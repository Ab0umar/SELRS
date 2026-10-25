type BuildPrintUrlOptions = {
  autoPrint?: boolean;
  nativePrint?: boolean;
};

export function buildPrintUrl(
  path: string,
  options: BuildPrintUrlOptions = {},
) {
  const base =
    typeof window !== "undefined" ? window.location.origin : "http://localhost";
  const url = new URL(path, base);
  if (options.nativePrint) {
    url.searchParams.set("nativeprint", "1");
    return `${url.pathname}${url.search}${url.hash}`;
  }
  if (options.autoPrint === false) {
    return `${url.pathname}${url.search}${url.hash}`;
  }
  url.searchParams.set("print", "1");
  url.searchParams.set("autoprint", "1");
  return `${url.pathname}${url.search}${url.hash}`;
}

type OpenPrintWindowResult =
  | { ok: true; win: Window }
  | { ok: false; reason: "blocked" | "no-window"; url: string };

export function openPrintWindow(
  path: string,
  options: BuildPrintUrlOptions = {},
  open?: typeof window.open,
): OpenPrintWindowResult {
  const url = buildPrintUrl(path, options);
  const openWindow =
    open ??
    (typeof window !== "undefined"
      ? window.open.bind(window)
      : undefined);
  if (!openWindow) {
    return { ok: false, reason: "no-window", url };
  }
  // No noopener in the features string: browsers return null even on success
  // when it is present; the opener link is severed manually below instead.
  const win = openWindow(url, "_blank");
  if (!win) {
    return { ok: false, reason: "blocked", url };
  }
  try {
    win.opener = null;
  } catch {
    // cross-origin or detached window; safety is best-effort, handle is still valid
  }
  try {
    win.focus?.();
  } catch {
    // ignore
  }
  return { ok: true, win };
}

export function readPrintMode(search?: string) {
  const params = new URLSearchParams(
    search ?? (typeof window !== "undefined" ? window.location.search : ""),
  );
  return {
    printView: params.get("print") === "1",
    autoPrint:
      params.get("printPreview") !== "1" && (params.get("autoprint") === "1" || params.get("nativeprint") === "1"),
    nativePrint: params.get("nativeprint") === "1",
  };
}
