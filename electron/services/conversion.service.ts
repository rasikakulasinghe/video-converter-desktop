/**
 * Conversion Service
 * 
 * Handles video conversion operations using FFmpeg with progress tracking,
 * job management, and queue processing capabilities.
 */

import { EventEmitter } from 'events'
import { spawn, ChildProcess } from 'child_process'
import { promises as fs } from 'fs'
import path from 'path'
import ffmpeg from 'ffmpeg-static'
import type {
  ConversionJob,
  ConversionProgress,
  ConversionError
} from '../../shared/types/conversion-job.js'
import type { VideoFile } from '../../shared/types/video-file.js'
import {
  ConversionJobUtils,
  QUALITY_PRESETS
} from '../../shared/types/conversion-job.js'
import type {
  StartConversionRequest,
  StartConversionResponse,
  CancelConversionRequest,
  CancelConversionResponse,
  GetJobsRequest,
  GetJobsResponse
} from '../../shared/types/ipc-contracts.js'

/**
 * Conversion events
 */
export interface ConversionServiceEvents {
  'job-started': (job: ConversionJob) => void
  'job-progress': (jobId: string, progress: ConversionProgress) => void
  'job-completed': (job: ConversionJob) => void
  'job-failed': (job: ConversionJob) => void
  'job-cancelled': (job: ConversionJob) => void
  'queue-updated': (jobs: ConversionJob[]) => void
}

/**
 * Conversion Service Class
 */
export class ConversionService extends EventEmitter {
  private static instance: ConversionService
  private jobs: Map<string, ConversionJob> = new Map()
  private activeProcesses: Map<string, ChildProcess> = new Map()
  private processingQueue: string[] = []
  private maxConcurrentJobs: number = 2
  private isProcessing: boolean = false

  private constructor() {
    super()
    this.setMaxListeners(50) // Allow more listeners for job events
  }

  /**
   * Get singleton instance
   */
  public static getInstance(): ConversionService {
    if (!ConversionService.instance) {
      ConversionService.instance = new ConversionService()
    }
    return ConversionService.instance
  }

  /**
   * Start a new conversion job
   */
  async startConversion(request: StartConversionRequest): Promise<StartConversionResponse> {
    try {
      // Validate input file exists
      try {
        await fs.access(request.inputPath)
      } catch {
        return {
          success: false,
          error: 'Input file does not exist'
        }
      }

      // Validate output directory exists or can be created
      const outputDir = path.dirname(request.outputPath)
      try {
        await fs.access(outputDir)
      } catch {
        try {
          await fs.mkdir(outputDir, { recursive: true })
        } catch {
          return {
            success: false,
            error: 'Cannot create output directory'
          }
        }
      }

      // Check if output file exists and overwrite is not allowed
      try {
        await fs.access(request.outputPath)
        // File exists, check if we should overwrite
        if (!request.settings.customArgs?.includes('-y')) {
          return {
            success: false,
            error: 'Output file already exists'
          }
        }
      } catch {
        // File doesn't exist, which is what we want
      }

      // Create video file object for the job
      const inputFile: VideoFile = {
        id: 'temp-' + Date.now(),
        name: path.basename(request.inputPath),
        path: request.inputPath,
        extension: path.extname(request.inputPath).toLowerCase(),
        mimeType: 'video/unknown', // Will be determined during validation
        isValid: true, // Assume valid for now
        addedAt: new Date()
      }

      // Create conversion job
      const job = ConversionJobUtils.create(
        inputFile,
        request.outputPath,
        request.settings,
        request.priority || 0
      )

      // Store job
      this.jobs.set(job.id, job)

      // Add to processing queue
      this.processingQueue.push(job.id)
      this.sortQueueByPriority()

      // Emit queue updated event
      this.emit('queue-updated', Array.from(this.jobs.values()))

      // Start processing if not already running
      this.processQueue()

      return {
        success: true,
        jobId: job.id
      }
    } catch (error) {
      console.error('Error starting conversion:', error)
      return {
        success: false,
        error: `Failed to start conversion: ${error instanceof Error ? error.message : 'Unknown error'}`
      }
    }
  }

