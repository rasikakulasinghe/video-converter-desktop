/**
 * IPC contract types for communication between main and renderer processes
 */

import type { VideoFileValidationResult } from './video-file'
import type { ConversionJob, ConversionSettings, ConversionProgress } from './conversion-job'
import type { ApplicationPreferences } from './app-state'

/**
 * Standard IPC response wrapper
 */
export interface IPCResponse<T = unknown> {
  /** Whether the operation was successful */
  success: boolean
  /** Response data (if successful) */
  data?: T
  /** Error message (if failed) */
  error?: string
  /** Additional error details */
  details?: string
}

/**
 * File Operations
 */

// file:select
export interface SelectFilesRequest {
  /** Whether to allow multiple file selection */
  multiple?: boolean
  /** File type filters */
  filters?: Array<{
    name: string
    extensions: string[]
  }>
}

export interface SelectFilesResponse {
  /** Whether user selected files */
  success: boolean
  /** Selected file paths */
  filePaths: string[]
}

// file:save-location
export interface SaveLocationRequest {
  /** Default file name */
  defaultPath?: string
  /** File type filters */
  filters?: Array<{
    name: string
    extensions: string[]
  }>
}

export interface SaveLocationResponse {
  /** Whether user selected a location */
  success: boolean
  /** Selected file path */
  filePath?: string
}

// file:validate
export interface ValidateFileRequest {
  /** File path to validate */
  filePath: string
}

export type ValidateFileResponse = VideoFileValidationResult

/**
 * Conversion Operations
 */

// conversion:start
export interface StartConversionRequest {
  /** Input file path */
  inputPath: string
  /** Output file path */
  outputPath: string
  /** Conversion settings */
  settings: ConversionSettings
  /** Job priority */
  priority?: number
}

export interface StartConversionResponse {
  /** Whether conversion started successfully */
  success: boolean
  /** Job ID for tracking */
  jobId?: string
  /** Error message if failed */
  error?: string
}

// conversion:cancel
export interface CancelConversionRequest {
  /** Job ID to cancel */
  jobId: string
}

export interface CancelConversionResponse {
  /** Whether cancellation was successful */
  success: boolean
  /** Error message if failed */
  error?: string
}

// conversion:get-jobs
export interface GetJobsRequest {
  /** Filter by status */
  status?: string[]
  /** Maximum number of jobs to return */
  limit?: number
}

export interface GetJobsResponse {
  /** List of conversion jobs */
  jobs: ConversionJob[]
}

/**
 * Conversion Progress Events
 */

// conversion:progress
export interface ProgressEvent {
  /** Job ID */
  jobId: string
  /** Current progress */
  progress: ConversionProgress
}

// conversion:started
export interface StartedEvent {
  /** Job ID */
  jobId: string
  /** Job details */
  job: ConversionJob
}

// conversion:completed
export interface CompletedEvent {
  /** Job ID */
  jobId: string
  /** Job details */
  job: ConversionJob
  /** Output file path */
  outputPath: string
  /** Conversion time in seconds */
  conversionTime: number
}

// conversion:failed
export interface FailedEvent {
  /** Job ID */
  jobId: string
  /** Job details */
  job: ConversionJob
  /** Error message */
  error: string
  /** Error details */
  details?: string
}

// conversion:cancelled
export interface CancelledEvent {
  /** Job ID */
  jobId: string
  /** Job details */
  job: ConversionJob
}

/**
 * App State
 */

// app:get-preferences
export interface GetPreferencesRequest {
  /** Specific preference section to get */
  section?: 'output' | 'conversion' | 'interface' | 'advanced'
}

export type GetPreferencesResponse = ApplicationPreferences

// app:set-preferences
export interface SetPreferencesRequest {
  /** Preferences to update */
  preferences: Partial<ApplicationPreferences>
}

export interface SetPreferencesResponse {
  /** Whether update was successful */
  success: boolean
  /** Whether restart is required */
  requiresRestart: boolean
  /** Error message if failed */
  error?: string
  /** Validation errors */
  validationErrors?: string[]
}

// app:get-statistics
export interface GetStatisticsResponse {
  /** Application usage statistics */
  statistics: {
    totalConversions: number
    totalConversionTime: number
    totalInputSize: number
    totalOutputSize: number
    failedConversions: number
    mostUsedFormat: string
    averageConversionSpeed: number
  }
}

