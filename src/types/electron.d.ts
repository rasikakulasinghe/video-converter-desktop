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
} from '../../shared/types/ipc-contracts'

export interface IElectronAPI {
  // File Operations
  file: {
    select: (request?: SelectFilesRequest) => Promise<SelectFilesResponse>;
    saveLocation: (request?: SaveLocationRequest) => Promise<SaveLocationResponse>;
    validate: (request: ValidateFileRequest) => Promise<ValidateFileResponse>;
  };

  // Conversion Operations
  conversion: {
    start: (request: StartConversionRequest) => Promise<StartConversionResponse>;
    cancel: (request: CancelConversionRequest) => Promise<CancelConversionResponse>;
  };

  // App State Management
  app: {
    getSession: (request?: GetSessionRequest) => Promise<GetSessionResponse>;
    updateSession: (request: UpdateSessionRequest) => Promise<UpdateSessionResponse>;
    getPreferences: (request?: GetPreferencesRequest) => Promise<GetPreferencesResponse>;
    setPreferences: (request: SetPreferencesRequest) => Promise<SetPreferencesResponse>;
    info: (request?: GetAppInfoRequest) => Promise<GetAppInfoResponse>;
    quit: (request?: QuitAppRequest) => Promise<QuitAppResponse>;
  };

  // System Integration
  system: {
    showInExplorer: (request: ShowInExplorerRequest) => Promise<ShowInExplorerResponse>;
    openExternal: (request: OpenExternalRequest) => Promise<OpenExternalResponse>;
  };

  // Event Listeners
  on: {
    conversionProgress: (callback: (progress: ProgressEvent) => void) => () => void;
    conversionComplete: (callback: (result: CompletedEvent) => void) => () => void;
    conversionError: (callback: (error: FailedEvent) => void) => () => void;
    stateChanged: (callback: (state: AppStateChangedEvent) => void) => () => void;
  };

  // Platform information
  platform: string;
  versions: {
    node: string;
    chrome: string;
    electron: string;
  };
}

declare global {
  interface Window {
    electronAPI: IElectronAPI;
  }
}