  /**
   * Cancel a conversion job
   */
  async cancelConversion(request: CancelConversionRequest): Promise<CancelConversionResponse> {
    try {
      const job = this.jobs.get(request.jobId)
      if (!job) {
        return {
          success: false,
          error: 'Job not found'
        }
      }

      if (!ConversionJobUtils.canCancel(job)) {
        return {
          success: false,
          error: `Cannot cancel job with status: ${job.status}`
        }
      }

      // If job is currently processing, kill the process
      const process = this.activeProcesses.get(request.jobId)
      if (process) {
        process.kill('SIGTERM')
        this.activeProcesses.delete(request.jobId)
      }

      // Remove from queue if pending
      const queueIndex = this.processingQueue.indexOf(request.jobId)
      if (queueIndex !== -1) {
        this.processingQueue.splice(queueIndex, 1)
      }

      // Update job status
      job.status = 'cancelled'
      job.completedAt = new Date()

      // Clean up any temporary files
      await this.cleanupJob(job)

      // Emit events
      this.emit('job-cancelled', job)
      this.emit('queue-updated', Array.from(this.jobs.values()))

      return {
        success: true
      }
    } catch (error) {
      console.error('Error cancelling conversion:', error)
      return {
        success: false,
        error: `Failed to cancel conversion: ${error instanceof Error ? error.message : 'Unknown error'}`
      }
    }
  }

