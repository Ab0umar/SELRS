import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const sidebarSource = readFileSync(
  resolve(__dirname, "components", "layout", "AppSidebar.tsx"),
  "utf8",
);

describe("sidebar section a11y regression", () => {
  it("should_not_put_aria_expanded_on_the_group_wrapper", () => {
    const groupRole = sidebarSource.indexOf('role="group"');
    expect(groupRole).toBeGreaterThanOrEqual(0);
    const wrapperOpen = sidebarSource.lastIndexOf("<div", groupRole);
    expect(wrapperOpen).toBeGreaterThanOrEqual(0);
    const wrapperClose = sidebarSource.indexOf(">", groupRole);
    expect(wrapperClose).toBeGreaterThan(groupRole);
    expect(sidebarSource.slice(wrapperOpen, wrapperClose)).not.toContain(
      "aria-expanded",
    );
  });

  it("should_expose_section_state_on_the_toggle_button", () => {
    const toggleLabel = sidebarSource.indexOf('aria-label={sectionOpen ? "');
    expect(toggleLabel).toBeGreaterThanOrEqual(0);
    const toggleStart = sidebarSource.lastIndexOf("<Button", toggleLabel);
    expect(toggleStart).toBeGreaterThanOrEqual(0);
    const toggleEnd = sidebarSource.indexOf("</Button>", toggleLabel);
    expect(toggleEnd).toBeGreaterThan(toggleLabel);
    const toggle = sidebarSource.slice(toggleStart, toggleEnd);
    expect(toggle).toContain("aria-expanded={sectionOpen}");
    expect(toggle).toContain("طي القسم");
    expect(toggle).toContain("توسيع القسم");
  });

  it("should_reference_the_section_list_from_the_toggle", () => {
    const sectionListIdDef = sidebarSource.indexOf(
      "const sectionListId = `sidebar-section-list-${navKey}`;",
    );
    expect(sectionListIdDef).toBeGreaterThanOrEqual(0);
    const toggleLabel = sidebarSource.indexOf('aria-label={sectionOpen ? "');
    expect(toggleLabel).toBeGreaterThanOrEqual(0);
    const toggleStart = sidebarSource.lastIndexOf("<Button", toggleLabel);
    expect(toggleStart).toBeGreaterThanOrEqual(0);
    const toggleEnd = sidebarSource.indexOf("</Button>", toggleLabel);
    expect(toggleEnd).toBeGreaterThan(toggleLabel);
    const toggle = sidebarSource.slice(toggleStart, toggleEnd);
    expect(toggle).toContain("aria-controls={sectionListId}");
  });

  it("should_give_the_expanded_list_a_matching_id", () => {
    const listClass = sidebarSource.indexOf(
      "max-h-80 space-y-0.5 overflow-y-auto",
    );
    expect(listClass).toBeGreaterThanOrEqual(0);
    const listOpen = sidebarSource.lastIndexOf("<div", listClass);
    expect(listOpen).toBeGreaterThanOrEqual(0);
    const listClose = sidebarSource.indexOf(">", listClass);
    expect(listClose).toBeGreaterThan(listOpen);
    expect(sidebarSource.slice(listOpen, listClose)).toContain(
      "id={sectionListId}",
    );
  });
});
