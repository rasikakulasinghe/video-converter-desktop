# API Contracts: Desktop Video Converter

**Date**: September 16, 2025  
**Feature**: Desktop Video Converter  
**Status**: Phase 1 Design  

## Overview

This document defines the internal API contracts for the Desktop Video Converter application. These APIs abstract the underlying FFmpeg operations and provide clean interfaces for the application layers.

## FFmpeg Service API

The FFmpeg service provides video processing capabilities with a clean TypeScript interface.

### Core Service Interface

```typescript
// services/ffmpeg/ffmpeg-service.ts
export interface FFmpegService {
  // Metadata & Validation
  validateFile(filePath: string): Promise<FileValidationResult>
  getMetadata(filePath: string): Promise<VideoMetadata>
  
  // Conversion Operations
  convertVideo(config: ConversionConfig): Promise<ConversionJob>
  cancelConversion(jobId: string): Promise<boolean>
  
  // Progress Monitoring
  onProgress(jobId: string, callback: ProgressCallback): void
  removeProgressListener(jobId: string): void
  
  // System Capabilities
  isAvailable(): Promise<boolean>
  getVersion(): Promise<string>
  getSupportedFormats(): Promise<SupportedFormats>
}
```

### Validation API

#### `validateFile(filePath: string)`
Validates that a file is a valid video and extracts basic information.

**Parameters**:
```typescript
filePath: string              // Absolute path to video file
```

**Returns**:
```typescript
interface FileValidationResult {
  isValid: boolean             // Whether file is a valid video
  error?: string               // Error message if invalid
  quickInfo: {
    duration: number           // Duration in seconds
    hasVideo: boolean          // Has video stream
    hasAudio: boolean          // Has audio stream
    format: string             // Container format
  }
}
```

**Implementation Pattern**:
```typescript
async validateFile(filePath: string): Promise<FileValidationResult> {
  try {
    // Use ffprobe for quick validation
    const probe = await ffprobe(filePath)
    
    const videoStream = probe.streams.find(s => s.codec_type === 'video')
    const audioStream = probe.streams.find(s => s.codec_type === 'audio')
    
    return {
      isValid: !!videoStream,
      quickInfo: {
        duration: parseFloat(probe.format.duration || '0'),
        hasVideo: !!videoStream,
        hasAudio: !!audioStream,
        format: probe.format.format_name || 'unknown'
      }
    }
  } catch (error) {
    return {
      isValid: false,
      error: `Invalid video file: ${error.message}`
    }
  }
}
```

### Metadata API

#### `getMetadata(filePath: string)`
Extracts comprehensive video metadata.

**Returns**:
```typescript
interface VideoMetadata {
  // File Information
  file: {
    path: string
    name: string
    size: number
    lastModified: Date
  }
  
  // Container Information
  container: {
    format: string             // e.g., "mp4", "avi"
    duration: number           // Duration in seconds
    bitrate: number            // Overall bitrate
    startTime: number          // Start time offset
  }
  
  // Video Stream
  video: {
    codec: string              // e.g., "h264", "hevc"
    resolution: {
      width: number
      height: number
    }
    aspectRatio: string        // e.g., "16:9"
    frameRate: number          // Frames per second
    bitrate: number            // Video bitrate
    colorSpace: string         // Color space information
    profile: string            // Codec profile
  }
  
  // Audio Stream (if present)
  audio?: {
    codec: string              // e.g., "aac", "mp3"
    channels: number           // Number of audio channels
    sampleRate: number         // Sample rate in Hz
    bitrate: number            // Audio bitrate
    channelLayout: string      // e.g., "stereo", "5.1"
  }
  
  // Additional Streams
  subtitles: SubtitleStream[]
  metadata: Record<string, string>  // Container metadata tags
  
  // Analysis
  analysis: {
    estimatedSize: number      // Estimated size for different qualities
    recommendations: {
      suggestedFormat: string
      qualityLevels: QualityLevel[]
    }
  }
}

interface SubtitleStream {
  index: number
  language?: string
  title?: string
  codec: string
}

interface QualityLevel {
  name: 'high' | 'medium' | 'low'
  estimatedSize: number
  estimatedBitrate: number
  description: string
}
```

### Conversion API

#### `convertVideo(config: ConversionConfig)`
Starts video conversion with specified configuration.

