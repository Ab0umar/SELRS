// file: client/src/components/TopNav.test.tsx
import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { Router } from "wouter";
import TopNav from "./TopNav";

const otherNavHrefs = ["/dashboard", "/appointments", "/reports"];

function renderTopNavAt(path: string): string {
  return renderToStaticMarkup(
    <Router ssrPath={path}>
      <TopNav />
    </Router>,
  );
}

/** Map of href -> opening <a ...> tag for every anchor in the markup. */
function anchorsByHref(html: string): Map<string, string> {
  const anchors = new Map<string, string>();
  for (const tag of html.match(/<a\s[^>]*>/g) ?? []) {
    const href = /href="([^"]*)"/.exec(tag)?.[1];
    if (href !== undefined) anchors.set(href, tag);
  }
  return anchors;
}

describe("TopNav current page indication", () => {
  it("should_mark_only_matching_link_as_current", () => {
    const html = renderTopNavAt("/patients");
    const anchors = anchorsByHref(html);

    expect(anchors.has("/patients")).toBe(true);
    expect(anchors.get("/patients")).toContain('aria-current="page"');
    for (const href of ["/", ...otherNavHrefs]) {
      expect(anchors.get(href)).not.toContain("aria-current");
    }
    expect(html.match(/aria-current="page"/g)).toHaveLength(1);
  });

  it("should_keep_nested_patient_route_marked_as_current", () => {
    const anchors = anchorsByHref(renderTopNavAt("/patients/123"));

    expect(anchors.get("/patients")).toContain('aria-current="page"');
    for (const href of otherNavHrefs) {
      expect(anchors.get(href)).not.toContain("aria-current");
    }
  });

  it("should_ignore_query_string_when_matching_current_link", () => {
    const html = renderTopNavAt("/patients?tab=x");
    const anchors = anchorsByHref(html);

    expect(anchors.get("/patients")).toContain('aria-current="page"');
    expect(html.match(/aria-current="page"/g)).toHaveLength(1);
  });

  it("should_not_mark_any_link_on_unknown_routes", () => {
    const html = renderTopNavAt("/unknown");

    expect(html).not.toContain("aria-current");
  });

  it("should_leave_other_links_without_aria_current_on_dashboard", () => {
    const anchors = anchorsByHref(renderTopNavAt("/dashboard"));

    expect(anchors.get("/dashboard")).toContain('aria-current="page"');
    for (const href of ["/patients", "/appointments", "/reports"]) {
      expect(anchors.get(href)).not.toContain("aria-current");
    }
  });

  it("should_label_the_navigation_landmark", () => {
    const html = renderToStaticMarkup(
      <Router ssrPath="/dashboard">
        <TopNav />
      </Router>,
    );

    expect(html).toContain('aria-label="التنقل الرئيسي"');
  });

  it("should_style_the_current_link_differently_from_inactive_links", () => {
    const anchors = anchorsByHref(renderTopNavAt("/patients"));
    const activeTag = anchors.get("/patients");
    const inactiveTag = anchors.get("/appointments");

    expect(activeTag).toContain("bg-primary-foreground/15");
    expect(activeTag).toContain("font-semibold");
    expect(activeTag).toContain("after:scale-x-100");
    expect(activeTag).not.toContain("after:scale-x-0");
    expect(inactiveTag).not.toContain("bg-primary-foreground/15");
    expect(inactiveTag).toContain("after:scale-x-0");
    expect(inactiveTag).not.toContain("font-semibold");
  });
});
