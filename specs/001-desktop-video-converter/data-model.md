# Data Model: Desktop Video Converter

**Date**: September 16, 2025  
**Feature**: Desktop Video Converter  
**Status**: Phase 1 Design  

## Overview

This document defines the core data entities and their relationships for the Desktop Video Converter application. The data model supports the primary user flow of selecting video files, configuring conversion settings, monitoring progress, and managing converted outputs.

## Core Entities

### 1. VideoFile Entity

Represents a source video file selected by the user for conversion.

```typescript
interface VideoFile {
  // Identification
  id: string                    // Unique identifier (UUID)
  path: string                  // Absolute file path
  name: string                  // File name with extension
  basename: string              // File name without extension
  extension: string             // File extension (e.g., 'mp4', 'avi')
  
  // File Properties
  size: number                  // File size in bytes
  lastModified: Date            // Last modification timestamp
  
  // Validation State
  isValid: boolean              // File validation status
  validationError?: string      // Error message if invalid
  
  // Metadata (populated after FFprobe)
  metadata?: VideoMetadata      // Video stream information
  thumbnail?: string            // Base64 encoded thumbnail
  
  // Status
  status: FileStatus            // Current processing status
  addedAt: Date                 // When file was selected
}

enum FileStatus {
  SELECTED = 'selected',        // File selected but not validated
  VALIDATING = 'validating',    // FFprobe validation in progress
  VALID = 'valid',              // Validation successful
  INVALID = 'invalid',          // Validation failed
  PROCESSING = 'processing',    // Currently being converted
  COMPLETED = 'completed',      // Conversion completed
  ERROR = 'error'               // Conversion failed
}

interface VideoMetadata {
  // Stream Information
  duration: number              // Duration in seconds
  width: number                 // Video width in pixels
  height: number                // Video height in pixels
  aspectRatio: string           // Aspect ratio (e.g., '16:9')
  frameRate: number             // Frames per second
  bitrate: number               // Bitrate in bits per second
  
  // Codec Information
  videoCodec: string            // Video codec (e.g., 'h264')
  audioCodec: string            // Audio codec (e.g., 'aac')
  format: string                // Container format (e.g., 'mp4')
  
  // Quality Metrics
  totalFrames: number           // Total number of frames
  audioChannels: number         // Number of audio channels
  sampleRate: number            // Audio sample rate
  
  // Creation Info
  creationTime?: Date           // Original creation timestamp
  title?: string                // Embedded title metadata
  comment?: string              // Embedded comment metadata
}
```

### 2. ConversionJob Entity

Represents an active or completed video conversion operation.

