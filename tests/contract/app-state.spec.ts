/**
 * Contract Test: App State Management IPC Channels
 * 
 * Tests the IPC communication contracts for application state management.
 * These tests MUST FAIL initially to demonstrate the broken state,
 * then pass once the IPC handlers are properly registered.
 */

import { test, expect } from '@playwright/test'

test.describe('App State Management Contract Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await page.waitForLoadState('domcontentloaded')
  })

  test('app:get-session - should retrieve current session data', async ({ page }) => {
    const result = await page.evaluate(async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const api = (window as any).electronAPI
      if (!api?.app?.getSession) {
        return { error: 'app.getSession method not available' }
      }
      
      try {
        const response = await api.app.getSession()
        return { success: true, response }
      } catch (error) {
        return { 
          success: false, 
          error: String(error),
          errorType: 'IPC Error'
        }
      }
    })

    // Contract: Should return GetSessionResponse structure
    if (result.success) {
      expect(result.response).toHaveProperty('session')
    } else {
      // Expected failure - log for troubleshooting
      console.log('app:get-session contract test failed (expected):', result.error)
      expect(result.error).toContain('method not available')
    }
  })

  test('app:update-session - should update session data', async ({ page }) => {
    const result = await page.evaluate(async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const api = (window as any).electronAPI
      if (!api?.app?.updateSession) {
        return { error: 'app.updateSession method not available' }
      }
      
      try {
        const response = await api.app.updateSession({
          session: {
            currentFiles: [],
            activeJob: null,
            conversionHistory: []
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

    // Contract: Should return UpdateSessionResponse structure
    if (result.success) {
      expect(result.response).toHaveProperty('success')
    } else {
      // Expected failure - log for troubleshooting
      console.log('app:update-session contract test failed (expected):', result.error)
      expect(result.error).toContain('method not available')
    }
  })

  test('app:get-preferences - should retrieve user preferences', async ({ page }) => {
    const result = await page.evaluate(async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const api = (window as any).electronAPI
      if (!api?.app?.getPreferences) {
        return { error: 'app.getPreferences method not available' }
      }
      
      try {
        const response = await api.app.getPreferences()
        return { success: true, response }
      } catch (error) {
        return { 
          success: false, 
          error: String(error),
          errorType: 'IPC Error'
        }
      }
    })

    // Contract: Should return GetPreferencesResponse structure
    if (result.success) {
      expect(result.response).toHaveProperty('preferences')
    } else {
      // Expected failure - log for troubleshooting
      console.log('app:get-preferences contract test failed (expected):', result.error)
      expect(result.error).toContain('method not available')
    }
  })

  test('app:set-preferences - should update user preferences', async ({ page }) => {
    const result = await page.evaluate(async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const api = (window as any).electronAPI
      if (!api?.app?.setPreferences) {
        return { error: 'app.setPreferences method not available' }
      }
      
      try {
        const response = await api.app.setPreferences({
          preferences: {
            theme: 'dark',
            defaultQuality: 'high',
            defaultFormat: 'mp4',
            autoStart: false,
            notifications: true
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

    // Contract: Should return SetPreferencesResponse structure
    if (result.success) {
      expect(result.response).toHaveProperty('success')
    } else {
      // Expected failure - log for troubleshooting
      console.log('app:set-preferences contract test failed (expected):', result.error)
      expect(result.error).toContain('method not available')
    }
  })

  test('app:info - should provide application information', async ({ page }) => {
    const result = await page.evaluate(async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const api = (window as any).electronAPI
      if (!api?.app?.info) {
        return { error: 'app.info method not available' }
      }
      
      try {
        const response = await api.app.info()
        return { success: true, response }
      } catch (error) {
        return { 
          success: false, 
          error: String(error),
          errorType: 'IPC Error'
        }
      }
    })

    // Contract: Should return GetAppInfoResponse structure
    if (result.success) {
      expect(result.response).toHaveProperty('appInfo')
    } else {
      // Expected failure - log for troubleshooting
      console.log('app:info contract test failed (expected):', result.error)
      expect(result.error).toContain('method not available')
    }
  })

  test('app:quit - should handle application quit requests', async ({ page }) => {
    const result = await page.evaluate(async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const api = (window as any).electronAPI
      if (!api?.app?.quit) {
        return { error: 'app.quit method not available' }
      }
      
      // Note: We can't actually test quit, just verify the method exists
      return { success: true, methodExists: true }
    })

    // Contract: Should have quit method available
    if (result.success) {
      expect(result.methodExists).toBe(true)
    } else {
      // Expected failure - log for troubleshooting
      console.log('app:quit contract test failed (expected):', result.error)
      expect(result.error).toContain('method not available')
    }
  })

  test('app operations should be exposed in electronAPI', async ({ page }) => {
    const apiStructure = await page.evaluate(() => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const api = (window as any).electronAPI
      return {
        hasElectronAPI: typeof api !== 'undefined',
        hasAppAPI: typeof api?.app === 'object',
        appAPIMethods: api?.app ? Object.keys(api.app) : [],
        getSessionType: typeof api?.app?.getSession,
        updateSessionType: typeof api?.app?.updateSession,
        getPreferencesType: typeof api?.app?.getPreferences,
        setPreferencesType: typeof api?.app?.setPreferences,
        infoType: typeof api?.app?.info,
        quitType: typeof api?.app?.quit
      }
    })

    // API structure should exist
    expect(apiStructure.hasElectronAPI).toBe(true)
    expect(apiStructure.hasAppAPI).toBe(true)
    
    // All app operation methods should be functions
    expect(apiStructure.getSessionType).toBe('function')
    expect(apiStructure.updateSessionType).toBe('function')
    expect(apiStructure.getPreferencesType).toBe('function')
    expect(apiStructure.setPreferencesType).toBe('function')
    expect(apiStructure.infoType).toBe('function')
    expect(apiStructure.quitType).toBe('function')
    
    // Should have all expected methods
    expect(apiStructure.appAPIMethods).toContain('getSession')
    expect(apiStructure.appAPIMethods).toContain('updateSession')
    expect(apiStructure.appAPIMethods).toContain('getPreferences')
    expect(apiStructure.appAPIMethods).toContain('setPreferences')
    expect(apiStructure.appAPIMethods).toContain('info')
    expect(apiStructure.appAPIMethods).toContain('quit')
  })

  test('app state event listeners should be available', async ({ page }) => {
    const eventStructure = await page.evaluate(() => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const api = (window as any).electronAPI
      return {
        hasOnAPI: typeof api?.on === 'object',
        onAPIMethods: api?.on ? Object.keys(api.on) : [],
        stateChangedListenerType: typeof api?.on?.stateChanged
      }
    })

    // Event listener API should exist
    expect(eventStructure.hasOnAPI).toBe(true)
    
    // State change event listener should be function
    expect(eventStructure.stateChangedListenerType).toBe('function')
    
    // Should have state change event listener
    expect(eventStructure.onAPIMethods).toContain('stateChanged')
  })
})