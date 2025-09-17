# IPC Contracts: Conversion Operations

**Date**: September 16, 2025  
**Service**: Conversion Operations  
**Namespace**: `conversion:*`

## Overview

This contract defines the IPC communication interface for video conversion operations between the renderer and main processes. These operations handle starting conversions, tracking progress, and managing conversion jobs.

## Contract Definitions

### conversion:start - Start Video Conversion

**Purpose**: Begin video conversion process with specified settings

**Request Interface**:
```typescript
interface StartConversionRequest {
  /** Input video file information */
  inputFile: {
    path: string
    metadata: VideoMetadata
  }
  /** Output file path */
  outputPath: string
  /** Conversion settings */
  settings: {
    format: OutputFormat
    quality: ConversionQuality
    resolution?: { width: number, height: number }
    bitrate?: number
    frameRate?: number
    maintainAspectRatio: boolean
    customArgs?: string[]
  }
  /** Job priority (normal, high, low) */
  priority?: string
}
```

**Response Interface**:
```typescript
interface StartConversionResponse {
  /** Whether conversion started successfully */
  success: boolean
  /** Unique job identifier */
  jobId?: string
  /** Error message if start failed */
  error?: string
  /** Estimated conversion time in seconds */
  estimatedDuration?: number
}
```

**Conversion Process**:
1. Validate input file and output path
2. Check available disk space
3. Generate unique job ID
4. Initialize FFmpeg process with settings
5. Begin progress tracking
6. Return job ID for monitoring

**Error Conditions**:
- Input file not accessible: `success: false, error: "Cannot read input file"`
- Output path invalid: `success: false, error: "Invalid output location"`
- Insufficient disk space: `success: false, error: "Not enough disk space"`
- FFmpeg not available: `success: false, error: "Video converter not available"`
- Invalid settings: `success: false, error: "Invalid conversion settings"`

---

### conversion:cancel - Cancel Conversion Job

**Purpose**: Cancel an ongoing conversion process

**Request Interface**:
```typescript
interface CancelConversionRequest {
  /** Job ID to cancel */
  jobId: string
  /** Whether to delete partial output file */
  cleanupOutput?: boolean
}
```

**Response Interface**:
```typescript
interface CancelConversionResponse {
  /** Whether cancellation was successful */
  success: boolean
  /** Error message if cancellation failed */
  error?: string
  /** Whether output file was cleaned up */
  outputCleaned?: boolean
}
```

**Cancellation Process**:
1. Locate active conversion job
2. Send termination signal to FFmpeg process
3. Wait for graceful shutdown
4. Clean up temporary files
5. Remove partial output if requested

**Error Conditions**:
- Job not found: `success: false, error: "Job not found"`
- Job already completed: `success: false, error: "Job already finished"`
- Process termination failed: `success: false, error: "Could not stop conversion"`

---

### conversion:progress - Progress Updates (Event)

**Purpose**: Real-time progress updates sent from main to renderer process

**Event Interface**:
```typescript
interface ProgressEvent {
  /** Job ID for this progress update */
  jobId: string
  /** Current progress information */
  progress: {
    percentage: number          // 0-100
    stage: string              // "analyzing", "converting", "finalizing"
    currentTime: number        // seconds processed
    totalTime: number          // total video duration
    speed: number              // processing speed multiplier
    bitrate: number            // current bitrate
    frame: number              // current frame
    fps: number                // processing fps
    eta: number                // estimated time remaining in seconds
  }
}
```

**Event Frequency**: Updates sent every 500ms during active conversion

**Progress Stages**:
- `analyzing` - Analyzing input file
- `converting` - Processing video/audio
- `finalizing` - Writing output file
- `complete` - Conversion finished

---

### conversion:complete - Conversion Complete (Event)

**Purpose**: Notification when conversion finishes successfully

**Event Interface**:
```typescript
interface CompletedEvent {
  /** Job ID that completed */
  jobId: string
  /** Output file path */
  outputPath: string
  /** Conversion statistics */
  stats: {
    startTime: Date
    endTime: Date
    duration: number           // total conversion time
    inputSize: number          // input file size
    outputSize: number         // output file size
    compressionRatio: number   // size reduction ratio
  }
}
```

---

### conversion:error - Conversion Failed (Event)

**Purpose**: Notification when conversion fails with error

**Event Interface**:
```typescript
interface FailedEvent {
  /** Job ID that failed */
  jobId: string
  /** Error message */
  error: string
  /** Detailed error information */
  details?: {
    ffmpegError?: string
    exitCode?: number
    stage?: string
    lastProgress?: ProgressEvent
  }
  /** Whether partial output was created */
  partialOutput?: string
}
```

---

## Implementation Requirements

### Main Process Handler Registration
```typescript
// In electron/main.ts
import { ConversionOperationsHandlers } from './handlers'

// Register handlers during app initialization
const conversionHandlers = new ConversionOperationsHandlers()
```

### Service Integration
```typescript
// In electron/handlers/conversion-operations.handlers.ts
export class ConversionOperationsHandlers {
  private conversionService: ConversionService

  constructor() {
    this.conversionService = ConversionService.getInstance()
    this.registerHandlers()
    this.setupEventListeners()
  }

  private registerHandlers(): void {
    ipcMain.handle('conversion:start', this.handleStartConversion.bind(this))
    ipcMain.handle('conversion:cancel', this.handleCancelConversion.bind(this))
  }

  private setupEventListeners(): void {
    this.conversionService.on('progress', this.sendProgressUpdate.bind(this))
    this.conversionService.on('complete', this.sendCompletionEvent.bind(this))
    this.conversionService.on('error', this.sendErrorEvent.bind(this))
  }
}
```

### FFmpeg Integration
- Use fluent-ffmpeg for conversion operations
- Implement progress parsing from FFmpeg output
- Handle process lifecycle (start, monitor, terminate)
- Manage temporary files and cleanup

### Concurrent Job Management
- Support multiple simultaneous conversions
- Implement job queue with priority handling
- Resource management (CPU, memory, disk)
- Fair scheduling and resource allocation

## Testing Requirements

### Contract Tests
- Verify IPC channel registration for all operations
- Test request/response interfaces
- Validate event emission and handling
- Confirm error scenarios

### Integration Tests
- End-to-end conversion workflow
- Progress tracking accuracy
- Cancellation handling
- Concurrent job management
- Error recovery scenarios

### Performance Tests
- Conversion speed benchmarks
- Memory usage monitoring
- Concurrent job limits
- Resource cleanup verification

### Test Data
- Various video formats and sizes
- Different quality settings
- Edge cases (very short/long videos)
- Corrupted input files
- Disk space limitations

---

**Contract Status**: ✅ COMPLETE - Ready for Implementation