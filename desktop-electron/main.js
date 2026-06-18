const { app, BrowserWindow, shell, session, Menu, ipcMain } = require("electron");
const path = require("path");
const fs = require("fs");

const DEFAULT_API_URL = "http://192.168.1.100:4000";
const SOURCE_PRESETS = [
  { id: "local",     label: "Local (192.168.1.100:4000)", url: "http://192.168.1.100:4000" },
  { id: "localhost", label: "Localhost (localhost:4000)",  url: "http://localhost:4000" },
  { id: "lan",       label: "LAN (192.168.0.100:4000)",   url: "http://192.168.0.100:4000" },
  { id: "online",    label: "Online (selrs.cc)",           url: "https://selrs.cc" },
];
const UA_SUFFIX = " SELRSDesktop/1";
const WINDOW_SHOW_TIMEOUT_MS = 4000;
const WINDOW_OVERLAY_HEIGHT = 36;
const ALLOWED_PERMISSIONS = new Set([
  "media", "notifications", "clipboard-read", "clipboard-sanitized-write", "fullscreen",
]);

const DIST_INDEX = path.join(__dirname, "dist", "index.html");
const USE_BUNDLED = fs.existsSync(DIST_INDEX);

let mainWindow = null;
let logFilePath = "";
let activeApiUrl = DEFAULT_API_URL;
let sourceConfigPath = "";
let recoveringFromCrash = false;

app.disableHardwareAcceleration();
const gotSingleInstanceLock = app.requestSingleInstanceLock();
if (!gotSingleInstanceLock) app.quit();

// ── Logging ───────────────────────────────────────────────────────────────────
function logEvent(type, payload = {}) {
  try {
    if (!logFilePath) return;
    fs.appendFileSync(logFilePath, JSON.stringify({ time: new Date().toISOString(), type, ...payload }) + "\n", "utf8");
  } catch {}
}

// ── Source config ─────────────────────────────────────────────────────────────
function normalizeSourceUrl(raw) {
  const value = String(raw || "").trim();
  if (!value) return "";
  const withProtocol = /^https?:\/\//i.test(value) ? value : `http://${value}`;
  try { const u = new URL(withProtocol); return `${u.protocol}//${u.host}`; }
  catch { return ""; }
}

function readSourceConfig() {
  try {
    if (!sourceConfigPath || !fs.existsSync(sourceConfigPath)) return null;
    const parsed = JSON.parse(fs.readFileSync(sourceConfigPath, "utf8"));
    return normalizeSourceUrl(parsed?.url) || null;
  } catch { return null; }
}

function writeSourceConfig(url) {
  try { if (sourceConfigPath) fs.writeFileSync(sourceConfigPath, JSON.stringify({ url }, null, 2), "utf8"); }
  catch {}
}

function resolveStartupUrl() {
  const argSource = process.argv.find((a) => a.startsWith("--source="));
  const argUrl = normalizeSourceUrl(argSource ? argSource.slice("--source=".length) : "");
  const envUrl = normalizeSourceUrl(process.env.SELRS_DESKTOP_URL || "");
  return argUrl || envUrl || readSourceConfig() || DEFAULT_API_URL;
}

function isAllowedOrigin(url) {
  try {
    const u = new URL(url);
    const origin = `${u.protocol}//${u.host}`;
    if (origin === normalizeSourceUrl(activeApiUrl)) return true;
    if (SOURCE_PRESETS.some((p) => origin === normalizeSourceUrl(p.url))) return true;
    // Allow file:// when bundled
    if (USE_BUNDLED && u.protocol === "file:") return true;
    return false;
  } catch { return false; }
}

function switchSource(nextUrl) {
  const normalized = normalizeSourceUrl(nextUrl);
  if (!normalized || normalized === normalizeSourceUrl(activeApiUrl)) return;
  activeApiUrl = normalized;
  writeSourceConfig(normalized);
  logEvent("source-changed", { url: normalized });
  if (!mainWindow || mainWindow.isDestroyed()) return;
  if (USE_BUNDLED) {
    mainWindow.webContents.reload();
  } else {
    mainWindow.loadURL(activeApiUrl);
  }
}

