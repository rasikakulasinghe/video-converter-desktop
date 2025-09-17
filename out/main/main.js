"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
const electron = require("electron");
const path = require("path");
const utils = require("@electron-toolkit/utils");
const log = require("electron-log");
const fs = require("fs");
const ffprobe = require("ffprobe-static");
const child_process = require("child_process");
const events = require("events");
const ffmpeg = require("ffmpeg-static");
class LoggingService {
  static instance;
  constructor() {
    this.configureLogging();
  }
  static getInstance() {
    if (!LoggingService.instance) {
      LoggingService.instance = new LoggingService();
    }
    return LoggingService.instance;
  }
  configureLogging() {
    const logPath = path.join(electron.app.getPath("logs"), "video-converter.log");
    log.transports.file.level = "debug";
    log.transports.file.maxSize = 10 * 1024 * 1024;
    log.transports.file.format = "[{y}-{m}-{d} {h}:{i}:{s}.{ms}] [{level}] {text}";
    log.transports.file.fileName = "video-converter.log";
    log.transports.console.level = "info";
    log.transports.console.format = "[{h}:{i}:{s}] [{level}] {text}";
    log.hooks.push((message, transport) => {
      if (transport === log.transports.file) {
        message.data.unshift(`[PID:${process.pid}]`);
      }
      return message;
    });
    this.info("LoggingService", "initialize", { logPath });
  }
  /**
   * Log IPC-related events for troubleshooting
   */
  logIPC(direction, channel, data) {
    const context = {
      component: "IPC",
      operation: `${direction}:${channel}`,
      metadata: {
        direction,
        channel,
        dataType: typeof data,
        timestamp: (/* @__PURE__ */ new Date()).toISOString()
      }
    };
    if (data && typeof data === "object") {
      context.metadata.dataKeys = Object.keys(data);
    }
    this.debug(context.component, context.operation, context.metadata);
  }
  /**
   * Log service lifecycle events
   */
  logService(serviceName, event, details) {
    const context = {
      component: "Service",
      operation: `${serviceName}:${event}`,
      metadata: {
        serviceName,
        event,
        details,
        timestamp: (/* @__PURE__ */ new Date()).toISOString()
      }
    };
    if (event === "error") {
      this.error(context.component, context.operation, context.metadata);
    } else {
      this.info(context.component, context.operation, context.metadata);
    }
  }
  /**
   * Log conversion process events
   */
  logConversion(jobId, stage, progress, error) {
    const context = {
      component: "Conversion",
      operation: `job:${stage}`,
      metadata: {
        jobId,
        stage,
        progress,
        error,
        timestamp: (/* @__PURE__ */ new Date()).toISOString()
      }
    };
    if (error) {
      this.error(context.component, context.operation, context.metadata);
    } else {
      this.info(context.component, context.operation, context.metadata);
    }
  }
  /**
   * Log file operation events
   */
  logFileOperation(operation, filePath, success, error) {
    const context = {
      component: "FileOps",
      operation,
      metadata: {
        filePath,
        success,
        error,
        timestamp: (/* @__PURE__ */ new Date()).toISOString()
      }
    };
    if (error) {
      this.error(context.component, context.operation, context.metadata);
    } else {
      this.info(context.component, context.operation, context.metadata);
    }
  }
  /**
   * Log troubleshooting checkpoints
   */
  logCheckpoint(checkpoint, status, details) {
    const context = {
      component: "Troubleshooting",
      operation: checkpoint,
      metadata: {
        status,
        details,
        timestamp: (/* @__PURE__ */ new Date()).toISOString()
      }
    };
    switch (status) {
      case "pass":
        this.info(context.component, `✅ ${context.operation}`, context.metadata);
        break;
      case "fail":
        this.error(context.component, `❌ ${context.operation}`, context.metadata);
        break;
      case "warn":
        this.warn(context.component, `⚠️ ${context.operation}`, context.metadata);
        break;
    }
  }
  // Base logging methods
  debug(component, operation, metadata) {
    const message = this.formatMessage(component, operation, metadata);
    log.debug(message);
  }
  info(component, operation, metadata) {
    const message = this.formatMessage(component, operation, metadata);
    log.info(message);
  }
  warn(component, operation, metadata) {
    const message = this.formatMessage(component, operation, metadata);
    log.warn(message);
  }
  error(component, operation, metadata) {
    const message = this.formatMessage(component, operation, metadata);
    log.error(message);
  }
  formatMessage(component, operation, metadata) {
    let message = `[${component}] ${operation}`;
    if (metadata && Object.keys(metadata).length > 0) {
      const metadataStr = JSON.stringify(metadata, null, 0);
      message += ` | ${metadataStr}`;
    }
    return message;
  }
  /**
   * Get current log file path for debugging
   */
  getLogPath() {
    return path.join(electron.app.getPath("logs"), "video-converter.log");
  }
  /**
   * Enable verbose logging for troubleshooting
   */
  enableVerboseLogging() {
    log.transports.console.level = "debug";
    log.transports.file.level = "debug";
    this.info("LoggingService", "enableVerboseLogging", { level: "debug" });
  }
  /**
   * Disable verbose logging
   */
  disableVerboseLogging() {
    log.transports.console.level = "info";
    log.transports.file.level = "info";
    this.info("LoggingService", "disableVerboseLogging", { level: "info" });
  }
}
const SUPPORTED_VIDEO_FORMATS = [
  ".mp4",
  ".avi",
  ".mkv",
  ".mov",
  ".wmv",
  ".flv",
  ".webm",
  ".m4v",
  ".3gp",
  ".ogv"
];
const VIDEO_MIME_TYPES = {
  ".mp4": "video/mp4",
  ".avi": "video/x-msvideo",
  ".mkv": "video/x-matroska",
  ".mov": "video/quicktime",
  ".wmv": "video/x-ms-wmv",
  ".flv": "video/x-flv",
  ".webm": "video/webm",
  ".m4v": "video/x-m4v",
  ".3gp": "video/3gpp",
  ".ogv": "video/ogg"
};
const VideoFileUtils = {
  /**
   * Check if a file extension is supported
   */
  isSupportedFormat(extension) {
    return SUPPORTED_VIDEO_FORMATS.includes(extension.toLowerCase());
  },
  /**
   * Get MIME type for a file extension
   */
  getMimeType(extension) {
    return VIDEO_MIME_TYPES[extension.toLowerCase()] || "application/octet-stream";
  },
  /**
   * Create a new VideoFile instance
   */
  create(filePath) {
    const name = filePath.split(/[/\\]/).pop() || "";
    const extension = "." + name.split(".").pop()?.toLowerCase() || "";
    return {
      name,
      path: filePath,
      extension,
      mimeType: VideoFileUtils.getMimeType(extension)
    };
  },
  /**
   * Generate a unique ID for a video file
   */
  generateId() {
    return `video_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  },
  /**
   * Format file size for display
   */
  formatFileSize(bytes) {
    if (bytes === 0)
      return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  },
  /**
   * Format duration for display
   */
  formatDuration(seconds) {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor(seconds % 3600 / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, "0")}:${remainingSeconds.toString().padStart(2, "0")}`;
    }
    return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`;
  }
};
const QUALITY_PRESETS = {
  low: {
    quality: "low",
    bitrate: 5e5,
    // 500 kbps
    resolution: "854x480",
    frameRate: 24,
    audioCodec: "aac",
    audioBitrate: 96e3
    // 96 kbps
  },
  medium: {
    quality: "medium",
    bitrate: 15e5,
    // 1.5 Mbps
    resolution: "1280x720",
    frameRate: 30,
    audioCodec: "aac",
    audioBitrate: 128e3
    // 128 kbps
  },
  high: {
    quality: "high",
    bitrate: 4e6,
    // 4 Mbps
    resolution: "1920x1080",
    frameRate: 30,
    audioCodec: "aac",
    audioBitrate: 192e3
    // 192 kbps
  },
  ultra: {
    quality: "ultra",
    bitrate: 8e6,
    // 8 Mbps
    resolution: "1920x1080",
    frameRate: 60,
    audioCodec: "aac",
    audioBitrate: 256e3
    // 256 kbps
  },
  custom: {
    quality: "custom"
    // Custom settings provided by user
  }
};
const ConversionJobUtils = {
  /**
   * Generate a unique job ID
   */
  generateId() {
    return `job_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  },
  /**
   * Create a new conversion job
   */
  create(inputFile, outputPath, settings, priority = 0) {
    return {
      id: ConversionJobUtils.generateId(),
      inputFile,
      outputPath,
      settings: {
        ...settings,
        maintainAspectRatio: settings.maintainAspectRatio ?? true
      },
      status: "pending",
      createdAt: /* @__PURE__ */ new Date(),
      priority,
      retryable: true,
      retryCount: 0,
      maxRetries: 3
    };
  },
  /**
   * Get quality preset settings
   */
  getQualityPreset(quality) {
    return QUALITY_PRESETS[quality] || QUALITY_PRESETS.medium;
  },
  /**
   * Check if a job can be cancelled
   */
  canCancel(job) {
    return ["pending", "queued", "processing"].includes(job.status);
  },
  /**
   * Check if a job can be retried
   */
  canRetry(job) {
    return job.status === "failed" && job.retryable && job.retryCount < job.maxRetries;
  },
  /**
   * Calculate estimated output file size based on settings
   */
  estimateOutputSize(inputFile, settings) {
    if (!inputFile.metadata || !settings.bitrate) {
      return 0;
    }
    const duration = settings.endTime && settings.startTime ? settings.endTime - settings.startTime : inputFile.metadata.duration;
    const videoBitrate = settings.bitrate;
    const audioBitrate = settings.audioBitrate || 128e3;
    const totalBitrate = videoBitrate + audioBitrate;
    return Math.round(totalBitrate * duration / 8);
  },
  /**
   * Format conversion time for display
   */
  formatConversionTime(seconds) {
    if (seconds < 60) {
      return `${seconds.toFixed(1)}s`;
    }
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    if (minutes < 60) {
      return `${minutes}m ${remainingSeconds.toFixed(0)}s`;
    }
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return `${hours}h ${remainingMinutes}m`;
  },
  /**
   * Get status display text
   */
  getStatusText(status) {
    const statusMap = {
      pending: "Pending",
      queued: "Queued",
      processing: "Processing",
      completed: "Completed",
      failed: "Failed",
      cancelled: "Cancelled"
    };
    return statusMap[status] || status;
  }
};
const IPC_CHANNELS = {
  // File Operations
  FILE_SELECT: "file:select",
  FILE_SAVE_LOCATION: "file:save-location",
  FILE_VALIDATE: "file:validate",
  // Conversion Operations
  CONVERSION_START: "conversion:start",
  CONVERSION_CANCEL: "conversion:cancel",
  CONVERSION_GET_JOBS: "conversion:get-jobs",
  // Conversion Events
  CONVERSION_PROGRESS: "conversion:progress",
  CONVERSION_STARTED: "conversion:started",
  CONVERSION_COMPLETED: "conversion:completed",
  CONVERSION_FAILED: "conversion:failed",
  CONVERSION_CANCELLED: "conversion:cancelled",
  // App State Management
  STATE_GET_SESSION: "state:get-session",
  STATE_UPDATE_SESSION: "state:update-session",
  STATE_GET_SETTINGS: "state:get-settings",
  STATE_UPDATE_SETTINGS: "state:update-settings",
  STATE_CHANGED: "state:changed",
  // Legacy App State (for compatibility)
  APP_GET_PREFERENCES: "app:get-preferences",
  APP_SET_PREFERENCES: "app:set-preferences",
  APP_GET_STATISTICS: "app:get-statistics",
  APP_RESET_STATISTICS: "app:reset-statistics",
  // System Integration
  SYSTEM_GET_INFO: "system:get-info",
  SYSTEM_TOGGLE_POWER_SAVE_BLOCKER: "system:toggle-power-save-blocker",
  SYSTEM_SHOW_IN_EXPLORER: "system:show-in-explorer",
  SYSTEM_SHOW_IN_FOLDER: "system:show-in-folder",
  SYSTEM_OPEN_EXTERNAL: "system:open-external",
  // App Lifecycle
  APP_INFO: "app:info",
  APP_GET_INFO: "app:get-info",
  APP_QUIT: "app:quit",
  APP_RESTART: "app:restart",
  APP_CHECK_FOR_UPDATES: "app:check-for-updates",
  APP_CLEAR_CACHE: "app:clear-cache",
  APP_GET_LOGS: "app:get-logs",
  APP_LIFECYCLE_EVENT: "app:lifecycle-event"
};
class FileOperationsService {
  static instance;
  constructor() {
  }
  /**
   * Get singleton instance
   */
  static getInstance() {
    if (!FileOperationsService.instance) {
      FileOperationsService.instance = new FileOperationsService();
    }
    return FileOperationsService.instance;
  }
  /**
   * Show file selection dialog
   */
  async selectFiles(request = {}) {
    try {
      const mainWindow = electron.BrowserWindow.getFocusedWindow() || electron.BrowserWindow.getAllWindows()[0];
      const result = await electron.dialog.showOpenDialog(mainWindow, {
        title: "Select Video Files",
        properties: ["openFile"].concat(
          request.multiple ? ["multiSelections"] : []
        ),
        filters: request.filters || [
          {
            name: "Video Files",
            extensions: SUPPORTED_VIDEO_FORMATS.map((ext) => ext.slice(1))
            // Remove the dot
          },
          {
            name: "All Files",
            extensions: ["*"]
          }
        ]
      });
      if (result.canceled) {
        return {
          success: false,
          filePaths: []
        };
      }
      const validFiles = result.filePaths.filter((filePath) => {
        const extension = path.extname(filePath).toLowerCase();
        return VideoFileUtils.isSupportedFormat(extension);
      });
      if (validFiles.length === 0 && result.filePaths.length > 0) {
        return {
          success: false,
          filePaths: []
        };
      }
      return {
        success: true,
        filePaths: validFiles
      };
    } catch (error) {
      console.error("Error in file selection:", error);
      return {
        success: false,
        filePaths: []
      };
    }
  }
  /**
   * Show save location dialog
   */
  async selectSaveLocation(request = {}) {
    try {
      const mainWindow = electron.BrowserWindow.getFocusedWindow() || electron.BrowserWindow.getAllWindows()[0];
      const result = await electron.dialog.showSaveDialog(mainWindow, {
        title: "Save Converted Video",
        defaultPath: request.defaultPath,
        filters: request.filters || [
          {
            name: "Video Files",
            extensions: ["mp4", "avi", "mkv", "mov", "wmv", "webm"]
          },
          {
            name: "All Files",
            extensions: ["*"]
          }
        ]
      });
      if (result.canceled || !result.filePath) {
        return {
          success: false
        };
      }
      const directory = path.dirname(result.filePath);
      try {
        await fs.promises.access(directory);
      } catch {
        await fs.promises.mkdir(directory, { recursive: true });
      }
      return {
        success: true,
        filePath: result.filePath
      };
    } catch (error) {
      console.error("Error in save location selection:", error);
      return {
        success: false
      };
    }
  }
  /**
   * Validate a video file and extract metadata
   */
  async validateFile(request) {
    try {
      try {
        await fs.promises.access(request.filePath);
      } catch {
        return {
          isValid: false,
          error: "File does not exist"
        };
      }
      const extension = path.extname(request.filePath).toLowerCase();
      if (!VideoFileUtils.isSupportedFormat(extension)) {
        return {
          isValid: false,
          error: `Unsupported file format: ${extension}`
        };
      }
      const stats = await fs.promises.stat(request.filePath);
      if (!stats.isFile()) {
        return {
          isValid: false,
          error: "Path is not a file"
        };
      }
      const metadata = await this.extractVideoMetadata(request.filePath);
      if (!metadata) {
        return {
          isValid: false,
          error: "Unable to read video metadata - file may be corrupted"
        };
      }
      const thumbnail = await this.generateThumbnail();
      return {
        isValid: true,
        metadata: {
          duration: metadata.duration,
          width: metadata.width,
          height: metadata.height,
          frameRate: metadata.frameRate,
          bitrate: metadata.bitrate,
          codec: metadata.codec,
          audioCodec: metadata.audioCodec,
          fileSize: stats.size,
          createdAt: stats.birthtime,
          modifiedAt: stats.mtime
        },
        thumbnail
      };
    } catch (error) {
      console.error("Error validating file:", error);
      return {
        isValid: false,
        error: `Validation failed: ${error instanceof Error ? error.message : "Unknown error"}`
      };
    }
  }
  /**
   * Extract video metadata using ffprobe
   */
  async extractVideoMetadata(filePath) {
    return new Promise((resolve) => {
      const ffprobeProcess = child_process.spawn(ffprobe.path, [
        "-v",
        "quiet",
        "-print_format",
        "json",
        "-show_format",
        "-show_streams",
        filePath
      ]);
      let output = "";
      let errorOutput = "";
      ffprobeProcess.stdout.on("data", (data) => {
        output += data.toString();
      });
      ffprobeProcess.stderr.on("data", (data) => {
        errorOutput += data.toString();
      });
      ffprobeProcess.on("close", (code) => {
        if (code !== 0) {
          console.error("ffprobe error:", errorOutput);
          resolve(null);
          return;
        }
        try {
          const data = JSON.parse(output);
          const typedData = data;
          const videoStream = typedData.streams?.find((stream) => stream.codec_type === "video");
          const audioStream = typedData.streams?.find((stream) => stream.codec_type === "audio");
          if (!videoStream) {
            resolve(null);
            return;
          }
          let frameRate = 30;
          if (videoStream.r_frame_rate) {
            const [num, den] = videoStream.r_frame_rate.split("/");
            frameRate = parseInt(num) / parseInt(den);
          }
          resolve({
            duration: parseFloat(typedData.format?.duration || "0"),
            width: parseInt(videoStream.width || "0"),
            height: parseInt(videoStream.height || "0"),
            frameRate,
            bitrate: parseInt(typedData.format?.bit_rate || videoStream.bit_rate || "0"),
            codec: videoStream.codec_name || "unknown",
            audioCodec: audioStream?.codec_name
          });
        } catch (error) {
          console.error("Error parsing ffprobe output:", error);
          resolve(null);
        }
      });
      ffprobeProcess.on("error", (error) => {
        console.error("ffprobe spawn error:", error);
        resolve(null);
      });
    });
  }
  /**
   * Generate thumbnail for video file
   */
  async generateThumbnail() {
    return void 0;
  }
  /**
   * Create a VideoFile instance from a file path
   */
  async createVideoFile(filePath) {
    const validationResult = await this.validateFile({ filePath });
    if (!validationResult.isValid) {
      return null;
    }
    const fileInfo = VideoFileUtils.create(filePath);
    return {
      id: VideoFileUtils.generateId(),
      ...fileInfo,
      isValid: true,
      metadata: validationResult.metadata,
      thumbnail: validationResult.thumbnail,
      addedAt: /* @__PURE__ */ new Date()
    };
  }
  /**
   * Batch validate multiple files
   */
  async validateFiles(filePaths) {
    const results = await Promise.allSettled(
      filePaths.map((filePath) => this.createVideoFile(filePath))
    );
    return results.filter(
      (result) => result.status === "fulfilled" && result.value !== null
    ).map((result) => result.value);
  }
  /**
   * Check if a file path is a supported video format
   */
  isSupportedVideoFile(filePath) {
    const extension = path.extname(filePath).toLowerCase();
    return VideoFileUtils.isSupportedFormat(extension);
  }
  /**
   * Get file information without full validation
   */
  async getFileInfo(filePath) {
    try {
      const stats = await fs.promises.stat(filePath);
      return {
        name: path.basename(filePath),
        path: filePath,
        extension: path.extname(filePath).toLowerCase(),
        size: stats.size,
        exists: true
      };
    } catch {
      return {
        name: path.basename(filePath),
        path: filePath,
        extension: path.extname(filePath).toLowerCase(),
        size: 0,
        exists: false
      };
    }
  }
}
class ConversionService extends events.EventEmitter {
  static instance;
  jobs = /* @__PURE__ */ new Map();
  activeProcesses = /* @__PURE__ */ new Map();
  processingQueue = [];
  maxConcurrentJobs = 2;
  isProcessing = false;
  constructor() {
    super();
    this.setMaxListeners(50);
  }
  /**
   * Get singleton instance
   */
  static getInstance() {
    if (!ConversionService.instance) {
      ConversionService.instance = new ConversionService();
    }
    return ConversionService.instance;
  }
  /**
   * Start a new conversion job
   */
  async startConversion(request) {
    try {
      try {
        await fs.promises.access(request.inputPath);
      } catch {
        return {
          success: false,
          error: "Input file does not exist"
        };
      }
      const outputDir = path.dirname(request.outputPath);
      try {
        await fs.promises.access(outputDir);
      } catch {
        try {
          await fs.promises.mkdir(outputDir, { recursive: true });
        } catch {
          return {
            success: false,
            error: "Cannot create output directory"
          };
        }
      }
      try {
        await fs.promises.access(request.outputPath);
        if (!request.settings.customArgs?.includes("-y")) {
          return {
            success: false,
            error: "Output file already exists"
          };
        }
      } catch {
      }
      const inputFile = {
        id: "temp-" + Date.now(),
        name: path.basename(request.inputPath),
        path: request.inputPath,
        extension: path.extname(request.inputPath).toLowerCase(),
        mimeType: "video/unknown",
        // Will be determined during validation
        isValid: true,
        // Assume valid for now
        addedAt: /* @__PURE__ */ new Date()
      };
      const job = ConversionJobUtils.create(
        inputFile,
        request.outputPath,
        request.settings,
        request.priority || 0
      );
      this.jobs.set(job.id, job);
      this.processingQueue.push(job.id);
      this.sortQueueByPriority();
      this.emit("queue-updated", Array.from(this.jobs.values()));
      this.processQueue();
      return {
        success: true,
        jobId: job.id
      };
    } catch (error) {
      console.error("Error starting conversion:", error);
      return {
        success: false,
        error: `Failed to start conversion: ${error instanceof Error ? error.message : "Unknown error"}`
      };
    }
  }
  /**
   * Cancel a conversion job
   */
  async cancelConversion(request) {
    try {
      const job = this.jobs.get(request.jobId);
      if (!job) {
        return {
          success: false,
          error: "Job not found"
        };
      }
      if (!ConversionJobUtils.canCancel(job)) {
        return {
          success: false,
          error: `Cannot cancel job with status: ${job.status}`
        };
      }
      const process2 = this.activeProcesses.get(request.jobId);
      if (process2) {
        process2.kill("SIGTERM");
        this.activeProcesses.delete(request.jobId);
      }
      const queueIndex = this.processingQueue.indexOf(request.jobId);
      if (queueIndex !== -1) {
        this.processingQueue.splice(queueIndex, 1);
      }
      job.status = "cancelled";
      job.completedAt = /* @__PURE__ */ new Date();
      await this.cleanupJob(job);
      this.emit("job-cancelled", job);
      this.emit("queue-updated", Array.from(this.jobs.values()));
      return {
        success: true
      };
    } catch (error) {
      console.error("Error cancelling conversion:", error);
      return {
        success: false,
        error: `Failed to cancel conversion: ${error instanceof Error ? error.message : "Unknown error"}`
      };
    }
  }
  /**
   * Get conversion jobs
   */
  async getJobs(request = {}) {
    try {
      let jobs = Array.from(this.jobs.values());
      if (request.status && request.status.length > 0) {
        jobs = jobs.filter((job) => request.status.includes(job.status));
      }
      jobs.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
      if (request.limit && request.limit > 0) {
        jobs = jobs.slice(0, request.limit);
      }
      return {
        jobs
      };
    } catch (error) {
      console.error("Error getting jobs:", error);
      return {
        jobs: []
      };
    }
  }
  /**
   * Set maximum concurrent jobs
   */
  setMaxConcurrentJobs(max) {
    this.maxConcurrentJobs = Math.max(1, Math.min(8, max));
  }
  /**
   * Get job by ID
   */
  getJob(jobId) {
    return this.jobs.get(jobId);
  }
  /**
   * Process the conversion queue
   */
  async processQueue() {
    if (this.isProcessing) {
      return;
    }
    this.isProcessing = true;
    while (this.processingQueue.length > 0 && this.activeProcesses.size < this.maxConcurrentJobs) {
      const jobId = this.processingQueue.shift();
      if (!jobId)
        continue;
      const job = this.jobs.get(jobId);
      if (!job || job.status !== "pending")
        continue;
      this.processJob(job);
    }
    this.isProcessing = false;
  }
  /**
   * Process a single conversion job
   */
  async processJob(job) {
    try {
      job.status = "processing";
      job.startedAt = /* @__PURE__ */ new Date();
      this.emit("job-started", job);
      const args = this.buildFFmpegArguments(job);
      if (!ffmpeg) {
        throw new Error("FFmpeg binary not found");
      }
      const ffmpegProcess = child_process.spawn(ffmpeg, args);
      this.activeProcesses.set(job.id, ffmpegProcess);
      let currentProgress = {
        percentage: 0,
        currentTime: 0,
        totalTime: job.inputFile.metadata?.duration || 0,
        speed: 0,
        bitrate: 0,
        frame: 0,
        fps: 0,
        eta: 0,
        stage: "Starting conversion..."
      };
      if (ffmpegProcess.stderr) {
        ffmpegProcess.stderr.on("data", (data) => {
          const output = data.toString();
          const progress = this.parseFFmpegProgress(output, currentProgress);
          if (progress) {
            currentProgress = progress;
            job.progress = progress;
            this.emit("job-progress", job.id, progress);
          }
        });
      }
      ffmpegProcess.on("close", async (code) => {
        this.activeProcesses.delete(job.id);
        if (code === 0) {
          job.status = "completed";
          job.completedAt = /* @__PURE__ */ new Date();
          try {
            const stats = await fs.promises.stat(job.outputPath);
            job.result = {
              success: true,
              outputPath: job.outputPath,
              outputSize: stats.size,
              conversionTime: job.completedAt.getTime() - (job.startedAt?.getTime() || 0)
            };
          } catch {
            job.result = {
              success: true,
              outputPath: job.outputPath,
              conversionTime: job.completedAt.getTime() - (job.startedAt?.getTime() || 0)
            };
          }
          this.emit("job-completed", job);
        } else {
          job.status = "failed";
          job.completedAt = /* @__PURE__ */ new Date();
          const error = {
            code: `FFMPEG_EXIT_${code}`,
            message: "FFmpeg process failed",
            timestamp: /* @__PURE__ */ new Date()
          };
          job.result = {
            success: false,
            conversionTime: job.completedAt.getTime() - (job.startedAt?.getTime() || 0),
            error
          };
          this.emit("job-failed", job);
        }
        this.processQueue();
      });
      ffmpegProcess.on("error", async (error) => {
        this.activeProcesses.delete(job.id);
        job.status = "failed";
        job.completedAt = /* @__PURE__ */ new Date();
        const conversionError = {
          code: "FFMPEG_SPAWN_ERROR",
          message: error.message,
          timestamp: /* @__PURE__ */ new Date()
        };
        job.result = {
          success: false,
          conversionTime: job.completedAt.getTime() - (job.startedAt?.getTime() || 0),
          error: conversionError
        };
        this.emit("job-failed", job);
        this.processQueue();
      });
    } catch (error) {
      console.error("Error processing job:", error);
      job.status = "failed";
      job.completedAt = /* @__PURE__ */ new Date();
      const conversionError = {
        code: "PROCESSING_ERROR",
        message: error instanceof Error ? error.message : "Unknown processing error",
        timestamp: /* @__PURE__ */ new Date()
      };
      job.result = {
        success: false,
        conversionTime: job.completedAt ? job.completedAt.getTime() - (job.startedAt?.getTime() || 0) : 0,
        error: conversionError
      };
      this.emit("job-failed", job);
      this.processQueue();
    }
  }
  /**
   * Build FFmpeg arguments for a conversion job
   */
  buildFFmpegArguments(job) {
    const args = [];
    args.push("-i", job.inputFile.path);
    const presetSettings = QUALITY_PRESETS[job.settings.quality] || {};
    const settings = { ...presetSettings, ...job.settings };
    if (settings.format === "mp4") {
      args.push("-c:v", "libx264");
    } else if (settings.format === "webm") {
      args.push("-c:v", "libvpx-vp9");
    } else {
      args.push("-c:v", "libx264");
    }
    if (settings.bitrate) {
      args.push("-b:v", `${settings.bitrate}`);
    }
    if (settings.resolution) {
      args.push("-s", settings.resolution);
    }
    if (settings.frameRate) {
      args.push("-r", settings.frameRate.toString());
    }
    if (settings.audioCodec) {
      args.push("-c:a", settings.audioCodec);
    } else {
      args.push("-c:a", "aac");
    }
    if (settings.audioBitrate) {
      args.push("-b:a", `${settings.audioBitrate}`);
    }
    if (settings.startTime !== void 0) {
      args.push("-ss", settings.startTime.toString());
    }
    if (settings.endTime !== void 0 && settings.startTime !== void 0) {
      args.push("-t", (settings.endTime - settings.startTime).toString());
    }
    if (settings.customArgs) {
      args.push(...settings.customArgs);
    }
    args.push("-progress", "pipe:2");
    args.push("-y");
    args.push(job.outputPath);
    return args;
  }
  /**
   * Parse FFmpeg progress output
   */
  parseFFmpegProgress(output, currentProgress) {
    const lines = output.split("\n");
    let updated = false;
    const newProgress = { ...currentProgress };
    for (const line of lines) {
      if (line.includes("frame=")) {
        const frameMatch = line.match(/frame=\s*(\d+)/);
        if (frameMatch) {
          newProgress.frame = parseInt(frameMatch[1]);
          updated = true;
        }
        const fpsMatch = line.match(/fps=\s*([\d.]+)/);
        if (fpsMatch) {
          newProgress.fps = parseFloat(fpsMatch[1]);
          updated = true;
        }
        const bitrateMatch = line.match(/bitrate=\s*([\d.]+)kbits\/s/);
        if (bitrateMatch) {
          newProgress.bitrate = parseFloat(bitrateMatch[1]) * 1e3;
          updated = true;
        }
        const speedMatch = line.match(/speed=\s*([\d.]+)x/);
        if (speedMatch) {
          newProgress.speed = parseFloat(speedMatch[1]);
          updated = true;
        }
      }
      if (line.includes("out_time_ms=")) {
        const timeMatch = line.match(/out_time_ms=(\d+)/);
        if (timeMatch) {
          newProgress.currentTime = parseInt(timeMatch[1]) / 1e6;
          if (newProgress.totalTime > 0) {
            newProgress.percentage = Math.min(100, newProgress.currentTime / newProgress.totalTime * 100);
            if (newProgress.speed > 0) {
              const remainingTime = newProgress.totalTime - newProgress.currentTime;
              newProgress.eta = remainingTime / newProgress.speed;
            }
          }
          updated = true;
        }
      }
    }
    return updated ? newProgress : null;
  }
  /**
   * Sort queue by priority (higher priority first)
   */
  sortQueueByPriority() {
    this.processingQueue.sort((a, b) => {
      const jobA = this.jobs.get(a);
      const jobB = this.jobs.get(b);
      if (!jobA || !jobB)
        return 0;
      return jobB.priority - jobA.priority;
    });
  }
  /**
   * Clean up temporary files for a job
   */
  async cleanupJob(job) {
    try {
      console.log(`Cleaning up job ${job.id}`);
    } catch (error) {
      console.error("Error cleaning up job:", error);
    }
  }
  /**
   * Get service statistics
   */
  getStatistics() {
    const jobs = Array.from(this.jobs.values());
    return {
      totalJobs: jobs.length,
      completedJobs: jobs.filter((j) => j.status === "completed").length,
      failedJobs: jobs.filter((j) => j.status === "failed").length,
      activeJobs: jobs.filter((j) => j.status === "processing").length,
      queuedJobs: jobs.filter((j) => j.status === "pending" || j.status === "queued").length
    };
  }
  /**
   * Clear completed jobs older than specified days
   */
  clearOldJobs(days = 7) {
    const cutoffDate = new Date(Date.now() - days * 24 * 60 * 60 * 1e3);
    const jobs = Array.from(this.jobs.entries());
    let removed = 0;
    for (const [jobId, job] of jobs) {
      if ((job.status === "completed" || job.status === "failed") && job.completedAt && job.completedAt < cutoffDate) {
        this.jobs.delete(jobId);
        removed++;
      }
    }
    if (removed > 0) {
      this.emit("queue-updated", Array.from(this.jobs.values()));
    }
    return removed;
  }
}
class FileOperationsHandlers {
  fileService;
  constructor() {
    this.fileService = FileOperationsService.getInstance();
    this.registerHandlers();
    console.log("File operations IPC handlers registered");
  }
  /**
   * Register all file operations IPC handlers
   */
  registerHandlers() {
    electron.ipcMain.handle(
      IPC_CHANNELS.FILE_SELECT,
      async (event, request) => {
        try {
          console.log("📂 file:select handler called with request:", request);
          const result = await this.fileService.selectFiles(request);
          console.log("📂 file:select result:", result);
          return result;
        } catch (error) {
          console.error("Error in file:select handler:", error);
          return {
            success: false,
            filePaths: [],
            error: error instanceof Error ? error.message : "Unknown error"
          };
        }
      }
    );
    electron.ipcMain.handle(
      IPC_CHANNELS.FILE_VALIDATE,
      async (event, request) => {
        try {
          console.log("✅ file:validate handler called with request:", request);
          const result = await this.fileService.validateFile(request);
          console.log("✅ file:validate result:", result);
          return result;
        } catch (error) {
          console.error("Error in file:validate handler:", error);
          return {
            isValid: false,
            error: error instanceof Error ? error.message : "Unknown error"
          };
        }
      }
    );
    electron.ipcMain.handle(
      IPC_CHANNELS.FILE_SAVE_LOCATION,
      async (event, request) => {
        try {
          console.log("💾 file:save-location handler called with request:", request);
          const result = await this.fileService.selectSaveLocation(request);
          console.log("💾 file:save-location result:", result);
          return result;
        } catch (error) {
          console.error("Error in file:save-location handler:", error);
          return {
            success: false,
            error: error instanceof Error ? error.message : "Unknown error"
          };
        }
      }
    );
  }
  /**
   * Unregister all handlers (for cleanup)
   */
  unregisterHandlers() {
    electron.ipcMain.removeHandler(IPC_CHANNELS.FILE_SELECT);
    electron.ipcMain.removeHandler(IPC_CHANNELS.FILE_SAVE_LOCATION);
    electron.ipcMain.removeHandler(IPC_CHANNELS.FILE_VALIDATE);
    console.log("File operations IPC handlers unregistered");
  }
  /**
   * Get file service instance for testing
   */
  getFileService() {
    return this.fileService;
  }
}
class ConversionOperationsHandlers {
  conversionService;
  constructor() {
    this.conversionService = ConversionService.getInstance();
    this.registerHandlers();
    this.setupEventListeners();
  }
  /**
   * Register all conversion operations IPC handlers
   */
  registerHandlers() {
    electron.ipcMain.handle(
      IPC_CHANNELS.CONVERSION_START,
      async (event, request) => {
        try {
          const result = await this.conversionService.startConversion(request);
          return {
            success: true,
            data: result
          };
        } catch (error) {
          console.error("Error in conversion:start handler:", error);
          return {
            success: false,
            error: `Conversion start failed: ${error instanceof Error ? error.message : "Unknown error"}`,
            details: error instanceof Error ? error.stack : void 0
          };
        }
      }
    );
    electron.ipcMain.handle(
      IPC_CHANNELS.CONVERSION_CANCEL,
      async (event, request) => {
        try {
          const result = await this.conversionService.cancelConversion(request);
          return {
            success: true,
            data: result
          };
        } catch (error) {
          console.error("Error in conversion:cancel handler:", error);
          return {
            success: false,
            error: `Conversion cancel failed: ${error instanceof Error ? error.message : "Unknown error"}`,
            details: error instanceof Error ? error.stack : void 0
          };
        }
      }
    );
    electron.ipcMain.handle(
      IPC_CHANNELS.CONVERSION_GET_JOBS,
      async (event, request) => {
        try {
          const result = await this.conversionService.getJobs(request);
          return {
            success: true,
            data: result
          };
        } catch (error) {
          console.error("Error in conversion:get-jobs handler:", error);
          return {
            success: false,
            error: `Get jobs failed: ${error instanceof Error ? error.message : "Unknown error"}`,
            details: error instanceof Error ? error.stack : void 0
          };
        }
      }
    );
    console.log("Conversion operations IPC handlers registered");
  }
  /**
   * Setup event listeners to relay conversion events to renderer processes
   */
  setupEventListeners() {
    this.conversionService.on("job-started", (job) => {
      const event = {
        jobId: job.id,
        job
      };
      this.sendToAllWindows(IPC_CHANNELS.CONVERSION_STARTED, event);
    });
    this.conversionService.on("job-progress", (jobId, progress) => {
      const event = {
        jobId,
        progress
      };
      this.sendToAllWindows(IPC_CHANNELS.CONVERSION_PROGRESS, event);
    });
    this.conversionService.on("job-completed", (job) => {
      const event = {
        jobId: job.id,
        job,
        outputPath: job.outputPath,
        conversionTime: job.result?.conversionTime || 0
      };
      this.sendToAllWindows(IPC_CHANNELS.CONVERSION_COMPLETED, event);
    });
    this.conversionService.on("job-failed", (job) => {
      const event = {
        jobId: job.id,
        job,
        error: job.result?.error?.message || "Unknown error",
        details: job.result?.error?.details
      };
      this.sendToAllWindows(IPC_CHANNELS.CONVERSION_FAILED, event);
    });
    this.conversionService.on("job-cancelled", (job) => {
      const event = {
        jobId: job.id,
        job
      };
      this.sendToAllWindows(IPC_CHANNELS.CONVERSION_CANCELLED, event);
    });
    console.log("Conversion service event listeners registered");
  }
  /**
   * Send event to all renderer windows
   */
  sendToAllWindows(channel, data) {
    const windows = electron.BrowserWindow.getAllWindows();
    windows.forEach((window) => {
      if (!window.isDestroyed()) {
        window.webContents.send(channel, data);
      }
    });
  }
  /**
   * Unregister all handlers and event listeners (for cleanup)
   */
  unregisterHandlers() {
    electron.ipcMain.removeHandler(IPC_CHANNELS.CONVERSION_START);
    electron.ipcMain.removeHandler(IPC_CHANNELS.CONVERSION_CANCEL);
    electron.ipcMain.removeHandler(IPC_CHANNELS.CONVERSION_GET_JOBS);
    this.conversionService.removeAllListeners();
    console.log("Conversion operations IPC handlers unregistered");
  }
  /**
   * Get conversion service instance for testing
   */
  getConversionService() {
    return this.conversionService;
  }
  /**
   * Get service statistics
   */
  getStatistics() {
    return this.conversionService.getStatistics();
  }
  /**
   * Set maximum concurrent jobs
   */
  setMaxConcurrentJobs(max) {
    this.conversionService.setMaxConcurrentJobs(max);
  }
}
class AppStateService extends events.EventEmitter {
  static instance;
  currentSession;
  settings;
  state;
  constructor() {
    super();
    this.setMaxListeners(20);
    this.initializeState();
  }
  static getInstance() {
    if (!AppStateService.instance) {
      AppStateService.instance = new AppStateService();
    }
    return AppStateService.instance;
  }
  initializeState() {
    this.currentSession = {
      id: `session-${Date.now()}`,
      createdAt: /* @__PURE__ */ new Date(),
      lastActivity: /* @__PURE__ */ new Date(),
      activeFiles: [],
      recentFiles: [],
      activeJobs: []
    };
    this.settings = {
      theme: "system",
      outputDirectory: "",
      defaultOutputFormat: "mp4",
      quality: "high",
      hardwareAcceleration: true,
      maxConcurrentJobs: 3,
      preserveMetadata: true,
      notifications: {
        enabled: true,
        onComplete: true,
        onError: true,
        sound: true
      },
      advanced: {
        ffmpegPath: "",
        customPresets: [],
        logLevel: "info",
        tempDirectory: ""
      }
    };
    this.state = {
      session: this.currentSession,
      settings: this.settings,
      isProcessing: false,
      lastError: null,
      version: "1.0.0"
    };
  }
  async getSession(_request) {
    this.currentSession.lastActivity = /* @__PURE__ */ new Date();
    return {
      session: this.currentSession
    };
  }
  async updateSession(request) {
    const { updates } = request;
    if (updates.activeFiles !== void 0) {
      this.currentSession.activeFiles = updates.activeFiles;
    }
    if (updates.recentFiles !== void 0) {
      this.currentSession.recentFiles = updates.recentFiles;
    }
    if (updates.activeJobs !== void 0) {
      this.currentSession.activeJobs = updates.activeJobs;
    }
    this.currentSession.lastActivity = /* @__PURE__ */ new Date();
    this.state.session = this.currentSession;
    this.emitStateChange();
    return {
      session: this.currentSession
    };
  }
  async getSettings(_request) {
    return {
      settings: this.settings
    };
  }
  async updateSettings(request) {
    const { updates } = request;
    this.settings = {
      ...this.settings,
      ...updates
    };
    if (updates.notifications) {
      this.settings.notifications = {
        ...this.settings.notifications,
        ...updates.notifications
      };
    }
    if (updates.advanced) {
      this.settings.advanced = {
        ...this.settings.advanced,
        ...updates.advanced
      };
    }
    this.state.settings = this.settings;
    this.emitStateChange();
    return {
      settings: this.settings
    };
  }
  getApplicationState() {
    return this.state;
  }
  setProcessingState(isProcessing) {
    this.state.isProcessing = isProcessing;
    this.emitStateChange();
  }
  setLastError(error) {
    this.state.lastError = error;
    this.emitStateChange();
  }
  emitStateChange() {
    this.emit("state-changed", this.state);
  }
  addRecentFile(filePath) {
    this.currentSession.recentFiles = this.currentSession.recentFiles.filter((path2) => path2 !== filePath);
    this.currentSession.recentFiles.unshift(filePath);
    this.currentSession.recentFiles = this.currentSession.recentFiles.slice(0, 10);
    this.state.session = this.currentSession;
    this.emitStateChange();
  }
  addActiveJob(jobId) {
    if (!this.currentSession.activeJobs.includes(jobId)) {
      this.currentSession.activeJobs.push(jobId);
      this.state.session = this.currentSession;
      this.emitStateChange();
    }
  }
  removeActiveJob(jobId) {
    this.currentSession.activeJobs = this.currentSession.activeJobs.filter((id) => id !== jobId);
    this.state.session = this.currentSession;
    this.emitStateChange();
  }
}
class AppStateHandlers {
  appStateService;
  constructor() {
    this.appStateService = AppStateService.getInstance();
    this.registerHandlers();
    this.setupEventListeners();
  }
  /**
   * Register all app state management IPC handlers
   */
  registerHandlers() {
    electron.ipcMain.handle(
      IPC_CHANNELS.STATE_GET_SESSION,
      async (event, request) => {
        try {
          const result = await this.appStateService.getSession(request);
          return {
            success: true,
            data: result
          };
        } catch (error) {
          console.error("Error in state:get-session handler:", error);
          return {
            success: false,
            error: `Get session failed: ${error instanceof Error ? error.message : "Unknown error"}`,
            details: error instanceof Error ? error.stack : void 0
          };
        }
      }
    );
    electron.ipcMain.handle(
      IPC_CHANNELS.STATE_UPDATE_SESSION,
      async (event, request) => {
        try {
          const result = await this.appStateService.updateSession(request);
          return {
            success: true,
            data: result
          };
        } catch (error) {
          console.error("Error in state:update-session handler:", error);
          return {
            success: false,
            error: `Update session failed: ${error instanceof Error ? error.message : "Unknown error"}`,
            details: error instanceof Error ? error.stack : void 0
          };
        }
      }
    );
    electron.ipcMain.handle(
      IPC_CHANNELS.STATE_GET_SETTINGS,
      async (event, request) => {
        try {
          const result = await this.appStateService.getSettings(request);
          return {
            success: true,
            data: result
          };
        } catch (error) {
          console.error("Error in state:get-settings handler:", error);
          return {
            success: false,
            error: `Get settings failed: ${error instanceof Error ? error.message : "Unknown error"}`,
            details: error instanceof Error ? error.stack : void 0
          };
        }
      }
    );
    electron.ipcMain.handle(
      IPC_CHANNELS.STATE_UPDATE_SETTINGS,
      async (event, request) => {
        try {
          const result = await this.appStateService.updateSettings(request);
          return {
            success: true,
            data: result
          };
        } catch (error) {
          console.error("Error in state:update-settings handler:", error);
          return {
            success: false,
            error: `Update settings failed: ${error instanceof Error ? error.message : "Unknown error"}`,
            details: error instanceof Error ? error.stack : void 0
          };
        }
      }
    );
    electron.ipcMain.handle(
      IPC_CHANNELS.APP_GET_PREFERENCES,
      async (event, request) => {
        try {
          const result = await this.appStateService.getSettings(request);
          return {
            success: true,
            data: result
          };
        } catch (error) {
          console.error("Error in app:get-preferences handler:", error);
          return {
            success: false,
            error: `Get preferences failed: ${error instanceof Error ? error.message : "Unknown error"}`,
            details: error instanceof Error ? error.stack : void 0
          };
        }
      }
    );
    electron.ipcMain.handle(
      IPC_CHANNELS.APP_SET_PREFERENCES,
      async (event, request) => {
        try {
          const result = await this.appStateService.updateSettings(request);
          return {
            success: true,
            data: result
          };
        } catch (error) {
          console.error("Error in app:set-preferences handler:", error);
          return {
            success: false,
            error: `Set preferences failed: ${error instanceof Error ? error.message : "Unknown error"}`,
            details: error instanceof Error ? error.stack : void 0
          };
        }
      }
    );
    console.log("App state management IPC handlers registered");
  }
  /**
   * Setup event listeners to relay state changes to renderer processes
   */
  setupEventListeners() {
    this.appStateService.on("state-changed", (state) => {
      const event = {
        state
      };
      this.sendToAllWindows(IPC_CHANNELS.STATE_CHANGED, event);
    });
    console.log("App state service event listeners registered");
  }
  /**
   * Send event to all renderer windows
   */
  sendToAllWindows(channel, data) {
    const windows = electron.BrowserWindow.getAllWindows();
    windows.forEach((window) => {
      if (!window.isDestroyed()) {
        window.webContents.send(channel, data);
      }
    });
  }
  /**
   * Unregister all handlers and event listeners (for cleanup)
   */
  unregisterHandlers() {
    electron.ipcMain.removeHandler(IPC_CHANNELS.STATE_GET_SESSION);
    electron.ipcMain.removeHandler(IPC_CHANNELS.STATE_UPDATE_SESSION);
    electron.ipcMain.removeHandler(IPC_CHANNELS.STATE_GET_SETTINGS);
    electron.ipcMain.removeHandler(IPC_CHANNELS.STATE_UPDATE_SETTINGS);
    electron.ipcMain.removeHandler(IPC_CHANNELS.APP_GET_PREFERENCES);
    electron.ipcMain.removeHandler(IPC_CHANNELS.APP_SET_PREFERENCES);
    this.appStateService.removeAllListeners();
    console.log("App state management IPC handlers unregistered");
  }
  /**
   * Get app state service instance for testing
   */
  getAppStateService() {
    return this.appStateService;
  }
  /**
   * Get current application state
   */
  getApplicationState() {
    return this.appStateService.getApplicationState();
  }
  /**
   * Helper methods for state management
   */
  setProcessingState(isProcessing) {
    this.appStateService.setProcessingState(isProcessing);
  }
  setLastError(error) {
    this.appStateService.setLastError(error);
  }
  addRecentFile(filePath) {
    this.appStateService.addRecentFile(filePath);
  }
  addActiveJob(jobId) {
    this.appStateService.addActiveJob(jobId);
  }
  removeActiveJob(jobId) {
    this.appStateService.removeActiveJob(jobId);
  }
}
class SystemIntegrationService extends events.EventEmitter {
  static instance;
  powerSaveBlockerId = null;
  shutdownState = false;
  constructor() {
    super();
    this.setMaxListeners(20);
    this.setupAppEventListeners();
  }
  static getInstance() {
    if (!SystemIntegrationService.instance) {
      SystemIntegrationService.instance = new SystemIntegrationService();
    }
    return SystemIntegrationService.instance;
  }
  setupAppEventListeners() {
    electron.app.on("before-quit", () => {
      this.shutdownState = true;
      this.emit("app-before-quit");
    });
    electron.app.on("will-quit", () => {
      this.emit("app-will-quit");
    });
    electron.app.on("window-all-closed", () => {
      this.emit("app-window-all-closed");
    });
    electron.app.on("activate", () => {
      this.emit("app-activate");
    });
    electron.app.on("browser-window-created", (event, window) => {
      this.emit("app-window-created", window.id);
    });
    electron.app.on("browser-window-focus", (event, window) => {
      this.emit("app-window-focus", window.id);
    });
    electron.app.on("browser-window-blur", (event, window) => {
      this.emit("app-window-blur", window.id);
    });
  }
  async getSystemInfo(_request) {
    try {
      const platform = process.platform;
      const arch = process.arch;
      const nodeVersion = process.version;
      const electronVersion = process.versions.electron;
      const chromeVersion = process.versions.chrome;
      const v8Version = process.versions.v8;
      const memoryUsage = process.memoryUsage();
      let cpuInfo = "";
      try {
        if (platform === "win32") {
          cpuInfo = child_process.execSync("wmic cpu get name /value", { encoding: "utf8" }).split("\n").find((line) => line.includes("Name="))?.replace("Name=", "").trim() || "Unknown";
        } else if (platform === "darwin") {
          cpuInfo = child_process.execSync("sysctl -n machdep.cpu.brand_string", { encoding: "utf8" }).trim();
        } else {
          cpuInfo = child_process.execSync('cat /proc/cpuinfo | grep "model name" | head -1', { encoding: "utf8" }).split(":")[1]?.trim() || "Unknown";
        }
      } catch {
        cpuInfo = "Unknown";
      }
      let totalMemory = 0;
      try {
        if (platform === "win32") {
          const memInfo = child_process.execSync("wmic computersystem get TotalPhysicalMemory /value", { encoding: "utf8" });
          const match = memInfo.match(/TotalPhysicalMemory=(\d+)/);
          if (match) {
            totalMemory = parseInt(match[1]) / (1024 * 1024 * 1024);
          }
        } else if (platform === "darwin") {
          const memInfo = child_process.execSync("sysctl hw.memsize", { encoding: "utf8" });
          const match = memInfo.match(/hw\.memsize: (\d+)/);
          if (match) {
            totalMemory = parseInt(match[1]) / (1024 * 1024 * 1024);
          }
        } else {
          const memInfo = child_process.execSync("cat /proc/meminfo | grep MemTotal", { encoding: "utf8" });
          const match = memInfo.match(/MemTotal:\s+(\d+)\s+kB/);
          if (match) {
            totalMemory = parseInt(match[1]) / (1024 * 1024);
          }
        }
      } catch {
        totalMemory = 0;
      }
      return {
        systemInfo: {
          platform,
          arch,
          nodeVersion,
          electronVersion,
          chromeVersion,
          v8Version,
          cpuInfo,
          totalMemory: Math.round(totalMemory * 100) / 100,
          // Round to 2 decimal places
          appMemoryUsage: {
            rss: Math.round(memoryUsage.rss / (1024 * 1024) * 100) / 100,
            // MB
            heapTotal: Math.round(memoryUsage.heapTotal / (1024 * 1024) * 100) / 100,
            // MB
            heapUsed: Math.round(memoryUsage.heapUsed / (1024 * 1024) * 100) / 100,
            // MB
            external: Math.round(memoryUsage.external / (1024 * 1024) * 100) / 100
            // MB
          }
        }
      };
    } catch (error) {
      throw new Error(`Failed to get system info: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
  }
  async togglePowerSaveBlocker(request) {
    const { enable, type = "prevent-display-sleep" } = request;
    try {
      if (enable) {
        if (this.powerSaveBlockerId === null) {
          this.powerSaveBlockerId = electron.powerSaveBlocker.start(type);
        }
      } else {
        if (this.powerSaveBlockerId !== null) {
          electron.powerSaveBlocker.stop(this.powerSaveBlockerId);
          this.powerSaveBlockerId = null;
        }
      }
      const isActive = this.powerSaveBlockerId !== null && electron.powerSaveBlocker.isStarted(this.powerSaveBlockerId);
      return {
        isActive,
        blockerId: this.powerSaveBlockerId
      };
    } catch (error) {
      throw new Error(`Failed to toggle power save blocker: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
  }
  async openExternal(request) {
    const { url } = request;
    try {
      const { shell } = await import("electron");
      await shell.openExternal(url);
      return {
        success: true
      };
    } catch (error) {
      throw new Error(`Failed to open external URL: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
  }
  async showInFolder(request) {
    const { filePath } = request;
    try {
      const { shell } = await import("electron");
      shell.showItemInFolder(filePath);
      return {
        success: true
      };
    } catch (error) {
      throw new Error(`Failed to show item in folder: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
  }
  async restartApp(_request) {
    try {
      this.emit("app-restart-requested");
      setTimeout(() => {
        electron.app.relaunch();
        electron.app.exit(0);
      }, 1e3);
      return {
        success: true
      };
    } catch (error) {
      throw new Error(`Failed to restart app: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
  }
  async quitApp(request) {
    const { force = false } = request;
    try {
      if (force) {
        electron.app.exit(0);
      } else {
        this.emit("app-quit-requested");
        setTimeout(() => {
          electron.app.quit();
        }, 1e3);
      }
      return {
        success: true
      };
    } catch (error) {
      throw new Error(`Failed to quit app: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
  }
  async checkForUpdates(_request) {
    try {
      return {
        hasUpdate: false,
        currentVersion: electron.app.getVersion(),
        latestVersion: electron.app.getVersion(),
        releaseNotes: "",
        downloadUrl: ""
      };
    } catch (error) {
      throw new Error(`Failed to check for updates: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
  }
  async getAppInfo(_request) {
    try {
      return {
        appInfo: {
          name: electron.app.getName(),
          version: electron.app.getVersion(),
          description: "Desktop Video Converter",
          author: "Video Converter Team",
          homepage: "https://github.com/video-converter/desktop",
          license: "MIT",
          buildDate: (/* @__PURE__ */ new Date()).toISOString(),
          // In real app, this would be build time
          commitHash: "dev",
          // In real app, this would be git commit hash
          environment: process.env.NODE_ENV || "development"
        }
      };
    } catch (error) {
      throw new Error(`Failed to get app info: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
  }
  async clearCache(request) {
    const { type = "all" } = request;
    try {
      const windows = electron.BrowserWindow.getAllWindows();
      const clearedSize = 0;
      for (const window of windows) {
        if (!window.isDestroyed()) {
          const session = window.webContents.session;
          if (type === "all" || type === "storage") {
            await session.clearStorageData();
          }
          if (type === "all" || type === "cache") {
            await session.clearCache();
          }
          if (type === "all" || type === "cookies") {
            await session.clearAuthCache();
          }
        }
      }
      return {
        success: true,
        clearedSize
      };
    } catch (error) {
      throw new Error(`Failed to clear cache: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
  }
  async getLogs(request) {
    const { lines = 100 } = request;
    try {
      const logs = [
        `[${(/* @__PURE__ */ new Date()).toISOString()}] INFO: Application started`,
        `[${(/* @__PURE__ */ new Date()).toISOString()}] INFO: Services initialized`,
        `[${(/* @__PURE__ */ new Date()).toISOString()}] INFO: IPC handlers registered`
      ];
      return {
        logs: logs.slice(-lines)
      };
    } catch (error) {
      throw new Error(`Failed to get logs: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
  }
  getShutdownState() {
    return this.shutdownState;
  }
  getPowerSaveBlockerStatus() {
    const isActive = this.powerSaveBlockerId !== null && electron.powerSaveBlocker.isStarted(this.powerSaveBlockerId);
    return {
      isActive,
      blockerId: this.powerSaveBlockerId
    };
  }
}
class SystemIntegrationHandlers {
  systemService;
  constructor() {
    this.systemService = SystemIntegrationService.getInstance();
    this.registerHandlers();
    this.setupEventListeners();
  }
  /**
   * Register all system integration and app lifecycle IPC handlers
   */
  registerHandlers() {
    electron.ipcMain.handle(
      IPC_CHANNELS.SYSTEM_GET_INFO,
      async (event, request) => {
        try {
          const result = await this.systemService.getSystemInfo(request);
          return {
            success: true,
            data: result
          };
        } catch (error) {
          console.error("Error in system:get-info handler:", error);
          return {
            success: false,
            error: `Get system info failed: ${error instanceof Error ? error.message : "Unknown error"}`,
            details: error instanceof Error ? error.stack : void 0
          };
        }
      }
    );
    electron.ipcMain.handle(
      IPC_CHANNELS.SYSTEM_TOGGLE_POWER_SAVE_BLOCKER,
      async (event, request) => {
        try {
          const result = await this.systemService.togglePowerSaveBlocker(request);
          return {
            success: true,
            data: result
          };
        } catch (error) {
          console.error("Error in system:toggle-power-save-blocker handler:", error);
          return {
            success: false,
            error: `Toggle power save blocker failed: ${error instanceof Error ? error.message : "Unknown error"}`,
            details: error instanceof Error ? error.stack : void 0
          };
        }
      }
    );
    electron.ipcMain.handle(
      IPC_CHANNELS.SYSTEM_OPEN_EXTERNAL,
      async (event, request) => {
        try {
          const result = await this.systemService.openExternal(request);
          return {
            success: true,
            data: result
          };
        } catch (error) {
          console.error("Error in system:open-external handler:", error);
          return {
            success: false,
            error: `Open external failed: ${error instanceof Error ? error.message : "Unknown error"}`,
            details: error instanceof Error ? error.stack : void 0
          };
        }
      }
    );
    electron.ipcMain.handle(
      IPC_CHANNELS.SYSTEM_SHOW_IN_FOLDER,
      async (event, request) => {
        try {
          const result = await this.systemService.showInFolder(request);
          return {
            success: true,
            data: result
          };
        } catch (error) {
          console.error("Error in system:show-in-folder handler:", error);
          return {
            success: false,
            error: `Show in folder failed: ${error instanceof Error ? error.message : "Unknown error"}`,
            details: error instanceof Error ? error.stack : void 0
          };
        }
      }
    );
    electron.ipcMain.handle(
      IPC_CHANNELS.APP_RESTART,
      async (event, request) => {
        try {
          const result = await this.systemService.restartApp(request);
          return {
            success: true,
            data: result
          };
        } catch (error) {
          console.error("Error in app:restart handler:", error);
          return {
            success: false,
            error: `Restart app failed: ${error instanceof Error ? error.message : "Unknown error"}`,
            details: error instanceof Error ? error.stack : void 0
          };
        }
      }
    );
    electron.ipcMain.handle(
      IPC_CHANNELS.APP_QUIT,
      async (event, request) => {
        try {
          const result = await this.systemService.quitApp(request);
          return {
            success: true,
            data: result
          };
        } catch (error) {
          console.error("Error in app:quit handler:", error);
          return {
            success: false,
            error: `Quit app failed: ${error instanceof Error ? error.message : "Unknown error"}`,
            details: error instanceof Error ? error.stack : void 0
          };
        }
      }
    );
    electron.ipcMain.handle(
      IPC_CHANNELS.APP_CHECK_FOR_UPDATES,
      async (event, request) => {
        try {
          const result = await this.systemService.checkForUpdates(request);
          return {
            success: true,
            data: result
          };
        } catch (error) {
          console.error("Error in app:check-for-updates handler:", error);
          return {
            success: false,
            error: `Check for updates failed: ${error instanceof Error ? error.message : "Unknown error"}`,
            details: error instanceof Error ? error.stack : void 0
          };
        }
      }
    );
    electron.ipcMain.handle(
      IPC_CHANNELS.APP_GET_INFO,
      async (event, request) => {
        try {
          const result = await this.systemService.getAppInfo(request);
          return {
            success: true,
            data: result
          };
        } catch (error) {
          console.error("Error in app:get-info handler:", error);
          return {
            success: false,
            error: `Get app info failed: ${error instanceof Error ? error.message : "Unknown error"}`,
            details: error instanceof Error ? error.stack : void 0
          };
        }
      }
    );
    electron.ipcMain.handle(
      IPC_CHANNELS.APP_CLEAR_CACHE,
      async (event, request) => {
        try {
          const result = await this.systemService.clearCache(request);
          return {
            success: true,
            data: result
          };
        } catch (error) {
          console.error("Error in app:clear-cache handler:", error);
          return {
            success: false,
            error: `Clear cache failed: ${error instanceof Error ? error.message : "Unknown error"}`,
            details: error instanceof Error ? error.stack : void 0
          };
        }
      }
    );
    electron.ipcMain.handle(
      IPC_CHANNELS.APP_GET_LOGS,
      async (event, request) => {
        try {
          const result = await this.systemService.getLogs(request);
          return {
            success: true,
            data: result
          };
        } catch (error) {
          console.error("Error in app:get-logs handler:", error);
          return {
            success: false,
            error: `Get logs failed: ${error instanceof Error ? error.message : "Unknown error"}`,
            details: error instanceof Error ? error.stack : void 0
          };
        }
      }
    );
    electron.ipcMain.handle(
      IPC_CHANNELS.SYSTEM_SHOW_IN_EXPLORER,
      async (event, request) => {
        try {
          const result = await this.systemService.showInFolder(request);
          return {
            success: true,
            data: result
          };
        } catch (error) {
          console.error("Error in system:show-in-explorer handler:", error);
          return {
            success: false,
            error: `Show in explorer failed: ${error instanceof Error ? error.message : "Unknown error"}`,
            details: error instanceof Error ? error.stack : void 0
          };
        }
      }
    );
    electron.ipcMain.handle(
      IPC_CHANNELS.APP_INFO,
      async (event, request) => {
        try {
          const result = await this.systemService.getAppInfo(request);
          return {
            success: true,
            data: result
          };
        } catch (error) {
          console.error("Error in app:info handler:", error);
          return {
            success: false,
            error: `Get app info failed: ${error instanceof Error ? error.message : "Unknown error"}`,
            details: error instanceof Error ? error.stack : void 0
          };
        }
      }
    );
    console.log("System integration and app lifecycle IPC handlers registered");
  }
  /**
   * Setup event listeners to relay system events to renderer processes
   */
  setupEventListeners() {
    this.systemService.on("app-before-quit", () => {
      const event = {
        type: "before-quit"
      };
      this.sendToAllWindows(IPC_CHANNELS.APP_LIFECYCLE_EVENT, event);
    });
    this.systemService.on("app-will-quit", () => {
      const event = {
        type: "will-quit"
      };
      this.sendToAllWindows(IPC_CHANNELS.APP_LIFECYCLE_EVENT, event);
    });
    this.systemService.on("app-window-all-closed", () => {
      const event = {
        type: "window-all-closed"
      };
      this.sendToAllWindows(IPC_CHANNELS.APP_LIFECYCLE_EVENT, event);
    });
    this.systemService.on("app-activate", () => {
      const event = {
        type: "activate"
      };
      this.sendToAllWindows(IPC_CHANNELS.APP_LIFECYCLE_EVENT, event);
    });
    this.systemService.on("app-window-created", (windowId) => {
      const event = {
        type: "window-created",
        data: { windowId }
      };
      this.sendToAllWindows(IPC_CHANNELS.APP_LIFECYCLE_EVENT, event);
    });
    this.systemService.on("app-window-focus", (windowId) => {
      const event = {
        type: "window-focus",
        data: { windowId }
      };
      this.sendToAllWindows(IPC_CHANNELS.APP_LIFECYCLE_EVENT, event);
    });
    this.systemService.on("app-window-blur", (windowId) => {
      const event = {
        type: "window-blur",
        data: { windowId }
      };
      this.sendToAllWindows(IPC_CHANNELS.APP_LIFECYCLE_EVENT, event);
    });
    this.systemService.on("app-restart-requested", () => {
      const event = {
        type: "restart-requested"
      };
      this.sendToAllWindows(IPC_CHANNELS.APP_LIFECYCLE_EVENT, event);
    });
    this.systemService.on("app-quit-requested", () => {
      const event = {
        type: "quit-requested"
      };
      this.sendToAllWindows(IPC_CHANNELS.APP_LIFECYCLE_EVENT, event);
    });
    console.log("System integration service event listeners registered");
  }
  /**
   * Send event to all renderer windows
   */
  sendToAllWindows(channel, data) {
    const windows = electron.BrowserWindow.getAllWindows();
    windows.forEach((window) => {
      if (!window.isDestroyed()) {
        window.webContents.send(channel, data);
      }
    });
  }
  /**
   * Unregister all handlers and event listeners (for cleanup)
   */
  unregisterHandlers() {
    electron.ipcMain.removeHandler(IPC_CHANNELS.SYSTEM_GET_INFO);
    electron.ipcMain.removeHandler(IPC_CHANNELS.SYSTEM_TOGGLE_POWER_SAVE_BLOCKER);
    electron.ipcMain.removeHandler(IPC_CHANNELS.SYSTEM_OPEN_EXTERNAL);
    electron.ipcMain.removeHandler(IPC_CHANNELS.SYSTEM_SHOW_IN_FOLDER);
    electron.ipcMain.removeHandler(IPC_CHANNELS.APP_RESTART);
    electron.ipcMain.removeHandler(IPC_CHANNELS.APP_QUIT);
    electron.ipcMain.removeHandler(IPC_CHANNELS.APP_CHECK_FOR_UPDATES);
    electron.ipcMain.removeHandler(IPC_CHANNELS.APP_GET_INFO);
    electron.ipcMain.removeHandler(IPC_CHANNELS.APP_CLEAR_CACHE);
    electron.ipcMain.removeHandler(IPC_CHANNELS.APP_GET_LOGS);
    electron.ipcMain.removeHandler(IPC_CHANNELS.SYSTEM_SHOW_IN_EXPLORER);
    electron.ipcMain.removeHandler(IPC_CHANNELS.APP_INFO);
    this.systemService.removeAllListeners();
    console.log("System integration and app lifecycle IPC handlers unregistered");
  }
  /**
   * Get system service instance for testing
   */
  getSystemService() {
    return this.systemService;
  }
  /**
   * Get power save blocker status
   */
  getPowerSaveBlockerStatus() {
    return this.systemService.getPowerSaveBlockerStatus();
  }
  /**
   * Check if app is shutting down
   */
  isShuttingDown() {
    return this.systemService.getShutdownState();
  }
}
const __dirname$1 = path.join(process.cwd(), "electron");
const logger = LoggingService.getInstance();
function logIPCHandlers() {
  const eventHandlers = electron.ipcMain.eventNames();
  console.log("=== IPC Handler Registration Debug ===");
  console.log(`Total event handlers: ${eventHandlers.length}`);
  console.log("Registered event channels:", eventHandlers);
  console.log("Note: invoke/handle channels are not shown in eventNames()");
  const expectedInvokeChannels = [
    "file:select",
    "file:validate",
    "file:save-location",
    "conversion:start",
    "conversion:cancel",
    "app:get-preferences",
    "app:set-preferences",
    "app:get-session",
    "system:show-in-explorer",
    "system:open-external"
  ];
  logger.logCheckpoint("IPC_Handler_Registration", "pass", {
    totalEventHandlers: eventHandlers.length,
    registeredEventChannels: eventHandlers,
    note: "eventNames() shows event listeners, not invoke handlers"
  });
  logger.logCheckpoint("Expected_IPC_Channels", "pass", {
    expectedInvokeChannels,
    note: "Testing via renderer will confirm if invoke handlers work",
    registeredEventChannels: eventHandlers
  });
  console.log("Expected invoke channels (not visible in eventNames()):", expectedInvokeChannels);
  console.log("📡 Invoke handlers will be tested when renderer calls them");
  console.log("=====================================");
}
function registerIPCHandlers() {
  logger.info("main-process", "Registering IPC handlers...");
  try {
    new FileOperationsHandlers();
    new ConversionOperationsHandlers();
    new AppStateHandlers();
    new SystemIntegrationHandlers();
    logger.logCheckpoint("IPC_Handler_Setup", "pass", {
      message: "All IPC handlers registered successfully"
    });
    console.log("✅ All IPC handlers registered successfully");
  } catch (error) {
    logger.logCheckpoint("IPC_Handler_Setup", "fail", {
      error: error instanceof Error ? error.message : "Unknown error"
    });
    console.error("❌ Failed to register IPC handlers:", error);
    throw error;
  }
}
function addDiagnosticHandlers() {
  electron.ipcMain.handle("test:ping", () => {
    logger.logIPC("receive", "test:ping");
    const response = { message: "pong", timestamp: (/* @__PURE__ */ new Date()).toISOString() };
    logger.logIPC("send", "test:ping", response);
    console.log("🏓 Ping received in main process");
    return response;
  });
  electron.ipcMain.handle("test:ipc-status", () => {
    const eventHandlers = electron.ipcMain.eventNames();
    const testChannels = [
      "file:select",
      "file:validate",
      "file:save-location",
      "conversion:start",
      "conversion:cancel",
      "app:get-session",
      "app:get-preferences",
      "app:set-preferences",
      "app:info",
      "app:quit",
      "system:show-in-explorer",
      "system:open-external"
    ];
    const status = {
      totalEventHandlers: eventHandlers.length,
      registeredEventChannels: eventHandlers,
      testedInvokeChannels: testChannels,
      timestamp: (/* @__PURE__ */ new Date()).toISOString(),
      note: "eventNames() only shows event listeners, not invoke handlers"
    };
    logger.logIPC("receive", "test:ipc-status");
    logger.logIPC("send", "test:ipc-status", status);
    return status;
  });
  logger.info("IPC", "diagnostic_handlers_added", {
    handlers: ["test:ping", "test:ipc-status"]
  });
  console.log("🔧 Diagnostic IPC handlers added: test:ping, test:ipc-status");
}
electron.app.disableHardwareAcceleration();
function createWindow() {
  const mainWindow = new electron.BrowserWindow({
    width: 1200,
    height: 1200,
    minWidth: 800,
    minHeight: 800,
    show: false,
    autoHideMenuBar: true,
    titleBarStyle: "default",
    // Use Windows native title bar
    backgroundColor: "#ffffff",
    // Match Windows light theme
    frame: true,
    // Use native window frame for Windows integration
    transparent: false,
    // Better performance on Windows
    webPreferences: {
      preload: (() => {
        const possiblePaths = [
          path.join(__dirname$1, "../preload/preload.js"),
          // When running from out/main
          path.join(__dirname$1, "../out/preload/preload.js")
          // When running from electron directory
        ];
        console.log("🔍 __dirname:", __dirname$1);
        for (const preloadPath of possiblePaths) {
          console.log("🔍 Trying preload path:", preloadPath);
          try {
            require("fs").accessSync(preloadPath);
            console.log("✅ Preload file found at:", preloadPath);
            return preloadPath;
          } catch (e) {
            console.log("❌ Preload file not found at:", preloadPath);
          }
        }
        console.error("💥 No preload file found in any location!");
        return possiblePaths[0];
      })(),
      sandbox: true,
      // Enhanced security
      contextIsolation: true,
      nodeIntegration: false,
      webSecurity: true,
      // Enforce web security
      allowRunningInsecureContent: false,
      experimentalFeatures: false,
      // GPU process crash mitigation
      webgl: false,
      // Disable WebGL to prevent GPU crashes
      offscreen: false
      // Ensure proper rendering mode
    },
    // Windows-specific settings
    icon: path.join(__dirname$1, "../../build/icon.ico"),
    // Windows app icon
    thickFrame: true
    // Native Windows resize handles
  });
  mainWindow.on("ready-to-show", () => {
    mainWindow.show();
  });
  mainWindow.webContents.setWindowOpenHandler((details) => {
    electron.shell.openExternal(details.url);
    return { action: "deny" };
  });
  if (utils.is.dev && process.env["ELECTRON_RENDERER_URL"]) {
    mainWindow.loadURL(process.env["ELECTRON_RENDERER_URL"]);
  } else {
    mainWindow.loadFile(path.join(__dirname$1, "../dist/index.html"));
  }
}
electron.app.whenReady().then(() => {
  utils.electronApp.setAppUserModelId("com.videoconverter.app");
  electron.app.on("browser-window-created", (_, window) => {
    utils.optimizer.watchWindowShortcuts(window);
  });
  addDiagnosticHandlers();
  registerIPCHandlers();
  createWindow();
  setTimeout(() => {
    logIPCHandlers();
  }, 1e3);
  electron.app.on("activate", function() {
    if (electron.BrowserWindow.getAllWindows().length === 0)
      createWindow();
  });
});
electron.app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    electron.app.quit();
  }
});
