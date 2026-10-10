import { describe, expect, it } from "vitest";
import { extractHubPatientId } from "./patientHubNavigation";

describe("patient-specific mobile navigation ownership", () => {
  it.each(["visits", "file", "brief", "prescription", "sheets/consultant"])(
    "identifies a selected patient in %s routes",
    (section) => {
      expect(extractHubPatientId(`/patient-hub/${section}/123?visitId=456`)).toBe("123");
    },
  );

  it.each(["/patient-hub", "/patient-hub/visits", "/salary/payroll", "/accounting", "/patient-hub?patientId=123"])(
    "preserves global navigation at %s",
    (path) => expect(extractHubPatientId(path)).toBeUndefined(),
  );
});
