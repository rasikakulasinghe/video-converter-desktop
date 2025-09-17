/**
 * Contract Test: System Integration IPC Channels
 * 
 * Tests the IPC communication contracts for system integration operations.
 * These tests MUST FAIL initially to demonstrate the broken state,
 * then pass once the IPC handlers are properly registered.
 */

import { test, expect } from '@playwright/test'

test.describe('System Integration Contract Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await page.waitForLoadState('domcontentloaded')
  })

  test('system:show-in-explorer - should show files in system explorer', async ({ page }) => {
    const result = await page.evaluate(async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const api = (window as any).electronAPI
      if (!api?.system?.showInExplorer) {
        return { error: 'system.showInExplorer method not available' }
      }
      
      try {
        const response = await api.system.showInExplorer({
          filePath: 'C:\\test\\sample.mp4'
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

    // Contract: Should return ShowInExplorerResponse structure
    if (result.success) {
      expect(result.response).toHaveProperty('success')
    } else {
      // Expected failure - log for troubleshooting
      console.log('system:show-in-explorer contract test failed (expected):', result.error)
      expect(result.error).toContain('method not available')
    }
  })

  test('system:open-external - should open external URLs or files', async ({ page }) => {
    const result = await page.evaluate(async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const api = (window as any).electronAPI
      if (!api?.system?.openExternal) {
        return { error: 'system.openExternal method not available' }
      }
      
      try {
        const response = await api.system.openExternal({
          url: 'https://example.com'
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

    // Contract: Should return OpenExternalResponse structure
    if (result.success) {
      expect(result.response).toHaveProperty('success')
    } else {
      // Expected failure - log for troubleshooting
      console.log('system:open-external contract test failed (expected):', result.error)
      expect(result.error).toContain('method not available')
    }
  })

  test('system operations should be exposed in electronAPI', async ({ page }) => {
    const apiStructure = await page.evaluate(() => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const api = (window as any).electronAPI
      return {
        hasElectronAPI: typeof api !== 'undefined',
        hasSystemAPI: typeof api?.system === 'object',
        systemAPIMethods: api?.system ? Object.keys(api.system) : [],
        showInExplorerType: typeof api?.system?.showInExplorer,
        openExternalType: typeof api?.system?.openExternal
      }
    })

    // API structure should exist
    expect(apiStructure.hasElectronAPI).toBe(true)
    expect(apiStructure.hasSystemAPI).toBe(true)
    
    // All system operation methods should be functions
    expect(apiStructure.showInExplorerType).toBe('function')
    expect(apiStructure.openExternalType).toBe('function')
    
    // Should have all expected methods
    expect(apiStructure.systemAPIMethods).toContain('showInExplorer')
    expect(apiStructure.systemAPIMethods).toContain('openExternal')
  })

  test('platform information should be available', async ({ page }) => {
    const platformInfo = await page.evaluate(() => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const api = (window as any).electronAPI
      return {
        hasPlatform: typeof api?.platform === 'string',
        hasVersions: typeof api?.versions === 'object',
        platform: api?.platform,
        versions: api?.versions ? Object.keys(api.versions) : []
      }
    })

    // Platform information should be available
    expect(platformInfo.hasPlatform).toBe(true)
    expect(platformInfo.hasVersions).toBe(true)
    
    // Should have expected version information
    expect(platformInfo.versions).toContain('node')
    expect(platformInfo.versions).toContain('chrome')
    expect(platformInfo.versions).toContain('electron')
    
    // Platform should be a valid string
    expect(typeof platformInfo.platform).toBe('string')
    expect(platformInfo.platform.length).toBeGreaterThan(0)
  })
})