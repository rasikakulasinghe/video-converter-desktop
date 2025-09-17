/**
 * App State Service
 * 
 * Manages application session data, user preferences, and application
 * information with persistent storage and validation.
 */

import { app } from 'electron'
import { promises as fs } from 'fs'
import path from 'path'
import type {
  GetSessionRequest,
  GetSessionResponse,
  UpdateSessionRequest,
  UpdateSessionResponse,
  GetPreferencesRequest,
  GetPreferencesResponse,
  SetPreferencesRequest,
  SetPreferencesResponse,
  GetAppInfoRequest,
  GetAppInfoResponse,
  QuitAppRequest,
  QuitAppResponse
} from '../../shared/types/ipc-contracts.js'
import { LoggingService } from './logging.service.js'

/**
 * Application Session Data
 */
interface AppSession {
  currentFiles: Array<{
    id: string
    path: string
    name: string
    addedAt: string
  }>
  activeJob: {
    jobId: string
    inputPath: string
    outputPath: string
    progress: number
    status: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled'
  } | null
  conversionHistory: Array<{
    jobId: string
    inputPath: string
    outputPath: string
    completedAt: string
    success: boolean
    error?: string
  }>
}

/**
 * User Preferences
 */
interface UserPreferences {
  theme: 'light' | 'dark' | 'system'
  defaultQuality: 'low' | 'medium' | 'high' | 'ultra'
  defaultFormat: 'mp4' | 'avi' | 'mkv' | 'mov' | 'wmv' | 'webm'
  autoStart: boolean
  notifications: boolean
  maxConcurrentJobs: number
  outputDirectory?: string
  preserveOriginalFiles: boolean
}

/**
 * Default preferences
 */
const DEFAULT_PREFERENCES: UserPreferences = {
  theme: 'system',
  defaultQuality: 'medium',
  defaultFormat: 'mp4',
  autoStart: false,
  notifications: true,
  maxConcurrentJobs: 2,
  preserveOriginalFiles: true
}

/**
 * Default session
 */
const DEFAULT_SESSION: AppSession = {
  currentFiles: [],
  activeJob: null,
  conversionHistory: []
}

/**
 * App State Service Class
 */
export class AppStateService {
  private static instance: AppStateService
  private session: AppSession = { ...DEFAULT_SESSION }
  private preferences: UserPreferences = { ...DEFAULT_PREFERENCES }
  private readonly dataDir: string
  private readonly sessionFile: string
  private readonly preferencesFile: string
  private logger: LoggingService

  private constructor() {
    this.logger = LoggingService.getInstance()
    this.dataDir = path.join(app.getPath('userData'), 'video-converter')
    this.sessionFile = path.join(this.dataDir, 'session.json')
    this.preferencesFile = path.join(this.dataDir, 'preferences.json')
  }

  /**
   * Get singleton instance
   */
  public static getInstance(): AppStateService {
    if (!AppStateService.instance) {
      AppStateService.instance = new AppStateService()
    }
    return AppStateService.instance
  }

  /**
   * Initialize the service - load saved data
   */
  async initialize(): Promise<void> {
    try {
      // Ensure data directory exists
      await this.ensureDataDirectory()
      
      // Load saved session and preferences
      await this.loadSession()
      await this.loadPreferences()
      
      this.logger.info('AppStateService initialized successfully')
    } catch (error) {
      this.logger.error('Failed to initialize AppStateService:', error)
      throw error
    }
  }

