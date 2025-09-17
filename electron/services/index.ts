/**
 * Services Index
 * 
 * Central export point for all main process services
 */

export { FileOperationsService } from './file-operations.service.js'
export { ConversionService } from './conversion.service.js'
export { AppStateService } from './app-state.service.js'
export { SystemIntegrationService } from './system-integration.service.js'
export { LoggingService } from './logging.service.js'

// Export types for consumers
export type {
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
  GetJobsRequest,
  GetJobsResponse,
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
  QuitAppResponse,
  ShowInExplorerRequest,
  ShowInExplorerResponse,
  OpenExternalRequest,
  OpenExternalResponse
} from '../../shared/types/ipc-contracts.js'