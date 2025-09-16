/**
 * Shared types and utilities for the Video Converter Desktop application
 * 
 * This module exports all type definitions, interfaces, and utilities
 * that are shared between the main process, renderer process, and tests.
 */

// Video file types
export * from './video-file'

// Conversion job types
export * from './conversion-job'

// Application state types
export * from './app-state'

// IPC contract types
export * from './ipc-contracts'

/**
 * Re-export commonly used types for convenience
 */
export type {
  VideoFile,
  VideoMetadata,
  VideoFileValidationResult
} from './video-file'

export type {
  ConversionJob,
  ConversionSettings,
  ConversionProgress,
  ConversionStatus,
  ConversionQuality
} from './conversion-job'

export type {
  ApplicationState,
  ApplicationPreferences,
  ApplicationStatistics,
  ApplicationSession
} from './app-state'

export type {
  IPCResponse,
  IPCHandlers,
  IPCChannels,
  IPC_CHANNELS
} from './ipc-contracts'