  /**
   * Get current session
   */
  async getSession(request?: GetSessionRequest): Promise<GetSessionResponse> {
    try {
      return {
        success: true,
        session: { ...this.session }
      }
    } catch (error) {
      this.logger.error('Failed to get session:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  /**
   * Update session data
   */
  async updateSession(request: UpdateSessionRequest): Promise<UpdateSessionResponse> {
    try {
      // Merge with existing session
      this.session = {
        ...this.session,
        ...request.session
      }

      // Save to disk
      await this.saveSession()

      this.logger.debug('Session updated successfully')
      
      return {
        success: true
      }
    } catch (error) {
      this.logger.error('Failed to update session:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  /**
   * Get user preferences
   */
  async getPreferences(request?: GetPreferencesRequest): Promise<GetPreferencesResponse> {
    try {
      return {
        success: true,
        preferences: { ...this.preferences }
      }
    } catch (error) {
      this.logger.error('Failed to get preferences:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  /**
   * Set user preferences
   */
  async setPreferences(request: SetPreferencesRequest): Promise<SetPreferencesResponse> {
    try {
      // Validate preferences
      const validatedPreferences = this.validatePreferences(request.preferences)
      
      // Merge with existing preferences
      this.preferences = {
        ...this.preferences,
        ...validatedPreferences
      }

      // Save to disk
      await this.savePreferences()

      this.logger.debug('Preferences updated successfully')
      
      return {
        success: true
      }
    } catch (error) {
      this.logger.error('Failed to set preferences:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  /**
   * Get application information
   */
  async getAppInfo(request?: GetAppInfoRequest): Promise<GetAppInfoResponse> {
    try {
      return {
        success: true,
        appInfo: {
          name: app.getName(),
          version: app.getVersion(),
          platform: process.platform,
          arch: process.arch,
          nodeVersion: process.version,
          electronVersion: process.versions.electron,
          chromeVersion: process.versions.chrome,
          dataPath: app.getPath('userData'),
          appPath: app.getAppPath(),
          isPackaged: app.isPackaged
        }
      }
    } catch (error) {
      this.logger.error('Failed to get app info:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  /**
   * Quit application
   */
  async quitApp(request?: QuitAppRequest): Promise<QuitAppResponse> {
    try {
      // Save current state before quitting
      await this.saveSession()
      await this.savePreferences()
      
      this.logger.info('Application quit requested')
      
      // Quit after a short delay to allow response to be sent
      setTimeout(() => {
        app.quit()
      }, 100)
      
      return {
        success: true
      }
    } catch (error) {
      this.logger.error('Failed to quit app:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  /**
   * Add file to current session
   */
  async addFileToSession(filePath: string, fileId: string): Promise<void> {
    const fileName = path.basename(filePath)
    
    // Check if file already exists in session
    const existingIndex = this.session.currentFiles.findIndex(f => f.path === filePath)
    
    if (existingIndex >= 0) {
      // Update existing file
      this.session.currentFiles[existingIndex] = {
        id: fileId,
        path: filePath,
        name: fileName,
        addedAt: new Date().toISOString()
      }
    } else {
      // Add new file
      this.session.currentFiles.push({
        id: fileId,
        path: filePath,
        name: fileName,
        addedAt: new Date().toISOString()
      })
    }
    
    await this.saveSession()
  }

  /**
   * Remove file from current session
   */
  async removeFileFromSession(filePath: string): Promise<void> {
    this.session.currentFiles = this.session.currentFiles.filter(f => f.path !== filePath)
    await this.saveSession()
  }

  /**
   * Update active job
   */
  async updateActiveJob(job: AppSession['activeJob']): Promise<void> {
    this.session.activeJob = job
    await this.saveSession()
  }

  /**
   * Add to conversion history
   */
  async addToHistory(jobId: string, inputPath: string, outputPath: string, success: boolean, error?: string): Promise<void> {
    this.session.conversionHistory.unshift({
      jobId,
      inputPath,
      outputPath,
      completedAt: new Date().toISOString(),
      success,
      error
    })
    
    // Keep only last 50 entries
    if (this.session.conversionHistory.length > 50) {
      this.session.conversionHistory = this.session.conversionHistory.slice(0, 50)
    }
    
    await this.saveSession()
  }

  /**
   * Private helper methods
   */
  private async ensureDataDirectory(): Promise<void> {
    try {
      await fs.access(this.dataDir)
    } catch {
      await fs.mkdir(this.dataDir, { recursive: true })
    }
  }

  private async loadSession(): Promise<void> {
    try {
      const data = await fs.readFile(this.sessionFile, 'utf-8')
      const loaded = JSON.parse(data) as AppSession
      this.session = { ...DEFAULT_SESSION, ...loaded }
    } catch {
      // File doesn't exist or is invalid, use defaults
      this.session = { ...DEFAULT_SESSION }
    }
  }

  private async saveSession(): Promise<void> {
    await fs.writeFile(this.sessionFile, JSON.stringify(this.session, null, 2), 'utf-8')
  }

  private async loadPreferences(): Promise<void> {
    try {
      const data = await fs.readFile(this.preferencesFile, 'utf-8')
      const loaded = JSON.parse(data) as UserPreferences
      this.preferences = { ...DEFAULT_PREFERENCES, ...loaded }
    } catch {
      // File doesn't exist or is invalid, use defaults
      this.preferences = { ...DEFAULT_PREFERENCES }
    }
  }

  private async savePreferences(): Promise<void> {
    await fs.writeFile(this.preferencesFile, JSON.stringify(this.preferences, null, 2), 'utf-8')
  }

  private validatePreferences(prefs: Partial<UserPreferences>): Partial<UserPreferences> {
    const validated: Partial<UserPreferences> = {}
    
    if (prefs.theme && ['light', 'dark', 'system'].includes(prefs.theme)) {
      validated.theme = prefs.theme
    }
    
    if (prefs.defaultQuality && ['low', 'medium', 'high', 'ultra'].includes(prefs.defaultQuality)) {
      validated.defaultQuality = prefs.defaultQuality
    }
    
    if (prefs.defaultFormat && ['mp4', 'avi', 'mkv', 'mov', 'wmv', 'webm'].includes(prefs.defaultFormat)) {
      validated.defaultFormat = prefs.defaultFormat
    }
    
    if (typeof prefs.autoStart === 'boolean') {
      validated.autoStart = prefs.autoStart
    }
    
    if (typeof prefs.notifications === 'boolean') {
      validated.notifications = prefs.notifications
    }
    
    if (typeof prefs.maxConcurrentJobs === 'number' && prefs.maxConcurrentJobs > 0 && prefs.maxConcurrentJobs <= 10) {
      validated.maxConcurrentJobs = prefs.maxConcurrentJobs
    }
    
    if (typeof prefs.outputDirectory === 'string') {
      validated.outputDirectory = prefs.outputDirectory
    }
    
    if (typeof prefs.preserveOriginalFiles === 'boolean') {
      validated.preserveOriginalFiles = prefs.preserveOriginalFiles
    }
    
    return validated
  }
}