export const PATIENT_SEARCH_MIN_LENGTH = 2;
export const PATIENT_SEARCH_DEBOUNCE_MS = 250;

/** Collapses whitespace runs to single spaces and trims (PatientPicker's old inline normalize). */
export function normalizePatientSearchTerm(raw: string): string {
  return raw.replace(/\s+/g, " ").trim();
}

/**
 * Decides, from the freshly typed term and its debounced counterpart, whether the
 * picker may show its dropdown, whether the search query may hit the API, and
 * whether the dropdown is still waiting on the debounce. React-query v5 reports
 * isLoading=false for a disabled query, so isDebouncing is what keeps the picker
 * from flashing the "no results" row mid-typing.
 */
export function getPatientSearchGate(
  normalizedQuery: string,
  debouncedQuery: string,
): {
  showDropdown: boolean;
  shouldFetch: boolean;
  isDebouncing: boolean;
} {
  const showDropdown = normalizedQuery.length >= PATIENT_SEARCH_MIN_LENGTH;
  return {
    showDropdown,
    shouldFetch: debouncedQuery.length >= PATIENT_SEARCH_MIN_LENGTH,
    isDebouncing: showDropdown && normalizedQuery !== debouncedQuery,
  };
}
