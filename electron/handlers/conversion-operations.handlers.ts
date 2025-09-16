/**
 * Conversion Operations IPC Handlers
 * 
 * Handles IPC communication for video conversion operations including
 * starting conversions, cancelling jobs, and retrieving job status.
 */

import { ipcMain, BrowserWindow } from 'electron'
import { ConversionService } from '../services/index.js'
import { IPC_CHANNELS } from '../../shared/index.js'
import type {
  IPCResponse,
  StartConversionRequest,
  StartConversionResponse,
  CancelConversionRequest,
  CancelConversionResponse,
  GetJobsRequest,
  GetJobsResponse,
  ProgressEvent,
  StartedEvent,
  CompletedEvent,
  FailedEvent,
  CancelledEvent
} from '../../shared/types/ipc-contracts.js'
import type { ConversionJob } from '../../shared/types/conversion-job.js'

/**
 * Conversion Operations IPC Handlers Class
 */
export class ConversionOperationsHandlers {
  private conversionService: ConversionService

  constructor() {
    this.conversionService = ConversionService.getInstance()
    this.registerHandlers()
    this.setupEventListeners()
  }

  /**
   * Register all conversion operations IPC handlers
   */
  private registerHandlers(): void {
    // Register conversion:start handler
    ipcMain.handle(
      IPC_CHANNELS.CONVERSION_START,
      async (event, request: StartConversionRequest): Promise<IPCResponse<StartConversionResponse>> => {
        try {
          const result = await this.conversionService.startConversion(request)
          return {
            success: true,
            data: result
          }
        } catch (error) {
          console.error('Error in conversion:start handler:', error)
          return {
            success: false,
            error: `Conversion start failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
            details: error instanceof Error ? error.stack : undefined
          }
        }
      }
    )

    // Register conversion:cancel handler
    ipcMain.handle(
      IPC_CHANNELS.CONVERSION_CANCEL,
      async (event, request: CancelConversionRequest): Promise<IPCResponse<CancelConversionResponse>> => {
        try {
          const result = await this.conversionService.cancelConversion(request)
          return {
            success: true,
            data: result
          }
        } catch (error) {
          console.error('Error in conversion:cancel handler:', error)
          return {
            success: false,
            error: `Conversion cancel failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
            details: error instanceof Error ? error.stack : undefined
          }
        }
      }
    )

    // Register conversion:get-jobs handler
    ipcMain.handle(
      IPC_CHANNELS.CONVERSION_GET_JOBS,
      async (event, request: GetJobsRequest): Promise<IPCResponse<GetJobsResponse>> => {
        try {
          const result = await this.conversionService.getJobs(request)
          return {
            success: true,
            data: result
          }
        } catch (error) {
          console.error('Error in conversion:get-jobs handler:', error)
          return {
            success: false,
            error: `Get jobs failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
            details: error instanceof Error ? error.stack : undefined
          }
        }
      }
    )

    console.log('Conversion operations IPC handlers registered')
  }

  /**
   * Setup event listeners to relay conversion events to renderer processes
   */
  private setupEventListeners(): void {
    // Job started event
    this.conversionService.on('job-started', (job: ConversionJob) => {
      const event: StartedEvent = {
        jobId: job.id,
        job
      }
      this.sendToAllWindows(IPC_CHANNELS.CONVERSION_STARTED, event)
    })

    // Job progress event
    this.conversionService.on('job-progress', (jobId: string, progress) => {
      const event: ProgressEvent = {
        jobId,
        progress
      }
      this.sendToAllWindows(IPC_CHANNELS.CONVERSION_PROGRESS, event)
    })

    // Job completed event
    this.conversionService.on('job-completed', (job: ConversionJob) => {
      const event: CompletedEvent = {
        jobId: job.id,
        job,
        outputPath: job.outputPath,
        conversionTime: job.result?.conversionTime || 0
      }
      this.sendToAllWindows(IPC_CHANNELS.CONVERSION_COMPLETED, event)
    })

    // Job failed event
    this.conversionService.on('job-failed', (job: ConversionJob) => {
      const event: FailedEvent = {
        jobId: job.id,
        job,
        error: job.result?.error?.message || 'Unknown error',
        details: job.result?.error?.details
      }
      this.sendToAllWindows(IPC_CHANNELS.CONVERSION_FAILED, event)
    })

    // Job cancelled event
    this.conversionService.on('job-cancelled', (job: ConversionJob) => {
      const event: CancelledEvent = {
        jobId: job.id,
        job
      }
      this.sendToAllWindows(IPC_CHANNELS.CONVERSION_CANCELLED, event)
    })

    console.log('Conversion service event listeners registered')
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
    ipcMain.removeHandler(IPC_CHANNELS.CONVERSION_START)
    ipcMain.removeHandler(IPC_CHANNELS.CONVERSION_CANCEL)
    ipcMain.removeHandler(IPC_CHANNELS.CONVERSION_GET_JOBS)

    // Remove all event listeners
    this.conversionService.removeAllListeners()
    
    console.log('Conversion operations IPC handlers unregistered')
  }

  /**
   * Get conversion service instance for testing
   */
  public getConversionService(): ConversionService {
    return this.conversionService
  }

  /**
   * Get service statistics
   */
  public getStatistics(): ReturnType<ConversionService['getStatistics']> {
    return this.conversionService.getStatistics()
  }

  /**
   * Set maximum concurrent jobs
   */
  public setMaxConcurrentJobs(max: number): void {
    this.conversionService.setMaxConcurrentJobs(max)
  }
}