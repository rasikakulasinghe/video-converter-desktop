/**
 * App State Management IPC Handlers
 * 
 * Handles IPC communication for application state management including
 * session management, settings, and application preferences.
 */

import { ipcMain, BrowserWindow } from 'electron'
import { IPC_CHANNELS } from '../../shared/index.js'
import type {
  IPCResponse,
  GetSessionRequest,
  GetSessionResponse,
  UpdateSessionRequest,
  UpdateSessionResponse,
  GetSettingsRequest,
  GetSettingsResponse,
  UpdateSettingsRequest,
  UpdateSettingsResponse,
  AppStateChangedEvent
} from '../../shared/types/ipc-contracts.js'
import type { ApplicationState, AppSession, AppSettings } from '../../shared/types/application-state.js'
import { EventEmitter } from 'events'

/**
 * App State Service for managing application state
 */
class AppStateService extends EventEmitter {
  private static instance: AppStateService
  private currentSession: AppSession
  private settings: AppSettings
  private state: ApplicationState

  private constructor() {
    super()
    this.setMaxListeners(20) // Increase for test environments
    this.initializeState()
  }

  public static getInstance(): AppStateService {
    if (!AppStateService.instance) {
      AppStateService.instance = new AppStateService()
    }
    return AppStateService.instance
  }

  private initializeState(): void {
    // Initialize default session
    this.currentSession = {
      id: `session-${Date.now()}`,
      createdAt: new Date(),
      lastActivity: new Date(),
      activeFiles: [],
      recentFiles: [],
      activeJobs: []
    }

    // Initialize default settings
    this.settings = {
      theme: 'system',
      outputDirectory: '',
      defaultOutputFormat: 'mp4',
      quality: 'high',
      hardwareAcceleration: true,
      maxConcurrentJobs: 3,
      preserveMetadata: true,
      notifications: {
        enabled: true,
        onComplete: true,
        onError: true,
        sound: true
      },
      advanced: {
        ffmpegPath: '',
        customPresets: [],
        logLevel: 'info',
        tempDirectory: ''
      }
    }

    // Initialize application state
    this.state = {
      session: this.currentSession,
      settings: this.settings,
      isProcessing: false,
      lastError: null,
      version: '1.0.0'
    }
  }

  public async getSession(_request: GetSessionRequest): Promise<GetSessionResponse> {
    // Update last activity
    this.currentSession.lastActivity = new Date()
    
    return {
      session: this.currentSession
    }
  }

  public async updateSession(request: UpdateSessionRequest): Promise<UpdateSessionResponse> {
    const { updates } = request

    // Apply updates to session
    if (updates.activeFiles !== undefined) {
      this.currentSession.activeFiles = updates.activeFiles
    }
    if (updates.recentFiles !== undefined) {
      this.currentSession.recentFiles = updates.recentFiles
    }
    if (updates.activeJobs !== undefined) {
      this.currentSession.activeJobs = updates.activeJobs
    }

    // Update last activity
    this.currentSession.lastActivity = new Date()

    // Update state
    this.state.session = this.currentSession

    // Emit state change event
    this.emitStateChange()

    return {
      session: this.currentSession
    }
  }

  public async getSettings(_request: GetSettingsRequest): Promise<GetSettingsResponse> {
    return {
      settings: this.settings
    }
  }

  public async updateSettings(request: UpdateSettingsRequest): Promise<UpdateSettingsResponse> {
    const { updates } = request

    // Apply updates to settings
    this.settings = {
      ...this.settings,
      ...updates
    }

    // Deep merge notifications if provided
    if (updates.notifications) {
      this.settings.notifications = {
        ...this.settings.notifications,
        ...updates.notifications
      }
    }

    // Deep merge advanced settings if provided
    if (updates.advanced) {
      this.settings.advanced = {
        ...this.settings.advanced,
        ...updates.advanced
      }
    }

    // Update state
    this.state.settings = this.settings

    // Emit state change event
    this.emitStateChange()

    return {
      settings: this.settings
    }
  }

  public getApplicationState(): ApplicationState {
    return this.state
  }

  public setProcessingState(isProcessing: boolean): void {
    this.state.isProcessing = isProcessing
    this.emitStateChange()
  }

  public setLastError(error: string | null): void {
    this.state.lastError = error
    this.emitStateChange()
  }

  private emitStateChange(): void {
    this.emit('state-changed', this.state)
  }

  public addRecentFile(filePath: string): void {
    // Remove if already exists
    this.currentSession.recentFiles = this.currentSession.recentFiles.filter(path => path !== filePath)
    
    // Add to beginning
    this.currentSession.recentFiles.unshift(filePath)
    
    // Keep only last 10
    this.currentSession.recentFiles = this.currentSession.recentFiles.slice(0, 10)
    
    // Update state
    this.state.session = this.currentSession
    this.emitStateChange()
  }

  public addActiveJob(jobId: string): void {
    if (!this.currentSession.activeJobs.includes(jobId)) {
      this.currentSession.activeJobs.push(jobId)
      this.state.session = this.currentSession
      this.emitStateChange()
    }
  }

  public removeActiveJob(jobId: string): void {
    this.currentSession.activeJobs = this.currentSession.activeJobs.filter(id => id !== jobId)
    this.state.session = this.currentSession
    this.emitStateChange()
  }
}

/**
 * App State Management IPC Handlers Class
 */
export class AppStateHandlers {
  private appStateService: AppStateService

  constructor() {
    this.appStateService = AppStateService.getInstance()
    this.registerHandlers()
    this.setupEventListeners()
  }

