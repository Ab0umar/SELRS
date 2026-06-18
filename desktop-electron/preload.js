const { contextBridge, ipcRenderer } = require("electron");

// API URL is passed via additionalArguments — no sendSync needed, sandbox stays true
const apiUrlArg = process.argv.find((a) => a.startsWith("--selrs-api-url="));
const apiUrl = apiUrlArg ? apiUrlArg.slice("--selrs-api-url=".length) : "";

contextBridge.exposeInMainWorld("SELRS", {
  platform: "electron",
  getApiUrl: () => apiUrl,
  checkForUpdate: () => ipcRenderer.invoke("check-for-update"),
  onUpdateAvailable: (cb) => ipcRenderer.on("update-available", (_e, info) => cb(info)),
  onUpdateDownloaded: (cb) => ipcRenderer.on("update-downloaded", (_e, info) => cb(info)),
  installUpdate: () => ipcRenderer.send("install-update"),
});
