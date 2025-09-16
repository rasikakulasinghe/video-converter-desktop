/**
 * System Integration and App Lifecycle IPC Handlers
 * 
 * Handles IPC communication for system integration operations and
 * application lifecycle management including power management,
 * system info, app control, and process management.
 */

import { ipcMain, BrowserWindow, app, powerSaveBlocker } from 'electron'
import { execSync } from 'child_process'
import { IPC_CHANNELS } from '../../shared/index.js'
import type {
  IPCResponse,
  GetSystemInfoRequest,
  GetSystemInfoResponse,
  TogglePowerSaveBlockerRequest,
  TogglePowerSaveBlockerResponse,
  OpenExternalRequest,
  OpenExternalResponse,
  ShowInExplorerRequest,
  ShowInExplorerResponse,
  RestartAppRequest,
  RestartAppResponse,
  QuitAppRequest,
  QuitAppResponse,
  CheckForUpdatesRequest,
  CheckForUpdatesResponse,
  GetAppInfoRequest,
  GetAppInfoResponse,
  ClearCacheRequest,
  ClearCacheResponse,
  GetLogsRequest,
  GetLogsResponse,
  AppLifecycleEvent
} from '../../shared/types/ipc-contracts.js'
import { EventEmitter } from 'events'

/**
 * System Integration Service for system operations
 */
class SystemIntegrationService extends EventEmitter {
  private static instance: SystemIntegrationService
  private powerSaveBlockerId: number | null = null
  private shutdownState = false

  private constructor() {
    super()
    this.setMaxListeners(20) // Increase for test environments
    this.setupAppEventListeners()
  }

  public static getInstance(): SystemIntegrationService {
    if (!SystemIntegrationService.instance) {
      SystemIntegrationService.instance = new SystemIntegrationService()
    }
    return SystemIntegrationService.instance
  }

  private setupAppEventListeners(): void {
    // App lifecycle events
    app.on('before-quit', () => {
      this.shutdownState = true
      this.emit('app-before-quit')
    })

    app.on('will-quit', () => {
      this.emit('app-will-quit')
    })

    app.on('window-all-closed', () => {
      this.emit('app-window-all-closed')
    })

    app.on('activate', () => {
      this.emit('app-activate')
    })

    // System events
    app.on('browser-window-created', (event, window) => {
      this.emit('app-window-created', window.id)
    })

    app.on('browser-window-focus', (event, window) => {
      this.emit('app-window-focus', window.id)
    })

    app.on('browser-window-blur', (event, window) => {
      this.emit('app-window-blur', window.id)
    })
  }

