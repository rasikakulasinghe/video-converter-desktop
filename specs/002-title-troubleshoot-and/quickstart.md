# Quickstart Guide: Video Converter App Troubleshooting

**Date**: September 16, 2025  
**Feature**: Troubleshoot and Fix Video Converter App  
**Purpose**: Systematic guide for debugging and fixing the video converter application

## Overview

This quickstart guide provides a systematic approach to troubleshooting and fixing the broken video converter Electron application. Follow these steps in order to diagnose and resolve the IPC communication issues that prevent the app from functioning properly.

## Prerequisites

Before starting the troubleshooting process, ensure you have:

- Node.js 18+ installed
- npm or yarn package manager
- Git for version control
- Code editor (VS Code recommended)
- Administrator privileges (if needed for file operations)

## Quick Diagnosis (5 minutes)

### Step 1: Verify App Startup
```bash
# Navigate to project directory
cd "d:\Projects\Current Projects\Video Converter Project"

# Install dependencies
npm install

# Start the app in development mode
npm run dev
```

**Expected Behavior**: App should start and show the main window
**If Failed**: Check for dependency issues or compilation errors

### Step 2: Test Basic UI
1. Open the video converter app
2. Click "Select File" button
3. Observe any error messages in the console

**Expected Behavior**: File dialog should open
**If Failed**: IPC communication is broken (proceed to systematic diagnosis)

### Step 3: Check Console Errors
- Open DevTools in the app (F12)
- Look for IPC-related errors
- Check the main process console for errors

**Common Error Patterns**:
- `IPC handler not found`
- `electronAPI is undefined`
- `Service not initialized`

## Systematic Troubleshooting Process

### Phase 1: IPC Channel Verification (10 minutes)

#### 1.1 Check IPC Handler Registration
```typescript
// In electron/main.ts
console.log('Registered IPC handlers:', ipcMain.eventNames())
```

**What to look for**:
- Should see `file:select`, `file:validate`, `conversion:start`, etc.
- If missing, handlers aren't being registered

#### 1.2 Verify Service Instantiation
```typescript
// Add debug logging in main.ts
import { FileOperationsService } from './services'

console.log('FileOperationsService instance:', FileOperationsService.getInstance())
```

**What to look for**:
- Service should initialize without errors
- If undefined or throws error, service setup is broken

#### 1.3 Test Basic IPC Communication
Create a test handler to verify IPC pipeline:
```typescript
// In main.ts
ipcMain.handle('test:ping', () => {
  console.log('Ping received in main process')
  return 'pong'
})
```

Then test from renderer:
```typescript
// In renderer (DevTools console)
window.electronAPI.test?.ping().then(console.log)
```

**Expected**: Should log "pong" in renderer console and "Ping received" in main console

### Phase 2: Service Layer Testing (15 minutes)

#### 2.1 Test File Operations Service
```typescript
// Add to main.ts for testing
async function testFileService() {
  const service = FileOperationsService.getInstance()
  try {
    const result = await service.selectFiles()
    console.log('File service test:', result)
  } catch (error) {
    console.error('File service error:', error)
  }
}

// Call after app ready
app.whenReady().then(testFileService)
```

#### 2.2 Test Conversion Service
```typescript
// Test conversion service initialization
async function testConversionService() {
  const service = ConversionService.getInstance()
  console.log('Conversion service initialized:', !!service)
  
  // Test FFmpeg availability
  const ffmpegPath = require('ffmpeg-static')
  console.log('FFmpeg path:', ffmpegPath)
}
```

#### 2.3 Verify Service Dependencies
Check that all required services can be imported and initialized:
```typescript
import { 
  FileOperationsService,
  ConversionService 
} from './services'

console.log('Services available:', {
  file: !!FileOperationsService,
  conversion: !!ConversionService
})
```

### Phase 3: End-to-End Workflow Testing (20 minutes)

#### 3.1 File Selection Workflow
1. Start app with debugging enabled
2. Click "Select File" button
3. Trace the complete flow:
   - UI click event
   - IPC call to main process
   - Service method execution
   - Response back to renderer
   - UI update

#### 3.2 File Validation Workflow
1. Select a test video file
2. Verify validation process:
   - File path validation
   - FFmpeg metadata extraction
   - Response format compliance

#### 3.3 Conversion Workflow (if file operations work)
1. Configure conversion settings
2. Start conversion process
3. Monitor progress updates
4. Verify completion handling

