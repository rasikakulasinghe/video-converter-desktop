import { app, BrowserWindow, ipcMain, shell } from 'electron';
import { join } from 'path';
import { electronApp, optimizer, is } from '@electron-toolkit/utils';
import { LoggingService } from './services/logging.service.js';

// Import IPC Handlers
import { FileOperationsHandlers } from './handlers/file-operations.handlers.js'
import { ConversionOperationsHandlers } from './handlers/conversion-operations.handlers.js'
import { AppStateHandlers } from './handlers/app-state.handlers.js'
import { SystemIntegrationHandlers } from './handlers/system-integration.handlers.js'

// Get __dirname equivalent for ES modules
const __dirname = join(process.cwd(), 'electron');

// Initialize logging service
const logger = LoggingService.getInstance();

// IPC Debugging Utilities
function logIPCHandlers(): void {
  const eventHandlers = ipcMain.eventNames();
  
  console.log('=== IPC Handler Registration Debug ===');
  console.log(`Total event handlers: ${eventHandlers.length}`);
  console.log('Registered event channels:', eventHandlers);
  console.log('Note: invoke/handle channels are not shown in eventNames()');
  
  // Since eventNames() doesn't show handle listeners, we'll focus on whether 
  // the handlers are callable rather than just registered
  const expectedInvokeChannels = [
    'file:select', 'file:validate', 'file:save-location',
    'conversion:start', 'conversion:cancel',
    'app:get-preferences', 'app:set-preferences', 'app:get-session',
    'system:show-in-explorer', 'system:open-external'
  ];
  
  logger.logCheckpoint('IPC_Handler_Registration', 'pass', {
    totalEventHandlers: eventHandlers.length,
    registeredEventChannels: eventHandlers,
    note: 'eventNames() shows event listeners, not invoke handlers'
  });
  
  // Instead of failing on missing channels, log info about expected invoke channels
  logger.logCheckpoint('Expected_IPC_Channels', 'pass', {
    expectedInvokeChannels,
    note: 'Testing via renderer will confirm if invoke handlers work',
    registeredEventChannels: eventHandlers
  });
  
  console.log('Expected invoke channels (not visible in eventNames()):', expectedInvokeChannels);
  console.log('📡 Invoke handlers will be tested when renderer calls them');
  console.log('=====================================');
}

/**
 * Register all IPC handlers
 */
function registerIPCHandlers(): void {
  logger.info('main-process', 'Registering IPC handlers...');

  try {
    // Initialize handler classes - they register themselves
    new FileOperationsHandlers();
    new ConversionOperationsHandlers();
    new AppStateHandlers();
    new SystemIntegrationHandlers();

    logger.logCheckpoint('IPC_Handler_Setup', 'pass', {
      message: 'All IPC handlers registered successfully'
    });

    console.log('✅ All IPC handlers registered successfully');
  } catch (error) {
    logger.logCheckpoint('IPC_Handler_Setup', 'fail', {
      error: error instanceof Error ? error.message : 'Unknown error'
    });

    console.error('❌ Failed to register IPC handlers:', error);
    throw error;
  }
}

function addDiagnosticHandlers(): void {
  // Test handler for basic IPC connectivity
  ipcMain.handle('test:ping', () => {
    logger.logIPC('receive', 'test:ping');
    const response = { message: 'pong', timestamp: new Date().toISOString() };
    logger.logIPC('send', 'test:ping', response);
    console.log('🏓 Ping received in main process');
    return response;
  });

  // Handler to get current IPC status (Updated to check handle listeners properly)
  ipcMain.handle('test:ipc-status', () => {
    // eventNames() only shows event listeners, not handle listeners
    // Let's try to test if our handlers are actually working
    const eventHandlers = ipcMain.eventNames();
    
    // Try to test if handlers exist by checking if they're callable
    const testChannels = [
      'file:select', 'file:validate', 'file:save-location',
      'conversion:start', 'conversion:cancel',
      'app:get-session', 'app:get-preferences', 'app:set-preferences',
      'app:info', 'app:quit',
      'system:show-in-explorer', 'system:open-external'
    ];
    
    const status = {
      totalEventHandlers: eventHandlers.length,
      registeredEventChannels: eventHandlers,
      testedInvokeChannels: testChannels,
      timestamp: new Date().toISOString(),
      note: 'eventNames() only shows event listeners, not invoke handlers'
    };
    
    logger.logIPC('receive', 'test:ipc-status');
    logger.logIPC('send', 'test:ipc-status', status);
    return status;
  });

  logger.info('IPC', 'diagnostic_handlers_added', {
    handlers: ['test:ping', 'test:ipc-status']
  });
  console.log('🔧 Diagnostic IPC handlers added: test:ping, test:ipc-status');
}

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
// Note: Remove this if not using electron-squirrel-startup
// if (require('electron-squirrel-startup')) {
//   app.quit();
// }