  /**
   * Register all app state management IPC handlers
   */
  private registerHandlers(): void {
    // Register state:get-session handler
    ipcMain.handle(
      IPC_CHANNELS.STATE_GET_SESSION,
      async (event, request: GetSessionRequest): Promise<IPCResponse<GetSessionResponse>> => {
        try {
          const result = await this.appStateService.getSession(request)
          return {
            success: true,
            data: result
          }
        } catch (error) {
          console.error('Error in state:get-session handler:', error)
          return {
            success: false,
            error: `Get session failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
            details: error instanceof Error ? error.stack : undefined
          }
        }
      }
    )

    // Register state:update-session handler
    ipcMain.handle(
      IPC_CHANNELS.STATE_UPDATE_SESSION,
      async (event, request: UpdateSessionRequest): Promise<IPCResponse<UpdateSessionResponse>> => {
        try {
          const result = await this.appStateService.updateSession(request)
          return {
            success: true,
            data: result
          }
        } catch (error) {
          console.error('Error in state:update-session handler:', error)
          return {
            success: false,
            error: `Update session failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
            details: error instanceof Error ? error.stack : undefined
          }
        }
      }
    )

    // Register state:get-settings handler
    ipcMain.handle(
      IPC_CHANNELS.STATE_GET_SETTINGS,
      async (event, request: GetSettingsRequest): Promise<IPCResponse<GetSettingsResponse>> => {
        try {
          const result = await this.appStateService.getSettings(request)
          return {
            success: true,
            data: result
          }
        } catch (error) {
          console.error('Error in state:get-settings handler:', error)
          return {
            success: false,
            error: `Get settings failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
            details: error instanceof Error ? error.stack : undefined
          }
        }
      }
    )

    // Register state:update-settings handler
    ipcMain.handle(
      IPC_CHANNELS.STATE_UPDATE_SETTINGS,
      async (event, request: UpdateSettingsRequest): Promise<IPCResponse<UpdateSettingsResponse>> => {
        try {
          const result = await this.appStateService.updateSettings(request)
          return {
            success: true,
            data: result
          }
        } catch (error) {
          console.error('Error in state:update-settings handler:', error)
          return {
            success: false,
            error: `Update settings failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
            details: error instanceof Error ? error.stack : undefined
          }
        }
      }
    )

    // Legacy handlers for backwards compatibility with tests
    ipcMain.handle(
      IPC_CHANNELS.APP_GET_PREFERENCES,
      async (event, request: GetSettingsRequest): Promise<IPCResponse<GetSettingsResponse>> => {
        try {
          const result = await this.appStateService.getSettings(request)
          return {
            success: true,
            data: result
          }
        } catch (error) {
          console.error('Error in app:get-preferences handler:', error)
          return {
            success: false,
            error: `Get preferences failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
            details: error instanceof Error ? error.stack : undefined
          }
        }
      }
    )

    ipcMain.handle(
      IPC_CHANNELS.APP_SET_PREFERENCES,
      async (event, request: UpdateSettingsRequest): Promise<IPCResponse<UpdateSettingsResponse>> => {
        try {
          const result = await this.appStateService.updateSettings(request)
          return {
            success: true,
            data: result
          }
        } catch (error) {
          console.error('Error in app:set-preferences handler:', error)
          return {
            success: false,
            error: `Set preferences failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
            details: error instanceof Error ? error.stack : undefined
          }
        }
      }
    )

    console.log('App state management IPC handlers registered')
  }

  /**
   * Setup event listeners to relay state changes to renderer processes
   */
  private setupEventListeners(): void {
    // State changed event
    this.appStateService.on('state-changed', (state: ApplicationState) => {
      const event: AppStateChangedEvent = {
        state
      }
      this.sendToAllWindows(IPC_CHANNELS.STATE_CHANGED, event)
    })

    console.log('App state service event listeners registered')
  }

  /**
   * Send event to all renderer windows
   */
  private sendToAllWindows(channel: string, data: unknown): void {
    const windows = BrowserWindow.getAllWindows()
    windows.forEach(window => {
      if (!window.isDestroyed()) {
        window.webContents.send(channel, data)
      }
    })
  }

  /**
   * Unregister all handlers and event listeners (for cleanup)
   */
  public unregisterHandlers(): void {
    // Remove IPC handlers
    ipcMain.removeHandler(IPC_CHANNELS.STATE_GET_SESSION)
    ipcMain.removeHandler(IPC_CHANNELS.STATE_UPDATE_SESSION)
    ipcMain.removeHandler(IPC_CHANNELS.STATE_GET_SETTINGS)
    ipcMain.removeHandler(IPC_CHANNELS.STATE_UPDATE_SETTINGS)
    
    // Remove legacy handlers
    ipcMain.removeHandler(IPC_CHANNELS.APP_GET_PREFERENCES)
    ipcMain.removeHandler(IPC_CHANNELS.APP_SET_PREFERENCES)

    // Remove all event listeners
    this.appStateService.removeAllListeners()
    
    console.log('App state management IPC handlers unregistered')
  }

  /**
   * Get app state service instance for testing
   */
  public getAppStateService(): AppStateService {
    return this.appStateService
  }

  /**
   * Get current application state
   */
  public getApplicationState(): ApplicationState {
    return this.appStateService.getApplicationState()
  }

  /**
   * Helper methods for state management
   */
  public setProcessingState(isProcessing: boolean): void {
    this.appStateService.setProcessingState(isProcessing)
  }

  public setLastError(error: string | null): void {
    this.appStateService.setLastError(error)
  }

  public addRecentFile(filePath: string): void {
    this.appStateService.addRecentFile(filePath)
  }

  public addActiveJob(jobId: string): void {
    this.appStateService.addActiveJob(jobId)
  }

  public removeActiveJob(jobId: string): void {
    this.appStateService.removeActiveJob(jobId)
  }
}