```typescript
interface ConversionJob {
  // Identification
  id: string                    // Unique job identifier (UUID)
  sourceFileId: string          // Reference to VideoFile.id
  
  // Input/Output Paths
  inputPath: string             // Source file path
  outputPath: string            // Destination file path
  tempPath?: string             // Temporary file path during conversion
  
  // Conversion Settings
  settings: ConversionSettings  // User-defined conversion parameters
  
  // Progress Tracking
  progress: ConversionProgress  // Current progress state
  
  // Timestamps
  createdAt: Date               // Job creation time
  startedAt?: Date              // Conversion start time
  completedAt?: Date            // Conversion completion time
  
  // Status Management
  status: JobStatus             // Current job status
  error?: ConversionError       // Error details if failed
  
  // Process Control
  processId?: number            // FFmpeg process ID
  canCancel: boolean            // Whether job can be cancelled
  
  // Output Information
  outputSize?: number           // Final output file size
  compressionRatio?: number     // Size reduction percentage
  qualityScore?: number         // Output quality assessment
}

enum JobStatus {
  QUEUED = 'queued',           // Job created but not started
  STARTING = 'starting',       // Initializing conversion process
  CONVERTING = 'converting',   // Active conversion in progress
  FINALIZING = 'finalizing',   // Post-processing (move temp file)
  COMPLETED = 'completed',     // Successfully completed
  CANCELLED = 'cancelled',     // User cancelled operation
  FAILED = 'failed'            // Conversion failed
}

interface ConversionSettings {
  // Output Format
  outputFormat: 'mp4'          // Currently only MP4 supported
  
  // Video Settings
  videoCodec: 'libx264'        // Video codec (H.264 for web optimization)
  videoBitrate?: number        // Target video bitrate (auto if not set)
  resolution?: Resolution      // Target resolution (maintain if not set)
  frameRate?: number           // Target frame rate (maintain if not set)
  
  // Audio Settings
  audioCodec: 'aac'            // Audio codec (AAC for web compatibility)
  audioBitrate?: number        // Target audio bitrate (128kbps default)
  audioChannels?: number       // Audio channels (maintain if not set)
  
  // Quality Settings
  qualityPreset: QualityPreset // User-selected quality level
  crf?: number                 // Constant Rate Factor (calculated from preset)
  
  // Web Optimization
  fastStart: boolean           // Move metadata to beginning for streaming
  webOptimized: boolean        // Apply web-specific optimizations
  
  // Advanced Options
  customFFmpegArgs?: string[]  // Additional FFmpeg arguments
}

enum QualityPreset {
  HIGH = 'high',               // High quality, larger file size
  MEDIUM = 'medium',           // Balanced quality and size
  LOW = 'low'                  // Smaller file, lower quality
}

interface Resolution {
  width: number                // Target width in pixels
  height: number               // Target height in pixels
  maintainAspectRatio: boolean // Whether to preserve aspect ratio
}

interface ConversionProgress {
  // Overall Progress
  percent: number              // Completion percentage (0-100)
  stage: ProgressStage         // Current conversion stage
  
  // Frame Progress
  currentFrame: number         // Frames processed
  totalFrames: number          // Total frames to process
  
  // Performance Metrics
  fps: number                  // Current processing speed (fps)
  speed: number                // Processing speed multiplier
  bitrate: number              // Current output bitrate
  
  // Time Estimates
  elapsed: number              // Elapsed time in seconds
  remaining?: number           // Estimated remaining time
  
  // Size Information
  currentSize: number          // Current output file size
  estimatedSize?: number       // Estimated final file size
  
  // Current Timecode
  timemark: string             // Current position (HH:MM:SS.mmm)
  
  // Resource Usage
  cpuUsage?: number            // CPU utilization percentage
  memoryUsage?: number         // Memory usage in MB
}

enum ProgressStage {
  INITIALIZING = 'initializing', // Setting up conversion
  ANALYZING = 'analyzing',       // Analyzing input file
  CONVERTING = 'converting',     // Active video conversion
  FINALIZING = 'finalizing',     // Post-processing
  COMPLETED = 'completed'        // Conversion finished
}

interface ConversionError {
  code: string                 // Error code for categorization
  message: string              // Human-readable error message
  details?: string             // Technical error details
  suggestion?: string          // Suggested user action
  recoverable: boolean         // Whether error can be retried
  timestamp: Date              // When error occurred
}
```

### 3. ApplicationState Entity

Represents the current state of the application UI and user preferences.

```typescript
interface ApplicationState {
  // UI State
  currentScreen: AppScreen     // Active application screen
  theme: AppTheme              // UI theme preference
  
  // File Management
  selectedFile?: VideoFile     // Currently selected video file
  recentFiles: VideoFile[]     // Recently processed files (max 10)
  
  // Conversion State
  activeJob?: ConversionJob    // Currently active conversion
  jobHistory: ConversionJob[]  // Completed conversion history
  
  // User Preferences
  preferences: UserPreferences // Persistent user settings
  
  // Window State
  windowState: WindowState     // Window position and size
  
  // Application Metadata
  version: string              // Application version
  firstRun: boolean            // Whether this is first application run
  lastUsed: Date               // Last application usage timestamp
}

enum AppScreen {
  MAIN = 'main',               // Primary conversion interface
  SETTINGS = 'settings',       // Application settings
  ABOUT = 'about',             // About dialog
  HISTORY = 'history'          // Conversion history view
}

enum AppTheme {
  SYSTEM = 'system',           // Follow system theme
  LIGHT = 'light',             // Light theme
  DARK = 'dark'                // Dark theme
}

interface UserPreferences {
  // Default Settings
  defaultOutputPath: string    // Default output directory
  defaultQuality: QualityPreset // Default quality setting
  
  // Behavior Settings
  autoOpenOutputFolder: boolean // Open folder after conversion
  confirmBeforeCancel: boolean  // Confirm before cancelling
  saveConversionHistory: boolean // Whether to save history
  
  // Performance Settings
  maxConcurrentJobs: number    // Max simultaneous conversions (1 for MVP)
  ffmpegThreads?: number       // FFmpeg thread count (auto if not set)
  
  // File Management
  cleanupTempFiles: boolean    // Auto-delete temporary files
  overwriteExisting: boolean   // Overwrite existing output files
  
  // UI Preferences
  showProgressDetails: boolean // Show detailed progress info
  minimizeToTray: boolean      // Minimize to system tray
  
  // Notifications
  notifyOnComplete: boolean    // Show completion notifications
  notifyOnError: boolean       // Show error notifications
}

interface WindowState {
  // Position and Size
  x: number                    // Window X position
  y: number                    // Window Y position
  width: number                // Window width
  height: number               // Window height
  
  // State
  isMaximized: boolean         // Whether window is maximized
  isMinimized: boolean         // Whether window is minimized
  isFullscreen: boolean        // Whether window is fullscreen
  
  // Display
  display: number              // Monitor display index
}
```

