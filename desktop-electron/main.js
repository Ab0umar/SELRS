const { app, BrowserWindow, shell, session, Menu } = require("electron");
const path = require("path");
const fs = require("fs");

const DEFAULT_HOME_URL = "http://192.168.0.100:4000";
const SOURCE_PRESETS = [
  { id: "cloud", label: "SELRS Cloud", url: "https://op.selrs.cc" },
  { id: "local", label: "Localhost :4000", url: "http://localhost:4000" },
  { id: "lan", label: "LAN 192.168.0.100:4000", url: "http://192.168.0.100:4000" },
];
const UA_SUFFIX = " SELRSDesktop/1";
const WINDOW_SHOW_TIMEOUT_MS = 4000;
const WINDOW_OVERLAY_HEIGHT = 36;
const ALLOWED_PERMISSIONS = new Set([
  "media", // camera/mic for app workflows
  "notifications",
  "clipboard-read",
  "clipboard-sanitized-write",
  "fullscreen",
]);

let mainWindow = null;
let logFilePath = "";
let activeHomeUrl = DEFAULT_HOME_URL;
let sourceConfigPath = "";
let recoveringFromCrash = false;

// Stability first: avoids a class of GPU/driver issues that can look like random reloads.
app.disableHardwareAcceleration();

const gotSingleInstanceLock = app.requestSingleInstanceLock();
if (!gotSingleInstanceLock) {
  app.quit();
}

function logEvent(type, payload = {}) {
  try {
    if (!logFilePath) return;
    const line = JSON.stringify({
      time: new Date().toISOString(),
      type,
      ...payload
    });
    fs.appendFileSync(logFilePath, line + "\n", "utf8");
  } catch {}
}

function normalizeSourceUrl(raw) {
  const value = String(raw || "").trim();
  if (!value) return "";
  const withProtocol = /^https?:\/\//i.test(value) ? value : `http://${value}`;
  try {
    const u = new URL(withProtocol);
    return `${u.protocol}//${u.host}`;
  } catch {
    return "";
  }
}

function readSourceConfig() {
  try {
    if (!sourceConfigPath || !fs.existsSync(sourceConfigPath)) return null;
    const raw = fs.readFileSync(sourceConfigPath, "utf8");
    const parsed = JSON.parse(raw);
    const nextUrl = normalizeSourceUrl(parsed?.url);
    return nextUrl || null;
  } catch {
    return null;
  }
}

function writeSourceConfig(url) {
  try {
    if (!sourceConfigPath) return;
    fs.writeFileSync(sourceConfigPath, JSON.stringify({ url }, null, 2), "utf8");
  } catch {}
}

function resolveStartupUrl() {
  const argSource = process.argv.find((arg) => arg.startsWith("--source="));
  const argUrl = normalizeSourceUrl(argSource ? argSource.slice("--source=".length) : "");
  const envUrl = normalizeSourceUrl(process.env.SELRS_DESKTOP_URL || "");
  const fileUrl = readSourceConfig();
  return argUrl || envUrl || fileUrl || DEFAULT_HOME_URL;
}

function isAllowed(url) {
  try {
    const u = new URL(url);
    const origin = `${u.protocol}//${u.host}`;
    const activeOrigin = normalizeSourceUrl(activeHomeUrl);
    return origin === activeOrigin || SOURCE_PRESETS.some((preset) => origin === normalizeSourceUrl(preset.url));
  } catch {
    return false;
  }
}

function switchSource(nextUrl) {
  const normalized = normalizeSourceUrl(nextUrl);
  if (!normalized) return;
  if (normalized === normalizeSourceUrl(activeHomeUrl)) return;
  activeHomeUrl = normalized;
  writeSourceConfig(normalized);
  logEvent("source-changed", { url: normalized });
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.loadURL(activeHomeUrl);
  }
}