  public async getSystemInfo(_request: GetSystemInfoRequest): Promise<GetSystemInfoResponse> {
    try {
      const platform = process.platform
      const arch = process.arch
      const nodeVersion = process.version
      const electronVersion = process.versions.electron
      const chromeVersion = process.versions.chrome
      const v8Version = process.versions.v8

      // Get memory info
      const memoryUsage = process.memoryUsage()
      
      // Get CPU info
      let cpuInfo = ''
      try {
        if (platform === 'win32') {
          cpuInfo = execSync('wmic cpu get name /value', { encoding: 'utf8' })
            .split('\n')
            .find(line => line.includes('Name='))
            ?.replace('Name=', '')
            .trim() || 'Unknown'
        } else if (platform === 'darwin') {
          cpuInfo = execSync('sysctl -n machdep.cpu.brand_string', { encoding: 'utf8' }).trim()
        } else {
          cpuInfo = execSync('cat /proc/cpuinfo | grep "model name" | head -1', { encoding: 'utf8' })
            .split(':')[1]?.trim() || 'Unknown'
        }
      } catch {
        cpuInfo = 'Unknown'
      }

      // Get total memory
      let totalMemory = 0
      try {
        if (platform === 'win32') {
          const memInfo = execSync('wmic computersystem get TotalPhysicalMemory /value', { encoding: 'utf8' })
          const match = memInfo.match(/TotalPhysicalMemory=(\d+)/)
          if (match) {
            totalMemory = parseInt(match[1]) / (1024 * 1024 * 1024) // Convert to GB
          }
        } else if (platform === 'darwin') {
          const memInfo = execSync('sysctl hw.memsize', { encoding: 'utf8' })
          const match = memInfo.match(/hw\.memsize: (\d+)/)
          if (match) {
            totalMemory = parseInt(match[1]) / (1024 * 1024 * 1024) // Convert to GB
          }
        } else {
          const memInfo = execSync('cat /proc/meminfo | grep MemTotal', { encoding: 'utf8' })
          const match = memInfo.match(/MemTotal:\s+(\d+)\s+kB/)
          if (match) {
            totalMemory = parseInt(match[1]) / (1024 * 1024) // Convert to GB
          }
        }
      } catch {
        totalMemory = 0
      }

      return {
        systemInfo: {
          platform,
          arch,
          nodeVersion,
          electronVersion,
          chromeVersion,
          v8Version,
          cpuInfo,
          totalMemory: Math.round(totalMemory * 100) / 100, // Round to 2 decimal places
          appMemoryUsage: {
            rss: Math.round(memoryUsage.rss / (1024 * 1024) * 100) / 100, // MB
            heapTotal: Math.round(memoryUsage.heapTotal / (1024 * 1024) * 100) / 100, // MB
            heapUsed: Math.round(memoryUsage.heapUsed / (1024 * 1024) * 100) / 100, // MB
            external: Math.round(memoryUsage.external / (1024 * 1024) * 100) / 100 // MB
          }
        }
      }
    } catch (error) {
      throw new Error(`Failed to get system info: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  public async togglePowerSaveBlocker(request: TogglePowerSaveBlockerRequest): Promise<TogglePowerSaveBlockerResponse> {
    const { enable, type = 'prevent-display-sleep' } = request

    try {
      if (enable) {
        if (this.powerSaveBlockerId === null) {
          this.powerSaveBlockerId = powerSaveBlocker.start(type)
        }
      } else {
        if (this.powerSaveBlockerId !== null) {
          powerSaveBlocker.stop(this.powerSaveBlockerId)
          this.powerSaveBlockerId = null
        }
      }

      const isActive = this.powerSaveBlockerId !== null && powerSaveBlocker.isStarted(this.powerSaveBlockerId)

      return {
        isActive,
        blockerId: this.powerSaveBlockerId
      }
    } catch (error) {
      throw new Error(`Failed to toggle power save blocker: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  public async openExternal(request: OpenExternalRequest): Promise<OpenExternalResponse> {
    const { url } = request

    try {
      const { shell } = await import('electron')
      await shell.openExternal(url)

      return {
        success: true
      }
    } catch (error) {
      throw new Error(`Failed to open external URL: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  public async showInFolder(request: ShowInExplorerRequest): Promise<ShowInExplorerResponse> {
    const { filePath } = request

    try {
      const { shell } = await import('electron')
      shell.showItemInFolder(filePath)

      return {
        success: true
      }
    } catch (error) {
      throw new Error(`Failed to show item in folder: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  public async restartApp(_request: RestartAppRequest): Promise<RestartAppResponse> {
    try {
      // Close all conversion jobs gracefully
      this.emit('app-restart-requested')

      // Wait a bit for cleanup
      setTimeout(() => {
        app.relaunch()
        app.exit(0)
      }, 1000)

      return {
        success: true
      }
    } catch (error) {
      throw new Error(`Failed to restart app: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  public async quitApp(request: QuitAppRequest): Promise<QuitAppResponse> {
    const { force = false } = request

    try {
      if (force) {
        app.exit(0)
      } else {
        // Emit quit requested event for graceful shutdown
        this.emit('app-quit-requested')
        
        // Wait a bit for cleanup then quit
        setTimeout(() => {
          app.quit()
        }, 1000)
      }

      return {
        success: true
      }
    } catch (error) {
      throw new Error(`Failed to quit app: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  public async checkForUpdates(_request: CheckForUpdatesRequest): Promise<CheckForUpdatesResponse> {
    try {
      // Placeholder for update checking logic
      // In a real app, this would integrate with electron-updater or similar
      
      return {
        hasUpdate: false,
        currentVersion: app.getVersion(),
        latestVersion: app.getVersion(),
        releaseNotes: '',
        downloadUrl: ''
      }
    } catch (error) {
      throw new Error(`Failed to check for updates: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  public async getAppInfo(_request: GetAppInfoRequest): Promise<GetAppInfoResponse> {
    try {
      return {
        appInfo: {
          name: app.getName(),
          version: app.getVersion(),
          description: 'Desktop Video Converter',
          author: 'Video Converter Team',
          homepage: 'https://github.com/video-converter/desktop',
          license: 'MIT',
          buildDate: new Date().toISOString(), // In real app, this would be build time
          commitHash: 'dev', // In real app, this would be git commit hash
          environment: process.env.NODE_ENV || 'development'
        }
      }
    } catch (error) {
      throw new Error(`Failed to get app info: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  public async clearCache(request: ClearCacheRequest): Promise<ClearCacheResponse> {
    const { type = 'all' } = request

    try {
      const windows = BrowserWindow.getAllWindows()
      const clearedSize = 0

      for (const window of windows) {
        if (!window.isDestroyed()) {
          const session = window.webContents.session
          
          if (type === 'all' || type === 'storage') {
            await session.clearStorageData()
          }
          
          if (type === 'all' || type === 'cache') {
            await session.clearCache()
          }
          
          if (type === 'all' || type === 'cookies') {
            await session.clearAuthCache()
          }
        }
      }

      return {
        success: true,
        clearedSize
      }
    } catch (error) {
      throw new Error(`Failed to clear cache: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  public async getLogs(request: GetLogsRequest): Promise<GetLogsResponse> {
    const { lines = 100 } = request

    try {
      // Placeholder for log retrieval
      // In a real app, this would read from log files
      const logs = [
        `[${new Date().toISOString()}] INFO: Application started`,
        `[${new Date().toISOString()}] INFO: Services initialized`,
        `[${new Date().toISOString()}] INFO: IPC handlers registered`
      ]

      return {
        logs: logs.slice(-lines)
      }
    } catch (error) {
      throw new Error(`Failed to get logs: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  public getShutdownState(): boolean {
    return this.shutdownState
  }

  public getPowerSaveBlockerStatus(): { isActive: boolean; blockerId: number | null } {
    const isActive = this.powerSaveBlockerId !== null && powerSaveBlocker.isStarted(this.powerSaveBlockerId)
    return {
      isActive,
      blockerId: this.powerSaveBlockerId
    }
  }
}

/**
 * System Integration and App Lifecycle IPC Handlers Class
 */
export class SystemIntegrationHandlers {
  private systemService: SystemIntegrationService

  constructor() {
    this.systemService = SystemIntegrationService.getInstance()
    this.registerHandlers()
    this.setupEventListeners()
  }

  /**
   * Register all system integration and app lifecycle IPC handlers
   */
  private registerHandlers(): void {
    // System info handlers
    ipcMain.handle(
      IPC_CHANNELS.SYSTEM_GET_INFO,
      async (event, request: GetSystemInfoRequest): Promise<IPCResponse<GetSystemInfoResponse>> => {
        try {
          const result = await this.systemService.getSystemInfo(request)
          return {
            success: true,
            data: result
          }
        } catch (error) {
          console.error('Error in system:get-info handler:', error)
          return {
            success: false,
            error: `Get system info failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
            details: error instanceof Error ? error.stack : undefined
          }
        }
      }
    )

    // Power save blocker handlers
    ipcMain.handle(
      IPC_CHANNELS.SYSTEM_TOGGLE_POWER_SAVE_BLOCKER,
      async (event, request: TogglePowerSaveBlockerRequest): Promise<IPCResponse<TogglePowerSaveBlockerResponse>> => {
        try {
          const result = await this.systemService.togglePowerSaveBlocker(request)
          return {
            success: true,
            data: result
          }
        } catch (error) {
          console.error('Error in system:toggle-power-save-blocker handler:', error)
          return {
            success: false,
            error: `Toggle power save blocker failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
            details: error instanceof Error ? error.stack : undefined
          }
        }
      }
    )

    // External operations handlers
    ipcMain.handle(
      IPC_CHANNELS.SYSTEM_OPEN_EXTERNAL,
      async (event, request: OpenExternalRequest): Promise<IPCResponse<OpenExternalResponse>> => {
        try {
          const result = await this.systemService.openExternal(request)
          return {
            success: true,
            data: result
          }
        } catch (error) {
          console.error('Error in system:open-external handler:', error)
          return {
            success: false,
            error: `Open external failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
            details: error instanceof Error ? error.stack : undefined
          }
        }
      }
    )

    ipcMain.handle(
      IPC_CHANNELS.SYSTEM_SHOW_IN_FOLDER,
      async (event, request: ShowInExplorerRequest): Promise<IPCResponse<ShowInExplorerResponse>> => {
        try {
          const result = await this.systemService.showInFolder(request)
          return {
            success: true,
            data: result
          }
        } catch (error) {
          console.error('Error in system:show-in-folder handler:', error)
          return {
            success: false,
            error: `Show in folder failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
            details: error instanceof Error ? error.stack : undefined
          }
        }
      }
    )

    // App lifecycle handlers
    ipcMain.handle(
      IPC_CHANNELS.APP_RESTART,
      async (event, request: RestartAppRequest): Promise<IPCResponse<RestartAppResponse>> => {
        try {
          const result = await this.systemService.restartApp(request)
          return {
            success: true,
            data: result
          }
        } catch (error) {
          console.error('Error in app:restart handler:', error)
          return {
            success: false,
            error: `Restart app failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
            details: error instanceof Error ? error.stack : undefined
          }
        }
      }
    )

    ipcMain.handle(
      IPC_CHANNELS.APP_QUIT,
      async (event, request: QuitAppRequest): Promise<IPCResponse<QuitAppResponse>> => {
        try {
          const result = await this.systemService.quitApp(request)
          return {
            success: true,
            data: result
          }
        } catch (error) {
          console.error('Error in app:quit handler:', error)
          return {
            success: false,
            error: `Quit app failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
            details: error instanceof Error ? error.stack : undefined
          }
        }
      }
    )

    ipcMain.handle(
      IPC_CHANNELS.APP_CHECK_FOR_UPDATES,
      async (event, request: CheckForUpdatesRequest): Promise<IPCResponse<CheckForUpdatesResponse>> => {
        try {
          const result = await this.systemService.checkForUpdates(request)
          return {
            success: true,
            data: result
          }
        } catch (error) {
          console.error('Error in app:check-for-updates handler:', error)
          return {
            success: false,
            error: `Check for updates failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
            details: error instanceof Error ? error.stack : undefined
          }
        }
      }
    )

    ipcMain.handle(
      IPC_CHANNELS.APP_GET_INFO,
      async (event, request: GetAppInfoRequest): Promise<IPCResponse<GetAppInfoResponse>> => {
        try {
          const result = await this.systemService.getAppInfo(request)
          return {
            success: true,
            data: result
          }
        } catch (error) {
          console.error('Error in app:get-info handler:', error)
          return {
            success: false,
            error: `Get app info failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
            details: error instanceof Error ? error.stack : undefined
          }
        }
      }
    )

    ipcMain.handle(
      IPC_CHANNELS.APP_CLEAR_CACHE,
      async (event, request: ClearCacheRequest): Promise<IPCResponse<ClearCacheResponse>> => {
        try {
          const result = await this.systemService.clearCache(request)
          return {
            success: true,
            data: result
          }
        } catch (error) {
          console.error('Error in app:clear-cache handler:', error)
          return {
            success: false,
            error: `Clear cache failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
            details: error instanceof Error ? error.stack : undefined
          }
        }
      }
    )

    ipcMain.handle(
      IPC_CHANNELS.APP_GET_LOGS,
      async (event, request: GetLogsRequest): Promise<IPCResponse<GetLogsResponse>> => {
        try {
          const result = await this.systemService.getLogs(request)
          return {
            success: true,
            data: result
          }
        } catch (error) {
          console.error('Error in app:get-logs handler:', error)
          return {
            success: false,
            error: `Get logs failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
            details: error instanceof Error ? error.stack : undefined
          }
        }
      }
    )

    // Legacy handlers for backwards compatibility with tests
    ipcMain.handle(
      IPC_CHANNELS.SYSTEM_SHOW_IN_EXPLORER,
      async (event, request: ShowInExplorerRequest): Promise<IPCResponse<ShowInExplorerResponse>> => {
        try {
          const result = await this.systemService.showInFolder(request)
          return {
            success: true,
            data: result
          }
        } catch (error) {
          console.error('Error in system:show-in-explorer handler:', error)
          return {
            success: false,
            error: `Show in explorer failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
            details: error instanceof Error ? error.stack : undefined
          }
        }
      }
    )

    ipcMain.handle(
      IPC_CHANNELS.APP_INFO,
      async (event, request: GetAppInfoRequest): Promise<IPCResponse<GetAppInfoResponse>> => {
        try {
          const result = await this.systemService.getAppInfo(request)
          return {
            success: true,
            data: result
          }
        } catch (error) {
          console.error('Error in app:info handler:', error)
          return {
            success: false,
            error: `Get app info failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
            details: error instanceof Error ? error.stack : undefined
          }
        }
      }
    )

    console.log('System integration and app lifecycle IPC handlers registered')
  }

  /**
   * Setup event listeners to relay system events to renderer processes
   */
  private setupEventListeners(): void {
    // App lifecycle events
    this.systemService.on('app-before-quit', () => {
      const event: AppLifecycleEvent = {
        type: 'before-quit'
      }
      this.sendToAllWindows(IPC_CHANNELS.APP_LIFECYCLE_EVENT, event)
    })

    this.systemService.on('app-will-quit', () => {
      const event: AppLifecycleEvent = {
        type: 'will-quit'
      }
      this.sendToAllWindows(IPC_CHANNELS.APP_LIFECYCLE_EVENT, event)
    })

    this.systemService.on('app-window-all-closed', () => {
      const event: AppLifecycleEvent = {
        type: 'window-all-closed'
      }
      this.sendToAllWindows(IPC_CHANNELS.APP_LIFECYCLE_EVENT, event)
    })

    this.systemService.on('app-activate', () => {
      const event: AppLifecycleEvent = {
        type: 'activate'
      }
      this.sendToAllWindows(IPC_CHANNELS.APP_LIFECYCLE_EVENT, event)
    })

    this.systemService.on('app-window-created', (windowId: number) => {
      const event: AppLifecycleEvent = {
        type: 'window-created',
        data: { windowId }
      }
      this.sendToAllWindows(IPC_CHANNELS.APP_LIFECYCLE_EVENT, event)
    })

    this.systemService.on('app-window-focus', (windowId: number) => {
      const event: AppLifecycleEvent = {
        type: 'window-focus',
        data: { windowId }
      }
      this.sendToAllWindows(IPC_CHANNELS.APP_LIFECYCLE_EVENT, event)
    })

    this.systemService.on('app-window-blur', (windowId: number) => {
      const event: AppLifecycleEvent = {
        type: 'window-blur',
        data: { windowId }
      }
      this.sendToAllWindows(IPC_CHANNELS.APP_LIFECYCLE_EVENT, event)
    })

    this.systemService.on('app-restart-requested', () => {
      const event: AppLifecycleEvent = {
        type: 'restart-requested'
      }
      this.sendToAllWindows(IPC_CHANNELS.APP_LIFECYCLE_EVENT, event)
    })

    this.systemService.on('app-quit-requested', () => {
      const event: AppLifecycleEvent = {
        type: 'quit-requested'
      }
      this.sendToAllWindows(IPC_CHANNELS.APP_LIFECYCLE_EVENT, event)
    })

    console.log('System integration service event listeners registered')
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
    ipcMain.removeHandler(IPC_CHANNELS.SYSTEM_GET_INFO)
    ipcMain.removeHandler(IPC_CHANNELS.SYSTEM_TOGGLE_POWER_SAVE_BLOCKER)
    ipcMain.removeHandler(IPC_CHANNELS.SYSTEM_OPEN_EXTERNAL)
    ipcMain.removeHandler(IPC_CHANNELS.SYSTEM_SHOW_IN_FOLDER)
    ipcMain.removeHandler(IPC_CHANNELS.APP_RESTART)
    ipcMain.removeHandler(IPC_CHANNELS.APP_QUIT)
    ipcMain.removeHandler(IPC_CHANNELS.APP_CHECK_FOR_UPDATES)
    ipcMain.removeHandler(IPC_CHANNELS.APP_GET_INFO)
    ipcMain.removeHandler(IPC_CHANNELS.APP_CLEAR_CACHE)
    ipcMain.removeHandler(IPC_CHANNELS.APP_GET_LOGS)
    
    // Remove legacy handlers
    ipcMain.removeHandler(IPC_CHANNELS.SYSTEM_SHOW_IN_EXPLORER)
    ipcMain.removeHandler(IPC_CHANNELS.APP_INFO)

    // Remove all event listeners
    this.systemService.removeAllListeners()
    
    console.log('System integration and app lifecycle IPC handlers unregistered')
  }

  /**
   * Get system service instance for testing
   */
  public getSystemService(): SystemIntegrationService {
    return this.systemService
  }

  /**
   * Get power save blocker status
   */
  public getPowerSaveBlockerStatus(): { isActive: boolean; blockerId: number | null } {
    return this.systemService.getPowerSaveBlockerStatus()
  }

  /**
   * Check if app is shutting down
   */
  public isShuttingDown(): boolean {
    return this.systemService.getShutdownState()
  }
}