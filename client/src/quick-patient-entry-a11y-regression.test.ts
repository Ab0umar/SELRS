import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const pageSource = readFileSync(
  resolve(__dirname, "pages", "QuickPatientEntry.tsx"),
  "utf8",
);

describe("quick patient entry a11y regression", () => {
  it("should_use_strict_id_parser_instead_of_parseint", () => {
    expect(pageSource).toContain("parseQuickEntryPatientId(params?.id)");
    expect(pageSource).not.toContain("parseInt");
  });

  it("should_not_nest_a_second_main_landmark", () => {
    // AppShell wraps every render of this page (standalone and patients hub)
    // in the app's single main landmark, so the page must not render its own.
    expect(pageSource).not.toContain("<main");
    expect(pageSource).toContain("AppShell already supplies");
  });

  it("should_render_back_button_with_accessible_name", () => {
    expect(pageSource).toContain('aria-label="رجوع"');
    expect(pageSource).toContain("goBack()");
  });

  it("should_render_destructive_alert_for_invalid_id", () => {
    const invalidBranch = pageSource.indexOf('parsed.status === "invalid"');
    expect(invalidBranch).toBeGreaterThanOrEqual(0);
    const elseBranch = pageSource.indexOf(") : (", invalidBranch);
    expect(elseBranch).toBeGreaterThan(invalidBranch);
    const invalidJsx = pageSource.slice(invalidBranch, elseBranch);
    expect(invalidJsx).toContain('<Alert variant="destructive"');
    expect(invalidJsx).toContain("<h1");
  });

  it("should_not_render_form_for_invalid_id", () => {
    const invalidBranch = pageSource.indexOf('parsed.status === "invalid"');
    expect(invalidBranch).toBeGreaterThanOrEqual(0);
    const elseBranch = pageSource.indexOf(") : (", invalidBranch);
    expect(elseBranch).toBeGreaterThan(invalidBranch);
    const invalidJsx = pageSource.slice(invalidBranch, elseBranch);
    expect(invalidJsx).not.toContain("QuickPatientEntryForm");
    const nonInvalidBranch = pageSource.slice(elseBranch);
    expect(nonInvalidBranch).toContain("QuickPatientEntryForm");
  });
});