function buildAppMenu() {
  const activeOrigin = normalizeSourceUrl(activeHomeUrl);
  const sourceSubmenu = SOURCE_PRESETS.map((preset) => {
    const presetUrl = normalizeSourceUrl(preset.url);
    return {
      type: "radio",
      label: preset.label,
      checked: presetUrl === activeOrigin,
      click: () => switchSource(presetUrl),
    };
  });
  sourceSubmenu.push(
    { type: "separator" },
    {
      label: "Reload Current Source",
      click: () => {
        if (mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.loadURL(activeHomeUrl);
        }
      },
    }
  );

  const template = [
    {
      label: "Source",
      submenu: sourceSubmenu,
    },
  ];
  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

function createWindow() {
  let showWindowTimer = null;
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    show: false,
    frame: false,
    thickFrame: false,
    titleBarStyle: "hidden",
    titleBarOverlay: {
      color: "#094e78",
      symbolColor: "#f5f7fa",
      height: WINDOW_OVERLAY_HEIGHT,
    },
    minimizable: true,
    maximizable: true,
    closable: true,
    autoHideMenuBar: true,
    backgroundColor: "#ffffff",
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      sandbox: true,
      backgroundThrottling: false,
      partition: "persist:selrs"
    }
  });

  const currentUA = mainWindow.webContents.userAgent || "";
  if (!currentUA.includes("SELRSDesktop/1")) {
    mainWindow.webContents.setUserAgent(`${currentUA}${UA_SUFFIX}`);
  }

  mainWindow.webContents.on("before-input-event", (event, input) => {
    const key = (input.key || "").toLowerCase();
    if (key === "f5" || ((input.control || input.meta) && key === "r")) {
      event.preventDefault();
    }
  });
  logEvent("window-created");
  showWindowTimer = setTimeout(() => {
    if (mainWindow && !mainWindow.isDestroyed() && !mainWindow.isVisible()) {
      logEvent("window-show-timeout-fallback");
      mainWindow.show();
    }
  }, WINDOW_SHOW_TIMEOUT_MS);
  mainWindow.on("close", () => {
    logEvent("window-close");
  });
  mainWindow.on("closed", () => {
    logEvent("window-closed");
    if (showWindowTimer) clearTimeout(showWindowTimer);
    mainWindow = null;
  });

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (isAllowed(url)) {
      return { action: "allow" };
    }
    shell.openExternal(url);
    return { action: "deny" };
  });

  mainWindow.webContents.on("will-navigate", (event, url) => {
    logEvent("will-navigate", { url });
    const current = mainWindow?.webContents?.getURL?.() || "";
    if (current && normalizeUrl(current) === normalizeUrl(url)) {
      event.preventDefault();
      return;
    }
    if (!isAllowed(url)) {
      event.preventDefault();
      shell.openExternal(url);
    }
  });

  mainWindow.webContents.on("did-finish-load", () => {
    logEvent("did-finish-load", { url: mainWindow?.webContents?.getURL?.() || "" });
    if (showWindowTimer) clearTimeout(showWindowTimer);
    if (!mainWindow) return;
    if (!mainWindow.isMaximized()) mainWindow.maximize();
    mainWindow.show();
  });

  mainWindow.webContents.on("did-start-navigation", (_event, url, isInPlace, isMainFrame) => {
    logEvent("did-start-navigation", { url, isInPlace, isMainFrame });
    if (!isMainFrame) return;
    if (isInPlace) return;
    const current = mainWindow?.webContents?.getURL?.() || "";
    if (current && normalizeUrl(current) === normalizeUrl(url)) {
      try {
        mainWindow?.webContents?.stop();
      } catch {}
    }
  });

  mainWindow.webContents.on("did-fail-load", (_event, code, desc, validatedURL, isMainFrame) => {
    logEvent("did-fail-load", { code, desc, validatedURL, isMainFrame });
    if (!isMainFrame) return;
    if (showWindowTimer) clearTimeout(showWindowTimer);
    if (mainWindow && !mainWindow.isDestroyed() && !mainWindow.isVisible()) {
      // Avoid a "frozen" feeling when startup URL is down.
      mainWindow.show();
    }
  });
  mainWindow.webContents.on("console-message", (_event, level, message, line, sourceId) => {
    if (
      message.includes("[SELRS]") ||
      message.includes("Navigation trace") ||
      message.includes("Last reload trace") ||
      message.includes("beforeunload")
    ) {
      logEvent("renderer-console", { level, message, line, sourceId });
    }
  });

  mainWindow.webContents.on("render-process-gone", (_event, details) => {
    logEvent("render-process-gone", details || {});
    recoverMainWindow("render-process-gone");
  });

  mainWindow.webContents.on("unresponsive", () => {
    logEvent("unresponsive");
  });

  mainWindow.webContents.on("responsive", () => {
    logEvent("responsive");
  });

  mainWindow.loadURL(activeHomeUrl);
}