**Parameters**:
```typescript
interface ConversionConfig {
  // Input/Output
  input: string                // Input file path
  output: string               // Output file path
  
  // Basic Settings
  quality: 'high' | 'medium' | 'low'
  format: 'mp4'                // Output format (MVP: MP4 only)
  
  // Advanced Settings
  video?: {
    codec?: 'h264' | 'h265'    // Video codec
    bitrate?: number           // Target bitrate
    resolution?: {
      width: number
      height: number
    }
    frameRate?: number         // Target frame rate
    preset?: string            // Encoding preset
  }
  
  audio?: {
    codec?: 'aac' | 'mp3'      // Audio codec
    bitrate?: number           // Audio bitrate
    channels?: number          // Number of channels
    sampleRate?: number        // Sample rate
  }
  
  // Processing Options
  startTime?: number           // Start time for trimming
  duration?: number            // Duration for trimming
  overwrite: boolean           // Overwrite existing files
  
  // Performance
  threads?: number             // Number of threads to use
  priority?: 'normal' | 'high' // Processing priority
}
```

**Returns**:
```typescript
interface ConversionJob {
  id: string                   // Unique job identifier
  status: JobStatus
  config: ConversionConfig     // Original configuration
  progress: ConversionProgress // Current progress
  
  // Control Methods
  cancel(): Promise<boolean>
  pause(): Promise<boolean>    // Future enhancement
  resume(): Promise<boolean>   // Future enhancement
  
  // Event Listeners
  onProgress(callback: ProgressCallback): void
  onComplete(callback: CompleteCallback): void
  onError(callback: ErrorCallback): void
}

type JobStatus = 'queued' | 'starting' | 'running' | 'paused' | 'completed' | 'cancelled' | 'error'

type ProgressCallback = (progress: ConversionProgress) => void
type CompleteCallback = (result: ConversionResult) => void
type ErrorCallback = (error: ConversionError) => void
```

### Progress Tracking API

#### Progress Event Structure
```typescript
interface ConversionProgress {
  // Job Information
  jobId: string
  status: JobStatus
  stage: ProcessingStage
  
  // Overall Progress
  percent: number              // 0-100 completion percentage
  
  // Frame Information
  frames: {
    processed: number          // Frames completed
    total: number              // Total frames to process
    dropped: number            // Dropped frames
    duplicated: number         // Duplicated frames
  }
  
  // Time Information
  time: {
    elapsed: number            // Elapsed time in seconds
    remaining?: number         // Estimated remaining time
    speed: number              // Processing speed multiplier
    bitrate: number            // Current bitrate
  }
  
  // Quality Metrics
  quality: {
    currentBitrate: number     // Current output bitrate
    targetBitrate: number      // Target bitrate
    averageBitrate: number     // Average bitrate so far
  }
  
  // System Resources
  system: {
    cpuUsage?: number          // CPU usage percentage
    memoryUsage?: number       // Memory usage in MB
    diskUsage?: number         // Disk I/O usage
  }
  
  // File Information
  output: {
    currentSize: number        // Current output file size
    estimatedSize?: number     // Estimated final size
  }
}

type ProcessingStage = 
  | 'initializing'             // Setting up conversion
  | 'analyzing'                // Analyzing input file
  | 'converting'               // Main conversion process
  | 'finalizing'               // Writing headers, cleanup
  | 'completed'                // Conversion finished
  | 'error'                    // Error occurred
```

### Result API

#### Conversion Result
```typescript
interface ConversionResult {
  success: boolean
  jobId: string
  
  // File Information
  input: {
    path: string
    size: number
  }
  
  output: {
    path: string
    size: number
    valid: boolean             // Whether output file is valid
  }
  
  // Performance Statistics
  statistics: {
    totalTime: number          // Total conversion time
    averageSpeed: number       // Average processing speed
    peakMemory: number         // Peak memory usage
    
    // Quality Comparison
    compressionRatio: number   // Size reduction percentage
    qualityScore?: number      // Quality assessment (0-100)
  }
  
  // Metadata Comparison
  comparison: {
    formatChanged: boolean
    resolutionChanged: boolean
    codecChanged: boolean
    bitrateReduction: number   // Percentage reduction
  }
}
```

## File Service API

The File Service provides file system operations with proper error handling.

### Core Interface

