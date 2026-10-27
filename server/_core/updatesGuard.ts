import path from "node:path";
import type { NextFunction, Request, RequestHandler, Response } from "express";

export type UpdatesKind = "electron" | "webview" | "android";

const EXTENSIONS: Record<UpdatesKind, readonly string[]> = {
  // Setup .exe plus the .blockmap electron-updater downloads for differential updates.
  electron: [".exe", ".blockmap"],
  webview: [".exe", ".msi", ".zip", ".blockmap", ".json"],
  android: [".apk", ".json"],
};

/** `latest.yml` / `latest-win.yml`: the updater manifest, and the only yaml that is public. */
const UPDATER_MANIFEST = /^latest(-[a-z0-9]+)?\.yml$/i;

/**
 * True when `requestPath` (relative to the updates mount) names a file that an
 * auto-updater actually needs. The folders behind these routes also hold build
 * scripts, node_modules, effective-config dumps and sources, which must never
 * be downloadable.
 */
export function isPublicUpdateFile(
  kind: UpdatesKind,
  requestPath: string,
): boolean {
  let decoded: string;
  try {
    decoded = decodeURIComponent(requestPath);
  } catch {
    return false;
  }
  if (decoded.includes("\0") || decoded.includes("\\")) return false;
  const relative = decoded.replace(/^\/+/, "");
  // Only files directly in the folder: no sub-directories, no traversal, no dotfiles.
  if (!relative || relative.includes("/") || relative.startsWith(".")) {
    return false;
  }
  if (path.posix.normalize(relative) !== relative) return false;
  if (UPDATER_MANIFEST.test(relative)) return true;
  return EXTENSIONS[kind].includes(path.posix.extname(relative).toLowerCase());
}

/**
 * Gate in front of express.static. Anything that is not an updater artifact gets
 * the same 404 as a missing file. The electron mount sits at `/updates`, so the
 * paths of the other two mounts are handed on untouched.
 */
export function updatesGuard(kind: UpdatesKind): RequestHandler {
  return (req: Request, res: Response, next: NextFunction) => {
    if (kind === "electron" && /^\/(webview|android)(\/|$)/.test(req.path)) {
      return next();
    }
    if (!isPublicUpdateFile(kind, req.path)) {
      res.status(404).type("text/plain").send("Not found");
      return;
    }
    next();
  };
}
