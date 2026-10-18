import { describe, expect, it } from "vitest";
import {
  PATIENT_SEARCH_DEBOUNCE_MS,
  PATIENT_SEARCH_MIN_LENGTH,
  getPatientSearchGate,
  normalizePatientSearchTerm,
} from "./patientSearchGate";

describe("patientSearchGate", () => {
  it("should_not_show_dropdown_or_fetch_for_single_character", () => {
    const gate = getPatientSearchGate("a", "a");
    expect(gate).toEqual({
      showDropdown: false,
      shouldFetch: false,
      isDebouncing: false,
    });
  });

  it("should_report_debouncing_when_typed_term_is_ahead_of_debounced", () => {
    const gate = getPatientSearchGate("ah", "a");
    expect(gate.showDropdown).toBe(true);
    expect(gate.isDebouncing).toBe(true);
    expect(gate.shouldFetch).toBe(false);
  });

  it("should_fetch_once_debounced_term_settles", () => {
    const gate = getPatientSearchGate("ahm", "ahm");
    expect(gate.isDebouncing).toBe(false);
    expect(gate.shouldFetch).toBe(true);
    expect(gate.showDropdown).toBe(true);
  });

  it("should_collapse_whitespace_when_normalizing", () => {
    expect(normalizePatientSearchTerm("  ahmed   ali ")).toBe("ahmed ali");
    expect(normalizePatientSearchTerm("   ")).toBe("");
    expect(getPatientSearchGate(normalizePatientSearchTerm("   "), "").showDropdown).toBe(false);
  });

  it("should_count_arabic_characters_for_min_length", () => {
    expect(getPatientSearchGate("أح", "أح").showDropdown).toBe(true);
    expect(getPatientSearchGate("أح", "أح").shouldFetch).toBe(true);
    expect(getPatientSearchGate("أ", "أ").showDropdown).toBe(false);
    expect(getPatientSearchGate("أ", "أ").shouldFetch).toBe(false);
  });

  it("should_hide_dropdown_after_deleting_back_to_one_char", () => {
    const gate = getPatientSearchGate("a", "ab");
    expect(gate.showDropdown).toBe(false);
    expect(gate.isDebouncing).toBe(false);
    expect(gate.shouldFetch).toBe(true);
  });

  it("exports the min length and debounce delay used by the picker", () => {
    expect(PATIENT_SEARCH_MIN_LENGTH).toBe(2);
    expect(PATIENT_SEARCH_DEBOUNCE_MS).toBe(250);
  });
});
