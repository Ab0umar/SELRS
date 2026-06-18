const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("SELRS", {
  platform: "electron",
  getApiUrl: () => ipcRenderer.sendSync("get-api-url"),
  checkForUpdate: () => ipcRenderer.invoke("check-for-update"),
  onUpdateAvailable: (cb) => ipcRenderer.on("update-available", (_e, info) => cb(info)),
  onUpdateDownloaded: (cb) => ipcRenderer.on("update-downloaded", (_e, info) => cb(info)),
  installUpdate: () => ipcRenderer.send("install-update"),
});
