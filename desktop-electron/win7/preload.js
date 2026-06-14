const { contextBridge } = require("electron");

contextBridge.exposeInMainWorld("SELRS", {
  platform: "electron"
});
