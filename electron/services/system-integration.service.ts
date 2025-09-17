/**
 * System Integration Service
 * 
 * Handles system-level operations like showing files in explorer,
 * opening external URLs, and managing system interactions.
 */

import { shell } from 'electron'
import { promises as fs } from 'fs'
import type {
  ShowInExplorerRequest,
  ShowInExplorerResponse,
  OpenExternalRequest,
  OpenExternalResponse
} from '../../shared/types/ipc-contracts.js'
import { LoggingService } from './logging.service.js'

/**
 * System Integration Service Class
 */
export class SystemIntegrationService {
  private static instance: SystemIntegrationService
  private logger: LoggingService

  private constructor() {
    this.logger = LoggingService.getInstance()
  }

  /**
   * Get singleton instance
   */
  public static getInstance(): SystemIntegrationService {
    if (!SystemIntegrationService.instance) {
      SystemIntegrationService.instance = new SystemIntegrationService()
    }
    return SystemIntegrationService.instance
  }

  /**
   * Show file or folder in system explorer
   */
  async showInExplorer(request: ShowInExplorerRequest): Promise<ShowInExplorerResponse> {
    try {
      // Validate that the file/folder exists
      try {
        await fs.access(request.filePath)
      } catch {
        return {
          success: false,
          error: 'File or folder does not exist'
        }
      }

      // Show in explorer
      shell.showItemInFolder(request.filePath)

      this.logger.debug('system-integration', `Showed ${request.filePath} in explorer`)
      
      return {
        success: true
      }
    } catch (error) {
      this.logger.error('system-integration', 'Failed to show in explorer:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  /**
   * Open external URL or file with default application
   */
  async openExternal(request: OpenExternalRequest): Promise<OpenExternalResponse> {
    try {
      // Validate URL format for basic security
      if (!this.isValidUrl(request.url)) {
        return {
          success: false,
          error: 'Invalid URL or file path'
        }
      }

      // Open with default application
      await shell.openExternal(request.url)
      
      this.logger.debug('system-integration', `Opened external: ${request.url}`)
      
      return {
        success: true
      }
    } catch (error) {
      this.logger.error('system-integration', 'Failed to open external:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  /**
   * Open file or folder with default application
   */
  async openPath(filePath: string): Promise<boolean> {
    try {
      // Validate that the file/folder exists
      await fs.access(filePath)
      
      // Open with default application
      await shell.openPath(filePath)
      
      this.logger.debug('system-integration', `Opened path: ${filePath}`)
      return true
    } catch (error) {
      this.logger.error('system-integration', `Failed to open path ${filePath}:`, error)
      return false
    }
  }

  /**
   * Get system information
   */
  getSystemInfo() {
    return {
      platform: process.platform,
      arch: process.arch,
      nodeVersion: process.version,
      electronVersion: process.versions.electron,
      chromeVersion: process.versions.chrome,
      v8Version: process.versions.v8
    }
  }

  /**
   * Check if URL is valid for opening
   */
  private isValidUrl(url: string): boolean {
    try {
      // Allow http, https, mailto, file protocols
      const allowedProtocols = ['http:', 'https:', 'mailto:', 'file:']
      const urlObj = new URL(url)
      return allowedProtocols.includes(urlObj.protocol)
    } catch {
      // If URL parsing fails, check if it's a file path
      return url.length > 0 && !url.includes('<') && !url.includes('>')
    }
  }
}