```typescript
export interface FileService {
  // File Operations
  exists(path: string): Promise<boolean>
  getInfo(path: string): Promise<FileInfo>
  createDirectory(path: string): Promise<boolean>
  deleteFile(path: string): Promise<boolean>
  
  // Path Operations
  validatePath(path: string): boolean
  sanitizePath(path: string): string
  generateOutputPath(inputPath: string, format: string): string
  
  // Space Management
  getFreeSpace(path: string): Promise<number>
  estimateRequiredSpace(inputPath: string, quality: string): Promise<number>
}
```

### Implementation Examples

#### `generateOutputPath(inputPath: string, format: string)`
Generates appropriate output path based on input file.

**Logic**:
```typescript
generateOutputPath(inputPath: string, format: string): string {
  const { dir, name } = path.parse(inputPath)
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
  
  // Avoid overwriting by adding suffix
  let outputPath = path.join(dir, `${name}_converted.${format}`)
  let counter = 1
  
  while (this.existsSync(outputPath)) {
    outputPath = path.join(dir, `${name}_converted_${counter}.${format}`)
    counter++
  }
  
  return outputPath
}
```

## Preferences Service API

Manages application settings and user preferences.

### Core Interface

```typescript
export interface PreferencesService {
  // Read Operations
  getPreferences(): Promise<UserPreferences>
  getPreference<T>(key: keyof UserPreferences): Promise<T>
  
  // Write Operations
  setPreferences(preferences: Partial<UserPreferences>): Promise<void>
  setPreference<T>(key: keyof UserPreferences, value: T): Promise<void>
  
  // Reset Operations
  resetToDefaults(): Promise<void>
  resetPreference(key: keyof UserPreferences): Promise<void>
  
  // Validation
  validatePreferences(preferences: Partial<UserPreferences>): ValidationResult
}
```

### Default Preferences

```typescript
const DEFAULT_PREFERENCES: UserPreferences = {
  // File Handling
  defaultOutputPath: '',       // Empty = same as input
  autoOpenOutputFolder: true,
  overwriteExisting: false,
  
  // Conversion Settings
  defaultQuality: 'medium',
  notifyOnComplete: true,
  notifyOnError: true,
  
  // Performance
  ffmpegThreads: 'auto',
  maxMemoryUsage: 2048,        // 2GB default
  
  // UI Settings
  theme: 'system',
  showAdvancedOptions: false,
  minimizeToTray: false,
  
  // History
  saveConversionHistory: true,
  maxHistoryItems: 50,
  
  // Privacy
  analyticsEnabled: false,
  crashReportingEnabled: true
}
```

## History Service API

Tracks conversion history for user reference.

### Core Interface

```typescript
export interface HistoryService {
  // Read Operations
  getHistory(): Promise<ConversionHistoryItem[]>
  getHistoryItem(id: string): Promise<ConversionHistoryItem | null>
  searchHistory(query: string): Promise<ConversionHistoryItem[]>
  
  // Write Operations
  addHistoryItem(item: ConversionHistoryItem): Promise<void>
  updateHistoryItem(id: string, updates: Partial<ConversionHistoryItem>): Promise<void>
  removeHistoryItem(id: string): Promise<void>
  
  // Maintenance
  clearHistory(): Promise<void>
  pruneHistory(): Promise<void>  // Remove old items based on preferences
}
```

### History Item Structure

```typescript
interface ConversionHistoryItem {
  id: string                   // Unique identifier
  timestamp: Date              // When conversion was performed
  
  // File Information
  input: {
    path: string
    name: string
    size: number
  }
  
  output: {
    path: string
    name: string
    size: number
    exists: boolean            // Whether output file still exists
  }
  
  // Conversion Details
  settings: {
    quality: string
    format: string
    customSettings?: any
  }
  
  // Results
  result: {
    success: boolean
    duration: number           // Conversion time
    compressionRatio: number
    error?: string
  }
  
  // Metadata
  tags: string[]               // User-defined tags
  notes?: string               // User notes
  favorite: boolean            // User marked as favorite
}
```

## Notification Service API

Handles system notifications and user alerts.

### Core Interface

```typescript
export interface NotificationService {
  // System Notifications
  showNotification(notification: NotificationConfig): Promise<void>
  showConversionComplete(result: ConversionResult): Promise<void>
  showError(error: string, details?: string): Promise<void>
  
  // Progress Notifications
  showProgressNotification(progress: ConversionProgress): Promise<void>
  hideProgressNotification(): Promise<void>
  
  // Permission Management
  requestPermission(): Promise<boolean>
  hasPermission(): Promise<boolean>
}
```

### Notification Configuration

