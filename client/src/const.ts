export { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";

const PREFERRED_URL_KEY = "selrs_preferred_url";
const DEFAULT_NATIVE_API_ORIGIN = "https://op.selrs.cc";
const LOCAL_API_HOSTS = new Set(["localhost", "127.0.0.1", "::1"]);

// Local development - no OAuth needed
export const getLoginUrl = () => {
  return "/login";
};

const normalizeOrigin = (value: string) => value.replace(/\/+$/, "");

const parseHttpOrigin = (value: string) => {
  try {
    const url = new URL(value);
    if (url.protocol !== "http:" && url.protocol !== "https:") {
      return null;
    }
    return normalizeOrigin(url.origin);
  } catch {
    return null;
  }
};

const isUsablePreferredOrigin = (origin: string, isNative: boolean) => {
  if (!isNative) {
    return true;
  }

  const url = new URL(origin);
  if (LOCAL_API_HOSTS.has(url.hostname)) {
    return false;
  }

  // Capacitor should not call back into the bundled shell origin.
  if (typeof window !== "undefined" && normalizeOrigin(window.location.origin) === origin) {
    return false;
  }

  return true;
};

export const getApiOrigin = () => {
  if (typeof window === "undefined") {
    return DEFAULT_NATIVE_API_ORIGIN;
  }

  const isNative = Boolean((window as any).Capacitor?.isNativePlatform?.());

  if (isNative) {
    // Native builds should always talk to the deployed backend.
    window.localStorage.removeItem(PREFERRED_URL_KEY);
    return DEFAULT_NATIVE_API_ORIGIN;
  }

  const preferredRaw = window.localStorage.getItem(PREFERRED_URL_KEY)?.trim();
  const preferred = preferredRaw ? parseHttpOrigin(preferredRaw) : null;

  if (preferred && isUsablePreferredOrigin(preferred, isNative)) {
    return preferred;
  }

  if (preferredRaw && !preferred) {
    window.localStorage.removeItem(PREFERRED_URL_KEY);
  }

  return normalizeOrigin(window.location.origin);
};

export const getApiUrl = (path: string) => {
  if (/^https?:\/\//i.test(path)) return path;
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${getApiOrigin()}${normalizedPath}`;
};
