/**
 * Services Index
 * 
 * Central export point for all main process services
 */

export { FileOperationsService } from './file-operations.service.js'
export { ConversionService } from './conversion.service.js'

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
  GetJobsResponse
} from '../../shared/types/ipc-contracts.js'