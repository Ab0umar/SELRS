// file: client/src/components/ErrorFallback.test.tsx
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { ErrorFallback } from "./ErrorFallback";

const HEADING = "حدث خطأ غير متوقع";
const RELOAD_LABEL = "إعادة تحميل الصفحة";
const HOME_LABEL = "الصفحة الرئيسية";
const SHOW_DETAILS_LABEL = "عرض التفاصيل التقنية";

function renderFallback(error: Error | null = null): string {
  return renderToStaticMarkup(
    createElement(ErrorFallback, {
      error,
      onReload: () => {},
      onGoHome: () => {},
    }),
  );
}

describe("ErrorFallback", () => {
  it("should_render_root_with_dir_rtl_and_role_alert", () => {
    const html = renderFallback();

    expect(html).toContain('dir="rtl"');
    expect(html).toContain('role="alert"');
  });

  it("should_render_the_arabic_heading_and_both_action_labels", () => {
    const html = renderFallback();

    expect(html).toContain(HEADING);
    expect(html).toContain(RELOAD_LABEL);
    expect(html).toContain(HOME_LABEL);
  });

  it("should_not_contain_the_old_english_fallback_strings", () => {
    const html = renderFallback();

    expect(html).not.toContain("An Unexpected Error Occurred");
    expect(html).not.toContain("Reload Page");
  });

  it("should_keep_the_stack_trace_out_of_the_collapsed_markup", () => {
    const marker = "SELRS_STACK_MARKER_020";
    const error = new Error(`boom ${marker}`);

    expect(error.stack).toContain(marker);
    expect(renderFallback(error)).not.toContain(marker);
  });

  it("should_render_the_details_toggle_collapsed_with_aria_expanded_false", () => {
    const html = renderFallback(new Error("boom"));

    expect(html).toContain(SHOW_DETAILS_LABEL);
    expect(html).toContain('aria-expanded="false"');
  });

  it("should_not_render_the_details_toggle_without_an_error", () => {
    const html = renderFallback(null);

    expect(html).not.toContain("aria-expanded");
    expect(html).not.toContain(SHOW_DETAILS_LABEL);
  });
});

describe("ErrorFallback source regressions", () => {
  const componentDir = resolve(__dirname);

  function readComponentFile(name: string): string {
    return readFileSync(resolve(componentDir, name), "utf8");
  }

  it("should_keep_ErrorBoundary_free_of_the_bare_variant_and_stack_output", () => {
    const source = readComponentFile("ErrorBoundary.tsx");

    expect(source).not.toContain('variant="bare"');
    expect(source).not.toContain("error?.stack");
  });

  it("should_keep_ErrorFallback_on_the_shared_Button_variants_only", () => {
    const source = readComponentFile("ErrorFallback.tsx");

    expect(source).not.toContain('variant="bare"');
    expect(source).toContain('variant="default"');
    expect(source).toContain('variant="outline"');
  });
});
