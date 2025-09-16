/**
 * Application state model for managing app preferences and settings
 */

import type { ConversionJob } from './conversion-job'

export interface OutputPreferences {
  /** Default output directory */
  defaultOutputDirectory: string
  /** Default output format */
  defaultFormat: string
  /** Default quality preset */
  defaultQuality: string
  /** Whether to create subdirectories organized by date */
  organizeByDate: boolean
  /** Whether to preserve original file names */
  preserveOriginalNames: boolean
  /** Custom naming pattern (e.g., '{name}_converted_{timestamp}') */
  namingPattern: string
  /** Whether to overwrite existing files */
  overwriteExisting: boolean
}

export interface ConversionPreferences {
  /** Maximum number of concurrent conversions */
  maxConcurrentJobs: number
  /** Whether to automatically start conversions when jobs are added */
  autoStart: boolean
  /** Whether to shutdown computer after all conversions complete */
  shutdownWhenComplete: boolean
  /** Whether to show notifications for completed conversions */
  showNotifications: boolean
  /** FFmpeg priority level (higher = more CPU usage) */
  processPriority: 'low' | 'normal' | 'high'
  /** Whether to preserve metadata in output files */
  preserveMetadata: boolean
  /** Whether to generate thumbnails for converted videos */
  generateThumbnails: boolean
}

export interface InterfacePreferences {
  /** Application theme */
  theme: 'light' | 'dark' | 'system'
  /** UI language/locale */
  language: string
  /** Whether to start application minimized */
  startMinimized: boolean
  /** Whether to minimize to system tray instead of closing */
  minimizeToTray: boolean
  /** Whether to show conversion progress in taskbar */
  showProgressInTaskbar: boolean
  /** Window size and position */
  windowBounds?: {
    x: number
    y: number
    width: number
    height: number
    maximized: boolean
  }
  /** Whether to remember last selected files/folders */
  rememberLastPath: boolean
  /** Last used input directory */
  lastInputDirectory?: string
}

export interface AdvancedPreferences {
  /** FFmpeg binary path (if custom) */
  ffmpegPath?: string
  /** Additional FFmpeg arguments to always include */
  globalFFmpegArgs: string[]
  /** Hardware acceleration preference */
  hardwareAcceleration: 'none' | 'auto' | 'nvidia' | 'intel' | 'amd'
  /** Temporary directory for conversion files */
  tempDirectory: string
  /** Whether to clean up temporary files automatically */
  cleanupTempFiles: boolean
  /** Log level for debugging */
  logLevel: 'error' | 'warn' | 'info' | 'debug'
  /** Whether to enable performance metrics collection */
  enableMetrics: boolean
  /** Maximum log file size in MB */
  maxLogSize: number
}

export interface ApplicationPreferences {
  /** Output file preferences */
  output: OutputPreferences
  /** Conversion behavior preferences */
  conversion: ConversionPreferences
  /** User interface preferences */
  interface: InterfacePreferences
  /** Advanced/technical preferences */
  advanced: AdvancedPreferences
  /** Version of preferences schema */
  version: string
  /** When preferences were last updated */
  updatedAt: Date
}

export interface ApplicationStatistics {
  /** Total number of files converted */
  totalConversions: number
  /** Total conversion time in seconds */
  totalConversionTime: number
  /** Total input file size in bytes */
  totalInputSize: number
  /** Total output file size in bytes */
  totalOutputSize: number
  /** Number of failed conversions */
  failedConversions: number
  /** Most used output format */
  mostUsedFormat: string
  /** Average conversion speed */
  averageConversionSpeed: number
  /** Application usage time in seconds */
  totalUsageTime: number
  /** Number of application launches */
  launchCount: number
  /** When statistics were last reset */
  lastReset: Date
}

export interface ApplicationSession {
  /** Session identifier */
  id: string
  /** When session started */
  startedAt: Date
  /** When session ended (if ended) */
  endedAt?: Date
  /** Active conversion jobs in this session */
  activeJobs: ConversionJob[]
  /** Completed jobs in this session */
  completedJobs: ConversionJob[]
  /** Files added to queue in this session */
  filesAdded: number
  /** Current session statistics */
  sessionStats: {
    conversionsCompleted: number
    conversionsFailed: number
    totalProcessingTime: number
    averageSpeed: number
  }
  /** Whether session is currently active */
  isActive: boolean
}

export interface ApplicationState {
  /** User preferences and settings */
  preferences: ApplicationPreferences
  /** Application usage statistics */
  statistics: ApplicationStatistics
  /** Current application session */
  currentSession: ApplicationSession
  /** Recent sessions */
  recentSessions: ApplicationSession[]
  /** Application version */
  version: string
  /** Whether this is the first run */
  isFirstRun: boolean
  /** When application was installed */
  installedAt: Date
  /** Last time application was updated */
  lastUpdateCheck: Date
}

/**
 * Default application preferences
 */
