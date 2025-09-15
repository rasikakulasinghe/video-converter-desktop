import { ipcRenderer as e, contextBridge as s } from "electron";
const o = {
  // File system operations with Windows-optimized dialogs
  selectFile: () => e.invoke("select-file"),
  selectSaveLocation: () => e.invoke("select-save-location"),
  selectDirectory: () => e.invoke("select-directory"),
  // IPC communication (development only)
  ...process.env.NODE_ENV === "development" && {
    ping: () => e.invoke("ping")
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
  s.exposeInMainWorld("electronAPI", o);
} catch (r) {
  console.error(r), window.electronAPI = o;
}