function normalizeUrl(raw) {
  try {
    const u = new URL(raw);
    const path = u.pathname.replace(/\/+$/, "");
    return `${u.protocol}//${u.host}${path}${u.search}`;
  } catch {
    return String(raw || "").trim().replace(/\/+$/, "");
  }
}

function recoverMainWindow(reason = "unknown") {
  if (recoveringFromCrash) return;
  recoveringFromCrash = true;
  logEvent("recover-start", { reason });
  setTimeout(() => {
    try {
      if (!mainWindow || mainWindow.isDestroyed()) {
        createWindow();
      } else {
        mainWindow.webContents.reloadIgnoringCache();
      }
    } catch (error) {
      logEvent("recover-error", { reason, message: String(error?.message || error) });
      try {
        if (mainWindow && !mainWindow.isDestroyed()) mainWindow.destroy();
      } catch {}
      createWindow();
    } finally {
      recoveringFromCrash = false;
      logEvent("recover-done", { reason });
    }
  }, 400);
}

app.whenReady().then(() => {
  app.setName("SELRS");
  const logDir = path.join(app.getPath("userData"), "logs");
  fs.mkdirSync(logDir, { recursive: true });
  logFilePath = path.join(logDir, "electron-events.log");
  sourceConfigPath = path.join(app.getPath("userData"), "source.json");
  activeHomeUrl = resolveStartupUrl();
  logEvent("app-ready", { userData: app.getPath("userData") });
  logEvent("source-active", { url: activeHomeUrl, sourceConfigPath });
  session.defaultSession.setPermissionRequestHandler((wc, permission, callback, details) => {
    const origin = details?.requestingOrigin || wc?.getURL?.() || "";
    const allowed = ALLOWED_PERMISSIONS.has(String(permission || "")) && isAllowed(origin);
    logEvent("permission-request", { permission, origin, allowed });
    callback(allowed);
  });
  buildAppMenu();
  createWindow();
  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("second-instance", () => {
  logEvent("second-instance");
  if (mainWindow && !mainWindow.isDestroyed()) {
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.focus();
  }
});

app.on("window-all-closed", () => {
  logEvent("window-all-closed");
  if (process.platform !== "darwin") app.quit();
});

app.on("before-quit", () => logEvent("before-quit"));

app.on("browser-window-created", () => logEvent("browser-window-created"));
app.on("render-process-gone", (_event, _wc, details) => {
  logEvent("app-render-process-gone", details || {});
  recoverMainWindow("app-render-process-gone");
});
app.on("child-process-gone", (_event, details) => {
  logEvent("child-process-gone", details || {});
  const serviceName = String(details?.serviceName || "");
  const name = String(details?.name || "");
  if (
    serviceName.includes("network.mojom.NetworkService") ||
    name.includes("Network Service") ||
    serviceName.includes("GPU") ||
    name.includes("GPU")
  ) {
    recoverMainWindow("child-process-gone");
  }
});
app.on("gpu-process-crashed", (_event, killed) => logEvent("gpu-process-crashed", { killed: Boolean(killed) }));
