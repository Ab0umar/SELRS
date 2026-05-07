/**
 * Patient Cache Cleanup Utilities
 *
 * Handles patientPageStates deletion for workflow cache management.
 * Used after MSSQL sync, patient switch, exam save, and logout.
 */

/**
 * Delete patientPageStates for specified pages and patient
 * Called after patient switch to prevent form rehydration on wrong patient
 */
export async function deletePatientCachePages(
  patientId: number,
  pages: ("examination" | "quick-entry" | "medical-file")[] = ["examination", "quick-entry", "medical-file"]
): Promise<void> {
  if (!Number.isFinite(patientId) || patientId <= 0) return;
  if (typeof window === "undefined") return;

  try {
    // Clear from localStorage first (sync)
    for (const page of pages) {
      localStorage.removeItem(`patient_state_${page}_${patientId}`);
    }

    // Note: Server-side deletion would require additional tRPC endpoint
    // For now, browser cache is cleared and server will overwrite on next save
    console.log(`[Cache] Cleared ${pages.join(", ")} for patient ${patientId}`);
  } catch (error) {
    console.warn(`[Cache] Failed to clear patient cache:`, error);
    // Non-blocking: continue operation
  }
}

/**
 * Clear all patient caches on logout
 * Security: prevent cached data leakage to next user
 */
export function clearAllPatientCaches(): void {
  if (typeof window === "undefined") return;
  try {
    // Find and delete all patient-related localStorage
    const keys = Object.keys(localStorage);
    let cleared = 0;

    for (const key of keys) {
      if (
        key.startsWith("patient_state_") ||
        key.startsWith("examination_draft_") ||
        key.includes("_patient_")
      ) {
        localStorage.removeItem(key);
        cleared++;
      }
    }

    console.log(`[Cache] Cleared ${cleared} patient cache entries on logout`);
  } catch (error) {
    console.warn(`[Cache] Failed to clear all caches:`, error);
    // Non-blocking
  }
}

/**
 * Cleanup cache after successful form save
 * Ensures next open fetches fresh medical data
 */
export async function clearFormCache(
  patientId: number,
  formPage: "examination" | "quick-entry" | "medical-file"
): Promise<void> {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(`patient_state_${formPage}_${patientId}`);
    console.log(`[Cache] Cleared ${formPage} cache after successful save`);
  } catch (error) {
    console.warn(`[Cache] Failed to clear form cache:`, error);
    // Non-blocking: form already saved successfully
  }
}

/**
 * Validate that cache doesn't contain forbidden medical fields
 * Diagnostic function for debugging stale hydration issues
 */
export function validateCacheContent(patientId: number): {
  valid: boolean;
  violations: string[];
} {
  if (typeof window === "undefined") {
    return { valid: true, violations: [] };
  }
  const violations: string[] = [];
  const pages = ["examination", "quick-entry", "medical-file"];

  try {
    for (const page of pages) {
      const key = `patient_state_${page}_${patientId}`;
      const cached = localStorage.getItem(key);

      if (!cached) continue;

      try {
        const data = JSON.parse(cached);
        const forbiddenFields = [
          "doctorName",
          "doctorCode",
          "serviceCode",
          "serviceName",
          "servicePrice",
          "discountValue",
          "medicalChecklist",
          "autorefraction",
          "pentacam",
        ];

        for (const field of forbiddenFields) {
          if (field in data) {
            violations.push(`${page}: found forbidden field "${field}"`);
          }
        }
      } catch {
        // ignore parse errors
      }
    }
  } catch (error) {
    console.warn(`[Cache] Validation error:`, error);
  }

  return {
    valid: violations.length === 0,
    violations,
  };
}
