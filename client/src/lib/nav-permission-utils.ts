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
  const cleanPath =
    noHashOrQuery.length > 1 && noHashOrQuery.endsWith("/")
      ? noHashOrQuery.slice(0, -1)
      : noHashOrQuery;
  const adminAliases: Record<string, string> = {
    "/admin": "/admin-hub",
    "/admin/api-tools": "/admin-hub/api",
    "/admin/data-source-audit": "/admin-hub/audit",
    "/admin/notification-settings": "/admin-hub/notifications",
    "/admin/pentacam": "/admin-hub/pentacam-linking",
  };
  if (adminAliases[cleanPath]) return adminAliases[cleanPath];
  if (cleanPath.startsWith("/admin/")) {
    return `/admin-hub${cleanPath.slice("/admin".length)}`;
  }
  return cleanPath;
}

/** Strip `:r` / `:rw` suffixes from stored permission tokens and dedupe. */
export function permissionsToAllowedRoots(permissions: string[]): string[] {
  const normalized = permissions
    .map((entry) => normalizeNavPath(entry.replace(/:r[w]?$/, "")))
    .filter((entry) => entry.length > 0);
  return Array.from(new Set(normalized));
}

// Paths accessible to all authenticated users regardless of role permissions
const ALWAYS_GRANTED = new Set<string>([
  "/profile",
  "/attendance/my",
  "/attendance/shift-schedule",
]);

/** Same generic path matching as ProtectedRoute (excluding role-specific exceptions). */
export function pathGrantedByRoots(
  cleanPath: string,
  allowedRoots: string[],
): boolean {
  if (ALWAYS_GRANTED.has(cleanPath)) return true;
  if (!allowedRoots.length) return false;

  const matchServicesHub =
    allowedRoots.includes("/services-hub") ||
    allowedRoots.some((p) => p.startsWith("/services-hub"));
  const matchMeds = allowedRoots.some(
    (p) => p === "/medications" || p.startsWith("/medications/"),
  );
  const matchExamCatalog =
    allowedRoots.includes("/examinations/catalog") ||
    allowedRoots.some((p) => p.startsWith("/examinations/catalog"));
  const matchTx =
    allowedRoots.includes("/txhub") ||
    allowedRoots.includes("/treatment") ||
    allowedRoots.some((p) => p.startsWith("/txhub") || p.startsWith("/treatment"));
  const matchTests = allowedRoots.some(
    (p) => p === "/tests" || p.startsWith("/tests/"),
  );
  const matchRegistry = allowedRoots.some(
    (p) => p === "/medications/registry" || p.startsWith("/medications/registry"),
  );

  const hasAnyServiceHubPermission =
    matchServicesHub ||
    matchMeds ||
    matchExamCatalog ||
    matchTx ||
    matchTests ||
    matchRegistry;

  if (cleanPath === "/services-hub" || cleanPath.startsWith("/services-hub/")) {
    if (hasAnyServiceHubPermission) return true;
  }
  if (cleanPath === "/medications" || cleanPath.startsWith("/medications/")) {
    if (cleanPath.startsWith("/medications/registry")) {
      if (matchServicesHub || matchRegistry || matchMeds) return true;
    } else {
      if (matchServicesHub || matchMeds) return true;
    }
  }
  if (
    cleanPath === "/examinations/catalog" ||
    cleanPath.startsWith("/examinations/catalog/")
  ) {
    if (matchServicesHub || matchExamCatalog || matchTests || matchMeds) return true;
  }
  if (
    cleanPath === "/txhub" ||
    cleanPath.startsWith("/txhub/") ||
    cleanPath === "/treatment" ||
    cleanPath.startsWith("/treatment/")
  ) {
    if (matchServicesHub || matchTx || matchTests || matchMeds) return true;
  }
  if (cleanPath === "/medications-tests" || cleanPath === "/tests") {
    if (hasAnyServiceHubPermission) return true;
  }

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
