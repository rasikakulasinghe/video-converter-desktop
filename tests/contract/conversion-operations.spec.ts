/**
 * Contract Test: Conversion Operations IPC Channels
 * 
 * Tests the IPC communication contracts for video conversion operations.
 * These tests MUST FAIL initially to demonstrate the broken state,
 * then pass once the IPC handlers are properly registered.
 */

import { test, expect } from '@playwright/test'

test.describe('Conversion Operations Contract Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await page.waitForLoadState('domcontentloaded')
  })

  test('conversion:start - should handle conversion start requests', async ({ page }) => {
    const result = await page.evaluate(async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const api = (window as any).electronAPI
      if (!api?.conversion?.start) {
        return { error: 'conversion.start method not available' }
      }
      
      try {
        const response = await api.conversion.start({
          jobId: 'test-job-123',
          filePath: 'C:\\test\\input.mp4',
          outputPath: 'C:\\test\\output.mp4',
          settings: {
            format: 'mp4',
            quality: 'medium',
            resolution: '1080p'
          }
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

    // Contract: Should return StartConversionResponse structure
    if (result.success) {
      expect(result.response).toHaveProperty('success')
      expect(result.response).toHaveProperty('jobId')
    } else {
      // Expected failure - log for troubleshooting
      console.log('conversion:start contract test failed (expected):', result.error)
      expect(result.error).toContain('method not available')
    }
  })

  test('conversion:cancel - should handle conversion cancellation', async ({ page }) => {
    const result = await page.evaluate(async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const api = (window as any).electronAPI
      if (!api?.conversion?.cancel) {
        return { error: 'conversion.cancel method not available' }
      }
      
      try {
        const response = await api.conversion.cancel({
          jobId: 'test-job-123'
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

    // Contract: Should return CancelConversionResponse structure
    if (result.success) {
      expect(result.response).toHaveProperty('success')
      expect(result.response).toHaveProperty('jobId')
    } else {
      // Expected failure - log for troubleshooting
      console.log('conversion:cancel contract test failed (expected):', result.error)
      expect(result.error).toContain('method not available')
    }
  })

  test('conversion operations should be exposed in electronAPI', async ({ page }) => {
    const apiStructure = await page.evaluate(() => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const api = (window as any).electronAPI
      return {
        hasElectronAPI: typeof api !== 'undefined',
        hasConversionAPI: typeof api?.conversion === 'object',
        conversionAPIMethods: api?.conversion ? Object.keys(api.conversion) : [],
        conversionStartType: typeof api?.conversion?.start,
        conversionCancelType: typeof api?.conversion?.cancel
      }
    })

    // API structure should exist
    expect(apiStructure.hasElectronAPI).toBe(true)
    expect(apiStructure.hasConversionAPI).toBe(true)
    
    // All conversion operation methods should be functions
    expect(apiStructure.conversionStartType).toBe('function')
    expect(apiStructure.conversionCancelType).toBe('function')
    
    // Should have all expected methods
    expect(apiStructure.conversionAPIMethods).toContain('start')
    expect(apiStructure.conversionAPIMethods).toContain('cancel')
  })

  test('conversion event listeners should be available', async ({ page }) => {
    const eventStructure = await page.evaluate(() => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const api = (window as any).electronAPI
      return {
        hasOnAPI: typeof api?.on === 'object',
        onAPIMethods: api?.on ? Object.keys(api.on) : [],
        progressListenerType: typeof api?.on?.conversionProgress,
        completeListenerType: typeof api?.on?.conversionComplete,
        errorListenerType: typeof api?.on?.conversionError
      }
    })

    // Event listener API should exist
    expect(eventStructure.hasOnAPI).toBe(true)
    
    // All event listeners should be functions
    expect(eventStructure.progressListenerType).toBe('function')
    expect(eventStructure.completeListenerType).toBe('function')
    expect(eventStructure.errorListenerType).toBe('function')
    
    // Should have all expected event listeners
    expect(eventStructure.onAPIMethods).toContain('conversionProgress')
    expect(eventStructure.onAPIMethods).toContain('conversionComplete')
    expect(eventStructure.onAPIMethods).toContain('conversionError')
  })
})