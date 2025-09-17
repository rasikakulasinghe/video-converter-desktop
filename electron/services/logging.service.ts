/**
 * Logging Service for Video Converter Troubleshooting
 * 
 * Provides structured logging capabilities for systematic debugging
 * of IPC communication and service layer issues.
 */

import log from 'electron-log'
import { join } from 'path'
import { app } from 'electron'

export interface LogContext {
  component: string
  operation: string
  metadata?: Record<string, unknown>
}

export class LoggingService {
  private static instance: LoggingService
  
  private constructor() {
    this.configureLogging()
  }
  
  public static getInstance(): LoggingService {
    if (!LoggingService.instance) {
      LoggingService.instance = new LoggingService()
    }
    return LoggingService.instance
  }
  
  private configureLogging(): void {
    // Configure log file locations
    const logPath = join(app.getPath('logs'), 'video-converter.log')
    
    // Set log levels and formats
    log.transports.file.level = 'debug'
    log.transports.file.maxSize = 10 * 1024 * 1024 // 10MB
    log.transports.file.format = '[{y}-{m}-{d} {h}:{i}:{s}.{ms}] [{level}] {text}'
    log.transports.file.fileName = 'video-converter.log'
    
    log.transports.console.level = 'info'
    log.transports.console.format = '[{h}:{i}:{s}] [{level}] {text}'
    
    // Add timestamp and process info
    log.hooks.push((message, transport) => {
      if (transport === log.transports.file) {
        message.data.unshift(`[PID:${process.pid}]`)
      }
      return message
    })
    
    this.info('LoggingService', 'initialize', { logPath })
  }
  
  /**
   * Log IPC-related events for troubleshooting
   */
  public logIPC(direction: 'send' | 'receive', channel: string, data?: unknown): void {
    const context: LogContext = {
      component: 'IPC',
      operation: `${direction}:${channel}`,
      metadata: { 
        direction, 
        channel,
        dataType: typeof data,
        timestamp: new Date().toISOString()
      }
    }
    
    if (data && typeof data === 'object') {
      context.metadata!.dataKeys = Object.keys(data as object)
    }
    
    this.debug(context.component, context.operation, context.metadata)
  }
  
  /**
   * Log service lifecycle events
   */
  public logService(serviceName: string, event: 'initialize' | 'error' | 'operation', details?: unknown): void {
    const context: LogContext = {
      component: 'Service',
      operation: `${serviceName}:${event}`,
      metadata: { 
        serviceName, 
        event, 
        details,
        timestamp: new Date().toISOString()
      }
    }
    
    if (event === 'error') {
      this.error(context.component, context.operation, context.metadata)
    } else {
      this.info(context.component, context.operation, context.metadata)
    }
  }
  
  /**
   * Log conversion process events
   */
  public logConversion(jobId: string, stage: string, progress?: number, error?: string): void {
    const context: LogContext = {
      component: 'Conversion',
      operation: `job:${stage}`,
      metadata: { 
        jobId, 
        stage, 
        progress,
        error,
        timestamp: new Date().toISOString()
      }
    }
    
    if (error) {
      this.error(context.component, context.operation, context.metadata)
    } else {
      this.info(context.component, context.operation, context.metadata)
    }
  }
  
  /**
   * Log file operation events
   */
  public logFileOperation(operation: string, filePath?: string, success?: boolean, error?: string): void {
    const context: LogContext = {
      component: 'FileOps',
      operation,
      metadata: { 
        filePath, 
        success, 
        error,
        timestamp: new Date().toISOString()
      }
    }
    
    if (error) {
      this.error(context.component, context.operation, context.metadata)
    } else {
      this.info(context.component, context.operation, context.metadata)
    }
  }
  
  /**
   * Log troubleshooting checkpoints
   */
  public logCheckpoint(checkpoint: string, status: 'pass' | 'fail' | 'warn', details?: unknown): void {
    const context: LogContext = {
      component: 'Troubleshooting',
      operation: checkpoint,
      metadata: { 
        status, 
        details,
        timestamp: new Date().toISOString()
      }
    }
    
    switch (status) {
      case 'pass':
        this.info(context.component, `✅ ${context.operation}`, context.metadata)
        break
      case 'fail':
        this.error(context.component, `❌ ${context.operation}`, context.metadata)
        break
      case 'warn':
        this.warn(context.component, `⚠️ ${context.operation}`, context.metadata)
        break
    }
  }
  
  // Base logging methods
  public debug(component: string, operation: string, metadata?: Record<string, unknown>): void {
    const message = this.formatMessage(component, operation, metadata)
    log.debug(message)
  }
  
  public info(component: string, operation: string, metadata?: Record<string, unknown>): void {
    const message = this.formatMessage(component, operation, metadata)
    log.info(message)
  }
  
  public warn(component: string, operation: string, metadata?: Record<string, unknown>): void {
    const message = this.formatMessage(component, operation, metadata)
    log.warn(message)
  }
  
  public error(component: string, operation: string, metadata?: Record<string, unknown>): void {
    const message = this.formatMessage(component, operation, metadata)
    log.error(message)
  }
  
  private formatMessage(component: string, operation: string, metadata?: Record<string, unknown>): string {
    let message = `[${component}] ${operation}`
    
    if (metadata && Object.keys(metadata).length > 0) {
      const metadataStr = JSON.stringify(metadata, null, 0)
      message += ` | ${metadataStr}`
    }
    
    return message
  }
  
  /**
   * Get current log file path for debugging
   */
  public getLogPath(): string {
    return join(app.getPath('logs'), 'video-converter.log')
  }
  
  /**
   * Enable verbose logging for troubleshooting
   */
  public enableVerboseLogging(): void {
    log.transports.console.level = 'debug'
    log.transports.file.level = 'debug'
    this.info('LoggingService', 'enableVerboseLogging', { level: 'debug' })
  }
  
  /**
   * Disable verbose logging
   */
  public disableVerboseLogging(): void {
    log.transports.console.level = 'info'
    log.transports.file.level = 'info'
    this.info('LoggingService', 'disableVerboseLogging', { level: 'info' })
  }
}