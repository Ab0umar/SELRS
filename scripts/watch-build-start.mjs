import { spawn } from "node:child_process";
import { watch } from "node:fs";
import fs from "node:fs";
import path from "node:path";

const projectRoot = path.resolve(process.cwd());
const LOCK_FILE = path.join(projectRoot, ".watch-build.lock");
const watchRoots = [
  path.join(projectRoot, "client"),
  path.join(projectRoot, "server"),
  path.join(projectRoot, "scripts"),
  path.join(projectRoot, "shared"),
];

const ignoreSegments = new Set([
  "node_modules",
  "dist",
  ".git",
  ".next",
  ".turbo",
  ".vite",
  ".cache",
  "build",
  ".output",
  "out",
  "coverage",
]);
const watchedExtensions = new Set([
  ".ts",
  ".tsx",
  ".js",
  ".jsx",
  ".mjs",
  ".cjs",
  ".json",
  ".css",
  ".scss",
  ".md",
  ".html",
  ".sql",
  ".yml",
  ".yaml",
]);

let buildRunning = false;
let buildNeedsRestart = false;
let queuedRestart = false;
let debounceTimer = null;
let serverProc = null;
let pendingBuildKind = "full";

const mergeBuildKind = (currentKind, incomingKind) => {
  if (currentKind === "full" || incomingKind === "full") return "full";
  if (currentKind === "server" || incomingKind === "server") return "server";
  return "none";
};

const log = (...args) => {
  console.log("[watch-build]", ...args);
};

const isProcessRunning = (pid) => {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
};

const acquireLock = () => {
  try {
    const fd = fs.openSync(LOCK_FILE, "wx");
    fs.writeFileSync(fd, String(process.pid), "utf8");
    fs.closeSync(fd);
    return true;
  } catch {
    try {
      const existingPid = Number(fs.readFileSync(LOCK_FILE, "utf8").trim());
      if (Number.isFinite(existingPid) && existingPid > 0 && isProcessRunning(existingPid)) {
        log(`Another watch process is already running (pid ${existingPid}). Exiting.`);
        return false;
      }
      fs.rmSync(LOCK_FILE, { force: true });
      const fd = fs.openSync(LOCK_FILE, "wx");
      fs.writeFileSync(fd, String(process.pid), "utf8");
      fs.closeSync(fd);
      return true;
    } catch (err) {
      log(`Failed to acquire lock: ${err.message}`);
      return false;
    }
  }
};

const releaseLock = () => {
  try {
    fs.rmSync(LOCK_FILE, { force: true });
  } catch {
    // ignore lock cleanup errors
  }
};

const killServer = () => {
  if (!serverProc) return;
  log("Stopping server...");
  serverProc.kill("SIGTERM");
  serverProc = null;
};

const startServer = () => {
  log("Starting server...");
  serverProc = spawn("nssm.exe", ["restart selrs-web"], {
    stdio: "inherit",
    shell: true,
  });
  serverProc.on("exit", (code) => {
    if (code != null) log(`Server exited with code ${code}`);
  });
};

const runBuild = () => {
  if (buildRunning) return;
  if (pendingBuildKind === "none") return;

  buildRunning = true;
  const buildKind = pendingBuildKind;
  pendingBuildKind = "none";
  const shouldRestart = buildNeedsRestart || queuedRestart;
  buildNeedsRestart = false;
  queuedRestart = false;
  const script = buildKind === "server" ? "build:server:watch" : "build:watch";
  log(`Running ${script}...`);
  const buildProc = spawn("pnpm.cmd", [script], {
    stdio: "inherit",
    shell: true,
  });
  buildProc.on("exit", (code) => {
    buildRunning = false;
    if (code === 0) {
      if (shouldRestart || !serverProc) {
        killServer();
        startServer();
      } else {
        log("Build done (no server restart needed).");
      }
    } else {
      log("Build failed. Server not restarted.");
    }
    if (pendingBuildKind !== "none") {
      runBuild();
    }
  });
};

const scheduleBuild = (buildKind, needsRestart) => {
  if (debounceTimer) clearTimeout(debounceTimer);
  pendingBuildKind = mergeBuildKind(pendingBuildKind, buildKind);
  if (needsRestart) buildNeedsRestart = true;
  if (buildRunning) queuedRestart = queuedRestart || needsRestart;
  debounceTimer = setTimeout(() => {
    runBuild();
  }, 700);
};

const shouldIgnore = (filePath) => {
  if (!filePath) return true;
  const normalizedPath = path.normalize(filePath);
  const normalized = normalizedPath.split(path.sep);
  const ext = path.extname(normalizedPath).toLowerCase();
  if (normalized.some((segment) => ignoreSegments.has(segment))) return true;
  if (ext && !watchedExtensions.has(ext)) return true;
  return false;
};

const startWatch = (root, buildKind, needsRestart) => {
  try {
    const watcher = watch(
      root,
      { recursive: true },
      (event, filename) => {
        if (!filename) return;
        const fullPath = path.join(root, filename.toString());
        if (shouldIgnore(fullPath)) return;
        scheduleBuild(buildKind, needsRestart);
      }
    );
    watcher.on("error", (err) => {
      log(`Watcher error at ${root}:`, err.message);
    });
    log(`Watching ${root}`);
  } catch (err) {
    log(`Failed to watch ${root}:`, err.message);
  }
};

process.on("SIGINT", () => {
  killServer();
  releaseLock();
  process.exit(0);
});

process.on("SIGTERM", () => {
  killServer();
  releaseLock();
  process.exit(0);
});

process.on("exit", () => {
  releaseLock();
});

if (!acquireLock()) {
  process.exit(0);
}

for (const root of watchRoots) {
  const isClientRoot = root.endsWith(`${path.sep}client`);
  const isServerRoot = root.endsWith(`${path.sep}server`);
  const isScriptsRoot = root.endsWith(`${path.sep}scripts`);
  const buildKind = isServerRoot || isScriptsRoot ? "server" : "full";
  const restartOnChange = isServerRoot || isScriptsRoot;
  if (isClientRoot) {
    // Client edits require a full frontend + server build.
    startWatch(root, "full", false);
    continue;
  }
  startWatch(root, buildKind, restartOnChange);
}

runBuild();
