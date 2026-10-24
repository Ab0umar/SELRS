// file: client/src/pages/NotFound.test.tsx
import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { Router } from "wouter";

import NotFound from "./NotFound";

const BADGE_LABEL = "رابط غير موجود";
const HEADING = "الصفحة غير موجودة";
const BODY_LINE_ONE = "عذراً، الصفحة التي تبحث عنها غير موجودة.";
const BODY_LINE_TWO = "ربما تم نقلها أو حذفها.";
const HOME_LABEL = "الصفحة الرئيسية";

function renderPage(): string {
  return renderToStaticMarkup(
    <Router ssrPath="/404">
      <NotFound />
    </Router>,
  );
}

describe("NotFound markup", () => {
  it("should_render_root_with_dir_rtl", () => {
    const html = renderPage();

    expect(html).toContain('dir="rtl"');
  });

  it("should_render_the_arabic_badge_heading_body_and_button", () => {
    const html = renderPage();

    expect(html).toContain(BADGE_LABEL);
    expect(html).toContain(HEADING);
    expect(html).toContain(BODY_LINE_ONE);
    expect(html).toContain(BODY_LINE_TWO);
    expect(html).toContain(HOME_LABEL);
  });

  it("should_keep_the_404_numeral_heading", () => {
    const html = renderPage();

    expect(html).toContain(">404</h1>");
  });

  it("should_not_contain_the_old_english_404_strings", () => {
    const html = renderPage();

    expect(html).not.toContain("Missing Route");
    expect(html).not.toContain("Page Not Found");
    expect(html).not.toContain("Go Home");
    expect(html).not.toContain("Sorry, the page you are looking for");
  });
});
