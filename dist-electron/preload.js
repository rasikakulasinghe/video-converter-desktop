import { contextBridge, ipcRenderer } from "electron";
const api = {
  // File system operations
  selectFile: () => ipcRenderer.invoke("select-file"),
  selectSaveLocation: () => ipcRenderer.invoke("select-save-location"),
  selectDirectory: () => ipcRenderer.invoke("select-directory"),
  // IPC communication
  ping: () => ipcRenderer.invoke("ping"),
  // Platform information
  platform: process.platform,
  // Version information
  versions: {
    node: process.versions.node,
    chrome: process.versions.chrome,
    electron: process.versions.electron
  }
};
try {
  contextBridge.exposeInMainWorld("electronAPI", api);
} catch (error) {
  console.error(error);
  window.electronAPI = api;
}