  /**
   * Get conversion jobs
   */
  async getJobs(request: GetJobsRequest = {}): Promise<GetJobsResponse> {
    try {
      let jobs = Array.from(this.jobs.values())

      // Filter by status if specified
      if (request.status && request.status.length > 0) {
        jobs = jobs.filter(job => request.status!.includes(job.status))
      }

      // Sort by creation date (newest first)
      jobs.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())

      // Limit results if specified
      if (request.limit && request.limit > 0) {
        jobs = jobs.slice(0, request.limit)
      }

      return {
        jobs
      }
    } catch (error) {
      console.error('Error getting jobs:', error)
      return {
        jobs: []
      }
    }
  }

  /**
   * Set maximum concurrent jobs
   */
  setMaxConcurrentJobs(max: number): void {
    this.maxConcurrentJobs = Math.max(1, Math.min(8, max))
  }

  /**
   * Get job by ID
   */
  getJob(jobId: string): ConversionJob | undefined {
    return this.jobs.get(jobId)
  }

  /**
   * Process the conversion queue
   */
  private async processQueue(): Promise<void> {
    if (this.isProcessing) {
      return
    }

    this.isProcessing = true

    while (this.processingQueue.length > 0 && this.activeProcesses.size < this.maxConcurrentJobs) {
      const jobId = this.processingQueue.shift()
      if (!jobId) continue

      const job = this.jobs.get(jobId)
      if (!job || job.status !== 'pending') continue

      // Start processing this job
      this.processJob(job)
    }

    this.isProcessing = false
  }

  /**
   * Process a single conversion job
   */
  private async processJob(job: ConversionJob): Promise<void> {
    try {
      // Update job status
      job.status = 'processing'
      job.startedAt = new Date()

      // Emit job started event
      this.emit('job-started', job)

      // Build FFmpeg arguments
      const args = this.buildFFmpegArguments(job)

      // Start FFmpeg process
      if (!ffmpeg) {
        throw new Error('FFmpeg binary not found')
      }
      
      const ffmpegProcess = spawn(ffmpeg as unknown as string, args)
      this.activeProcesses.set(job.id, ffmpegProcess)

      // Track progress
      let currentProgress: ConversionProgress = {
        percentage: 0,
        currentTime: 0,
        totalTime: job.inputFile.metadata?.duration || 0,
        speed: 0,
        bitrate: 0,
        frame: 0,
        fps: 0,
        eta: 0,
        stage: 'Starting conversion...'
      }

      // Parse FFmpeg output for progress
      if (ffmpegProcess.stderr) {
        ffmpegProcess.stderr.on('data', (data) => {
          const output = data.toString()
          const progress = this.parseFFmpegProgress(output, currentProgress)
          if (progress) {
            currentProgress = progress
            job.progress = progress
            this.emit('job-progress', job.id, progress)
          }
        })
      }

      // Handle process completion
      ffmpegProcess.on('close', async (code) => {
        this.activeProcesses.delete(job.id)

        if (code === 0) {
          // Success
          job.status = 'completed'
          job.completedAt = new Date()
          
          // Get output file size
          try {
            const stats = await fs.stat(job.outputPath)
            job.result = {
              success: true,
              outputPath: job.outputPath,
              outputSize: stats.size,
              conversionTime: job.completedAt.getTime() - (job.startedAt?.getTime() || 0)
            }
          } catch {
            job.result = {
              success: true,
              outputPath: job.outputPath,
              conversionTime: job.completedAt.getTime() - (job.startedAt?.getTime() || 0)
            }
          }

          this.emit('job-completed', job)
        } else {
          // Failure
          job.status = 'failed'
          job.completedAt = new Date()
          
          const error: ConversionError = {
            code: `FFMPEG_EXIT_${code}`,
            message: 'FFmpeg process failed',
            timestamp: new Date()
          }

          job.result = {
            success: false,
            conversionTime: job.completedAt.getTime() - (job.startedAt?.getTime() || 0),
            error
          }

          this.emit('job-failed', job)
        }

        // Continue processing queue
        this.processQueue()
      })

      // Handle process errors
      ffmpegProcess.on('error', async (error) => {
        this.activeProcesses.delete(job.id)
        
        job.status = 'failed'
        job.completedAt = new Date()
        
        const conversionError: ConversionError = {
          code: 'FFMPEG_SPAWN_ERROR',
          message: error.message,
          timestamp: new Date()
        }

        job.result = {
          success: false,
          conversionTime: job.completedAt.getTime() - (job.startedAt?.getTime() || 0),
          error: conversionError
        }

        this.emit('job-failed', job)
        this.processQueue()
      })

    } catch (error) {
      console.error('Error processing job:', error)
      
      job.status = 'failed'
      job.completedAt = new Date()
      
      const conversionError: ConversionError = {
        code: 'PROCESSING_ERROR',
        message: error instanceof Error ? error.message : 'Unknown processing error',
        timestamp: new Date()
      }

      job.result = {
        success: false,
        conversionTime: job.completedAt ? job.completedAt.getTime() - (job.startedAt?.getTime() || 0) : 0,
        error: conversionError
      }

      this.emit('job-failed', job)
      this.processQueue()
    }
  }

  /**
   * Build FFmpeg arguments for a conversion job
   */
  private buildFFmpegArguments(job: ConversionJob): string[] {
    const args: string[] = []

    // Input file
    args.push('-i', job.inputFile.path)

    // Get quality preset settings
    const presetSettings = QUALITY_PRESETS[job.settings.quality] || {}
    const settings = { ...presetSettings, ...job.settings }

    // Video codec and settings
    if (settings.format === 'mp4') {
      args.push('-c:v', 'libx264')
    } else if (settings.format === 'webm') {
      args.push('-c:v', 'libvpx-vp9')
    } else {
      args.push('-c:v', 'libx264') // Default to h264
    }

    // Bitrate
    if (settings.bitrate) {
      args.push('-b:v', `${settings.bitrate}`)
    }

    // Resolution
    if (settings.resolution) {
      args.push('-s', settings.resolution)
    }

    // Frame rate
    if (settings.frameRate) {
      args.push('-r', settings.frameRate.toString())
    }

    // Audio codec and settings
    if (settings.audioCodec) {
      args.push('-c:a', settings.audioCodec)
    } else {
      args.push('-c:a', 'aac') // Default audio codec
    }

    // Audio bitrate
    if (settings.audioBitrate) {
      args.push('-b:a', `${settings.audioBitrate}`)
    }

    // Trimming
    if (settings.startTime !== undefined) {
      args.push('-ss', settings.startTime.toString())
    }
    if (settings.endTime !== undefined && settings.startTime !== undefined) {
      args.push('-t', (settings.endTime - settings.startTime).toString())
    }

    // Custom arguments
    if (settings.customArgs) {
      args.push(...settings.customArgs)
    }

    // Progress reporting
    args.push('-progress', 'pipe:2')

    // Overwrite output file
    args.push('-y')

    // Output file
    args.push(job.outputPath)

    return args
  }

  /**
   * Parse FFmpeg progress output
   */
  private parseFFmpegProgress(output: string, currentProgress: ConversionProgress): ConversionProgress | null {
    const lines = output.split('\n')
    let updated = false
    const newProgress = { ...currentProgress }

    for (const line of lines) {
      if (line.includes('frame=')) {
        const frameMatch = line.match(/frame=\s*(\d+)/)
        if (frameMatch) {
          newProgress.frame = parseInt(frameMatch[1])
          updated = true
        }

        const fpsMatch = line.match(/fps=\s*([\d.]+)/)
        if (fpsMatch) {
          newProgress.fps = parseFloat(fpsMatch[1])
          updated = true
        }

        const bitrateMatch = line.match(/bitrate=\s*([\d.]+)kbits\/s/)
        if (bitrateMatch) {
          newProgress.bitrate = parseFloat(bitrateMatch[1]) * 1000
          updated = true
        }

        const speedMatch = line.match(/speed=\s*([\d.]+)x/)
        if (speedMatch) {
          newProgress.speed = parseFloat(speedMatch[1])
          updated = true
        }
      }

      if (line.includes('out_time_ms=')) {
        const timeMatch = line.match(/out_time_ms=(\d+)/)
        if (timeMatch) {
          newProgress.currentTime = parseInt(timeMatch[1]) / 1000000 // Convert microseconds to seconds
          
          if (newProgress.totalTime > 0) {
            newProgress.percentage = Math.min(100, (newProgress.currentTime / newProgress.totalTime) * 100)
            
            // Calculate ETA
            if (newProgress.speed > 0) {
              const remainingTime = newProgress.totalTime - newProgress.currentTime
              newProgress.eta = remainingTime / newProgress.speed
            }
          }
          
          updated = true
        }
      }
    }

    return updated ? newProgress : null
  }

  /**
   * Sort queue by priority (higher priority first)
   */
  private sortQueueByPriority(): void {
    this.processingQueue.sort((a, b) => {
      const jobA = this.jobs.get(a)
      const jobB = this.jobs.get(b)
      
      if (!jobA || !jobB) return 0
      
      return jobB.priority - jobA.priority
    })
  }

  /**
   * Clean up temporary files for a job
   */
  private async cleanupJob(job: ConversionJob): Promise<void> {
    try {
      // For now, just log cleanup
      // In the future, this could clean up partial files, temp files, etc.
      console.log(`Cleaning up job ${job.id}`)
    } catch (error) {
      console.error('Error cleaning up job:', error)
    }
  }

  /**
   * Get service statistics
   */
  getStatistics(): {
    totalJobs: number
    completedJobs: number
    failedJobs: number
    activeJobs: number
    queuedJobs: number
  } {
    const jobs = Array.from(this.jobs.values())
    
    return {
      totalJobs: jobs.length,
      completedJobs: jobs.filter(j => j.status === 'completed').length,
      failedJobs: jobs.filter(j => j.status === 'failed').length,
      activeJobs: jobs.filter(j => j.status === 'processing').length,
      queuedJobs: jobs.filter(j => j.status === 'pending' || j.status === 'queued').length
    }
  }

  /**
   * Clear completed jobs older than specified days
   */
  clearOldJobs(days: number = 7): number {
    const cutoffDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000)
    const jobs = Array.from(this.jobs.entries())
    let removed = 0

    for (const [jobId, job] of jobs) {
      if ((job.status === 'completed' || job.status === 'failed') && 
          job.completedAt && 
          job.completedAt < cutoffDate) {
        this.jobs.delete(jobId)
        removed++
      }
    }

    if (removed > 0) {
      this.emit('queue-updated', Array.from(this.jobs.values()))
    }

    return removed
  }
}