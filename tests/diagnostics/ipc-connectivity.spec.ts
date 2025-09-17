/**
 * IPC Connectivity Diagnostic Tests
 * 
 * These tests verify basic IPC communication between main and renderer processes.
 * Used for systematic troubleshooting of the video converter app.
 */

import { test, expect } from '@playwright/test'

test.describe('IPC Connectivity Diagnostics', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the app
    await page.goto('/')
    
    // Wait for the app to load
    await page.waitForLoadState('domcontentloaded')
  })

  test('should have electronAPI available in renderer', async ({ page }) => {
    // Check if electronAPI is exposed to renderer process
    const hasElectronAPI = await page.evaluate(() => {
      return typeof window.electronAPI !== 'undefined'
    })
    
    expect(hasElectronAPI).toBe(true)
  })

  test('should respond to basic ping test', async ({ page }) => {
    // Test basic IPC connectivity with diagnostic ping handler
    const response = await page.evaluate(async () => {
      if (typeof window.electronAPI?.test?.ping === 'function') {
        try {
          return await window.electronAPI.test.ping()
        } catch (error) {
          return { error: error.message }
        }
      }
      return { error: 'ping handler not available' }
    })
    
    // Should receive pong response with timestamp
    expect(response).toHaveProperty('message', 'pong')
    expect(response).toHaveProperty('timestamp')
    expect(response.error).toBeUndefined()
  })

  test('should report IPC handler status', async ({ page }) => {
    // Get current IPC handler registration status
    const status = await page.evaluate(async () => {
      if (typeof window.electronAPI?.test?.ipcStatus === 'function') {
        try {
          return await window.electronAPI.test.ipcStatus()
        } catch (error) {
          return { error: error.message }
        }
      }
      return { error: 'ipcStatus handler not available' }
    })
    
    // Should report handler count and registered channels
    expect(status).toHaveProperty('totalHandlers')
    expect(status).toHaveProperty('registeredChannels')
    expect(status).toHaveProperty('timestamp')
    expect(status.totalHandlers).toBeGreaterThan(0)
    expect(Array.isArray(status.registeredChannels)).toBe(true)
  })

  test('should identify missing IPC handlers', async ({ page }) => {
    // Check for expected video converter IPC channels
    const status = await page.evaluate(async () => {
      if (typeof window.electronAPI?.test?.ipcStatus === 'function') {
        const result = await window.electronAPI.test.ipcStatus()
        
        const expectedChannels = [
          'file:select',
          'file:validate', 
          'file:save-location',
          'conversion:start',
          'conversion:cancel',
          'app:get-preferences',
          'app:set-preferences',
          'system:show-in-explorer'
        ]
        
        const missingChannels = expectedChannels.filter(
          channel => !result.registeredChannels.includes(channel)
        )
        
        return {
          ...result,
          expectedChannels,
          missingChannels,
          hasAllExpected: missingChannels.length === 0
        }
      }
      return { error: 'Cannot check IPC status' }
    })
    
    // Log missing channels for troubleshooting
    if (status.missingChannels && status.missingChannels.length > 0) {
      console.log('Missing IPC channels:', status.missingChannels)
      console.log('Current channels:', status.registeredChannels)
    }
    
    // This test is expected to fail initially - it's diagnostic
    expect(status.hasAllExpected).toBe(true)
  })

  test('should test basic file operations API structure', async ({ page }) => {
    // Check if file operations API structure exists
    const apiStructure = await page.evaluate(() => {
      const api = window.electronAPI
      return {
        hasFileAPI: typeof api?.file === 'object',
        hasConversionAPI: typeof api?.conversion === 'object',
        hasAppAPI: typeof api?.app === 'object',
        hasSystemAPI: typeof api?.system === 'object',
        fileOperations: api?.file ? Object.keys(api.file) : [],
        conversionOperations: api?.conversion ? Object.keys(api.conversion) : [],
        appOperations: api?.app ? Object.keys(api.app) : [],
        systemOperations: api?.system ? Object.keys(api.system) : []
      }
    })
    
    // Basic API structure should exist
    expect(apiStructure.hasFileAPI).toBe(true)
    expect(apiStructure.hasConversionAPI).toBe(true)
    expect(apiStructure.hasAppAPI).toBe(true)
    expect(apiStructure.hasSystemAPI).toBe(true)
    
    // Log API structure for diagnostics
    console.log('API Structure:', apiStructure)
  })

  test('should attempt file selection and capture errors', async ({ page }) => {
    // Try to call file selection and capture any errors
    const result = await page.evaluate(async () => {
      if (typeof window.electronAPI?.file?.select === 'function') {
        try {
          // This will likely fail but we want to see the error
          const response = await window.electronAPI.file.select()
          return { success: true, response }
        } catch (error) {
          return { 
            success: false, 
            error: error.message,
            errorType: error.name 
          }
        }
      }
      return { 
        success: false, 
        error: 'file.select method not available',
        errorType: 'MethodNotFound'
      }
    })
    
    // Log the result for troubleshooting
    console.log('File selection test result:', result)
    
    // This test documents the current failure state
    // When IPC is fixed, this should succeed
    if (!result.success) {
      console.log('Expected failure - IPC not properly configured')
      console.log('Error:', result.error)
    }
  })
})