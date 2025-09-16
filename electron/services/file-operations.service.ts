/**
 * File Operations Service
 * 
 * Handles file selection, save location dialogs, and file validation
 * using Electron's dialog API and FFmpeg for video file validation.
 */

import { dialog, BrowserWindow } from 'electron'
import { promises as fs } from 'fs'
import path from 'path'
import ffprobe from 'ffprobe-static'
import { spawn } from 'child_process'
import {
  VideoFile,
  VideoFileUtils,
  SUPPORTED_VIDEO_FORMATS
} from '../../shared/index.js'
import type {
  SelectFilesRequest,
  SelectFilesResponse,
  SaveLocationRequest,
  SaveLocationResponse,
  ValidateFileRequest,
  ValidateFileResponse
} from '../../shared/types/ipc-contracts.js'

/**
 * File Operations Service Class
 */
export class FileOperationsService {
  private static instance: FileOperationsService
  
  private constructor() {}
  
  /**
   * Get singleton instance
   */
  public static getInstance(): FileOperationsService {
    if (!FileOperationsService.instance) {
      FileOperationsService.instance = new FileOperationsService()
    }
    return FileOperationsService.instance
  }

  /**
   * Show file selection dialog
   */
  async selectFiles(request: SelectFilesRequest = {}): Promise<SelectFilesResponse> {
    try {
      const mainWindow = BrowserWindow.getFocusedWindow() || BrowserWindow.getAllWindows()[0]
      
      const result = await dialog.showOpenDialog(mainWindow, {
        title: 'Select Video Files',
        properties: (['openFile'] as Array<'openFile' | 'multiSelections'>).concat(
          request.multiple ? ['multiSelections'] : []
        ),
        filters: request.filters || [
          {
            name: 'Video Files',
            extensions: SUPPORTED_VIDEO_FORMATS.map(ext => ext.slice(1)) // Remove the dot
          },
          {
            name: 'All Files',
            extensions: ['*']
          }
        ]
      })

      if (result.canceled) {
        return {
          success: false,
          filePaths: []
        }
      }

      // Validate that selected files are supported video formats
      const validFiles = result.filePaths.filter(filePath => {
        const extension = path.extname(filePath).toLowerCase()
        return VideoFileUtils.isSupportedFormat(extension)
      })

      if (validFiles.length === 0 && result.filePaths.length > 0) {
        return {
          success: false,
          filePaths: []
        }
      }

      return {
        success: true,
        filePaths: validFiles
      }
    } catch (error) {
      console.error('Error in file selection:', error)
      return {
        success: false,
        filePaths: []
      }
    }
  }

  /**
   * Show save location dialog
   */
  async selectSaveLocation(request: SaveLocationRequest = {}): Promise<SaveLocationResponse> {
    try {
      const mainWindow = BrowserWindow.getFocusedWindow() || BrowserWindow.getAllWindows()[0]
      
      const result = await dialog.showSaveDialog(mainWindow, {
        title: 'Save Converted Video',
        defaultPath: request.defaultPath,
        filters: request.filters || [
          {
            name: 'Video Files',
            extensions: ['mp4', 'avi', 'mkv', 'mov', 'wmv', 'webm']
          },
          {
            name: 'All Files',
            extensions: ['*']
          }
        ]
      })

      if (result.canceled || !result.filePath) {
        return {
          success: false
        }
      }

      // Ensure the directory exists
      const directory = path.dirname(result.filePath)
      try {
        await fs.access(directory)
      } catch {
        await fs.mkdir(directory, { recursive: true })
      }

      return {
        success: true,
        filePath: result.filePath
      }
    } catch (error) {
      console.error('Error in save location selection:', error)
      return {
        success: false
      }
    }
  }

