import type { PageKey } from "@/lib/dashboard-data";

/** Service type → sheet page key (matches dashboard patient-action menu logic). */
const SERVICE_TYPE_TO_SHEET_PAGE_KEY: Record<string, PageKey> = {
  consultant: "consultant-sheet",
  specialist: "specialist-sheet",
  lasik: "lasik-exam-sheet",
  external: "external-operation-sheet",
  pentacam: "pentacam-sheet",
  pentacam_c: "lasik-exam-sheet",
  pentacam_ex: "external-operation-sheet",
  pentacam_ex_c: "external-operation-sheet",
  pentacam_center: "pentacam-sheet",
  pentacam_external: "external-operation-sheet",
  surgery: "external-operation-sheet",
  surgery_center: "external-operation-sheet",
  surgery_external: "external-operation-sheet",
  radiology_center: "pentacam-sheet",
  radiology_external: "external-operation-sheet",
};

const SHEET_PAGE_KEY_TO_PATH: Record<
  "consultant-sheet" | "specialist-sheet" | "lasik-exam-sheet" | "external-operation-sheet" | "pentacam-sheet",
  (id: number) => string
> = {
  "consultant-sheet": (id) => `/sheets/consultant/${id}`,
  "specialist-sheet": (id) => `/sheets/specialist/${id}`,
  "lasik-exam-sheet": (id) => `/sheets/lasik/${id}`,
  "external-operation-sheet": (id) => `/sheets/external/${id}`,
  "pentacam-sheet": (id) => `/sheets/pentacam/${id}`,
};

export function patientSheetPathByServiceType(serviceType: string, patientId: number): string {
  const key = (SERVICE_TYPE_TO_SHEET_PAGE_KEY[serviceType] ?? "consultant-sheet") as keyof typeof SHEET_PAGE_KEY_TO_PATH;
  const build = SHEET_PAGE_KEY_TO_PATH[key] ?? SHEET_PAGE_KEY_TO_PATH["consultant-sheet"];
  return build(patientId);
}

/** Patient-scoped URL for a `PageKey` used from queues / shortcuts (must match `App.tsx` routes). */
export function patientNavPathForPageKey(page: PageKey, patientId: number): string | null {
  switch (page) {
    case "examination-form":
      return `/examination/${patientId}`;
    case "write-prescription":
      return `/prescription/${patientId}`;
    case "request-tests":
      return `/request-tests/${patientId}`;
    case "medical-reports":
      return `/medical-reports/${patientId}`;
    case "patient-details":
      return `/patient-file/${patientId}`;
    case "patient-summary":
      return `/patient-summary/${patientId}`;
    case "pentacam-sheet":
      return `/sheets/pentacam/${patientId}`;
    case "consultant-sheet":
      return `/sheets/consultant/${patientId}`;
    case "specialist-sheet":
      return `/sheets/specialist/${patientId}`;
    case "lasik-exam-sheet":
      return `/sheets/lasik/${patientId}`;
    case "external-operation-sheet":
      return `/sheets/external/${patientId}`;
    case "refraction":
      return `/refraction/${patientId}`;
    default:
      return null;
  }
}
