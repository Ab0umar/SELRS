// file: client/src/components/PatientPicker.test.tsx
import { describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import PatientPicker from "./PatientPicker";
import PatientPickerResults, {
  type PatientOption,
} from "./PatientPickerResults";

vi.mock("@/lib/trpc", () => ({
  trpc: {
    patient: {
      getPatient: { useQuery: () => ({ data: undefined }) },
    },
    medical: {
      searchPatients: { useQuery: () => ({ data: [], isLoading: false }) },
    },
  },
}));

// Obviously fake patients; no realistic names or phone numbers.
const fixturePatients: PatientOption[] = [
  {
    id: 1,
    fullName: "Test Patient A",
    patientCode: "T-001",
    phone: "01000000001",
  },
  { id: 2, fullName: "Test Patient B", patientCode: "T-002", phone: null },
  { id: 3, fullName: "Test Patient C", patientCode: null, phone: null },
];

const noop = () => {};

type PickerProps = React.ComponentProps<typeof PatientPicker>;
type ResultsProps = React.ComponentProps<typeof PatientPickerResults>;

function renderPicker(overrides: Partial<PickerProps> = {}): string {
  return renderToStaticMarkup(<PatientPicker onSelect={noop} {...overrides} />);
}

function renderResults(overrides: Partial<ResultsProps> = {}): string {
  const props: ResultsProps = {
    listboxId: "lb-1",
    labelId: "lb-1-label",
    patients: fixturePatients,
    activeIndex: -1,
    isLoading: false,
    isEnglish: false,
    onSelectPatient: noop,
    onActiveIndexChange: noop,
    ...overrides,
  };
  return renderToStaticMarkup(<PatientPickerResults {...props} />);
}

/** Opening tag of the first `<tag ...>` element in the markup. */
function openTag(html: string, tag: string): string {
  return new RegExp(`<${tag}\\s[^>]*>`).exec(html)?.[0] ?? "";
}

/** Value of attribute `name` inside an opening tag, "" when absent. */
function attr(tag: string, name: string): string {
  return new RegExp(`${name}="([^"]*)"`).exec(tag)?.[1] ?? "";
}

describe("PatientPicker closed markup", () => {
  it("should_link_visually_hidden_label_to_input", () => {
    const html = renderPicker();
    const label = openTag(html, "label");
    const input = openTag(html, "input");

    expect(label).toContain("sr-only");
    expect(label).not.toContain("hidden");
    expect(attr(input, "id")).not.toBe("");
    expect(attr(label, "for")).toBe(attr(input, "id"));
  });

  it("should_expose_input_as_collapsed_combobox", () => {
    const input = openTag(renderPicker(), "input");

    expect(input).toContain('role="combobox"');
    expect(input).toContain('aria-autocomplete="list"');
    expect(input).toContain('aria-expanded="false"');
    expect(input).not.toContain("aria-controls");
    expect(input).not.toContain("aria-activedescendant");
  });

  it("should_render_custom_label_text", () => {
    const html = renderPicker({ label: "Patient", locale: "en" });

    expect(html).toMatch(/<label[^>]*>Patient<\/label>/);
  });
});

describe("PatientPickerResults", () => {
  it("should_render_listbox_with_option_roles", () => {
    const html = renderResults();
    const listbox = openTag(html, "ul");

    expect(listbox).toContain('role="listbox"');
    expect(listbox).toContain('id="lb-1"');
    expect(listbox).toContain('aria-labelledby="lb-1-label"');
    expect(html.match(/role="option"/g)).toHaveLength(3);
    expect(html).not.toContain("<button");
    expect(html).not.toContain("tabindex");
  });

  it("should_mark_only_active_option_selected", () => {
    const html = renderResults({ activeIndex: 1 });
    const options = html.match(/<li\s[^>]*>/g) ?? [];

    expect(html.match(/aria-selected="true"/g)).toHaveLength(1);
    expect(options).toHaveLength(3);
    expect(options[1]).toContain('id="lb-1-option-2"');
    expect(options[1]).toContain('aria-selected="true"');
    expect(options[1]).toContain('data-active="true"');
    expect(options[0]).toContain('aria-selected="false"');
    expect(options[2]).toContain('aria-selected="false"');
  });

  it("should_mark_no_option_selected_when_active_index_unset", () => {
    const html = renderResults({ activeIndex: -1 });

    expect(html).not.toContain('aria-selected="true"');
    expect(html).not.toContain("data-active");
    expect(html.match(/aria-selected="false"/g)).toHaveLength(3);
  });

  it("should_announce_loading_and_empty_states_via_status", () => {
    const loading = renderResults({
      patients: [],
      isLoading: true,
      isEnglish: false,
    });
    expect(loading).toContain('role="status"');
    expect(loading).toContain('aria-live="polite"');
    expect(loading).toContain("جاري البحث...");

    const empty = renderResults({ patients: [], isEnglish: true });
    expect(empty).toContain('role="status"');
    expect(empty).toContain("No results found");
  });
});
