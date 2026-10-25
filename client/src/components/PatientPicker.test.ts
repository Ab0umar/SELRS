import { beforeEach, describe, expect, it, vi } from "vitest";
import { createElement, Fragment, type ComponentProps } from "react";
import { renderToStaticMarkup } from "react-dom/server";

const getPatientUseQuery = vi.hoisted(() => vi.fn());
const searchUseQuery = vi.hoisted(() => vi.fn());
vi.mock("@/lib/trpc", () => ({
  trpc: {
    patient: { getPatient: { useQuery: getPatientUseQuery } },
    medical: { searchPatients: { useQuery: searchUseQuery } },
  },
}));
import PatientPicker from "./PatientPicker";

type PickerProps = ComponentProps<typeof PatientPicker>;

function renderPicker(props: Partial<PickerProps> = {}) {
  return renderToStaticMarkup(
    createElement(PatientPicker, { onSelect: () => {}, ...props }),
  );
}

function inputTag(html: string) {
  const tag = html.match(/<input\b[^>]*>/)?.[0];
  if (!tag) throw new Error("input element missing from markup");
  return tag;
}

function attrOf(tag: string, name: string) {
  return tag.match(new RegExp(`(?:^|\\s)${name}="([^"]*)"`))?.[1];
}

// Markup cases shared with the collapsed picker live in PatientPicker.test.tsx;
// this file keeps only the cases unique to it.
describe("patient picker combobox markup", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getPatientUseQuery.mockReturnValue({
      data: undefined,
      isError: false,
      refetch: vi.fn(),
    });
    searchUseQuery.mockReturnValue({
      data: [],
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    });
  });

  it("should_omit_aria_controls_while_listbox_is_not_rendered", () => {
    const html = renderPicker();
    const input = inputTag(html);
    expect(html).not.toContain('role="listbox"');
    expect(input).not.toContain("aria-controls");
    expect(attrOf(input, "aria-expanded")).toBe("false");
    expect(attrOf(input, "id")?.endsWith("-input")).toBe(true);
  });

  it("should_keep_the_accessible_label_linked_to_the_input", () => {
    const html = renderPicker();
    const labelFor = html.match(/<label\b[^>]*\bfor="([^"]+)"/)?.[1];
    const labelTag = html.match(/<label\b[^>]*>/)?.[0] ?? "";
    expect(labelFor).toBe(attrOf(inputTag(html), "id"));
    expect(labelTag).toContain("sr-only");
    expect(labelTag).not.toContain("hidden");
    expect(html).toContain("اختر المريض");
  });

  it("should_fall_back_to_placeholder_aria_label_when_label_is_empty", () => {
    const html = renderPicker({ label: "", placeholder: "بحث عن مريض…" });
    expect(html).not.toContain("<label");
    expect(attrOf(inputTag(html), "aria-label")).toBe("بحث عن مريض…");
  });

  it("should_generate_unique_ids_for_multiple_instances", () => {
    const html = renderToStaticMarkup(
      createElement(
        Fragment,
        null,
        createElement(PatientPicker, { onSelect: () => {} }),
        createElement(PatientPicker, { onSelect: () => {} }),
      ),
    );
    const ids = [...html.matchAll(/<input\b[^>]*>/g)].map((tag) =>
      attrOf(tag[0], "id"),
    );
    expect(ids).toHaveLength(2);
    expect(ids[0]).not.toBe(ids[1]);
  });

  it("should_stay_collapsed_and_readonly_when_readOnly", () => {
    const html = renderPicker({ readOnly: true });
    const input = inputTag(html);
    // React serializes the prop as readOnly="" in static markup, readonly="" in the DOM.
    expect(input.toLowerCase()).toContain('readonly=""');
    expect(attrOf(input, "aria-expanded")).toBe("false");
    expect(html).not.toContain('role="listbox"');
  });

  it("should_render_english_label_for_en_locale", () => {
    const html = renderPicker({
      locale: "en",
      label: "Patient Search (optional)",
    });
    expect(html).toContain("Patient Search (optional)");
    expect(html).toContain('dir="ltr"');
  });
});