// ── Auto-updater ──────────────────────────────────────────────────────────────
function initAutoUpdater() {
  try {
    const { autoUpdater } = require("electron-updater");
    autoUpdater.autoDownload = true;
    autoUpdater.autoInstallOnAppQuit = true;

    // Check for updates from the local server's /updates/ endpoint
    autoUpdater.setFeedURL({
      provider: "generic",
      url: `${activeApiUrl}/updates`,
    });

    autoUpdater.on("update-available", (info) => {
      logEvent("update-available", { version: info.version });
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send("update-available", info);
      }
    });

    autoUpdater.on("update-downloaded", (info) => {
      logEvent("update-downloaded", { version: info.version });
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send("update-downloaded", info);
      }
    });

    autoUpdater.on("error", (err) => {
      logEvent("updater-error", { message: String(err?.message || err) });
    });

    ipcMain.handle("check-for-update", async () => {
      try { await autoUpdater.checkForUpdates(); return { ok: true }; }
      catch (e) { return { ok: false, error: String(e?.message || e) }; }
    });

    ipcMain.on("install-update", () => {
      autoUpdater.quitAndInstall();
    });

    // Check 30s after launch, then every 4 hours
    setTimeout(() => autoUpdater.checkForUpdates().catch(() => {}), 30_000);
    setInterval(() => autoUpdater.checkForUpdates().catch(() => {}), 4 * 60 * 60 * 1000);

  } catch (e) {
    logEvent("updater-init-failed", { message: String(e?.message || e) });
  }
}

// ── IPC ───────────────────────────────────────────────────────────────────────
ipcMain.on("get-api-url", (event) => {
  event.returnValue = activeApiUrl;
});

// ── Source menu ───────────────────────────────────────────────────────────────
function buildSourceMenu() {
  const activeOrigin = normalizeSourceUrl(activeApiUrl);
  const items = SOURCE_PRESETS.map((preset) => ({
    type: "radio",
    label: preset.label,
    checked: normalizeSourceUrl(preset.url) === activeOrigin,
    click: () => switchSource(preset.url),
  }));
  items.push(
    { type: "separator" },
    { label: "Check for Updates", click: () => ipcMain.emit("check-for-update") },
    { type: "separator" },
    { label: "Reload", click: () => mainWindow && !mainWindow.isDestroyed() && mainWindow.webContents.reload() },
  );
  return Menu.buildFromTemplate(items);
}

function showSourceMenu() {
  if (!mainWindow || mainWindow.isDestroyed()) return;
  buildSourceMenu().popup({ window: mainWindow });
}