```typescript
interface NotificationConfig {
  title: string
  message: string
  type: 'info' | 'success' | 'warning' | 'error'
  
  // Behavior
  persistent?: boolean         // Whether notification stays visible
  clickAction?: string         // Action to perform on click
  
  // Appearance
  icon?: string                // Custom icon path
  sound?: boolean              // Whether to play sound
  
  // Actions
  actions?: NotificationAction[]
}

interface NotificationAction {
  text: string
  action: string
  primary?: boolean
}
```

## Error Handling API

Standardized error handling across all services.

### Error Types

```typescript
// Base error class
export class VideoConverterError extends Error {
  constructor(
    message: string,
    public code: string,
    public details?: string,
    public retryable: boolean = false
  ) {
    super(message)
    this.name = 'VideoConverterError'
  }
}

// Specific error types
export class FileNotFoundError extends VideoConverterError {
  constructor(path: string) {
    super(`File not found: ${path}`, 'FILE_NOT_FOUND', undefined, false)
  }
}

export class InvalidVideoError extends VideoConverterError {
  constructor(path: string, reason: string) {
    super(
      `Invalid video file: ${path}`,
      'INVALID_VIDEO',
      reason,
      false
    )
  }
}

export class ConversionError extends VideoConverterError {
  constructor(message: string, details?: string) {
    super(message, 'CONVERSION_FAILED', details, true)
  }
}

export class InsufficientSpaceError extends VideoConverterError {
  constructor(required: number, available: number) {
    super(
      `Insufficient disk space. Required: ${required}MB, Available: ${available}MB`,
      'INSUFFICIENT_SPACE',
      undefined,
      false
    )
  }
}
```

### Error Handler Service

```typescript
export interface ErrorHandlerService {
  // Error Processing
  handleError(error: Error | VideoConverterError): Promise<void>
  formatError(error: Error): FormattedError
  
  // User Feedback
  showErrorToUser(error: FormattedError): Promise<void>
  reportError(error: Error, context?: any): Promise<void>
  
  // Recovery
  suggestRecovery(error: VideoConverterError): RecoveryOption[]
}

interface FormattedError {
  title: string
  message: string
  details?: string
  code: string
  suggestions: string[]
  recoverable: boolean
}

interface RecoveryOption {
  text: string
  action: () => Promise<void>
  primary?: boolean
}
```

## Service Integration

### Service Container

```typescript
// services/service-container.ts
export class ServiceContainer {
  private static instance: ServiceContainer
  
  private services: Map<string, any> = new Map()
  
  // Service Registration
  register<T>(name: string, service: T): void {
    this.services.set(name, service)
  }
  
  // Service Resolution
  get<T>(name: string): T {
    const service = this.services.get(name)
    if (!service) {
      throw new Error(`Service not found: ${name}`)
    }
    return service as T
  }
  
  // Convenience Methods
  get ffmpeg(): FFmpegService {
    return this.get<FFmpegService>('ffmpeg')
  }
  
  get files(): FileService {
    return this.get<FileService>('files')
  }
  
  get preferences(): PreferencesService {
    return this.get<PreferencesService>('preferences')
  }
  
  get history(): HistoryService {
    return this.get<HistoryService>('history')
  }
  
  get notifications(): NotificationService {
    return this.get<NotificationService>('notifications')
  }
  
  get errorHandler(): ErrorHandlerService {
    return this.get<ErrorHandlerService>('errorHandler')
  }
  
  static getInstance(): ServiceContainer {
    if (!ServiceContainer.instance) {
      ServiceContainer.instance = new ServiceContainer()
    }
    return ServiceContainer.instance
  }
}
```

### Service Initialization

```typescript
// main/services/index.ts
export async function initializeServices(): Promise<ServiceContainer> {
  const container = ServiceContainer.getInstance()
  
  // Register all services
  container.register('ffmpeg', new FFmpegServiceImpl())
  container.register('files', new FileServiceImpl())
  container.register('preferences', new PreferencesServiceImpl())
  container.register('history', new HistoryServiceImpl())
  container.register('notifications', new NotificationServiceImpl())
  container.register('errorHandler', new ErrorHandlerServiceImpl())
  
  // Initialize services that need setup
  await container.ffmpeg.initialize()
  await container.preferences.loadPreferences()
  
  return container
}
```

This API contract specification provides clean, type-safe interfaces for all internal services while maintaining separation of concerns and enabling easy testing and maintenance.