## Common Issues and Solutions

### Issue 1: IPC Handlers Not Registered
**Symptoms**: `No handler registered for 'file:select'` errors

**Diagnosis**:
```typescript
// Check what handlers are actually registered
console.log('IPC handlers:', ipcMain.eventNames())
```

**Solution**:
```typescript
// In main.ts, ensure handlers are registered before app.whenReady()
import { 
  FileOperationsHandlers,
  ConversionOperationsHandlers,
  AppStateHandlers,
  SystemIntegrationHandlers 
} from './handlers'

// Register all handlers
new FileOperationsHandlers()
new ConversionOperationsHandlers()
new AppStateHandlers()
new SystemIntegrationHandlers()
```

### Issue 2: Service Classes Not Instantiated
**Symptoms**: Services are undefined or throw initialization errors

**Diagnosis**:
```typescript
// Test service instantiation
try {
  const fileService = FileOperationsService.getInstance()
  console.log('File service OK')
} catch (error) {
  console.error('File service failed:', error)
}
```

**Solution**:
- Check service constructor logic
- Verify dependencies are available
- Ensure singleton pattern is properly implemented

### Issue 3: FFmpeg Not Available
**Symptoms**: Video validation and conversion fail

**Diagnosis**:
```typescript
const ffmpegPath = require('ffmpeg-static')
const fs = require('fs')

console.log('FFmpeg path:', ffmpegPath)
console.log('FFmpeg exists:', fs.existsSync(ffmpegPath))
```

**Solution**:
- Verify ffmpeg-static installation
- Check file permissions
- Test FFmpeg execution

### Issue 4: Preload Script Issues
**Symptoms**: `electronAPI` is undefined in renderer

**Diagnosis**:
- Check preload script is properly loaded
- Verify context isolation settings
- Test API exposure

**Solution**:
```typescript
// In preload.ts, ensure proper API exposure
contextBridge.exposeInMainWorld('electronAPI', api)
```

## Validation Steps

After implementing fixes, validate the repair:

### 1. Basic Functionality Test
- [ ] App starts without errors
- [ ] File selection dialog opens
- [ ] File validation works
- [ ] Conversion process starts
- [ ] Progress tracking functions
- [ ] Conversion completes successfully

### 2. Error Handling Test
- [ ] Invalid file selection shows proper error
- [ ] Insufficient disk space is detected
- [ ] Conversion cancellation works
- [ ] Network disconnection is handled gracefully

### 3. Performance Test
- [ ] UI remains responsive during conversion
- [ ] Multiple concurrent conversions work
- [ ] Memory usage is reasonable
- [ ] CPU usage is appropriate

## Debugging Tools and Commands

### Useful Console Commands
```bash
# View main process logs
npm run dev 2>&1 | grep "Main Process"

# Check IPC communication
# (In renderer DevTools)
Object.keys(window.electronAPI)

# Test specific API calls
window.electronAPI.file.select().then(console.log)
```

### Log File Locations
- **Windows**: `%APPDATA%/video-converter-desktop/logs/`
- **macOS**: `~/Library/Logs/video-converter-desktop/`
- **Linux**: `~/.config/video-converter-desktop/logs/`

### Environment Variables for Debugging
```bash
# Enable verbose logging
ELECTRON_LOG_LEVEL=debug npm run dev

# Enable DevTools in production
ELECTRON_IS_DEV=true npm start
```

## Recovery Checklist

If the systematic approach doesn't resolve issues:

- [ ] Clean install dependencies (`rm -rf node_modules && npm install`)
- [ ] Clear Electron cache
- [ ] Reset user preferences
- [ ] Check for OS-specific issues
- [ ] Verify FFmpeg binary integrity
- [ ] Test with minimal configuration
- [ ] Consult error logs for stack traces

## Success Criteria

The troubleshooting is complete when:

1. ✅ All IPC channels are properly registered
2. ✅ Service classes are instantiated and functional
3. ✅ File operations work end-to-end
4. ✅ Video conversion process is operational
5. ✅ Error handling provides meaningful feedback
6. ✅ UI remains responsive throughout operations
7. ✅ System integration features function correctly

## Next Steps

After completing this quickstart:

1. Run comprehensive test suite
2. Update documentation
3. Implement monitoring and logging improvements
4. Plan preventive measures for similar issues

---

**Quickstart Status**: ✅ COMPLETE - Ready for Implementation and Testing