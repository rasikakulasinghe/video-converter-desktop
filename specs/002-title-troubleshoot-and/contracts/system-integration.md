# IPC Contracts: System Integration

**Date**: September 16, 2025  
**Service**: System Integration  
**Namespace**: `system:*`

## Overview

This contract defines the IPC communication interface for system integration operations between the renderer and main processes. These operations handle file system interactions, external application launches, and OS-specific features.

## Contract Definitions

### system:show-in-explorer - Show File in Explorer

**Purpose**: Open file manager and highlight specified file or directory

**Request Interface**:
```typescript
interface ShowInExplorerRequest {
  /** Absolute path to file or directory */
  filePath: string
  /** Whether to select the file (true) or just open the directory (false) */
  selectFile?: boolean
}
```

**Response Interface**:
```typescript
interface ShowInExplorerResponse {
  /** Whether operation was successful */
  success: boolean
  /** Error message if operation failed */
  error?: string
  /** Path that was actually opened */
  openedPath?: string
}
```

**Platform Behavior**:
- **Windows**: Uses `explorer.exe /select,"path"` to highlight file
- **macOS**: Uses `open -R "path"` to reveal in Finder
- **Linux**: Uses `xdg-open "directory"` (file selection varies by desktop environment)

**Error Conditions**:
- File not found: `success: false, error: "File does not exist"`
- Path invalid: `success: false, error: "Invalid file path"`
- Permission denied: `success: false, error: "Cannot access file location"`
- System command failed: `success: false, error: "Could not open file explorer"`

---

### system:open-external - Open External URL or Application

**Purpose**: Open URLs in default browser or launch external applications

**Request Interface**:
```typescript
interface OpenExternalRequest {
  /** URL or file path to open */
  url: string
  /** Whether to open in background (if supported) */
  background?: boolean
  /** Application to use for opening (optional) */
  application?: string
}
```

**Response Interface**:
```typescript
interface OpenExternalResponse {
  /** Whether operation was successful */
  success: boolean
  /** Error message if operation failed */
  error?: string
  /** Application that handled the request */
  handledBy?: string
}
```

**Supported URL Schemes**:
- `http://` and `https://` - Web URLs
- `mailto:` - Email addresses
- `file://` - Local files
- `ftp://` - FTP resources
- Custom protocol handlers

**Security Restrictions**:
- Only allow trusted URL schemes
- Validate URLs to prevent security issues
- Block potentially dangerous file types
- Sanitize input parameters

**Error Conditions**:
- Invalid URL: `success: false, error: "Invalid URL format"`
- Unsupported scheme: `success: false, error: "URL scheme not supported"`
- No handler available: `success: false, error: "No application available to handle URL"`
- Security violation: `success: false, error: "URL blocked for security reasons"`

---

### system:get-directories - Get System Directories

**Purpose**: Retrieve common system directory paths

**Request Interface**:
```typescript
interface GetDirectoriesRequest {
  /** Specific directories to retrieve */
  directories?: ('home' | 'desktop' | 'documents' | 'downloads' | 'videos' | 'temp')[]
}
```

**Response Interface**:
```typescript
interface GetDirectoriesResponse {
  /** System directory paths */
  directories: {
    home: string
    desktop: string
    documents: string
    downloads: string
    videos: string
    temp: string
    userData: string
    appData: string
  }
  /** Whether all directories are accessible */
  accessible: boolean
  /** Directories that couldn't be accessed */
  inaccessible?: string[]
}
```

**Platform-Specific Paths**:
- Uses Electron's `app.getPath()` for standard directories
- Handles platform differences automatically
- Provides fallbacks for missing directories

---

### system:get-disk-space - Get Available Disk Space

**Purpose**: Check available disk space for a given path

**Request Interface**:
```typescript
interface GetDiskSpaceRequest {
  /** Path to check (file or directory) */
  path: string
  /** Units for the response */
  units?: 'bytes' | 'kb' | 'mb' | 'gb'
}
```

