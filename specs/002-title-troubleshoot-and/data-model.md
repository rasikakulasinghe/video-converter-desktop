# Data Model: Troubleshoot and Fix Video Converter App

**Date**: September 16, 2025  
**Feature**: Troubleshoot and Fix Video Converter App  
**Phase**: 1 - Design & Contracts

## Entity Overview

This data model defines the core entities and their relationships for the video converter application's troubleshooting and fix implementation. The model focuses on restoring proper IPC communication and service integration.

## Core Entities

### VideoFile
Represents input video files with metadata, validation status, and processing information.

**Properties**:
- `path: string` - Absolute file path to the video file
- `name: string` - Display name of the file
- `size: number` - File size in bytes
- `format: string` - Video format (mp4, avi, mov, etc.)
- `duration: number` - Video duration in seconds
- `resolution: { width: number, height: number }` - Video dimensions
- `bitrate: number` - Video bitrate in kbps
- `codec: string` - Video codec information
- `isValid: boolean` - Whether file passed validation
- `validationError?: string` - Error message if validation failed
- `metadata: VideoMetadata` - Additional video metadata
- `addedAt: Date` - When file was added to the app
- `lastModified: Date` - File system last modified date

**Validation Rules**:
- Path must be absolute and file must exist
- File extension must be in supported formats list
- File size must be > 0 and < 10GB (configurable limit)
- Video must be readable by FFmpeg

**State Transitions**:
```
Unknown → Validating → Valid/Invalid
Valid → Processing → Converted/Failed
```

### ConversionJob
Represents active or completed video conversion tasks with progress tracking and settings.

**Properties**:
- `id: string` - Unique job identifier (UUID)
- `inputFile: VideoFile` - Source video file
- `outputPath: string` - Target file path for converted video
- `settings: ConversionSettings` - Conversion configuration
- `status: ConversionStatus` - Current job status
- `progress: ConversionProgress` - Real-time progress information
- `startTime: Date` - When conversion began
- `endTime?: Date` - When conversion completed
- `error?: string` - Error message if conversion failed
- `cancelRequested: boolean` - Whether user requested cancellation
- `pid?: number` - FFmpeg process ID for cancellation

**Status Values**:
- `pending` - Job created but not started
- `processing` - Conversion in progress
- `completed` - Successfully finished
- `failed` - Conversion failed with error
- `cancelled` - User cancelled the operation

**State Transitions**:
```
pending → processing → completed/failed/cancelled
processing → cancelled (user action)
```

### ConversionSettings
User-configurable options for video conversion output.

**Properties**:
- `format: OutputFormat` - Target video format (mp4, avi, mov, etc.)
- `quality: ConversionQuality` - Quality preset (low, medium, high, custom)
- `resolution?: { width: number, height: number }` - Target resolution (optional)
- `bitrate?: number` - Target bitrate in kbps (optional)
- `frameRate?: number` - Target frame rate (optional)
- `maintainAspectRatio: boolean` - Whether to preserve aspect ratio
- `customArgs?: string[]` - Custom FFmpeg arguments for advanced users

**Validation Rules**:
- Format must be supported by FFmpeg
- Quality preset must be valid
- Custom resolution must have positive dimensions
- Bitrate must be between 100 and 50000 kbps
- Frame rate must be between 1 and 120 fps

### ConversionProgress
Real-time progress information for ongoing conversions.

**Properties**:
- `percentage: number` - Completion percentage (0-100)
- `stage: string` - Current processing stage description
- `currentTime: number` - Current processing time in seconds
- `totalTime: number` - Total video duration in seconds
- `speed: number` - Processing speed multiplier
- `bitrate: number` - Current processing bitrate
- `frame: number` - Current frame being processed
- `fps: number` - Frames per second being processed
- `eta: number` - Estimated time to completion in seconds

**Update Frequency**: Real-time updates every 500ms during conversion

### ApplicationPreferences
Persistent user settings for application behavior and defaults.

