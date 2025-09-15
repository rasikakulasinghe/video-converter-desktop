import { contextBridge, ipcRenderer } from 'electron';

// Custom APIs for renderer
const api = {
  // File system operations
  selectFile: () => ipcRenderer.invoke('select-file'),
  selectSaveLocation: () => ipcRenderer.invoke('select-save-location'),
  selectDirectory: () => ipcRenderer.invoke('select-directory'),
  
  // IPC communication
  ping: () => ipcRenderer.invoke('ping'),
  
  // Platform information
  platform: process.platform,
  
  // Version information
  versions: {
    node: process.versions.node,
    chrome: process.versions.chrome,
    electron: process.versions.electron
  }
};

// Use `contextBridge` APIs to expose Electron APIs to
// renderer only if context isolation is enabled, otherwise
// just add to the DOM global.
try {
  contextBridge.exposeInMainWorld('electronAPI', api);
} catch (error) {
  console.error(error);
  // @ts-expect-error (define in dts)
  window.electronAPI = api;
}