# IPC Contracts: App State Management

**Date**: September 16, 2025  
**Service**: App State Management  
**Namespace**: `app:*`

## Overview

This contract defines the IPC communication interface for application state management between the renderer and main processes. These operations handle user preferences, session management, and application lifecycle.

## Contract Definitions

### app:get-preferences - Get User Preferences

**Purpose**: Retrieve current user preferences and settings

**Request Interface**:
```typescript
interface GetPreferencesRequest {
  /** Specific preference categories to retrieve */
  categories?: ('output' | 'conversion' | 'interface' | 'advanced')[]
}
```

**Response Interface**:
```typescript
interface GetPreferencesResponse {
  /** User preferences object */
  preferences: ApplicationPreferences
}

interface ApplicationPreferences {
  output: {
    defaultOutputDirectory: string
    defaultFormat: OutputFormat
    defaultQuality: ConversionQuality
    organizeByDate: boolean
    preserveOriginalNames: boolean
    namingPattern: string
    overwriteExisting: boolean
  }
  conversion: {
    maxConcurrentJobs: number
    autoStart: boolean
    shutdownWhenComplete: boolean
    showNotifications: boolean
    processPriority: 'low' | 'normal' | 'high'
    preserveMetadata: boolean
    generateThumbnails: boolean
  }
  interface: {
    theme: 'light' | 'dark' | 'system'
    language: string
    startMinimized: boolean
    minimizeToTray: boolean
    showProgressInTaskbar: boolean
    rememberLastPath: boolean
  }
  advanced: {
    globalFFmpegArgs: string[]
    hardwareAcceleration: 'auto' | 'enabled' | 'disabled'
    tempDirectory: string
    cleanupTempFiles: boolean
    logLevel: 'error' | 'warn' | 'info' | 'debug'
    enableMetrics: boolean
    maxLogSize: number
  }
  version: string
  updatedAt: Date
}
```

**Default Behavior**:
- Returns all preference categories if none specified
- Provides default values for missing preferences
- Validates preference values before returning

---

### app:set-preferences - Update User Preferences

**Purpose**: Update user preferences and persist to storage

**Request Interface**:
```typescript
interface SetPreferencesRequest {
  /** Preferences to update (partial update supported) */
  preferences: Partial<ApplicationPreferences>
  /** Whether to validate preferences before saving */
  validate?: boolean
}
```

**Response Interface**:
```typescript
interface SetPreferencesResponse {
  /** Whether preferences were saved successfully */
  success: boolean
  /** Error message if save failed */
  error?: string
  /** Whether app restart is required for changes */
  requiresRestart: boolean
  /** Updated preferences */
  preferences: ApplicationPreferences
}
```

**Validation Rules**:
- Output directory must be writable
- Concurrent jobs limit: 1-10
- Naming pattern must be valid template
- Language must be supported
- FFmpeg args must be valid syntax

**Error Conditions**:
- Invalid preference values: `success: false, error: "Invalid preference: {details}"`
- Storage write error: `success: false, error: "Could not save preferences"`
- Permission denied: `success: false, error: "Cannot write to preferences file"`

---

### app:get-session - Get Current Session State

**Purpose**: Retrieve current application session information

**Request Interface**:
```typescript
interface GetSessionRequest {
  /** Whether to include recent files list */
  includeRecentFiles?: boolean
  /** Whether to include active jobs */
  includeActiveJobs?: boolean
}
```

**Response Interface**:
```typescript
interface GetSessionResponse {
  session: {
    id: string
    createdAt: Date
    lastActivity: Date
    activeFiles: VideoFile[]
    recentFiles: RecentFile[]
    activeJobs: ConversionJob[]
    statistics: {
      totalConversions: number
      totalProcessingTime: number
      averageConversionTime: number
      favoriteFormat: string
    }
  }
}

interface RecentFile {
  path: string
  name: string
  lastUsed: Date
  conversions: number
  formats: string[]
}
```

---

### app:update-session - Update Session State

**Purpose**: Update current session with new activity

**Request Interface**:
```typescript
interface UpdateSessionRequest {
  /** Session updates to apply */
  updates: {
    addFile?: VideoFile
    removeFile?: string
    addJob?: ConversionJob
    updateJob?: { jobId: string, updates: Partial<ConversionJob> }
    removeJob?: string
    activity?: 'file-selected' | 'conversion-started' | 'conversion-completed'
  }
}
```

**Response Interface**:
```typescript
interface UpdateSessionResponse {
  /** Updated session state */
  session: GetSessionResponse['session']
  /** Whether update was successful */
  success: boolean
  /** Error message if update failed */
  error?: string
}
```

---

### app:info - Get Application Information

**Purpose**: Retrieve application metadata and system information

**Request Interface**:
```typescript
interface GetAppInfoRequest {
  /** Whether to include system information */
  includeSystem?: boolean
}
```

**Response Interface**:
```typescript
interface GetAppInfoResponse {
  appInfo: {
    name: string
    version: string
    description: string
    author: string
    homepage: string
    license: string
    buildDate: string
    commitHash: string
    environment: 'development' | 'production'
    platform: NodeJS.Platform
    arch: string
    electronVersion: string
    nodeVersion: string
    ffmpegVersion?: string
  }
  systemInfo?: {
    totalMemory: number
    freeMemory: number
    cpuCount: number
    platform: string
    release: string
    uptime: number
  }
}
```

---

### app:quit - Quit Application

**Purpose**: Gracefully shut down the application

**Request Interface**:
```typescript
interface QuitAppRequest {
  /** Whether to force quit (cancel active jobs) */
  force?: boolean
  /** Whether to save session state before quitting */
  saveSession?: boolean
}
```

**Response Interface**:
```typescript
interface QuitAppResponse {
  /** Whether quit process was initiated */
  success: boolean
  /** Error message if quit failed */
  error?: string
  /** Whether there are active jobs to confirm */
  hasActiveJobs?: boolean
  /** Active job count */
  activeJobCount?: number
}
```

**Quit Process**:
1. Check for active conversion jobs
2. Prompt user about active jobs if any
3. Save current session state
4. Clean up temporary files
5. Close all windows
6. Quit application

---

### app:state-changed - State Change Event

**Purpose**: Notification when application state changes

**Event Interface**:
```typescript
interface AppStateChangedEvent {
  /** Type of state change */
  type: 'preferences-updated' | 'session-updated' | 'job-added' | 'job-removed' | 'file-added' | 'file-removed'
  /** Timestamp of change */
  timestamp: Date
  /** Change details */
  details: {
    affectedKeys?: string[]
    addedItems?: any[]
    removedItems?: any[]
    updatedItems?: any[]
  }
}
```

---

## Implementation Requirements

### Storage Integration
- Use electron-store for preferences persistence
- Implement session state caching
- Handle storage errors gracefully
- Provide backup/restore functionality

### State Management
- Maintain in-memory state cache
- Implement change notifications
- Handle concurrent access
- Validate state integrity

### Migration Support
- Version preferences schema
- Provide migration paths
- Handle corrupted preferences
- Default value fallbacks

## Testing Requirements

### Contract Tests
- Verify IPC channel registration
- Test preferences validation
- Confirm session state management
- Validate app info retrieval

### Integration Tests
- End-to-end preference workflow
- Session persistence across restarts
- State synchronization
- Error recovery scenarios

### Performance Tests
- Preference load/save speed
- Session state size limits
- Memory usage monitoring
- Storage cleanup efficiency

---

**Contract Status**: ✅ COMPLETE - Ready for Implementation