**Response Interface**:
```typescript
interface GetDiskSpaceResponse {
  /** Whether operation was successful */
  success: boolean
  /** Available space in requested units */
  available: number
  /** Total space in requested units */
  total: number
  /** Used space in requested units */
  used: number
  /** Percentage of space used */
  usedPercentage: number
  /** Error message if check failed */
  error?: string
}
```

**Usage Scenarios**:
- Pre-conversion space validation
- Output directory space checking
- Cleanup recommendations
- Storage management

---

### system:create-directory - Create Directory

**Purpose**: Create directory structure if it doesn't exist

**Request Interface**:
```typescript
interface CreateDirectoryRequest {
  /** Directory path to create */
  path: string
  /** Whether to create parent directories */
  recursive?: boolean
  /** Directory permissions (Unix systems) */
  mode?: number
}
```

**Response Interface**:
```typescript
interface CreateDirectoryResponse {
  /** Whether operation was successful */
  success: boolean
  /** Error message if creation failed */
  error?: string
  /** Whether directory already existed */
  alreadyExists: boolean
  /** Path that was created */
  createdPath: string
}
```

**Error Conditions**:
- Permission denied: `success: false, error: "Permission denied"`
- Invalid path: `success: false, error: "Invalid directory path"`
- Parent directory missing: `success: false, error: "Parent directory does not exist"`
- File system error: `success: false, error: "File system error: {details}"`

---

### system:watch-directory - Directory Change Monitoring

**Purpose**: Monitor directory for file changes (useful for monitoring output directories)

**Request Interface**:
```typescript
interface WatchDirectoryRequest {
  /** Directory path to watch */
  path: string
  /** Whether to watch subdirectories */
  recursive?: boolean
  /** Event types to watch for */
  events?: ('add' | 'change' | 'remove')[]
}
```

**Response Interface**:
```typescript
interface WatchDirectoryResponse {
  /** Whether watch was established */
  success: boolean
  /** Watch ID for stopping later */
  watchId?: string
  /** Error message if watch failed */
  error?: string
}
```

**Event Interface**:
```typescript
interface DirectoryChangeEvent {
  /** Watch ID that generated this event */
  watchId: string
  /** Type of change */
  eventType: 'add' | 'change' | 'remove'
  /** File or directory that changed */
  path: string
  /** Additional file information */
  stats?: {
    size: number
    modified: Date
    isDirectory: boolean
  }
}
```

---

### system:stop-watch - Stop Directory Monitoring

**Purpose**: Stop monitoring a directory for changes

**Request Interface**:
```typescript
interface StopWatchRequest {
  /** Watch ID to stop */
  watchId: string
}
```

**Response Interface**:
```typescript
interface StopWatchResponse {
  /** Whether watch was stopped */
  success: boolean
  /** Error message if stop failed */
  error?: string
}
```

---

## Implementation Requirements

### Native System Integration
- Use Electron's shell module for file operations
- Implement cross-platform path handling
- Handle platform-specific behaviors
- Provide consistent error messages

### Security Measures
- Validate all file paths
- Sanitize external URLs
- Implement permission checks
- Log security-related operations

### Error Handling
- Comprehensive error categorization
- User-friendly error messages
- Fallback behaviors where appropriate
- Detailed logging for debugging

### Performance Considerations
- Efficient directory monitoring
- Proper cleanup of watchers
- Minimal system resource usage
- Responsive UI interactions

## Testing Requirements

### Contract Tests
- Verify IPC channel registration
- Test platform-specific behaviors
- Validate security restrictions
- Confirm error handling

### Integration Tests
- File system operation workflows
- Cross-platform compatibility
- Permission handling
- External application launching

### Security Tests
- URL validation and sanitization
- Path traversal prevention
- Permission boundary testing
- Malicious input handling

### Platform Tests
- Windows Explorer integration
- macOS Finder integration
- Linux file manager support
- Cross-platform path handling

---

**Contract Status**: ✅ COMPLETE - Ready for Implementation