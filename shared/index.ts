/**
 * Shared module for Video Converter Desktop
 * 
 * This module contains all shared code between the main process,
 * renderer process, and tests including:
 * - Type definitions
 * - Data models
 * - Utility functions
 * - Constants
 */

// Export all types
export * from './types'

// Export commonly used constants
export { SUPPORTED_VIDEO_FORMATS, VIDEO_MIME_TYPES } from './types/video-file'
export { QUALITY_PRESETS, OUTPUT_FORMATS } from './types/conversion-job'
export { DEFAULT_PREFERENCES } from './types/app-state'
export { IPC_CHANNELS } from './types/ipc-contracts'