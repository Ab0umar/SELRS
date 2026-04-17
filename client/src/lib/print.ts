type BuildPrintUrlOptions = {
  autoPrint?: boolean;
  nativePrint?: boolean;
};

export function buildPrintUrl(path: string, options: BuildPrintUrlOptions = {}) {
  const base = typeof window !== "undefined" ? window.location.origin : "http://localhost";
  const url = new URL(path, base);
  if (options.nativePrint) {
    url.searchParams.set("nativeprint", "1");
    return `${url.pathname}${url.search}${url.hash}`;
  }
  url.searchParams.set("print", "1");
  if (options.autoPrint !== false) {
    url.searchParams.set("autoprint", "1");
  }
  return `${url.pathname}${url.search}${url.hash}`;
}

export function readPrintMode(search?: string) {
  const params = new URLSearchParams(
    search ?? (typeof window !== "undefined" ? window.location.search : "")
  );
  return {
    printView: params.get("print") === "1",
    autoPrint: params.get("autoprint") === "1" || params.get("nativeprint") === "1",
    nativePrint: params.get("nativeprint") === "1",
  };
}
