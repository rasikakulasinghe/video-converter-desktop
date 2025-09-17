/**
 * File Operations IPC Handlers
 *
 * Handles IPC communication for file operations including file selection,
 * save location dialogs, and file validation.
 */

import { ipcMain } from 'electron'
import { FileOperationsService } from '../services/index.js'
import { IPC_CHANNELS } from '../../shared/index.js'
import type {
  IPCResponse,
  SelectFilesRequest,
  SelectFilesResponse,
  SaveLocationRequest,
  SaveLocationResponse,
  ValidateFileRequest,
  ValidateFileResponse
} from '../../shared/types/ipc-contracts.js'

/**
 * File Operations IPC Handlers Class
 */
export class FileOperationsHandlers {
  private fileService: FileOperationsService

  constructor() {
    this.fileService = FileOperationsService.getInstance()
    this.registerHandlers()
    console.log('File operations IPC handlers registered')
  }

  /**
   * Register all file operations IPC handlers
   */
  private registerHandlers(): void {
    // Register file:select handler
    ipcMain.handle(
      IPC_CHANNELS.FILE_SELECT,
      async (event, request?: SelectFilesRequest): Promise<SelectFilesResponse> => {
        try {
          console.log('📂 file:select handler called with request:', request)
          const result = await this.fileService.selectFiles(request)
          console.log('📂 file:select result:', result)
          return result
        } catch (error) {
          console.error('Error in file:select handler:', error)
          return {
            success: false,
            filePaths: [],
            error: error instanceof Error ? error.message : 'Unknown error'
          }
        }
      }
    )

    // Register file:validate handler
    ipcMain.handle(
      IPC_CHANNELS.FILE_VALIDATE,
      async (event, request: ValidateFileRequest): Promise<ValidateFileResponse> => {
        try {
          console.log('✅ file:validate handler called with request:', request)
          const result = await this.fileService.validateFile(request)
          console.log('✅ file:validate result:', result)
          return result
        } catch (error) {
          console.error('Error in file:validate handler:', error)
          return {
            isValid: false,
            error: error instanceof Error ? error.message : 'Unknown error'
          }
        }
      }
    )

    // Register file:save-location handler
    ipcMain.handle(
      IPC_CHANNELS.FILE_SAVE_LOCATION,
      async (event, request?: SaveLocationRequest): Promise<SaveLocationResponse> => {
        try {
          console.log('💾 file:save-location handler called with request:', request)
          const result = await this.fileService.selectSaveLocation(request)
          console.log('💾 file:save-location result:', result)
          return result
        } catch (error) {
          console.error('Error in file:save-location handler:', error)
          return {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
          }
        }
      }
    )
  }

  /**
   * Unregister all handlers (for cleanup)
   */
  public unregisterHandlers(): void {
    ipcMain.removeHandler(IPC_CHANNELS.FILE_SELECT)
    ipcMain.removeHandler(IPC_CHANNELS.FILE_SAVE_LOCATION)
    ipcMain.removeHandler(IPC_CHANNELS.FILE_VALIDATE)

    console.log('File operations IPC handlers unregistered')
  }

  /**
   * Get file service instance for testing
   */
  public getFileService(): FileOperationsService {
    return this.fileService
  }
}