// ── Window ────────────────────────────────────────────────────────────────────
function createWindow() {
  let showWindowTimer = null;
  mainWindow = new BrowserWindow({
    width: 1400, height: 900, show: false, frame: false, thickFrame: false,
    titleBarStyle: "hidden",
    titleBarOverlay: { color: "#094e78", symbolColor: "#f5f7fa", height: WINDOW_OVERLAY_HEIGHT },
    minimizable: true, maximizable: true, closable: true, autoHideMenuBar: true,
    backgroundColor: "#ffffff",
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      sandbox: false, // needed for ipcRenderer.sendSync
      backgroundThrottling: false,
      partition: "persist:selrs",
    },
  });

  const currentUA = mainWindow.webContents.userAgent || "";
  if (!currentUA.includes("SELRSDesktop/1")) {
    mainWindow.webContents.setUserAgent(`${currentUA}${UA_SUFFIX}`);
  }

  mainWindow.webContents.on("before-input-event", (event, input) => {
    const key = (input.key || "").toLowerCase();
    if (key === "f5" || ((input.control || input.meta) && key === "r")) event.preventDefault();
    if (input.type === "keyDown" && (input.control || input.meta) && input.shift && key === "s") {
      event.preventDefault();
      showSourceMenu();
    }
  });

  mainWindow.webContents.on("context-menu", () => showSourceMenu());

  showWindowTimer = setTimeout(() => {
    if (mainWindow && !mainWindow.isDestroyed() && !mainWindow.isVisible()) {
      logEvent("window-show-timeout-fallback");
      mainWindow.show();
    }
  }, WINDOW_SHOW_TIMEOUT_MS);

  mainWindow.on("closed", () => {
    if (showWindowTimer) clearTimeout(showWindowTimer);
    mainWindow = null;
  });

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (isAllowedOrigin(url)) return { action: "allow" };
    shell.openExternal(url);
    return { action: "deny" };
  });

  mainWindow.webContents.on("did-finish-load", () => {
    logEvent("did-finish-load");
    if (showWindowTimer) clearTimeout(showWindowTimer);
    if (!mainWindow) return;
    if (!mainWindow.isMaximized()) mainWindow.maximize();
    mainWindow.show();
  });

  mainWindow.webContents.on("did-fail-load", (_e, code, desc, url, isMainFrame) => {
    logEvent("did-fail-load", { code, desc, url, isMainFrame });
    if (!isMainFrame) return;
    if (showWindowTimer) clearTimeout(showWindowTimer);
    if (mainWindow && !mainWindow.isDestroyed() && !mainWindow.isVisible()) mainWindow.show();
  });

  mainWindow.webContents.on("render-process-gone", (_e, details) => {
    logEvent("render-process-gone", details || {});
    recoverMainWindow("render-process-gone");
  });

  if (USE_BUNDLED) {
    logEvent("load-mode", { mode: "bundled", distIndex: DIST_INDEX });
    mainWindow.loadFile(DIST_INDEX);
  } else {
    logEvent("load-mode", { mode: "url", url: activeApiUrl });
    mainWindow.loadURL(activeApiUrl);
  }
}

function recoverMainWindow(reason = "unknown") {
  if (recoveringFromCrash) return;
  recoveringFromCrash = true;
  setTimeout(() => {
    try {
      if (!mainWindow || mainWindow.isDestroyed()) createWindow();
      else mainWindow.webContents.reloadIgnoringCache();
    } catch { try { if (mainWindow && !mainWindow.isDestroyed()) mainWindow.destroy(); } catch {} createWindow(); }
    finally { recoveringFromCrash = false; }
  }, 400);
}

// ── App lifecycle ─────────────────────────────────────────────────────────────
app.whenReady().then(() => {
  app.setName("SELRS");
  const logDir = path.join(app.getPath("userData"), "logs");
  fs.mkdirSync(logDir, { recursive: true });
  logFilePath = path.join(logDir, "electron-events.log");
  sourceConfigPath = path.join(app.getPath("userData"), "source.json");
  activeApiUrl = resolveStartupUrl();

  logEvent("app-ready", { bundled: USE_BUNDLED, apiUrl: activeApiUrl });

  session.defaultSession.setPermissionRequestHandler((wc, permission, callback, details) => {
    const origin = details?.requestingOrigin || wc?.getURL?.() || "";
    const allowed = ALLOWED_PERMISSIONS.has(String(permission || "")) && isAllowedOrigin(origin);
    callback(allowed);
  });

  // Allow API calls from file:// to the local server (CORS bypass for bundled mode)
  if (USE_BUNDLED) {
    session.defaultSession.webRequest.onBeforeSendHeaders((details, callback) => {
      const headers = { ...details.requestHeaders, Origin: activeApiUrl };
      callback({ requestHeaders: headers });
    });
  }

  Menu.setApplicationMenu(null);
  createWindow();
  initAutoUpdater();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("second-instance", () => {
  if (mainWindow && !mainWindow.isDestroyed()) {
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.focus();
  }
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