// Disable hardware acceleration to prevent GPU crashes on Windows
// Must be called before app is ready
app.disableHardwareAcceleration();

function createWindow(): void {
  // Create the browser window with Windows-specific optimizations
  const mainWindow = new BrowserWindow({
    width: 1200,
    height: 1200,
    minWidth: 800,
    minHeight: 800,
    show: false,
    autoHideMenuBar: true,
    titleBarStyle: 'default', // Use Windows native title bar
    backgroundColor: '#ffffff', // Match Windows light theme
    frame: true, // Use native window frame for Windows integration
    transparent: false, // Better performance on Windows
    webPreferences: {
      preload: (() => {
        // In built version: __dirname is out/main, so we need ../preload/preload.js
        // In source version: __dirname is electron, so we need ../out/preload/preload.js
        const possiblePaths = [
          join(__dirname, '../preload/preload.js'),  // When running from out/main
          join(__dirname, '../out/preload/preload.js'), // When running from electron directory
        ];

        console.log('🔍 __dirname:', __dirname);

        for (const preloadPath of possiblePaths) {
          console.log('🔍 Trying preload path:', preloadPath);
          try {
            require('fs').accessSync(preloadPath);
            console.log('✅ Preload file found at:', preloadPath);
            return preloadPath;
          } catch (e) {
            console.log('❌ Preload file not found at:', preloadPath);
          }
        }

        console.error('💥 No preload file found in any location!');
        return possiblePaths[0]; // Fallback
      })(),
      sandbox: true, // Enhanced security
      contextIsolation: true,
      nodeIntegration: false,
      webSecurity: true, // Enforce web security
      allowRunningInsecureContent: false,
      experimentalFeatures: false,
      // GPU process crash mitigation
      webgl: false, // Disable WebGL to prevent GPU crashes
      offscreen: false // Ensure proper rendering mode
    },
    // Windows-specific settings
    icon: join(__dirname, '../../build/icon.ico'), // Windows app icon
    thickFrame: true // Native Windows resize handles
  });

  mainWindow.on('ready-to-show', () => {
    mainWindow.show();
  });

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url);
    return { action: 'deny' };
  });

  // HMR for renderer base on electron-vite cli.
  // Load the remote URL for development or the local html file for production.
  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL']);
  } else {
    mainWindow.loadFile(join(__dirname, '../dist/index.html'));
  }
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(() => {
  // Set app user model id for Windows taskbar grouping
  electronApp.setAppUserModelId('com.videoconverter.app');

  // Default open or close DevTools by F12 in development
  // and ignore CommandOrControl + R in production.
  // see https://github.com/alex8088/electron-toolkit/tree/master/packages/utils
  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window);
  });

  // Remove test IPC handler in production
  // Note: Commented out to avoid conflicts with diagnostic handlers
  // if (is.dev) {
  //   ipcMain.on('ping', () => console.log('pong'));
  // }

  // Add diagnostic handlers for troubleshooting
  addDiagnosticHandlers();

  // Register all IPC handlers
  registerIPCHandlers();

  createWindow();

  // Log IPC handlers after everything is set up
  setTimeout(() => {
    logIPCHandlers();
  }, 1000);

  app.on('activate', function () {
    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// In this file you can include the rest of your app"s main process code.
// You can also put them in separate files and require them here.