### 4. AppSession Entity

Represents a single application session with temporary state management.

```typescript
interface AppSession {
  // Session Identity
  sessionId: string            // Unique session identifier
  startTime: Date              // Session start timestamp
  
  // Temporary State
  dragDropActive: boolean      // Whether drag-drop is active
  lastFileDialog: string       // Last file dialog directory
  tempFiles: string[]          // Temporary files to cleanup
  
  // Performance Monitoring
  memoryUsage: number          // Current memory usage
  conversionCount: number      // Conversions in this session
  errorCount: number           // Errors in this session
  
  // Feature Usage
  featuresUsed: string[]       // Features accessed this session
  shortcuts: KeyboardShortcuts // Active keyboard shortcuts
  
  // Cleanup State
  cleanupRequired: boolean     // Whether cleanup is needed on exit
  unsavedChanges: boolean      // Whether there are unsaved preferences
}

interface KeyboardShortcuts {
  selectFile: string           // Keyboard shortcut for file selection
  convert: string              // Keyboard shortcut to start conversion
  cancel: string               // Keyboard shortcut to cancel
  settings: string             // Keyboard shortcut for settings
  quit: string                 // Keyboard shortcut to quit application
}
```

## Entity Relationships

```
VideoFile (1) ←→ (1) ConversionJob
VideoFile (n) ←→ (1) ApplicationState.selectedFile
VideoFile (n) ←→ (n) ApplicationState.recentFiles
ConversionJob (1) ←→ (1) ApplicationState.activeJob
ConversionJob (n) ←→ (n) ApplicationState.jobHistory
ApplicationState (1) ←→ (1) UserPreferences
ApplicationState (1) ←→ (1) WindowState
AppSession (1) ←→ (1) ApplicationState
```

## Data Flow Patterns

### 1. File Selection Flow
```
User Action → VideoFile.create() → FFprobe Validation → VideoFile.metadata
```

### 2. Conversion Flow
```
VideoFile + Settings → ConversionJob.create() → FFmpeg Process → Progress Updates → Completion
```

### 3. State Persistence Flow
```
ApplicationState → UserPreferences → LocalStorage/Registry → Application Restart → State Restoration
```

## Validation Rules

### VideoFile Validation
- `path` must be valid, accessible file path
- `size` must be > 0 and < 50GB (practical limit)
- `extension` must be in supported format list
- `metadata.duration` must be > 0 seconds and < 24 hours

### ConversionJob Validation
- `inputPath` must reference valid VideoFile
- `outputPath` must be writable directory
- `settings.qualityPreset` must be valid enum value
- `progress.percent` must be 0-100 range

### ApplicationState Validation
- `recentFiles` maximum 10 items, auto-pruned
- `jobHistory` maximum 100 items, auto-pruned by age
- `preferences` must have valid default values

## Storage Strategy

### Temporary Storage
- **VideoFile metadata**: In-memory during session
- **ConversionProgress**: In-memory with IPC communication
- **TempFiles**: System temp directory with cleanup

### Persistent Storage
- **UserPreferences**: Electron store (JSON file)
- **WindowState**: Electron store (JSON file)
- **JobHistory**: Electron store with rotation
- **RecentFiles**: Electron store (file paths only)

### Security Considerations
- File paths validated before access
- No sensitive data in persistent storage
- Temporary files cleaned on exit
- Input validation on all user data

## Future Extensions

### Planned Enhancements
- **Batch Processing**: Multiple VideoFile entities in single job
- **Presets**: Named ConversionSettings templates
- **Scheduling**: Time-based job execution
- **Cloud Storage**: Remote input/output paths
- **Plugins**: Extensible conversion pipeline

### Data Model Impacts
- ConversionJob would support multiple input files
- New PresetTemplate entity for saved settings
- JobSchedule entity for time-based execution
- CloudPath entity for remote file handling

This data model provides a robust foundation for the Desktop Video Converter application while maintaining flexibility for future enhancements.