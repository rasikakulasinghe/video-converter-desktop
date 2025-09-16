import { contextBridge, ipcRenderer } from 'electron';
import type {
  SelectFilesRequest,
  SelectFilesResponse,
  SaveLocationRequest,
  SaveLocationResponse,
  ValidateFileRequest,
  ValidateFileResponse,
  StartConversionRequest,
  StartConversionResponse,
  CancelConversionRequest,
  CancelConversionResponse,
  GetSessionRequest,
  GetSessionResponse,
  UpdateSessionRequest,
  UpdateSessionResponse,
  GetPreferencesRequest,
  GetPreferencesResponse,
  SetPreferencesRequest,
  SetPreferencesResponse,
  ShowInExplorerRequest,
  ShowInExplorerResponse,
  OpenExternalRequest,
  OpenExternalResponse,
  GetAppInfoRequest,
  GetAppInfoResponse,
  QuitAppRequest,
  QuitAppResponse,
  ProgressEvent,
  CompletedEvent,
  FailedEvent,
  AppStateChangedEvent
} from '../shared/types/ipc-contracts.js'

// Secure API interface for renderer process
const api = {
  // File Operations
  file: {
    select: async (request?: SelectFilesRequest): Promise<SelectFilesResponse> => {
      const response = await ipcRenderer.invoke('file:select', request)
      return response.success ? response.data : { success: false, filePaths: [] }
    },
    saveLocation: async (request?: SaveLocationRequest): Promise<SaveLocationResponse> => {
      const response = await ipcRenderer.invoke('file:save-location', request)
      return response.success ? response.data : { success: false }
    },
    validate: async (request: ValidateFileRequest): Promise<ValidateFileResponse> => {
      const response = await ipcRenderer.invoke('file:validate', request)
      return response.success ? response.data : { isValid: false, error: 'Validation failed' }
    },
  },

  // Conversion Operations
  conversion: {
    start: async (request: StartConversionRequest): Promise<StartConversionResponse> => {
      const response = await ipcRenderer.invoke('conversion:start', request)
      return response.success ? response.data : { success: false }
    },
    cancel: async (request: CancelConversionRequest): Promise<CancelConversionResponse> => {
      const response = await ipcRenderer.invoke('conversion:cancel', request)
      return response.success ? response.data : { success: false }
    },
  },

  // App State Management
  app: {
    getSession: async (request?: GetSessionRequest): Promise<GetSessionResponse> => {
      const response = await ipcRenderer.invoke('app:get-session', request)
      return response.success ? response.data : { 
        session: { 
          id: '', 
          createdAt: new Date(), 
          lastActivity: new Date(), 
          activeFiles: [], 
          recentFiles: [], 
          activeJobs: [] 
        } 
      }
    },
    updateSession: async (request: UpdateSessionRequest): Promise<UpdateSessionResponse> => {
      const response = await ipcRenderer.invoke('app:update-session', request)
      return response.success ? response.data : { 
        session: { 
          id: '', 
          createdAt: new Date(), 
          lastActivity: new Date(), 
          activeFiles: [], 
          recentFiles: [], 
          activeJobs: [] 
        } 
      }
    },
    getPreferences: async (request?: GetPreferencesRequest): Promise<GetPreferencesResponse> => {
      const response = await ipcRenderer.invoke('app:get-preferences', request)
      return response.success ? response.data : {
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
    },
    setPreferences: async (request: SetPreferencesRequest): Promise<SetPreferencesResponse> => {
      const response = await ipcRenderer.invoke('app:set-preferences', request)
      return response.success ? response.data : { success: false, requiresRestart: false }
    },
    info: async (request?: GetAppInfoRequest): Promise<GetAppInfoResponse> => {
      const response = await ipcRenderer.invoke('app:info', request)
      return response.success ? response.data : { 
        appInfo: { 
          name: '', 
          version: '', 
          description: '', 
          author: '', 
          homepage: '', 
          license: '',
          buildDate: '',
          commitHash: '',
          environment: ''
        } 
      }
    },
    quit: async (request?: QuitAppRequest): Promise<QuitAppResponse> => {
      const response = await ipcRenderer.invoke('app:quit', request)
      return response.success ? response.data : { success: false }
    },
  },

  // System Integration
  system: {
    showInExplorer: async (request: ShowInExplorerRequest): Promise<ShowInExplorerResponse> => {
      const response = await ipcRenderer.invoke('system:show-in-explorer', request)
      return response.success ? response.data : { success: false }
    },
    openExternal: async (request: OpenExternalRequest): Promise<OpenExternalResponse> => {
      const response = await ipcRenderer.invoke('system:open-external', request)
      return response.success ? response.data : { success: false }
    },
  },

  // Event Listeners
  on: {
    conversionProgress: (callback: (progress: ProgressEvent) => void) => {
      ipcRenderer.on('conversion:progress', (_event, progress) => callback(progress))
      return () => ipcRenderer.removeAllListeners('conversion:progress')
    },
    conversionComplete: (callback: (result: CompletedEvent) => void) => {
      ipcRenderer.on('conversion:complete', (_event, result) => callback(result))
      return () => ipcRenderer.removeAllListeners('conversion:complete')
    },
    conversionError: (callback: (error: FailedEvent) => void) => {
      ipcRenderer.on('conversion:error', (_event, error) => callback(error))
      return () => ipcRenderer.removeAllListeners('conversion:error')
    },
    stateChanged: (callback: (state: AppStateChangedEvent) => void) => {
      ipcRenderer.on('app:state-changed', (_event, state) => callback(state))
      return () => ipcRenderer.removeAllListeners('app:state-changed')
    },
  },

  // Platform information (read-only)
  platform: process.platform,

  // Version information (read-only)
  versions: {
    node: process.versions.node,
    chrome: process.versions.chrome,
    electron: process.versions.electron
  }
};

// Use `contextBridge` APIs to expose Electron APIs to
// renderer only if context isolation is enabled, otherwise
// just add to the DOM global.
try {
  contextBridge.exposeInMainWorld('electronAPI', api);
} catch (error) {
  console.error(error);
  // @ts-expect-error (define in dts)
  window.electronAPI = api;
}