var __getOwnPropNames = Object.getOwnPropertyNames;
var __commonJS = (cb, mod) => function __require() {
  return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
};
import { contextBridge, ipcRenderer } from "electron";
var require_preload = __commonJS({
  "preload.cjs"() {
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
  }
});
export default require_preload();
