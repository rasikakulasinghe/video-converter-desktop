/**
 * Video file model representing a video file with metadata
 */

export interface VideoMetadata {
  /** Duration in seconds */
  duration: number
  /** Width in pixels */
  width: number
  /** Height in pixels */
  height: number
  /** Frame rate (fps) */
  frameRate: number
  /** Bitrate in bits per second */
  bitrate: number
  /** Video codec (e.g., 'h264', 'hevc', 'vp9') */
  codec: string
  /** Audio codec (e.g., 'aac', 'mp3', 'opus') */
  audioCodec?: string
  /** File size in bytes */
  fileSize: number
  /** Creation date */
  createdAt: Date
  /** Modified date */
  modifiedAt: Date
}

export interface VideoFile {
  /** Unique identifier for the video file */
  id: string
  /** File name with extension */
  name: string
  /** Full file path */
  path: string
  /** File extension (e.g., '.mp4', '.avi', '.mkv') */
  extension: string
  /** MIME type (e.g., 'video/mp4') */
  mimeType: string
  /** Validation status */
  isValid: boolean
  /** Error message if validation failed */
  error?: string
  /** Video metadata (available after validation) */
  metadata?: VideoMetadata
  /** Thumbnail data URL (base64 encoded image) */
  thumbnail?: string
  /** When this file record was created */
  addedAt: Date
}

export interface VideoFileValidationResult {
  /** Whether the file is valid */
  isValid: boolean
  /** Error message if validation failed */
  error?: string
  /** Video metadata if validation succeeded */
  metadata?: VideoMetadata
  /** Generated thumbnail if validation succeeded */
  thumbnail?: string
}

/**
 * Supported video formats
 */
export const SUPPORTED_VIDEO_FORMATS = [
  '.mp4',
  '.avi',
  '.mkv',
  '.mov',
  '.wmv',
  '.flv',
  '.webm',
  '.m4v',
  '.3gp',
  '.ogv'
] as const

export type SupportedVideoFormat = typeof SUPPORTED_VIDEO_FORMATS[number]

/**
 * Video format MIME type mappings
 */
export const VIDEO_MIME_TYPES: Record<string, string> = {
  '.mp4': 'video/mp4',
  '.avi': 'video/x-msvideo',
  '.mkv': 'video/x-matroska',
  '.mov': 'video/quicktime',
  '.wmv': 'video/x-ms-wmv',
  '.flv': 'video/x-flv',
  '.webm': 'video/webm',
  '.m4v': 'video/x-m4v',
  '.3gp': 'video/3gpp',
  '.ogv': 'video/ogg'
}

/**
 * Utility functions for video files
 */
export const VideoFileUtils = {
  /**
   * Check if a file extension is supported
   */
  isSupportedFormat(extension: string): boolean {
    return SUPPORTED_VIDEO_FORMATS.includes(extension.toLowerCase() as SupportedVideoFormat)
  },

  /**
   * Get MIME type for a file extension
   */
  getMimeType(extension: string): string {
    return VIDEO_MIME_TYPES[extension.toLowerCase()] || 'application/octet-stream'
  },

  /**
   * Create a new VideoFile instance
   */
  create(filePath: string): Omit<VideoFile, 'id' | 'isValid' | 'metadata' | 'thumbnail' | 'addedAt'> {
    // Extract filename and extension using string manipulation
    // This avoids Node.js dependencies in shared types
    const name = filePath.split(/[/\\]/).pop() || ''
    const extension = ('.' + name.split('.').pop()?.toLowerCase()) || ''
    
    return {
      name,
      path: filePath,
      extension,
      mimeType: VideoFileUtils.getMimeType(extension)
    }
  },

  /**
   * Generate a unique ID for a video file
   */
  generateId(): string {
    return `video_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  },

  /**
   * Format file size for display
   */
  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes'
    
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  },

  /**
   * Format duration for display
   */
  formatDuration(seconds: number): string {
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    const remainingSeconds = Math.floor(seconds % 60)
    
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`
    }
    
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`
  }
}