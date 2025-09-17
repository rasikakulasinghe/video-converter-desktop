"use strict";
const electron = require("electron");
const api = {
  // File Operations
  file: {
    select: async (request) => {
      return await electron.ipcRenderer.invoke("file:select", request);
    },
    saveLocation: async (request) => {
      return await electron.ipcRenderer.invoke("file:save-location", request);
    },
    validate: async (request) => {
      return await electron.ipcRenderer.invoke("file:validate", request);
    }
  },
  // Conversion Operations
  conversion: {
    start: async (request) => {
      const response = await electron.ipcRenderer.invoke("conversion:start", request);
      return response.data || response;
    },
    cancel: async (request) => {
      const response = await electron.ipcRenderer.invoke("conversion:cancel", request);
      return response.data || response;
    }
  },
  // App State Management
  app: {
    getSession: async (request) => {
      const response = await electron.ipcRenderer.invoke("app:get-session", request);
      return response.data || response;
    },
    updateSession: async (request) => {
      const response = await electron.ipcRenderer.invoke("app:update-session", request);
      return response.data || response;
    },
    getPreferences: async (request) => {
      const response = await electron.ipcRenderer.invoke("app:get-preferences", request);
      return response.data || response;
    },
    setPreferences: async (request) => {
      const response = await electron.ipcRenderer.invoke("app:set-preferences", request);
      return response.data || response;
    },
    info: async (request) => {
      const response = await electron.ipcRenderer.invoke("app:info", request);
      return response.data || response;
    },
    quit: async (request) => {
      const response = await electron.ipcRenderer.invoke("app:quit", request);
      return response.data || response;
    }
  },
  // System Integration
  system: {
    showInExplorer: async (request) => {
      const response = await electron.ipcRenderer.invoke("system:show-in-explorer", request);
      return response.data || response;
    },
    openExternal: async (request) => {
      const response = await electron.ipcRenderer.invoke("system:open-external", request);
      return response.data || response;
    }
  },
  // Diagnostic/Test API for troubleshooting
  test: {
    ping: async () => {
      return await electron.ipcRenderer.invoke("test:ping");
    },
    ipcStatus: async () => {
      return await electron.ipcRenderer.invoke("test:ipc-status");
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
console.log("🚀 Preload script is executing...");
try {
  electron.contextBridge.exposeInMainWorld("electronAPI", api);
  console.log("✅ electronAPI exposed via contextBridge");
} catch (error) {
  console.error("❌ contextBridge failed, falling back to window:", error);
  window.electronAPI = api;
  console.log("✅ electronAPI set on window object");
}
