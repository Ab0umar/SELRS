import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const clientRoot = resolve(__dirname, "..");

const navSource = readFileSync(
  resolve(clientRoot, "src/components/layout/AppBottomNav.tsx"),
  "utf8",
);

// Scope element-level assertions to the <nav data-app-bottom-nav> JSX block so
// decorative aria-hidden icons elsewhere in the file cannot mask a regression
// on the nav element itself.
const navBlock =
  navSource.match(/<nav\s+data-app-bottom-nav[\s\S]*?<\/nav>/)?.[0] ?? "";

describe("bottom nav inert regression", () => {
  it("should_remove_the_hidden_bottom_nav_from_the_tab_order_and_accessibility_tree", () => {
    expect(navBlock).not.toBe("");

    // inert must be bound to the derived suppression flag - never hardcoded
    // true and never a valueless attribute, or the visible nav would lose its
    // buttons to every pointer and keyboard interaction.
    expect(navBlock).toContain("inert={navSuppressed}");
    expect(navBlock).not.toMatch(/\binert(?!\s*=)/);
    expect(navBlock).not.toContain("inert={true}");

    // aria-hidden must be conditional so the attribute disappears entirely
    // while the nav is visible instead of announcing aria-hidden="false".
    expect(navBlock).toContain(
      "aria-hidden={navSuppressed ? true : undefined}",
    );
    expect(navBlock).not.toContain('aria-hidden="true"');
    expect(navBlock).not.toContain('aria-hidden="false"');
  });

  it("should_keep_sheet_open_guards_in_the_derived_navsuppressed_flag", () => {
    // The !sheetOpen/!moreSheetOpen guards are mandatory: SheetContent's
    // onCloseAutoFocus focuses moreButtonRef when the more-sheet closes, and
    // an inert nav would swallow that focus restore.
    expect(navSource).toContain(
      "const navSuppressed = navHidden && !sheetOpen && !moreSheetOpen;",
    );
  });

  it("should_preserve_the_200ms_slide_transition_without_visibility_hiding", () => {
    // Hidden branch classes must stay exactly as they were.
    expect(navBlock).toContain("pointer-events-none");
    expect(navBlock).toContain("opacity-0");
    expect(navBlock).toContain(
      "translate-y-[calc(100%+24px+env(safe-area-inset-bottom))]",
    );

    // Visible branch classes must stay exactly as they were.
    expect(navBlock).toContain("translate-y-0 opacity-100");

    // The slide-out animation rides on transform+opacity; a visibility-based
    // class would snap the nav instantly and kill the 200ms transition.
    expect(navBlock).toContain("transition-[transform,opacity]");
    expect(navBlock).toContain("duration-200");
    expect(navBlock).not.toMatch(/\binvisible\b|visibility/);
  });

  it("should_reset_navhidden_when_location_changes", () => {
    expect(navSource).toMatch(
      /useEffect\(\(\) => \{\s*setNavHidden\(false\);\s*\}, \[location\]\)/,
    );
  });
});
