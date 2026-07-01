import { PAGE_PERMISSION_DEFINITIONS } from "@/lib/page-permissions";

// Paths that have their own explicit permission entry — parent permission does NOT cover these.
const DEFINED_PERMISSION_PATHS = new Set(
  PAGE_PERMISSION_DEFINITIONS.map((p) => p.id).filter((id) => id.startsWith("/")),
);

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
const ALWAYS_GRANTED = new Set<string>([]);

/** Same generic path matching as ProtectedRoute (excluding role-specific exceptions). */
export function pathGrantedByRoots(
  cleanPath: string,
  allowedRoots: string[],
): boolean {
  if (ALWAYS_GRANTED.has(cleanPath)) return true;
  if (!allowedRoots.length) return false;
  return allowedRoots.some((permission) => {
    if (!permission) return false;
    if (permission === cleanPath) return true;
    // Parent-prefix match: only when cleanPath has no own defined permission.
    if (
      permission !== "/" &&
      cleanPath.startsWith(`${permission}/`) &&
      !DEFINED_PERMISSION_PATHS.has(cleanPath as any)
    )
      return true;
    if (permission.includes("/:")) {
      const base = permission.split("/:")[0];
      if (cleanPath === base) return true;
      if (
        cleanPath.startsWith(`${base}/`) &&
        !DEFINED_PERMISSION_PATHS.has(cleanPath as any)
      )
        return true;
    }
    return false;
  });
}