// app:reset-statistics
export interface ResetStatisticsResponse {
  /** Whether reset was successful */
  success: boolean
}

/**
 * System Integration
 */

// system:show-in-explorer
export interface ShowInExplorerRequest {
  /** File path to show */
  filePath: string
}

export interface ShowInExplorerResponse {
  /** Whether operation was successful */
  success: boolean
  /** Error message if failed */
  error?: string
}

// system:open-external
export interface OpenExternalRequest {
  /** URL or file path to open */
  url: string
}

export interface OpenExternalResponse {
  /** Whether operation was successful */
  success: boolean
  /** Error message if failed */
  error?: string
}

// app:info
export interface AppInfoResponse {
  /** Application version */
  version: string
  /** Electron version */
  electronVersion: string
  /** Node.js version */
  nodeVersion: string
  /** Chrome version */
  chromeVersion: string
  /** Operating system */
  platform: string
  /** Architecture */
  arch: string
  /** FFmpeg version */
  ffmpegVersion?: string
  /** FFmpeg path */
  ffmpegPath?: string
  /** Available hardware acceleration */
  hardwareAcceleration: string[]
}

// app:quit
export interface QuitAppRequest {
  /** Whether to force quit (skip confirmations) */
  force?: boolean
}

export interface QuitAppResponse {
  /** Whether quit was initiated */
  success: boolean
  /** Reason if quit was prevented */
  reason?: string
}

// System integration types (extended)
// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface GetSystemInfoRequest {
  /** Empty request */
}

export interface GetSystemInfoResponse {
  /** System information */
  systemInfo: {
    platform: string
    arch: string
    nodeVersion: string
    electronVersion: string
    chromeVersion: string
    v8Version: string
    cpuInfo: string
    totalMemory: number
    appMemoryUsage: {
      rss: number
      heapTotal: number
      heapUsed: number
      external: number
    }
  }
}

export interface TogglePowerSaveBlockerRequest {
  /** Whether to enable or disable */
  enable: boolean
  /** Type of power save blocker */
  type?: 'prevent-app-suspension' | 'prevent-display-sleep'
}

export interface TogglePowerSaveBlockerResponse {
  /** Whether power save blocker is active */
  isActive: boolean
  /** Power save blocker ID */
  blockerId: number | null
}

// App lifecycle types
// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface RestartAppRequest {
  /** Empty request */
}

export interface RestartAppResponse {
  /** Whether restart was initiated */
  success: boolean
}

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface CheckForUpdatesRequest {
  /** Empty request */
}

export interface CheckForUpdatesResponse {
  /** Whether an update is available */
  hasUpdate: boolean
  /** Current version */
  currentVersion: string
  /** Latest version */
  latestVersion: string
  /** Release notes */
  releaseNotes: string
  /** Download URL */
  downloadUrl: string
}

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface GetAppInfoRequest {
  /** Empty request */
}

export interface GetAppInfoResponse {
  /** Application information */
  appInfo: {
    name: string
    version: string
    description: string
    author: string
    homepage: string
    license: string
    buildDate: string
    commitHash: string
    environment: string
  }
}

export interface ClearCacheRequest {
  /** Type of cache to clear */
  type?: 'all' | 'storage' | 'cache' | 'cookies'
}

export interface ClearCacheResponse {
  /** Whether operation was successful */
  success: boolean
  /** Size of cleared cache in bytes */
  clearedSize: number
}

export interface GetLogsRequest {
  /** Type of logs to retrieve */
  type?: 'app' | 'ffmpeg' | 'error'
  /** Number of lines to retrieve */
  lines?: number
}

export interface GetLogsResponse {
  /** Log lines */
  logs: string[]
}

// App state management types
// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface GetSessionRequest {
  /** Empty request */
}

export interface GetSessionResponse {
  /** Current session */
  session: {
    id: string
    createdAt: Date
    lastActivity: Date
    activeFiles: string[]
    recentFiles: string[]
    activeJobs: string[]
  }
}

export interface UpdateSessionRequest {
  /** Session updates */
  updates: {
    activeFiles?: string[]
    recentFiles?: string[]
    activeJobs?: string[]
  }
}

export interface UpdateSessionResponse {
  /** Updated session */
  session: {
    id: string
    createdAt: Date
    lastActivity: Date
    activeFiles: string[]
    recentFiles: string[]
    activeJobs: string[]
  }
}

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface GetSettingsRequest {
  /** Empty request */
}

