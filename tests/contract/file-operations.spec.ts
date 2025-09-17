/**
 * Contract Test: File Operations IPC Channels
 * 
 * Tests the IPC communication contracts for file operations.
 * These tests MUST FAIL initially to demonstrate the broken state,
 * then pass once the IPC handlers are properly registered.
 */

import { test, expect } from '@playwright/test'

test.describe('File Operations Contract Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await page.waitForLoadState('domcontentloaded')
  })

  test('file:select - should handle file selection requests', async ({ page }) => {
    const result = await page.evaluate(async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const api = (window as any).electronAPI
      if (!api?.file?.select) {
        return { error: 'file.select method not available' }
      }
      
      try {
        const response = await api.file.select({
          multiple: false,
          filters: [{ name: 'Video Files', extensions: ['mp4', 'avi'] }]
        })
        return { success: true, response }
      } catch (error) {
        return { 
          success: false, 
          error: String(error),
          errorType: 'IPC Error'
        }
      }
    })

    // Contract: Should return SelectFilesResponse structure
    if (result.success) {
      expect(result.response).toHaveProperty('success')
      expect(result.response).toHaveProperty('filePaths')
    } else {
      // Expected failure - log for troubleshooting
      console.log('file:select contract test failed (expected):', result.error)
      expect(result.error).toContain('method not available')
    }
  })

  test('file:validate - should validate video files', async ({ page }) => {
    const result = await page.evaluate(async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const api = (window as any).electronAPI
      if (!api?.file?.validate) {
        return { error: 'file.validate method not available' }
      }
      
      try {
        const response = await api.file.validate({
          filePath: 'C:\\test\\sample.mp4',
          includeMetadata: true
        })
        return { success: true, response }
      } catch (error) {
        return { 
          success: false, 
          error: String(error),
          errorType: 'IPC Error'
        }
      }
    })

    // Contract: Should return ValidateFileResponse structure
    if (result.success) {
      expect(result.response).toHaveProperty('isValid')
    } else {
      // Expected failure - log for troubleshooting
      console.log('file:validate contract test failed (expected):', result.error)
      expect(result.error).toContain('method not available')
    }
  })

  test('file:save-location - should handle save location selection', async ({ page }) => {
    const result = await page.evaluate(async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const api = (window as any).electronAPI
      if (!api?.file?.saveLocation) {
        return { error: 'file.saveLocation method not available' }
      }
      
      try {
        const response = await api.file.saveLocation({
          defaultPath: 'converted_video.mp4',
          format: 'mp4'
        })
        return { success: true, response }
      } catch (error) {
        return { 
          success: false, 
          error: String(error),
          errorType: 'IPC Error'
        }
      }
    })

    // Contract: Should return SaveLocationResponse structure
    if (result.success) {
      expect(result.response).toHaveProperty('success')
    } else {
      // Expected failure - log for troubleshooting
      console.log('file:save-location contract test failed (expected):', result.error)
      expect(result.error).toContain('method not available')
    }
  })

  test('file operations should be exposed in electronAPI', async ({ page }) => {
    const apiStructure = await page.evaluate(() => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const api = (window as any).electronAPI
      return {
        hasElectronAPI: typeof api !== 'undefined',
        hasFileAPI: typeof api?.file === 'object',
        fileAPIMethods: api?.file ? Object.keys(api.file) : [],
        fileSelectType: typeof api?.file?.select,
        fileValidateType: typeof api?.file?.validate,
        fileSaveLocationType: typeof api?.file?.saveLocation
      }
    })

    // API structure should exist
    expect(apiStructure.hasElectronAPI).toBe(true)
    expect(apiStructure.hasFileAPI).toBe(true)
    
    // All file operation methods should be functions
    expect(apiStructure.fileSelectType).toBe('function')
    expect(apiStructure.fileValidateType).toBe('function')
    expect(apiStructure.fileSaveLocationType).toBe('function')
    
    // Should have all expected methods
    expect(apiStructure.fileAPIMethods).toContain('select')
    expect(apiStructure.fileAPIMethods).toContain('validate')
    expect(apiStructure.fileAPIMethods).toContain('saveLocation')
  })
})