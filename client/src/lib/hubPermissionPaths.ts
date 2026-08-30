/**
 * Hub shells (`/clinics-hub/*`, `/patients-hub/*`, `/services-hub/*`) render the
 * same page components as their top-level routes, but their sub-paths have no
 * permission entry of their own — so `ProtectedRoute` grants them by prefix from
 * the hub permission. Without this map, `/clinics-hub/examination` would open
 * the examination page for anyone holding `/clinics-hub`, bypassing
 * `/examination`.
 *
 * Each hub sub-path maps to the permission that actually guards the page behind
 * it. Sub-paths that only `<Redirect>` elsewhere are left out: the destination
 * route runs its own check.
 */
export const HUB_SUBPATH_PERMISSIONS: Record<string, string> = {
  // ── مركز العيادات ──
  "/clinics-hub/examination": "/examination",
  "/clinics-hub/medical-reports": "/medical-reports",
  "/clinics-hub/patient-summary": "/patient-summary",
  "/clinics-hub/pentacam": "/sheets/pentacam/dashboard",
  "/clinics-hub/refractions-dashboard": "/sheets/refractions/dashboard",
  "/clinics-hub/autorefs-dashboard": "/sheets/autorefs/dashboard",
  "/clinics-hub/prescriptions-dashboard": "/sheets/prescriptions/dashboard",
  "/clinics-hub/prescriptions": "/prescriptions",
  "/clinics-hub/request-tests": "/request-tests",

  // ── مركز المرضى ──
  "/patients-hub/list": "/patients",
  "/patients-hub/quick": "/quick-entry",
  "/patients-hub/followups": "/followups",
  "/patients-hub/visits": "/visits",

  // ── مركز الخدمات ──
  "/services-hub/medications": "/medications",
  "/services-hub/drug-reference": "/medications",
  "/services-hub/catalog": "/examinations/catalog",
  "/services-hub/registry": "/medications/registry",
  "/services-hub/txhub": "/txhub",
};

/**
 * The permission to check for a hub sub-path. Falls back to the path itself so
 * unmapped links keep their current behaviour.
 */
export function permissionPathForHubLink(href: string): string {
  return HUB_SUBPATH_PERMISSIONS[href] ?? href;
}