export interface GetSettingsResponse {
  /** Current settings */
  settings: {
    theme: 'light' | 'dark' | 'system'
    outputDirectory: string
    defaultOutputFormat: string
    quality: 'low' | 'medium' | 'high' | 'lossless'
    hardwareAcceleration: boolean
    maxConcurrentJobs: number
    preserveMetadata: boolean
    notifications: {
      enabled: boolean
      onComplete: boolean
      onError: boolean
      sound: boolean
    }
    advanced: {
      ffmpegPath: string
      customPresets: Array<{
        name: string
        settings: Record<string, unknown>
      }>
      logLevel: 'error' | 'warning' | 'info' | 'debug'
      tempDirectory: string
    }
  }
}

export interface UpdateSettingsRequest {
  /** Settings updates */
  updates: Partial<{
    theme: 'light' | 'dark' | 'system'
    outputDirectory: string
    defaultOutputFormat: string
    quality: 'low' | 'medium' | 'high' | 'lossless'
    hardwareAcceleration: boolean
    maxConcurrentJobs: number
    preserveMetadata: boolean
    notifications: {
      enabled: boolean
      onComplete: boolean
      onError: boolean
      sound: boolean
    }
    advanced: {
      ffmpegPath: string
      customPresets: Array<{
        name: string
        settings: Record<string, unknown>
      }>
      logLevel: 'error' | 'warning' | 'info' | 'debug'
      tempDirectory: string
    }
  }>
}

export interface UpdateSettingsResponse {
  /** Updated settings */
  settings: {
    theme: 'light' | 'dark' | 'system'
    outputDirectory: string
    defaultOutputFormat: string
    quality: 'low' | 'medium' | 'high' | 'lossless'
    hardwareAcceleration: boolean
    maxConcurrentJobs: number
    preserveMetadata: boolean
    notifications: {
      enabled: boolean
      onComplete: boolean
      onError: boolean
      sound: boolean
    }
    advanced: {
      ffmpegPath: string
      customPresets: Array<{
        name: string
        settings: Record<string, unknown>
      }>
      logLevel: 'error' | 'warning' | 'info' | 'debug'
      tempDirectory: string
    }
  }
}

// Event types
export interface AppLifecycleEvent {
  /** Event type */
  type: 'before-quit' | 'will-quit' | 'window-all-closed' | 'activate' | 'window-created' | 'window-focus' | 'window-blur' | 'restart-requested' | 'quit-requested'
  /** Event data */
  data?: unknown
}

export interface AppStateChangedEvent {
  /** New application state */
  state: {
    session: {
      id: string
      createdAt: Date
      lastActivity: Date
      activeFiles: string[]
      recentFiles: string[]
      activeJobs: string[]
    }
    settings: {
      theme: 'light' | 'dark' | 'system'
      outputDirectory: string
      defaultOutputFormat: string
      quality: 'low' | 'medium' | 'high' | 'lossless'
      hardwareAcceleration: boolean
      maxConcurrentJobs: number
      preserveMetadata: boolean
      notifications: {
        enabled: boolean
        onComplete: boolean
        onError: boolean
        sound: boolean
      }
      advanced: {
        ffmpegPath: string
        customPresets: Array<{
          name: string
          settings: Record<string, unknown>
        }>
        logLevel: 'error' | 'warning' | 'info' | 'debug'
        tempDirectory: string
      }
    }
    isProcessing: boolean
    lastError: string | null
    version: string
  }
}

/**
 * IPC Channel Names
 */