**Properties**:
- `output: OutputPreferences` - Default output settings
- `conversion: ConversionPreferences` - Conversion behavior settings
- `interface: InterfacePreferences` - UI and interaction settings
- `advanced: AdvancedPreferences` - Advanced configuration options
- `version: string` - Preferences version for migration
- `updatedAt: Date` - Last update timestamp

**Persistence**: Stored using electron-store in user data directory

### IPC Communication Entities

### IPCResponse<T>
Standard response wrapper for all IPC communication.

**Properties**:
- `success: boolean` - Whether operation succeeded
- `data?: T` - Response data if successful
- `error?: string` - Error message if failed
- `details?: string` - Additional error context
- `errorCode?: string` - Structured error identifier
- `timestamp: Date` - Response timestamp

### IPCChannel
Represents IPC communication channels between main and renderer processes.

**Channel Categories**:
- `file:*` - File operations (select, validate, save location)
- `conversion:*` - Video conversion operations (start, cancel, progress)
- `app:*` - Application state management (preferences, session)
- `system:*` - System integration (explorer, external links)

**Error Recovery**: Each channel implements timeout and retry logic

## Entity Relationships

### Core Workflow Relationships
```
User → VideoFile → ConversionJob → ConversionProgress
                ↓
ApplicationPreferences → ConversionSettings
```

### IPC Communication Flow
```
Renderer Process → IPCChannel → Main Process → Service → IPCResponse
                                                ↓
                              FileOperationsService
                              ConversionService
                              AppStateService
                              SystemIntegrationService
```

### Service Dependencies
```
ConversionService → VideoFile validation
                 → FFmpeg integration
                 → Progress tracking
                 → File system operations

FileOperationsService → File validation
                     → Directory selection
                     → File metadata extraction

AppStateService → ApplicationPreferences
               → Session management
               → State persistence
```

## Error States and Recovery

### File Operation Errors
- **Invalid file path**: Return validation error with suggested action
- **Unsupported format**: Provide list of supported formats
- **File access denied**: Check permissions and suggest solutions
- **File not found**: Verify path and suggest re-selection

### Conversion Errors
- **FFmpeg not available**: Guide user to installation or bundled binary
- **Insufficient disk space**: Calculate required space and suggest cleanup
- **Codec not supported**: Suggest alternative formats or codecs
- **Process killed**: Detect interruption and offer restart option

### IPC Communication Errors
- **Handler not registered**: Log error and provide fallback UI
- **Service not initialized**: Restart service initialization
- **Timeout**: Retry with exponential backoff
- **Invalid request**: Validate input and provide error details

## Data Validation and Constraints

### File Validation
- Maximum file size: 10GB (configurable)
- Supported formats: MP4, AVI, MOV, MKV, WMV, FLV, WEBM, M4V
- Path validation: Must be absolute, accessible, and exist
- Content validation: Must be readable by FFmpeg

### Conversion Constraints
- Maximum concurrent jobs: 3 (configurable based on system resources)
- Output file validation: Prevent overwriting without confirmation
- Temporary file cleanup: Automatic cleanup on cancellation or failure
- Progress validation: Ensure progress values are within valid ranges

### IPC Communication Constraints
- Request timeout: 30 seconds for file operations, 5 minutes for conversions
- Message size limit: 10MB for large data transfers
- Channel naming: Consistent namespace convention (service:operation)
- Error handling: Comprehensive error context for debugging

## Testing Data Requirements

### Valid Test Data
- Sample video files in each supported format
- Various file sizes (small: <10MB, medium: 100MB, large: 1GB)
- Different resolutions (480p, 720p, 1080p, 4K)
- Various durations (short: <1min, medium: 5min, long: 30min)

### Invalid Test Data
- Corrupted video files
- Unsupported formats
- Files exceeding size limits
- Non-existent file paths
- Permission-restricted files

### Edge Cases
- Zero-byte files
- Files with special characters in paths
- Network-mounted files
- Read-only directories for output
- Simultaneous conversion requests

---

**Data Model Status**: ✅ COMPLETE - Ready for Contract Generation