export const DEFAULT_PREFERENCES: ApplicationPreferences = {
  output: {
    defaultOutputDirectory: '',
    defaultFormat: 'mp4',
    defaultQuality: 'medium',
    organizeByDate: false,
    preserveOriginalNames: true,
    namingPattern: '{name}_converted',
    overwriteExisting: false
  },
  conversion: {
    maxConcurrentJobs: 2,
    autoStart: true,
    shutdownWhenComplete: false,
    showNotifications: true,
    processPriority: 'normal',
    preserveMetadata: true,
    generateThumbnails: true
  },
  interface: {
    theme: 'system',
    language: 'en',
    startMinimized: false,
    minimizeToTray: true,
    showProgressInTaskbar: true,
    rememberLastPath: true
  },
  advanced: {
    globalFFmpegArgs: [],
    hardwareAcceleration: 'auto',
    tempDirectory: '',
    cleanupTempFiles: true,
    logLevel: 'info',
    enableMetrics: true,
    maxLogSize: 50
  },
  version: '1.0.0',
  updatedAt: new Date()
}

/**
 * Utility functions for application state
 */
export const ApplicationStateUtils = {
  /**
   * Generate a new session ID
   */
  generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  },

  /**
   * Create a new application session
   */
  createSession(): ApplicationSession {
    return {
      id: ApplicationStateUtils.generateSessionId(),
      startedAt: new Date(),
      activeJobs: [],
      completedJobs: [],
      filesAdded: 0,
      sessionStats: {
        conversionsCompleted: 0,
        conversionsFailed: 0,
        totalProcessingTime: 0,
        averageSpeed: 0
      },
      isActive: true
    }
  },

  /**
   * Create initial application state
   */
  createInitialState(): ApplicationState {
    const now = new Date()
    
    return {
      preferences: DEFAULT_PREFERENCES,
      statistics: {
        totalConversions: 0,
        totalConversionTime: 0,
        totalInputSize: 0,
        totalOutputSize: 0,
        failedConversions: 0,
        mostUsedFormat: 'mp4',
        averageConversionSpeed: 0,
        totalUsageTime: 0,
        launchCount: 1,
        lastReset: now
      },
      currentSession: ApplicationStateUtils.createSession(),
      recentSessions: [],
      version: '1.0.0',
      isFirstRun: true,
      installedAt: now,
      lastUpdateCheck: now
    }
  },

  /**
   * Merge user preferences with defaults
   */
  mergePreferences(
    userPrefs: Partial<ApplicationPreferences>,
    defaults: ApplicationPreferences = DEFAULT_PREFERENCES
  ): ApplicationPreferences {
    return {
      output: { ...defaults.output, ...userPrefs.output },
      conversion: { ...defaults.conversion, ...userPrefs.conversion },
      interface: { ...defaults.interface, ...userPrefs.interface },
      advanced: { ...defaults.advanced, ...userPrefs.advanced },
      version: userPrefs.version || defaults.version,
      updatedAt: new Date()
    }
  },

  /**
   * Check if preferences update requires application restart
   */
  requiresRestart(
    oldPrefs: ApplicationPreferences,
    newPrefs: ApplicationPreferences
  ): boolean {
    const restartRequired = [
      // Advanced settings that require restart
      oldPrefs.advanced.ffmpegPath !== newPrefs.advanced.ffmpegPath,
      oldPrefs.advanced.hardwareAcceleration !== newPrefs.advanced.hardwareAcceleration,
      oldPrefs.advanced.tempDirectory !== newPrefs.advanced.tempDirectory,
      oldPrefs.advanced.logLevel !== newPrefs.advanced.logLevel,
      
      // Interface settings that require restart
      oldPrefs.interface.language !== newPrefs.interface.language
    ]
    
    return restartRequired.some(Boolean)
  },

  /**
   * Validate preferences object
   */
  validatePreferences(prefs: Partial<ApplicationPreferences>): {
    isValid: boolean
    errors: string[]
  } {
    const errors: string[] = []
    
    // Validate concurrent jobs
    if (prefs.conversion?.maxConcurrentJobs !== undefined) {
      if (prefs.conversion.maxConcurrentJobs < 1 || prefs.conversion.maxConcurrentJobs > 8) {
        errors.push('Max concurrent jobs must be between 1 and 8')
      }
    }
    
    // Validate naming pattern
    if (prefs.output?.namingPattern !== undefined) {
      if (!prefs.output.namingPattern.includes('{name}')) {
        errors.push('Naming pattern must include {name} placeholder')
      }
    }
    
    // Validate log size
    if (prefs.advanced?.maxLogSize !== undefined) {
      if (prefs.advanced.maxLogSize < 1 || prefs.advanced.maxLogSize > 1000) {
        errors.push('Max log size must be between 1 and 1000 MB')
      }
    }
    
    return {
      isValid: errors.length === 0,
      errors
    }
  },

  /**
   * Update session statistics
   */
  updateSessionStats(session: ApplicationSession, job: ConversionJob): ApplicationSession {
    const updatedStats = { ...session.sessionStats }
    
    if (job.status === 'completed') {
      updatedStats.conversionsCompleted++
      if (job.result?.conversionTime) {
        updatedStats.totalProcessingTime += job.result.conversionTime
        updatedStats.averageSpeed = updatedStats.totalProcessingTime / updatedStats.conversionsCompleted
      }
    } else if (job.status === 'failed') {
      updatedStats.conversionsFailed++
    }
    
    return {
      ...session,
      sessionStats: updatedStats
    }
  }
}