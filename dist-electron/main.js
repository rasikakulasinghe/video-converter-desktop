import { app as t, session as u, ipcMain as r, BrowserWindow as d, dialog as f, shell as v } from "electron";
import { dirname as g, join as a } from "path";
import { fileURLToPath as x } from "url";
const l = {
  dev: !t.isPackaged
}, p = {
  isWindows: process.platform === "win32",
  isMacOS: process.platform === "darwin",
  isLinux: process.platform === "linux"
}, y = {
  setAppUserModelId(e) {
    p.isWindows && t.setAppUserModelId(l.dev ? process.execPath : e);
  },
  setAutoLaunch(e) {
    if (p.isLinux)
      return !1;
    const s = () => t.getLoginItemSettings().openAtLogin;
    return s() !== e ? (t.setLoginItemSettings({ openAtLogin: e }), s() === e) : !0;
  },
  skipProxy() {
    return u.defaultSession.setProxy({ mode: "direct" });
  }
}, D = {
  watchWindowShortcuts(e, s) {
    if (!e)
      return;
    const { webContents: n } = e, { escToCloseWindow: m = !1, zoom: h = !1 } = s || {};
    n.on("before-input-event", (i, o) => {
      o.type === "keyDown" && (l.dev ? o.code === "F12" && (n.isDevToolsOpened() ? n.closeDevTools() : (n.openDevTools({ mode: "undocked" }), console.log("Open dev tool..."))) : (o.code === "KeyR" && (o.control || o.meta) && i.preventDefault(), o.code === "KeyI" && (o.alt && o.meta || o.control && o.shift) && i.preventDefault()), m && o.code === "Escape" && o.key !== "Process" && (e.close(), i.preventDefault()), h || (o.code === "Minus" && (o.control || o.meta) && i.preventDefault(), o.code === "Equal" && o.shift && (o.control || o.meta) && i.preventDefault()));
    });
  },
  registerFramelessWindowIpc() {
    r.on("win:invoke", (e, s) => {
      const n = d.fromWebContents(e.sender);
      n && (s === "show" ? n.show() : s === "showInactive" ? n.showInactive() : s === "min" ? n.minimize() : s === "max" ? n.isMaximized() ? n.unmaximize() : n.maximize() : s === "close" && n.close());
    });
  }
}, R = x(import.meta.url), c = g(R);
function w() {
  const e = new d({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    show: !1,
    autoHideMenuBar: !0,
    titleBarStyle: "default",
    // Use Windows native title bar
    backgroundColor: "#ffffff",
    // Match Windows light theme
    frame: !0,
    // Use native window frame for Windows integration
    transparent: !1,
    // Better performance on Windows
    webPreferences: {
      preload: a(c, "./preload.js"),
      sandbox: !0,
      // Enhanced security
      contextIsolation: !0,
      nodeIntegration: !1,
      webSecurity: !0,
      // Enforce web security
      allowRunningInsecureContent: !1,
      experimentalFeatures: !1
    },
    // Windows-specific settings
    icon: a(c, "../../build/icon.ico"),
    // Windows app icon
    thickFrame: !0
    // Native Windows resize handles
  });
  e.on("ready-to-show", () => {
    e.show();
  }), e.webContents.setWindowOpenHandler((s) => (v.openExternal(s.url), { action: "deny" })), l.dev && process.env.ELECTRON_RENDERER_URL ? e.loadURL(process.env.ELECTRON_RENDERER_URL) : e.loadFile(a(c, "../dist/index.html"));
}
t.whenReady().then(() => {
  y.setAppUserModelId("com.videoconverter.app"), t.on("browser-window-created", (e, s) => {
    D.watchWindowShortcuts(s);
  }), l.dev && r.on("ping", () => console.log("pong")), w(), t.on("activate", function() {
    d.getAllWindows().length === 0 && w();
  });
});
t.on("window-all-closed", () => {
  process.platform !== "darwin" && t.quit();
});
r.handle("select-file", async () => (await f.showOpenDialog({
  properties: ["openFile"],
  filters: [
    { name: "Video Files", extensions: ["mp4", "avi", "mov", "mkv", "wmv", "flv", "webm", "m4v"] },
    { name: "All Files", extensions: ["*"] }
  ]
})).filePaths);
r.handle("select-save-location", async () => (await f.showSaveDialog({
  filters: [
    { name: "Video Files", extensions: ["mp4", "avi", "mov", "mkv", "wmv", "flv", "webm", "m4v"] },
    { name: "All Files", extensions: ["*"] }
  ]
})).filePath);
r.handle("select-directory", async () => (await f.showOpenDialog({
  properties: ["openDirectory"]
})).filePaths);
