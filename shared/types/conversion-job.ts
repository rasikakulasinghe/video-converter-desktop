/**
 * Conversion job model for tracking video conversion operations
 */

import type { VideoFile } from './video-file'

export type ConversionStatus = 
  | 'pending'
  | 'queued'
  | 'processing'
  | 'completed'
  | 'failed'
  | 'cancelled'

export type ConversionQuality = 
  | 'low'
  | 'medium'
  | 'high'
  | 'ultra'
  | 'custom'

export interface ConversionSettings {
  /** Output format/codec */
  format: string
  /** Quality preset */
  quality: ConversionQuality
  /** Target resolution (e.g., '1920x1080', '1280x720') */
  resolution?: string
  /** Target bitrate in bits per second */
  bitrate?: number
  /** Target frame rate */
  frameRate?: number
  /** Audio codec */
  audioCodec?: string
  /** Audio bitrate in bits per second */
  audioBitrate?: number
  /** Custom FFmpeg arguments */
  customArgs?: string[]
  /** Whether to maintain aspect ratio when resizing */
  maintainAspectRatio: boolean
  /** Start time for trimming (in seconds) */
  startTime?: number
  /** End time for trimming (in seconds) */
  endTime?: number
}

export interface ConversionProgress {
  /** Percentage complete (0-100) */
  percentage: number
  /** Current processing time in seconds */
  currentTime: number
  /** Total duration in seconds */
  totalTime: number
  /** Processing speed (e.g., '2.5x') */
  speed: number
  /** Current bitrate being processed */
  bitrate: number
  /** Current frame being processed */
  frame: number
  /** Frames per second being processed */
  fps: number
  /** Estimated time remaining in seconds */
  eta: number
  /** Current processing stage */
  stage: string
}

export interface ConversionError {
  /** Error code */
  code: string
  /** Human-readable error message */
  message: string
  /** Detailed error information */
  details?: string
  /** FFmpeg stderr output */
  ffmpegOutput?: string
  /** Timestamp when error occurred */
  timestamp: Date
}

export interface ConversionResult {
  /** Whether conversion was successful */
  success: boolean
  /** Output file path if successful */
  outputPath?: string
  /** File size of output file in bytes */
  outputSize?: number
  /** Actual conversion time in seconds */
  conversionTime: number
  /** Error information if failed */
  error?: ConversionError
}

export interface ConversionJob {
  /** Unique job identifier */
  id: string
  /** Source video file */
  inputFile: VideoFile
  /** Output file path */
  outputPath: string
  /** Conversion settings */
  settings: ConversionSettings
  /** Current status */
  status: ConversionStatus
  /** Current progress (if processing) */
  progress?: ConversionProgress
  /** Conversion result (if completed/failed) */
  result?: ConversionResult
  /** When the job was created */
  createdAt: Date
  /** When the job was started */
  startedAt?: Date
  /** When the job was completed/failed/cancelled */
  completedAt?: Date
  /** Job priority (higher number = higher priority) */
  priority: number
  /** Whether this job can be retried if it fails */
  retryable: boolean
  /** Number of retry attempts made */
  retryCount: number
  /** Maximum number of retry attempts */
  maxRetries: number
}

/**
 * Predefined quality presets
 */
export const QUALITY_PRESETS: Record<ConversionQuality, Partial<ConversionSettings>> = {
  low: {
    quality: 'low',
    bitrate: 500000, // 500 kbps
    resolution: '854x480',
    frameRate: 24,
    audioCodec: 'aac',
    audioBitrate: 96000 // 96 kbps
  },
  medium: {
    quality: 'medium',
    bitrate: 1500000, // 1.5 Mbps
    resolution: '1280x720',
    frameRate: 30,
    audioCodec: 'aac',
    audioBitrate: 128000 // 128 kbps
  },
  high: {
    quality: 'high',
    bitrate: 4000000, // 4 Mbps
    resolution: '1920x1080',
    frameRate: 30,
    audioCodec: 'aac',
    audioBitrate: 192000 // 192 kbps
  },
  ultra: {
    quality: 'ultra',
    bitrate: 8000000, // 8 Mbps
    resolution: '1920x1080',
    frameRate: 60,
    audioCodec: 'aac',
    audioBitrate: 256000 // 256 kbps
  },
  custom: {
    quality: 'custom'
    // Custom settings provided by user
  }
}

/**
 * Supported output formats
 */
export const OUTPUT_FORMATS = [
  'mp4',
  'avi',
  'mkv',
  'mov',
  'wmv',
  'webm',
  'm4v'
] as const

export type OutputFormat = typeof OUTPUT_FORMATS[number]

/**
 * Utility functions for conversion jobs
 */
export const ConversionJobUtils = {
  /**
   * Generate a unique job ID
   */
  generateId(): string {
    return `job_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  },

  /**
   * Create a new conversion job
   */
  create(
    inputFile: VideoFile,
    outputPath: string,
    settings: ConversionSettings,
    priority: number = 0
  ): ConversionJob {
    return {
      id: ConversionJobUtils.generateId(),
      inputFile,
      outputPath,
      settings: {
        ...settings,
        maintainAspectRatio: settings.maintainAspectRatio ?? true
      },
      status: 'pending',
      createdAt: new Date(),
      priority,
      retryable: true,
      retryCount: 0,
      maxRetries: 3
    }
  },

  /**
   * Get quality preset settings
   */
  getQualityPreset(quality: ConversionQuality): Partial<ConversionSettings> {
    return QUALITY_PRESETS[quality] || QUALITY_PRESETS.medium
  },

  /**
   * Check if a job can be cancelled
   */
  canCancel(job: ConversionJob): boolean {
    return ['pending', 'queued', 'processing'].includes(job.status)
  },

  /**
   * Check if a job can be retried
   */
  canRetry(job: ConversionJob): boolean {
    return job.status === 'failed' && 
           job.retryable && 
           job.retryCount < job.maxRetries
  },

  /**
   * Calculate estimated output file size based on settings
   */
  estimateOutputSize(inputFile: VideoFile, settings: ConversionSettings): number {
    if (!inputFile.metadata || !settings.bitrate) {
      return 0
    }

    const duration = settings.endTime && settings.startTime 
      ? settings.endTime - settings.startTime
      : inputFile.metadata.duration

    // Estimate: (video bitrate + audio bitrate) * duration / 8 (bits to bytes)
    const videoBitrate = settings.bitrate
    const audioBitrate = settings.audioBitrate || 128000
    const totalBitrate = videoBitrate + audioBitrate

    return Math.round((totalBitrate * duration) / 8)
  },

  /**
   * Format conversion time for display
   */
  formatConversionTime(seconds: number): string {
    if (seconds < 60) {
      return `${seconds.toFixed(1)}s`
    }
    
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = seconds % 60
    
    if (minutes < 60) {
      return `${minutes}m ${remainingSeconds.toFixed(0)}s`
    }
    
    const hours = Math.floor(minutes / 60)
    const remainingMinutes = minutes % 60
    
    return `${hours}h ${remainingMinutes}m`
  },

  /**
   * Get status display text
   */
  getStatusText(status: ConversionStatus): string {
    const statusMap = {
      pending: 'Pending',
      queued: 'Queued',
      processing: 'Processing',
      completed: 'Completed',
      failed: 'Failed',
      cancelled: 'Cancelled'
    }
    
    return statusMap[status] || status
  }
}