export const IPC_CHANNELS = {
  // File Operations
  FILE_SELECT: 'file:select',
  FILE_SAVE_LOCATION: 'file:save-location',
  FILE_VALIDATE: 'file:validate',

  // Conversion Operations
  CONVERSION_START: 'conversion:start',
  CONVERSION_CANCEL: 'conversion:cancel',
  CONVERSION_GET_JOBS: 'conversion:get-jobs',

  // Conversion Events
  CONVERSION_PROGRESS: 'conversion:progress',
  CONVERSION_STARTED: 'conversion:started',
  CONVERSION_COMPLETED: 'conversion:completed',
  CONVERSION_FAILED: 'conversion:failed',
  CONVERSION_CANCELLED: 'conversion:cancelled',

  // App State Management
  STATE_GET_SESSION: 'state:get-session',
  STATE_UPDATE_SESSION: 'state:update-session',
  STATE_GET_SETTINGS: 'state:get-settings',
  STATE_UPDATE_SETTINGS: 'state:update-settings',
  STATE_CHANGED: 'state:changed',

  // Legacy App State (for compatibility)
  APP_GET_PREFERENCES: 'app:get-preferences',
  APP_SET_PREFERENCES: 'app:set-preferences',
  APP_GET_STATISTICS: 'app:get-statistics',
  APP_RESET_STATISTICS: 'app:reset-statistics',

  // System Integration
  SYSTEM_GET_INFO: 'system:get-info',
  SYSTEM_TOGGLE_POWER_SAVE_BLOCKER: 'system:toggle-power-save-blocker',
  SYSTEM_SHOW_IN_EXPLORER: 'system:show-in-explorer',
  SYSTEM_SHOW_IN_FOLDER: 'system:show-in-folder',
  SYSTEM_OPEN_EXTERNAL: 'system:open-external',

  // App Lifecycle
  APP_INFO: 'app:info',
  APP_GET_INFO: 'app:get-info',
  APP_QUIT: 'app:quit',
  APP_RESTART: 'app:restart',
  APP_CHECK_FOR_UPDATES: 'app:check-for-updates',
  APP_CLEAR_CACHE: 'app:clear-cache',
  APP_GET_LOGS: 'app:get-logs',
  APP_LIFECYCLE_EVENT: 'app:lifecycle-event'
} as const

/**
 * Type-safe IPC channel definitions
 */
export type IPCChannels = typeof IPC_CHANNELS

/**
 * IPC handler type definitions
 */
export interface IPCHandlers {
  [IPC_CHANNELS.FILE_SELECT]: (request: SelectFilesRequest) => Promise<IPCResponse<SelectFilesResponse>>
  [IPC_CHANNELS.FILE_SAVE_LOCATION]: (request: SaveLocationRequest) => Promise<IPCResponse<SaveLocationResponse>>
  [IPC_CHANNELS.FILE_VALIDATE]: (request: ValidateFileRequest) => Promise<IPCResponse<ValidateFileResponse>>
  
  [IPC_CHANNELS.CONVERSION_START]: (request: StartConversionRequest) => Promise<IPCResponse<StartConversionResponse>>
  [IPC_CHANNELS.CONVERSION_CANCEL]: (request: CancelConversionRequest) => Promise<IPCResponse<CancelConversionResponse>>
  [IPC_CHANNELS.CONVERSION_GET_JOBS]: (request: GetJobsRequest) => Promise<IPCResponse<GetJobsResponse>>
  
  [IPC_CHANNELS.APP_GET_PREFERENCES]: (request: GetPreferencesRequest) => Promise<IPCResponse<GetPreferencesResponse>>
  [IPC_CHANNELS.APP_SET_PREFERENCES]: (request: SetPreferencesRequest) => Promise<IPCResponse<SetPreferencesResponse>>
  [IPC_CHANNELS.APP_GET_STATISTICS]: () => Promise<IPCResponse<GetStatisticsResponse>>
  [IPC_CHANNELS.APP_RESET_STATISTICS]: () => Promise<IPCResponse<ResetStatisticsResponse>>
  
  [IPC_CHANNELS.SYSTEM_SHOW_IN_EXPLORER]: (request: ShowInExplorerRequest) => Promise<IPCResponse<ShowInExplorerResponse>>
  [IPC_CHANNELS.SYSTEM_OPEN_EXTERNAL]: (request: OpenExternalRequest) => Promise<IPCResponse<OpenExternalResponse>>
  [IPC_CHANNELS.APP_INFO]: () => Promise<IPCResponse<AppInfoResponse>>
  [IPC_CHANNELS.APP_QUIT]: (request: QuitAppRequest) => Promise<IPCResponse<QuitAppResponse>>
}

/**
 * Utility type for extracting request types
 */
export type IPCRequest<T extends keyof IPCHandlers> = Parameters<IPCHandlers[T]>[0]

/**
 * Utility type for extracting response types
 */
export type IPCResponseData<T extends keyof IPCHandlers> = 
  IPCHandlers[T] extends (...args: unknown[]) => Promise<IPCResponse<infer R>> 
    ? R 
    : never