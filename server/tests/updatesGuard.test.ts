import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { isPublicUpdateFile, updatesGuard } from "../_core/updatesGuard";

describe("isPublicUpdateFile", () => {
  it("allows the artifacts an updater needs", () => {
    expect(isPublicUpdateFile("electron", "/latest.yml")).toBe(true);
    expect(isPublicUpdateFile("electron", "/SELRS-Electron-Setup-1.1.92.exe")).toBe(true);
    expect(isPublicUpdateFile("electron", "/SELRS-Electron-Setup-1.1.92.exe.blockmap")).toBe(true);
    expect(isPublicUpdateFile("android", "/selrs-1.2.apk")).toBe(true);
    expect(isPublicUpdateFile("webview", "/Setup.msi")).toBe(true);
  });

  it("refuses sources, scripts, configs and dependencies sitting in the same folders", () => {
    for (const file of [
      "/main.js",
      "/package.json",
      "/build.ps1",
      "/deploy-exe.cmd",
      "/builder-effective-config.yaml",
      "/builder-debug.yml",
      "/SelrsElectronInstaller.iss",
      "/README.md",
    ]) {
      expect(isPublicUpdateFile("electron", file)).toBe(false);
    }
    expect(isPublicUpdateFile("electron", "/node_modules/x/y.exe")).toBe(false);
    expect(isPublicUpdateFile("electron", "/dist/app.exe")).toBe(false);
  });

  it("refuses traversal, encoded tricks, dotfiles and bare directories", () => {
    for (const file of [
      "/",
      "",
      "/../secret.exe",
      "/%2e%2e/x.exe",
      "/a%2Fb.exe",
      "/.env.exe",
      "/x.exe%00.js",
      "/%E0%A4%A",
    ]) {
      expect(isPublicUpdateFile("electron", file)).toBe(false);
    }
    expect(isPublicUpdateFile("electron", "/a" + String.fromCharCode(92) + "b.exe")).toBe(false);
  });

  it("keeps each mount to its own file types", () => {
    expect(isPublicUpdateFile("android", "/Setup.exe")).toBe(false);
    expect(isPublicUpdateFile("electron", "/app.apk")).toBe(false);
  });
});

describe("updatesGuard (real Express + express.static)", () => {
  it("serves installers, hides everything else, leaves the other mounts alone", async () => {
    const { default: express } = await import("express");
    const root = mkdtempSync(path.join(os.tmpdir(), "updates-"));
    const electron = path.join(root, "electron");
    const webview = path.join(root, "webview");
    mkdirSync(path.join(electron, "node_modules"), { recursive: true });
    mkdirSync(webview);
    writeFileSync(path.join(electron, "latest.yml"), "version: 1");
    writeFileSync(path.join(electron, "Setup-1.exe"), "exe");
    writeFileSync(path.join(electron, "main.js"), "secret source");
    writeFileSync(path.join(electron, "builder-effective-config.yaml"), "cfg");
    writeFileSync(path.join(electron, "node_modules", "pkg.exe"), "dep");
    writeFileSync(path.join(webview, "Web-1.exe"), "web");

    const staticOptions = { fallthrough: true, dotfiles: "deny", index: false } as const;
    const app = express();
    app.use("/updates", updatesGuard("electron"), express.static(electron, staticOptions));
    app.use("/updates/webview", updatesGuard("webview"), express.static(webview, staticOptions));
    const server = app.listen(0);
    try {
      const { port } = server.address() as { port: number };
      const status = async (p: string) =>
        (await fetch(`http://127.0.0.1:${port}${p}`)).status;
      expect(await status("/updates/latest.yml")).toBe(200);
      expect(await status("/updates/Setup-1.exe")).toBe(200);
      expect(await status("/updates/main.js")).toBe(404);
      expect(await status("/updates/builder-effective-config.yaml")).toBe(404);
      expect(await status("/updates/node_modules/pkg.exe")).toBe(404);
      expect(await status("/updates/node_modules/")).toBe(404);
      expect(await status("/updates/%2e%2e/%2e%2e/package.json")).toBe(404);
      expect(await status("/updates/webview/Web-1.exe")).toBe(200);
      expect(await status("/updates/webview/main.js")).toBe(404);
    } finally {
      server.close();
      rmSync(root, { recursive: true, force: true });
    }
  });
});
