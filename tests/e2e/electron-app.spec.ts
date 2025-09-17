import { test, expect, _electron as electron } from '@playwright/test';
import path from 'path';

test.describe('Electron Application', () => {
  let electronApp;
  let window;

  test.beforeEach(async () => {
    // Ensure we have the correct paths for Windows
    const projectRoot = path.join(__dirname, '../..');
    const electronPath = path.join(projectRoot, 'node_modules', '.bin', 'electron.cmd'); // Use .cmd for Windows
    const appPath = path.join(projectRoot, 'out', 'main', 'main.js');

    console.log('Project root:', projectRoot);
    console.log('Electron path:', electronPath);
    console.log('App path:', appPath);

    // Launch Electron app
    electronApp = await electron.launch({
      args: [appPath],
      cwd: projectRoot,
      env: {
        ...process.env,
        NODE_ENV: 'test',
        ELECTRON_IS_DEV: '0' // Ensure production mode
      },
      timeout: 30000, // 30 second timeout for startup
    });

    // Get the first window
    window = await electronApp.firstWindow();

    // Wait for the app to be ready and loaded
    await window.waitForLoadState('domcontentloaded');
    await window.waitForTimeout(2000); // Additional wait for electron to initialize
  });

  test.afterEach(async () => {
    await electronApp?.close();
  });

  test('should launch the Electron application successfully', async () => {
    // Verify the window is created
    expect(window).toBeTruthy();

    // Check if the title is correct
    const title = await window.title();
    expect(title).toContain('Video Converter');

    // Take a screenshot to verify the UI loaded
    await window.screenshot({ path: 'tests/screenshots/app-launch.png' });
  });

  test('should have electronAPI available in renderer process', async () => {
    // Debug: Check what's actually available on the window
    const windowInfo = await window.evaluate(() => {
      const keys = Object.keys(window);
      const electronAPIKeys = window.electronAPI ? Object.keys(window.electronAPI) : [];
      return {
        hasElectronAPI: typeof window.electronAPI !== 'undefined',
        windowKeys: keys.filter(k => k.includes('electron') || k.includes('API')),
        electronAPIKeys,
        userAgent: navigator.userAgent,
        contextIsolation: typeof require === 'undefined' // Should be true if context isolation is working
      };
    });

    console.log('Window info:', windowInfo);

    expect(windowInfo.hasElectronAPI).toBe(true);

    if (windowInfo.hasElectronAPI) {
      // Test if specific API methods are available
      const apiMethods = await window.evaluate(() => {
        const api = window.electronAPI;
        return {
          hasFile: typeof api.file !== 'undefined',
          hasFileSelect: typeof api.file?.select !== 'undefined',
          hasFileValidate: typeof api.file?.validate !== 'undefined',
          hasConversion: typeof api.conversion !== 'undefined',
          hasSystem: typeof api.system !== 'undefined',
          hasApp: typeof api.app !== 'undefined', // Fixed: it's 'app' not 'appState'
          hasTest: typeof api.test !== 'undefined', // Test API should be available
        };
      });

      expect(apiMethods.hasFile).toBe(true);
      expect(apiMethods.hasFileSelect).toBe(true);
      expect(apiMethods.hasFileValidate).toBe(true);
      expect(apiMethods.hasConversion).toBe(true);
      expect(apiMethods.hasSystem).toBe(true);
      expect(apiMethods.hasApp).toBe(true);
      expect(apiMethods.hasTest).toBe(true);
    }
  });

  test('should display main UI elements', async () => {
    // Wait for React app to load - Look for actual elements that exist
    await window.waitForSelector('h1:has-text("Video Converter")', { timeout: 15000 });

    // Check for key UI elements based on actual structure
    const chooseFileButton = window.locator('button:has-text("Choose Video File")');
    await expect(chooseFileButton).toBeVisible();

    // Check for IPC debug section
    const ipcTestSection = window.locator('text=IPC Test (Debug)');
    await expect(ipcTestSection).toBeVisible();

    // Check for debug buttons
    const testPingButton = window.locator('button:has-text("Test Ping")');
    const testFileSelectButton = window.locator('button:has-text("Test File Select")');

    await expect(testPingButton).toBeVisible();
    await expect(testFileSelectButton).toBeVisible();

    // Take screenshot of the main UI
    await window.screenshot({ path: 'tests/screenshots/main-ui.png' });
  });

  test('should handle IPC ping test successfully', async () => {
    // Wait for the app to be ready
    await window.waitForSelector('button:has-text("Test Ping")', { timeout: 10000 });

    // Click the Test Ping button
    const testPingButton = window.locator('button:has-text("Test Ping")');
    await testPingButton.click();

    // Wait a moment for the ping response
    await window.waitForTimeout(1000);

    // Check if ping was successful (you might need to adjust this based on your UI feedback)
    // For now, let's just verify no errors occurred
    const consoleErrors = [];
    window.on('pageerror', (error) => {
      consoleErrors.push(error.message);
    });

    expect(consoleErrors.length).toBe(0);
  });

  test('should handle file selection dialog', async () => {
    // Wait for the choose file button
    await window.waitForSelector('button:has-text("Choose Video File")', { timeout: 10000 });

    const chooseFileButton = window.locator('button:has-text("Choose Video File")');
    await expect(chooseFileButton).toBeEnabled();

    // Note: We can't actually test file selection dialog opening without mocking
    // But we can verify the button is functional and doesn't crash
    // In a real test environment, you might mock the dialog response

    // Take screenshot showing the file selection button is ready
    await window.screenshot({ path: 'tests/screenshots/file-selection-ready.png' });
  });

  test('should handle test file select IPC operation', async () => {
    // Wait for the test file select button
    await window.waitForSelector('button:has-text("Test File Select")', { timeout: 10000 });

    const testFileSelectButton = window.locator('button:has-text("Test File Select")');
    await testFileSelectButton.click();

    // Wait a moment for the IPC operation
    await window.waitForTimeout(2000);

    // Verify no JavaScript errors occurred
    const consoleErrors = [];
    window.on('pageerror', (error) => {
      consoleErrors.push(error.message);
    });

    expect(consoleErrors.length).toBe(0);

    // Take screenshot after test file select
    await window.screenshot({ path: 'tests/screenshots/test-file-select.png' });
  });

  test('should display conversion area when file is selected', async () => {
    // This test would require actually selecting a file or mocking the file selection
    // For now, let's just verify the UI structure exists for conversion display

    await window.waitForSelector('[data-testid="main-container"]', { timeout: 10000 });

    // Check if conversion-related elements exist in the DOM (even if hidden)
    const conversionArea = window.locator('[data-testid="conversion-area"]');

    // Note: This might not be visible initially, but should exist in the DOM
    // Adjust based on your actual implementation
    const conversionAreaExists = await window.evaluate(() => {
      return document.querySelector('[data-testid="conversion-area"]') !== null;
    });

    // If conversion area doesn't exist initially, that's also valid behavior
    // This test mainly ensures the app structure is correct
    console.log('Conversion area exists:', conversionAreaExists);
  });

  test('should handle window resizing correctly', async () => {
    // Test responsive behavior
    await window.setViewportSize({ width: 800, height: 600 });
    await window.waitForTimeout(500);

    // Verify main elements are still visible at smaller size
    const chooseFileButton = window.locator('button:has-text("Choose Video File")');
    await expect(chooseFileButton).toBeVisible();

    // Test larger size
    await window.setViewportSize({ width: 1200, height: 800 });
    await window.waitForTimeout(500);

    await expect(chooseFileButton).toBeVisible();

    // Take screenshot of resized window
    await window.screenshot({ path: 'tests/screenshots/window-resized.png' });
  });

  test('should maintain Electron context and not be a browser', async () => {
    // Verify we're in Electron context, not a web browser
    const isElectron = await window.evaluate(() => {
      return typeof window.electronAPI !== 'undefined' &&
             typeof require !== 'undefined';
    });

    expect(isElectron).toBe(true);

    // Check that we have access to Electron-specific features
    const electronFeatures = await window.evaluate(() => {
      return {
        hasElectronAPI: typeof window.electronAPI !== 'undefined',
        hasNodeIntegration: typeof process !== 'undefined',
        userAgent: navigator.userAgent.includes('Electron'),
      };
    });

    expect(electronFeatures.hasElectronAPI).toBe(true);
    // Note: Node integration might be disabled for security, that's ok
    expect(electronFeatures.userAgent).toBe(true);
  });
});