// file: client/src/components/FormField.test.tsx
import { describe, expect, it } from "vitest";
import { Fragment } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { FormField } from "./FormField";

type FormFieldProps = React.ComponentProps<typeof FormField>;

// Obviously fake label and messages; no real product copy.
const LABEL = "Test Field Label";
const FAKE_ERROR = "Test error message";
const FAKE_OVERRIDE = "Test required override";

function renderField(overrides: Partial<FormFieldProps> = {}): string {
  const props = {
    label: LABEL,
    // Fragment children are never wired, so the label keeps the sr-only text.
    children: (
      <Fragment>
        <input />
      </Fragment>
    ),
    ...overrides,
  };
  return renderToStaticMarkup(<FormField {...props} />);
}

/** Opening tag of the first `<tag ...>` element in the markup. */
function openTag(html: string, tag: string): string {
  return new RegExp(`<${tag}\\s[^>]*>`).exec(html)?.[0] ?? "";
}

/** Value of attribute `name` inside an opening tag, "" when absent. */
function attr(tag: string, name: string): string {
  return new RegExp(`${name}="([^"]*)"`).exec(tag)?.[1] ?? "";
}

describe("FormField required text", () => {
  it("should_render_arabic_required_text_by_default", () => {
    const html = renderField({ required: true });

    expect(html).toContain("(مطلوب)");
    expect(html).not.toContain("(required)");
  });

  it("should_render_english_required_text_for_en_locale", () => {
    const html = renderField({ required: true, locale: "en" });

    expect(html).toContain("(required)");
    expect(html).not.toContain("(مطلوب)");
  });

  it("should_use_required_label_override_over_locale", () => {
    const html = renderField({
      required: true,
      locale: "en",
      requiredLabel: FAKE_OVERRIDE,
    });

    expect(html).toContain(FAKE_OVERRIDE);
    expect(html).not.toContain("(required)");
    expect(html).not.toContain("(مطلوب)");
  });

  it("should_not_render_sr_only_text_when_child_control_is_wired", () => {
    const html = renderField({ required: true, children: <input /> });
    const input = openTag(html, "input");

    expect(html).not.toContain("sr-only");
    expect(html).not.toContain("(مطلوب)");
    expect(attr(input, "aria-required")).toBe("true");
  });
});

describe("FormField error styling", () => {
  it("should_apply_strong_error_ring_when_error_present", () => {
    const html = renderField({ error: FAKE_ERROR });

    expect(html).toContain("ring-2");
    expect(html).toContain("ring-destructive/60");
    expect(html).toContain("border-destructive");
    expect(html).not.toContain("ring-destructive/30");
  });

  it("should_not_apply_error_ring_without_error", () => {
    const html = renderField();

    expect(html).not.toContain("ring-destructive");
    expect(html).toContain("border-transparent");
  });

  it("should_keep_role_alert_error_node_and_aria_invalid_on_control", () => {
    const html = renderField({ error: FAKE_ERROR, children: <input /> });
    const alert = new RegExp('<div\\s[^>]*role="alert"[^>]*>').exec(html)?.[0];
    const input = openTag(html, "input");

    expect(alert).toBeDefined();
    expect(attr(input, "aria-invalid")).toBe("true");
    // The control points at the alert node through aria-describedby.
    expect(alert).toContain(`id="${attr(input, "aria-describedby")}"`);
    expect(html).toContain(FAKE_ERROR);
  });
});
