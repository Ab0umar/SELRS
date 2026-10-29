const clinicalPages: Record<string, readonly string[]> = {
  examination: ["sheetSelection", "visitDate", "isFollowup", "activeTab"],
  prescription: ["medicationSearch", "activeTab"],
  "request-tests": ["testSearch", "printProfile", "activeTab"],
  "medical-file": ["activeTab"],
};

export function patientWorkflowState(page: string, data: unknown): unknown {
  const fields = clinicalPages[page.trim().toLowerCase()];
  if (!fields) return data;
  if (!data || typeof data !== "object" || Array.isArray(data)) return {};
  return Object.fromEntries(
    fields
      .filter((key) => Object.hasOwn(data, key))
      .map((key) => [key, (data as Record<string, unknown>)[key]])
      .filter(
        ([, value]) =>
          typeof value === "string" ||
          typeof value === "boolean" ||
          (typeof value === "number" && Number.isFinite(value)),
      ),
  );
}
