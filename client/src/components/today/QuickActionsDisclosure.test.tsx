// file: client/src/components/today/QuickActionsDisclosure.test.tsx
import { describe, expect, it } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { QuickActionsDisclosure } from "./QuickActionsDisclosure";

const LABEL = "إجراءات سريعة";

function renderDisclosure(open: boolean, children = "محتوى الإجراءات"): string {
  return renderToStaticMarkup(
    createElement(QuickActionsDisclosure, {
      open,
      onOpenChange: () => {},
      children,
    }),
  );
}

/** Opening tags of every <button ...> in the markup. */
function buttonTags(html: string): string[] {
  return html.match(/<button\s[^>]*>/g) ?? [];
}

/** The trigger button: the only button the component renders itself. */
function triggerTag(html: string): string | undefined {
  return buttonTags(html).find(tag => tag.includes("aria-expanded"));
}

/** Full trigger element, opening tag through closing tag. */
function triggerElement(html: string): string | undefined {
  const tag = triggerTag(html);
  if (!tag) return undefined;
  return html.match(
    new RegExp(`${tag.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}[\\s\\S]*?</button>`),
  )?.[0];
}

describe("QuickActionsDisclosure", () => {
  it("should_render_trigger_as_button_with_aria_expanded_true_when_open", () => {
    const trigger = triggerTag(renderDisclosure(true));

    expect(trigger).toBeDefined();
    expect(trigger).toContain('type="button"');
    expect(trigger).toContain('aria-expanded="true"');
  });

  it("should_render_aria_expanded_false_when_closed", () => {
    // Radix also emits aria-controls when closed, so only state is asserted here.
    const trigger = triggerTag(renderDisclosure(false));

    expect(trigger).toBeDefined();
    expect(trigger).toContain('aria-expanded="false"');
  });

  it("should_link_trigger_aria_controls_to_content_id_when_open", () => {
    const html = renderDisclosure(true);
    const contentId = triggerTag(html)?.match(/aria-controls="([^"]+)"/)?.[1];

    expect(contentId).toBeTruthy();
    expect(html).toContain(`id="${contentId}"`);
  });

  it("should_render_chevron_svg_aria_hidden_inside_trigger", () => {
    const trigger = triggerElement(renderDisclosure(true));

    expect(trigger).toBeDefined();
    expect(trigger).toContain("<svg");
    expect(trigger).toContain('aria-hidden="true"');
  });

  it("should_not_render_plus_or_minus_text_indicator", () => {
    const trigger = triggerElement(renderDisclosure(true));

    expect(trigger).toBeDefined();
    expect(trigger).not.toContain("+");
    expect(trigger).not.toContain("−");
  });

  it("should_render_children_only_when_open", () => {
    expect(renderDisclosure(true)).toContain("محتوى الإجراءات");
    expect(renderDisclosure(false)).not.toContain("محتوى الإجراءات");
  });

  it("should_keep_label_text_in_trigger", () => {
    const trigger = triggerElement(renderDisclosure(true));

    expect(trigger).toContain(LABEL);
  });
});
