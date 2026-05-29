/** Normalize URL path for permission checks (matches ProtectedRoute behavior). */
export function normalizeNavPath(path: string): string {
  const raw = String(path ?? "").trim();
  if (!raw) return "/";
  const withSlash = raw.startsWith("/") ? raw : `/${raw}`;
  const noHashOrQuery = withSlash.split("?")[0].split("#")[0];
  if (noHashOrQuery.length > 1 && noHashOrQuery.endsWith("/")) {
    return noHashOrQuery.slice(0, -1);
  }
  return noHashOrQuery;
}

/** Strip `:r` / `:rw` suffixes from stored permission tokens and dedupe. */
export function permissionsToAllowedRoots(permissions: string[]): string[] {
  const normalized = permissions
    .map((entry) => normalizeNavPath(entry.replace(/:r[w]?$/, "")))
    .filter((entry) => entry.length > 0);
  return Array.from(new Set(normalized));
}

// Paths accessible to all authenticated users regardless of role permissions
const ALWAYS_GRANTED = new Set(["/attendance/shift-schedule"]);

/** Same generic path matching as ProtectedRoute (excluding role-specific exceptions). */
export function pathGrantedByRoots(cleanPath: string, allowedRoots: string[]): boolean {
  if (ALWAYS_GRANTED.has(cleanPath)) return true;
  if (!allowedRoots.length) return false;
  return allowedRoots.some((permission) => {
    if (!permission) return false;
    if (permission === cleanPath) return true;
    if (permission !== "/" && cleanPath.startsWith(`${permission}/`)) return true;
    if (permission.includes("/:")) {
      const base = permission.split("/:")[0];
      return cleanPath === base || cleanPath.startsWith(`${base}/`);
    }
    return false;
  });
}
