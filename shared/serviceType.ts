// Single source of truth for patient serviceType filter matching. Both
// server (db.ts filter building) and client (admin patients table
// filtering/display) must agree: each filter selection matches its exact
// stored serviceType value only — no blending of legacy/related buckets.
// (Previously this collapsed several DB values together per filter; that
// caused filters to silently include/exclude patients the user didn't
// expect. Reclassifying old data into the right bucket is a data-fix
// concern, not something the filter should paper over.)
export function getServiceTypeFilterVariants(serviceType: string): string[] {
  return [serviceType];
}

// serviceType values whose patients are physically seen at an external
// location. Used to derive `patients.locationType` whenever serviceType is
// set/changed, since several queries (e.g. monthly/yearly stats) count by
// locationType rather than by serviceType directly.
export const EXTERNAL_SERVICE_TYPES = new Set([
  "external",
  "pentacam_ex",
  "pentacam_ex_c",
  "pentacam_external",
  "surgery_external",
]);

export function isExternalServiceType(serviceType: unknown): boolean {
  return EXTERNAL_SERVICE_TYPES.has(String(serviceType ?? ""));
}
