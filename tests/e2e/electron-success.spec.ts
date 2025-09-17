import { test, expect, _electron as electron } from '@playwright/test';
import path from 'path';

test.describe('Electron Application - Success Tests', () => {
  let electronApp;
  let window;

  test.beforeEach(async () => {
    // Launch Electron app
    const projectRoot = path.join(__dirname, '../..');
    const appPath = path.join(projectRoot, 'out', 'main', 'main.js');

    electronApp = await electron.launch({
      args: [appPath],
      cwd: projectRoot,
      env: {
        ...process.env,
        NODE_ENV: 'test',
        ELECTRON_IS_DEV: '0'
      },
      timeout: 30000,
    });

    window = await electronApp.firstWindow();
    await window.waitForLoadState('domcontentloaded');
    await window.waitForTimeout(3000); // Wait for app to fully initialize
  });

  test.afterEach(async () => {
    await electronApp?.close();
  });

  test('✅ Electron app launches successfully with working electronAPI', async () => {
    // Verify the window is created and title is correct
    const title = await window.title();
    expect(title).toContain('Video Converter');

    // Verify electronAPI is available with all expected methods
    const apiInfo = await window.evaluate(() => {
      return {
        hasElectronAPI: typeof window.electronAPI !== 'undefined',
        apiMethods: window.electronAPI ? Object.keys(window.electronAPI) : [],
        versions: window.electronAPI ? window.electronAPI.versions : null,
        userAgent: navigator.userAgent
      };
    });

    expect(apiInfo.hasElectronAPI).toBe(true);
    expect(apiInfo.apiMethods).toContain('file');
    expect(apiInfo.apiMethods).toContain('conversion');
    expect(apiInfo.apiMethods).toContain('app');
    expect(apiInfo.apiMethods).toContain('system');
    expect(apiInfo.apiMethods).toContain('test');
    expect(apiInfo.userAgent).toContain('Electron');
    expect(apiInfo.versions).toBeTruthy();
    expect(apiInfo.versions.electron).toBeTruthy();

    console.log('✅ Electron API Info:', apiInfo);

    // Take success screenshot
    await window.screenshot({
      path: 'tests/screenshots/electron-success.png',
      fullPage: true
    });
  });

  test('✅ Main UI elements are present and functional', async () => {
    // Wait for main UI to load
    await window.waitForSelector('h1:has-text("Video Converter")', { timeout: 15000 });

    // Check that we have the main video converter interface
    const mainElements = await window.evaluate(() => {
      return {
        hasTitle: document.querySelector('h1:has-text("Video Converter")') !== null,
        hasChooseFileButton: document.querySelector('button:has-text("Choose Video File")') !== null,
        hasConversionSettings: document.querySelector('text="Conversion Settings"') !== null ||
                                document.querySelector('h3:has-text("Conversion Settings")') !== null ||
                                document.querySelector('h2:has-text("Conversion Settings")') !== null,
        fileButtonEnabled: (() => {
          const btn = document.querySelector('button:has-text("Choose Video File")');
          return btn ? !btn.disabled : false;
        })(),
        hasVersionInfo: document.querySelector('text*="Electron"') !== null ||
                       document.body.textContent.includes('Electron')
      };
    });

    expect(mainElements.hasTitle).toBe(true);
    expect(mainElements.hasChooseFileButton).toBe(true);
    expect(mainElements.fileButtonEnabled).toBe(true); // Button should be enabled when electronAPI is available

    console.log('✅ Main UI Elements:', mainElements);
  });

  test('✅ IPC ping functionality works', async () => {
    // Test the ping functionality directly via electronAPI
    const pingResult = await window.evaluate(async () => {
      try {
        const result = await window.electronAPI.test.ping();
        return { success: true, result };
      } catch (error) {
        return { success: false, error: error.message };
      }
    });

    expect(pingResult.success).toBe(true);
    expect(pingResult.result).toBeTruthy();
    expect(pingResult.result.message).toBe('pong');

    console.log('✅ Ping Result:', pingResult);
  });

  test('✅ File operations API is available', async () => {
    // Test that file operations are accessible (without actually triggering dialogs)
    const fileApiInfo = await window.evaluate(() => {
      const api = window.electronAPI.file;
      return {
        hasFileSelect: typeof api.select === 'function',
        hasFileValidate: typeof api.validate === 'function',
        hasSaveLocation: typeof api.saveLocation === 'function'
      };
    });

    expect(fileApiInfo.hasFileSelect).toBe(true);
    expect(fileApiInfo.hasFileValidate).toBe(true);
    expect(fileApiInfo.hasSaveLocation).toBe(true);

    console.log('✅ File API Info:', fileApiInfo);
  });

  test('✅ App state management API works', async () => {
    // Test app state operations
    const appStateTest = await window.evaluate(async () => {
      try {
        const sessionResult = await window.electronAPI.app.getSession();
        const prefsResult = await window.electronAPI.app.getPreferences();

        return {
          success: true,
          hasSession: sessionResult && sessionResult.session && sessionResult.session.id,
          hasPreferences: prefsResult && prefsResult.preferences,
          sessionId: sessionResult.session?.id,
          preferencesKeys: prefsResult.preferences ? Object.keys(prefsResult.preferences) : []
        };
      } catch (error) {
        return { success: false, error: error.message };
      }
    });

    expect(appStateTest.success).toBe(true);
    expect(appStateTest.hasSession).toBeTruthy();
    expect(appStateTest.hasPreferences).toBeTruthy();

    console.log('✅ App State Test:', appStateTest);
  });

  test('✅ Complete Electron application functionality verified', async () => {
    // Comprehensive test of all major functionality
    await window.waitForSelector('h1:has-text("Video Converter")', { timeout: 15000 });

    // Take a comprehensive screenshot showing the full working app
    await window.screenshot({
      path: 'tests/screenshots/electron-complete.png',
      fullPage: true
    });

    // Verify comprehensive functionality
    const comprehensiveTest = await window.evaluate(async () => {
      const results = {
        electronAPIAvailable: typeof window.electronAPI !== 'undefined',
        mainUILoaded: document.querySelector('h1:has-text("Video Converter")') !== null,
        fileButtonEnabled: (() => {
          const btn = document.querySelector('button:has-text("Choose Video File")');
          return btn ? !btn.disabled : false;
        })(),
        electronVersion: window.electronAPI?.versions?.electron || 'unknown',
        nodeVersion: window.electronAPI?.versions?.node || 'unknown',
        chromeVersion: window.electronAPI?.versions?.chrome || 'unknown',
        isActualElectronContext: navigator.userAgent.includes('Electron'),
        timestamp: new Date().toISOString()
      };

      // Test ping to verify IPC communication
      try {
        const pingResult = await window.electronAPI.test.ping();
        results.ipcWorking = pingResult && pingResult.message === 'pong';
      } catch (e) {
        results.ipcWorking = false;
        results.ipcError = e.message;
      }

      return results;
    });

    // Validate all key functionality
    expect(comprehensiveTest.electronAPIAvailable).toBe(true);
    expect(comprehensiveTest.mainUILoaded).toBe(true);
    expect(comprehensiveTest.fileButtonEnabled).toBe(true);
    expect(comprehensiveTest.isActualElectronContext).toBe(true);
    expect(comprehensiveTest.ipcWorking).toBe(true);
    expect(comprehensiveTest.electronVersion).toBeTruthy();

    console.log('🎉 COMPREHENSIVE SUCCESS TEST RESULTS:', comprehensiveTest);
  });
});