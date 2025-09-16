"use strict";
const electron = require("electron");
const path = require("path");
const url = require("url");
const utils = require("@electron-toolkit/utils");
var _documentCurrentScript = typeof document !== "undefined" ? document.currentScript : null;
const __filename$1 = url.fileURLToPath(typeof document === "undefined" ? require("url").pathToFileURL(__filename).href : _documentCurrentScript && _documentCurrentScript.tagName.toUpperCase() === "SCRIPT" && _documentCurrentScript.src || new URL("main.js", document.baseURI).href);
const __dirname$1 = path.dirname(__filename$1);
function createWindow() {
  const mainWindow = new electron.BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
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
      preload: path.join(__dirname$1, "./preload.js"),
      sandbox: true,
      // Enhanced security
      contextIsolation: true,
      nodeIntegration: false,
      webSecurity: true,
      // Enforce web security
      allowRunningInsecureContent: false,
      experimentalFeatures: false
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
  if (utils.is.dev) {
    electron.ipcMain.on("ping", () => console.log("pong"));
  }
  createWindow();
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
electron.ipcMain.handle("select-file", async () => {
  const result = await electron.dialog.showOpenDialog({
    properties: ["openFile"],
    filters: [
      { name: "Video Files", extensions: ["mp4", "avi", "mov", "mkv", "wmv", "flv", "webm", "m4v"] },
      { name: "All Files", extensions: ["*"] }
    ]
  });
  return result.filePaths;
});
electron.ipcMain.handle("select-save-location", async () => {
  const result = await electron.dialog.showSaveDialog({
    filters: [
      { name: "Video Files", extensions: ["mp4", "avi", "mov", "mkv", "wmv", "flv", "webm", "m4v"] },
      { name: "All Files", extensions: ["*"] }
    ]
  });
  return result.filePath;
});
electron.ipcMain.handle("select-directory", async () => {
  const result = await electron.dialog.showOpenDialog({
    properties: ["openDirectory"]
  });
  return result.filePaths;
});