  /**
   * Validate a video file and extract metadata
   */
  async validateFile(request: ValidateFileRequest): Promise<ValidateFileResponse> {
    try {
      // Check if file exists
      try {
        await fs.access(request.filePath)
      } catch {
        return {
          isValid: false,
          error: 'File does not exist'
        }
      }

      // Check file extension
      const extension = path.extname(request.filePath).toLowerCase()
      if (!VideoFileUtils.isSupportedFormat(extension)) {
        return {
          isValid: false,
          error: `Unsupported file format: ${extension}`
        }
      }

      // Get file stats
      const stats = await fs.stat(request.filePath)
      if (!stats.isFile()) {
        return {
          isValid: false,
          error: 'Path is not a file'
        }
      }

      // Extract video metadata using ffprobe
      const metadata = await this.extractVideoMetadata(request.filePath)
      if (!metadata) {
        return {
          isValid: false,
          error: 'Unable to read video metadata - file may be corrupted'
        }
      }

      // Generate thumbnail (optional)
      const thumbnail = await this.generateThumbnail()

      return {
        isValid: true,
        metadata: {
          duration: metadata.duration,
          width: metadata.width,
          height: metadata.height,
          frameRate: metadata.frameRate,
          bitrate: metadata.bitrate,
          codec: metadata.codec,
          audioCodec: metadata.audioCodec,
          fileSize: stats.size,
          createdAt: stats.birthtime,
          modifiedAt: stats.mtime
        },
        thumbnail
      }
    } catch (error) {
      console.error('Error validating file:', error)
      return {
        isValid: false,
        error: `Validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      }
    }
  }

  /**
   * Extract video metadata using ffprobe
   */
  private async extractVideoMetadata(filePath: string): Promise<{
    duration: number
    width: number
    height: number
    frameRate: number
    bitrate: number
    codec: string
    audioCodec?: string
  } | null> {
    return new Promise((resolve) => {
      const ffprobeProcess = spawn(ffprobe, [
        '-v', 'quiet',
        '-print_format', 'json',
        '-show_format',
        '-show_streams',
        filePath
      ])

      let output = ''
      let errorOutput = ''

      ffprobeProcess.stdout.on('data', (data) => {
        output += data.toString()
      })

      ffprobeProcess.stderr.on('data', (data) => {
        errorOutput += data.toString()
      })

      ffprobeProcess.on('close', (code) => {
        if (code !== 0) {
          console.error('ffprobe error:', errorOutput)
          resolve(null)
          return
        }

        try {
          const data = JSON.parse(output)
          
          // Define types for ffprobe stream data
          interface FFProbeStream {
            codec_type: string
            codec_name: string
            width?: string
            height?: string
            r_frame_rate?: string
            bit_rate?: string
          }
          
          interface FFProbeData {
            streams?: FFProbeStream[]
            format?: {
              duration?: string
              bit_rate?: string
            }
          }
          
          const typedData = data as FFProbeData
          
          // Find video stream
          const videoStream = typedData.streams?.find((stream) => stream.codec_type === 'video')
          const audioStream = typedData.streams?.find((stream) => stream.codec_type === 'audio')
          
          if (!videoStream) {
            resolve(null)
            return
          }

          // Extract frame rate
          let frameRate = 30 // default
          if (videoStream.r_frame_rate) {
            const [num, den] = videoStream.r_frame_rate.split('/')
            frameRate = parseInt(num) / parseInt(den)
          }

          resolve({
            duration: parseFloat(data.format?.duration || '0'),
            width: parseInt(videoStream.width || '0'),
            height: parseInt(videoStream.height || '0'),
            frameRate,
            bitrate: parseInt(data.format?.bit_rate || videoStream.bit_rate || '0'),
            codec: videoStream.codec_name || 'unknown',
            audioCodec: audioStream?.codec_name
          })
        } catch (error) {
          console.error('Error parsing ffprobe output:', error)
          resolve(null)
        }
      })

      // Handle process errors
      ffprobeProcess.on('error', (error) => {
        console.error('ffprobe spawn error:', error)
        resolve(null)
      })
    })
  }

  /**
   * Generate thumbnail for video file
   */
  private async generateThumbnail(): Promise<string | undefined> {
    // For now, return undefined - thumbnail generation can be implemented later
    // This would involve using ffmpeg to extract a frame and convert to base64
    return undefined
  }

  /**
   * Create a VideoFile instance from a file path
   */
  async createVideoFile(filePath: string): Promise<VideoFile | null> {
    const validationResult = await this.validateFile({ filePath })
    
    if (!validationResult.isValid) {
      return null
    }

    const fileInfo = VideoFileUtils.create(filePath)
    
    return {
      id: VideoFileUtils.generateId(),
      ...fileInfo,
      isValid: true,
      metadata: validationResult.metadata,
      thumbnail: validationResult.thumbnail,
      addedAt: new Date()
    }
  }

  /**
   * Batch validate multiple files
   */
  async validateFiles(filePaths: string[]): Promise<VideoFile[]> {
    const results = await Promise.allSettled(
      filePaths.map(filePath => this.createVideoFile(filePath))
    )

    return results
      .filter((result): result is PromiseFulfilledResult<VideoFile> => 
        result.status === 'fulfilled' && result.value !== null
      )
      .map(result => result.value)
  }

  /**
   * Check if a file path is a supported video format
   */
  isSupportedVideoFile(filePath: string): boolean {
    const extension = path.extname(filePath).toLowerCase()
    return VideoFileUtils.isSupportedFormat(extension)
  }

  /**
   * Get file information without full validation
   */
  async getFileInfo(filePath: string): Promise<{
    name: string
    path: string
    extension: string
    size: number
    exists: boolean
  }> {
    try {
      const stats = await fs.stat(filePath)
      return {
        name: path.basename(filePath),
        path: filePath,
        extension: path.extname(filePath).toLowerCase(),
        size: stats.size,
        exists: true
      }
    } catch {
      return {
        name: path.basename(filePath),
        path: filePath,
        extension: path.extname(filePath).toLowerCase(),
        size: 0,
        exists: false
      }
    }
  }
}