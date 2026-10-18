import { describe, expect, it } from "vitest";
import { readPrintMode } from "../lib/print";
import {
  defaultPrintProfile,
  printProfileSchema,
  printSettingsSchema,
  readClinicalPrintSettings,
} from "../../../shared/printSettings";
import {
  getPrintProfile,
  profileRootCss,
  resolvePrintDocument,
} from "../lib/clinicalPrintSettings";

describe("clinical print settings", () => {
  it("never automatically prints while previewing an actual document", () => {
    expect(
      readPrintMode("?printPreview=1&print=1&autoprint=1&nativeprint=1")
        .autoPrint,
    ).toBe(false);
    expect(readPrintMode("?print=1&autoprint=1").autoPrint).toBe(true);
  });
  it("keeps existing documents untouched by default", () => {
    expect(readClinicalPrintSettings(null)).toEqual({
      version: 1,
      profiles: {},
    });
    expect(defaultPrintProfile().enabled).toBe(false);
    expect(
      getPrintProfile(readClinicalPrintSettings(null), "prescription").enabled,
    ).toBe(false);
  });
  it.each([-1, NaN, Infinity, 500])(
    "rejects an invalid paper width: %s",
    (widthMm) => {
      expect(
        printProfileSchema.safeParse({ ...defaultPrintProfile(), widthMm })
          .success,
      ).toBe(false);
    },
  );
  it("rejects margins that leave too little space", () => {
    expect(
      printProfileSchema.safeParse({
        ...defaultPrintProfile(),
        widthMm: 148,
        leftMm: 60,
        rightMm: 60,
      }).success,
    ).toBe(false);
  });
  it("accepts custom dimensions and literal header/footer text", () => {
    const profile = {
      ...defaultPrintProfile(),
      enabled: true,
      widthMm: 148,
      heightMm: 210,
      topMm: 50,
      header: "<script>literal text</script>",
      footer: "سطر أول\nسطر ثانٍ",
    };
    expect(
      printSettingsSchema.parse({
        version: 1,
        profiles: { prescription: profile },
      }).profiles.prescription,
    ).toEqual(profile);
    expect(profileRootCss(profile)).toContain("width:148mm");
    expect(profileRootCss(profile)).toContain("padding:50mm 10mm 10mm 10mm");
  });
  it.each([
    ["/prescription/1", "prescription"],
    ["/patient-hub/sheets/consultant/1", "consultant"],
    ["/patient-hub/sheets/lasik/1/followup", "followup"],
    ["/clinics-hub/request-tests", "tests"],
    ["/request-tests/1", "tests"],
    ["/sheets/consultant/1/followup", "followup"],
    ["/sheets/lasik/1/followup", "followup"],
    ["/sheets/specialist/1", "specialist"],
    ["/medical-condition-report/1", "medical-condition"],
    ["/post-op-offdays-en/1", "offdays"],
    ["/sheets/referral/1", "referral"],
  ])("resolves %s to its independent profile", (path, id) =>
    expect(resolvePrintDocument(path)?.id).toBe(id),
  );
  it("distinguishes explicitly selected radiology from laboratory requests", () => {
    expect(resolvePrintDocument("/request-tests/1", "radiology")?.id).toBe(
      "radiology",
    );
  });
  it("does not apply clinical print profiles to accounting or ordinary pages", () => {
    expect(resolvePrintDocument("/accounting/print")).toBeUndefined();
    expect(resolvePrintDocument("/home")).toBeUndefined();
  });
});
