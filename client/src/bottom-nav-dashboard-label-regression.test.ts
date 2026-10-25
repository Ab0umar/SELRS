import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const clientRoot = resolve(__dirname, "..");

const navSource = readFileSync(
  resolve(clientRoot, "src/components/layout/AppBottomNav.tsx"),
  "utf8",
);

// Scope element-level assertions to the <nav data-app-bottom-nav> JSX block so
// label spans in the more-sheet / customize-sheet lists cannot mask a
// regression on the primary tab buttons themselves.
const navBlock =
  navSource.match(/<nav\s+data-app-bottom-nav[\s\S]*?<\/nav>/)?.[0] ?? "";

describe("bottom nav dashboard label regression", () => {
  it("should_render_a_visible_label_for_the_dashboard_tab", () => {
    expect(navBlock).not.toBe("");

    // The dashboard-only suppression was the single icon-only tab in the bar;
    // it must never come back. Every primary tab renders its label span
    // unconditionally next to the icon.
    expect(navBlock).not.toContain('tab.key !== "dashboard"');
    expect(navBlock).toMatch(/\{tab\.label\}\s*<\/span>/);
  });

  it("should_keep_tab_labels_wrapping_so_the_bar_fits_six_buttons", () => {
    // Six labeled buttons (five tabs + المزيد) must share the h-16 row at
    // 360px; wrapping labels (not nowrap or truncation) is what keeps every
    // label fully visible inside the fixed 64px height.
    expect(navBlock).toContain(
      "max-w-full whitespace-normal text-center text-xs leading-tight",
    );
  });

  it("should_keep_the_accessible_name_matching_the_visible_label", () => {
    // WCAG 2.5.3 Label in Name: with the span now visible, the button's
    // accessible name must still come from the same tab.label so speech-input
    // users can activate the tab by its visible text.
    expect(navBlock).toContain("aria-label={tab.label}");
  });
});
