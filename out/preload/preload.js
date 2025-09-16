"use strict";
const electron = require("electron");
const api = {
  // File Operations
  file: {
    select: async (request) => {
      const response = await electron.ipcRenderer.invoke("file:select", request);
      return response.success ? response.data : { success: false, filePaths: [] };
    },
    saveLocation: async (request) => {
      const response = await electron.ipcRenderer.invoke("file:save-location", request);
      return response.success ? response.data : { success: false };
    },
    validate: async (request) => {
      const response = await electron.ipcRenderer.invoke("file:validate", request);
      return response.success ? response.data : { isValid: false, error: "Validation failed" };
    }
  },
  // Conversion Operations
  conversion: {
    start: async (request) => {
      const response = await electron.ipcRenderer.invoke("conversion:start", request);
      return response.success ? response.data : { success: false };
    },
    cancel: async (request) => {
      const response = await electron.ipcRenderer.invoke("conversion:cancel", request);
      return response.success ? response.data : { success: false };
    }
  },
  // App State Management
  app: {
    getSession: async (request) => {
      const response = await electron.ipcRenderer.invoke("app:get-session", request);
      return response.success ? response.data : {
        session: {
          id: "",
          createdAt: /* @__PURE__ */ new Date(),
          lastActivity: /* @__PURE__ */ new Date(),
          activeFiles: [],
          recentFiles: [],
          activeJobs: []
        }
      };
    },
    updateSession: async (request) => {
      const response = await electron.ipcRenderer.invoke("app:update-session", request);
      return response.success ? response.data : {
        session: {
          id: "",
          createdAt: /* @__PURE__ */ new Date(),
          lastActivity: /* @__PURE__ */ new Date(),
          activeFiles: [],
          recentFiles: [],
          activeJobs: []
        }
      };
    },
    getPreferences: async (request) => {
      const response = await electron.ipcRenderer.invoke("app:get-preferences", request);
      return response.success ? response.data : {
        output: {
          defaultOutputDirectory: "",
          defaultFormat: "mp4",
          defaultQuality: "medium",
          organizeByDate: false,
          preserveOriginalNames: true,
          namingPattern: "{name}_converted",
          overwriteExisting: false
        },
        conversion: {
          maxConcurrentJobs: 2,
          autoStart: true,
          shutdownWhenComplete: false,
          showNotifications: true,
          processPriority: "normal",
          preserveMetadata: true,
          generateThumbnails: true
        },
        interface: {
          theme: "system",
          language: "en",
          startMinimized: false,
          minimizeToTray: true,
          showProgressInTaskbar: true,
          rememberLastPath: true
        },
        advanced: {
          globalFFmpegArgs: [],
          hardwareAcceleration: "auto",
          tempDirectory: "",
          cleanupTempFiles: true,
          logLevel: "info",
          enableMetrics: true,
          maxLogSize: 50
        },
        version: "1.0.0",
        updatedAt: /* @__PURE__ */ new Date()
      };
    },
    setPreferences: async (request) => {
      const response = await electron.ipcRenderer.invoke("app:set-preferences", request);
      return response.success ? response.data : { success: false, requiresRestart: false };
    },
    info: async (request) => {
      const response = await electron.ipcRenderer.invoke("app:info", request);
      return response.success ? response.data : {
        appInfo: {
          name: "",
          version: "",
          description: "",
          author: "",
          homepage: "",
          license: "",
          buildDate: "",
          commitHash: "",
          environment: ""
        }
      };
    },
    quit: async (request) => {
      const response = await electron.ipcRenderer.invoke("app:quit", request);
      return response.success ? response.data : { success: false };
    }
  },
  // System Integration
  system: {
    showInExplorer: async (request) => {
      const response = await electron.ipcRenderer.invoke("system:show-in-explorer", request);
      return response.success ? response.data : { success: false };
    },
    openExternal: async (request) => {
      const response = await electron.ipcRenderer.invoke("system:open-external", request);
      return response.success ? response.data : { success: false };
    }
  },
  // Event Listeners
  on: {
    conversionProgress: (callback) => {
      electron.ipcRenderer.on("conversion:progress", (_event, progress) => callback(progress));
      return () => electron.ipcRenderer.removeAllListeners("conversion:progress");
    },
    conversionComplete: (callback) => {
      electron.ipcRenderer.on("conversion:complete", (_event, result) => callback(result));
      return () => electron.ipcRenderer.removeAllListeners("conversion:complete");
    },
    conversionError: (callback) => {
      electron.ipcRenderer.on("conversion:error", (_event, error) => callback(error));
      return () => electron.ipcRenderer.removeAllListeners("conversion:error");
    },
    stateChanged: (callback) => {
      electron.ipcRenderer.on("app:state-changed", (_event, state) => callback(state));
      return () => electron.ipcRenderer.removeAllListeners("app:state-changed");
    }
  },
  // Platform information (read-only)
  platform: process.platform,
  // Version information (read-only)
  versions: {
    node: process.versions.node,
    chrome: process.versions.chrome,
    electron: process.versions.electron
  }
};
try {
  electron.contextBridge.exposeInMainWorld("electronAPI", api);
} catch (error) {
  console.error(error);
  window.electronAPI = api;
}
