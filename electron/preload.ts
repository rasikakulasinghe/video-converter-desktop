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
      return await ipcRenderer.invoke('file:select', request)
    },
    saveLocation: async (request?: SaveLocationRequest): Promise<SaveLocationResponse> => {
      return await ipcRenderer.invoke('file:save-location', request)
    },
    validate: async (request: ValidateFileRequest): Promise<ValidateFileResponse> => {
      return await ipcRenderer.invoke('file:validate', request)
    },
  },

  // Conversion Operations
  conversion: {
    start: async (request: StartConversionRequest): Promise<StartConversionResponse> => {
      const response = await ipcRenderer.invoke('conversion:start', request)
      return response.data || response
    },
    cancel: async (request: CancelConversionRequest): Promise<CancelConversionResponse> => {
      const response = await ipcRenderer.invoke('conversion:cancel', request)
      return response.data || response
    },
  },

  // App State Management
  app: {
    getSession: async (request?: GetSessionRequest): Promise<GetSessionResponse> => {
      const response = await ipcRenderer.invoke('app:get-session', request)
      return response.data || response
    },
    updateSession: async (request: UpdateSessionRequest): Promise<UpdateSessionResponse> => {
      const response = await ipcRenderer.invoke('app:update-session', request)
      return response.data || response
    },
    getPreferences: async (request?: GetPreferencesRequest): Promise<GetPreferencesResponse> => {
      const response = await ipcRenderer.invoke('app:get-preferences', request)
      return response.data || response
    },
    setPreferences: async (request: SetPreferencesRequest): Promise<SetPreferencesResponse> => {
      const response = await ipcRenderer.invoke('app:set-preferences', request)
      return response.data || response
    },
    info: async (request?: GetAppInfoRequest): Promise<GetAppInfoResponse> => {
      const response = await ipcRenderer.invoke('app:info', request)
      return response.data || response
    },
    quit: async (request?: QuitAppRequest): Promise<QuitAppResponse> => {
      const response = await ipcRenderer.invoke('app:quit', request)
      return response.data || response
    },
  },

  // System Integration
  system: {
    showInExplorer: async (request: ShowInExplorerRequest): Promise<ShowInExplorerResponse> => {
      const response = await ipcRenderer.invoke('system:show-in-explorer', request)
      return response.data || response
    },
    openExternal: async (request: OpenExternalRequest): Promise<OpenExternalResponse> => {
      const response = await ipcRenderer.invoke('system:open-external', request)
      return response.data || response
    },
  },

  // Diagnostic/Test API for troubleshooting
  test: {
    ping: async (): Promise<{ message: string; timestamp: string }> => {
      return await ipcRenderer.invoke('test:ping')
    },
    ipcStatus: async (): Promise<{
      totalHandlers: number;
      registeredChannels: string[];
      timestamp: string;
    }> => {
      return await ipcRenderer.invoke('test:ipc-status')
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
console.log('🚀 Preload script is executing...');
try {
  contextBridge.exposeInMainWorld('electronAPI', api);
  console.log('✅ electronAPI exposed via contextBridge');
} catch (error) {
  console.error('❌ contextBridge failed, falling back to window:', error);
  // @ts-expect-error (define in dts)
  window.electronAPI = api;
  console.log('✅ electronAPI set on window object');
}
