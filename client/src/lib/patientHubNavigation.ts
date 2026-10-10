const HUB_PATIENT_PATH_RE =
  /\/patient-hub\/(?:file|summary|reports|doctor|brief|examination|prescription|request-tests|visits|followups|pentacam-dashboard|sheets\/consultant)\/(\d+)/;

export function extractHubPatientId(pathWithQuery: string): string | undefined {
  return pathWithQuery.split("?")[0]?.match(HUB_PATIENT_PATH_RE)?.[1];
}
