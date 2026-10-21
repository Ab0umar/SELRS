import { describe, expect, it } from "vitest";
import {
  getPatientOptionId,
  getNextActiveIndex,
  resolveComboboxKey,
} from "./patientPickerCombobox";

describe("patient picker combobox helpers", () => {
  it("should_wrap_forward_past_the_last_option_back_to_index_zero", () => {
    expect(getNextActiveIndex(2, 3, 1)).toBe(0);
    expect(getNextActiveIndex(0, 1, 1)).toBe(0);
  });

  it("should_wrap_backward_before_the_first_option_to_the_last_index", () => {
    expect(getNextActiveIndex(0, 3, -1)).toBe(2);
    expect(getNextActiveIndex(0, 1, -1)).toBe(0);
  });

  it("should_step_one_index_without_wrapping_inside_the_list", () => {
    expect(getNextActiveIndex(0, 3, 1)).toBe(1);
    expect(getNextActiveIndex(2, 3, -1)).toBe(1);
  });

  it("should_return_minus_one_for_an_empty_option_list", () => {
    expect(getNextActiveIndex(-1, 0, 1)).toBe(-1);
    expect(getNextActiveIndex(0, 0, -1)).toBe(-1);
  });

  it("should_pick_index_zero_on_first_arrow_down_from_minus_one", () => {
    expect(getNextActiveIndex(-1, 3, 1)).toBe(0);
  });

  it("should_pick_the_last_index_on_first_arrow_up_from_minus_one", () => {
    expect(getNextActiveIndex(-1, 3, -1)).toBe(2);
  });

  it("should_treat_an_out_of_range_current_like_no_active_option", () => {
    expect(getNextActiveIndex(5, 3, 1)).toBe(0);
    expect(getNextActiveIndex(5, 3, -1)).toBe(2);
  });

  it("should_open_on_arrow_down_when_closed_and_openable", () => {
    expect(
      resolveComboboxKey({
        key: "ArrowDown",
        isOpen: false,
        activeIndex: -1,
        optionCount: 3,
        canOpen: true,
      }),
    ).toEqual({ type: "open", activeIndex: 0 });
  });

  it("should_open_on_the_last_option_when_arrow_up_from_closed", () => {
    expect(
      resolveComboboxKey({
        key: "ArrowUp",
        isOpen: false,
        activeIndex: -1,
        optionCount: 3,
        canOpen: true,
      }),
    ).toEqual({ type: "open", activeIndex: 2 });
  });

  it("should_open_with_minus_one_when_closed_and_no_results_yet", () => {
    expect(
      resolveComboboxKey({
        key: "ArrowDown",
        isOpen: false,
        activeIndex: -1,
        optionCount: 0,
        canOpen: true,
      }),
    ).toEqual({ type: "open", activeIndex: -1 });
  });

  it("should_do_nothing_on_arrows_when_closed_and_not_openable", () => {
    for (const key of ["ArrowDown", "ArrowUp"]) {
      expect(
        resolveComboboxKey({
          key,
          isOpen: false,
          activeIndex: -1,
          optionCount: 3,
          canOpen: false,
        }),
      ).toEqual({ type: "none" });
    }
  });

  it("should_move_with_wrap_when_open_and_options_exist", () => {
    expect(
      resolveComboboxKey({
        key: "ArrowDown",
        isOpen: true,
        activeIndex: 2,
        optionCount: 3,
        canOpen: true,
      }),
    ).toEqual({ type: "move", activeIndex: 0 });
    expect(
      resolveComboboxKey({
        key: "ArrowUp",
        isOpen: true,
        activeIndex: 0,
        optionCount: 3,
        canOpen: true,
      }),
    ).toEqual({ type: "move", activeIndex: 2 });
  });

  it("should_do_nothing_on_arrows_when_open_without_options", () => {
    expect(
      resolveComboboxKey({
        key: "ArrowDown",
        isOpen: true,
        activeIndex: -1,
        optionCount: 0,
        canOpen: true,
      }),
    ).toEqual({ type: "none" });
  });

  it("should_return_none_for_enter_without_an_active_option", () => {
    expect(
      resolveComboboxKey({
        key: "Enter",
        isOpen: true,
        activeIndex: -1,
        optionCount: 3,
        canOpen: true,
      }),
    ).toEqual({ type: "none" });
    expect(
      resolveComboboxKey({
        key: "Enter",
        isOpen: false,
        activeIndex: 1,
        optionCount: 3,
        canOpen: true,
      }),
    ).toEqual({ type: "none" });
    expect(
      resolveComboboxKey({
        key: "Enter",
        isOpen: true,
        activeIndex: 3,
        optionCount: 3,
        canOpen: true,
      }),
    ).toEqual({ type: "none" });
  });

  it("should_return_select_for_enter_with_an_active_option", () => {
    expect(
      resolveComboboxKey({
        key: "Enter",
        isOpen: true,
        activeIndex: 1,
        optionCount: 3,
        canOpen: true,
      }),
    ).toEqual({ type: "select", activeIndex: 1 });
  });

  it("should_return_none_for_escape_when_already_closed", () => {
    expect(
      resolveComboboxKey({
        key: "Escape",
        isOpen: false,
        activeIndex: 0,
        optionCount: 3,
        canOpen: true,
      }),
    ).toEqual({ type: "none" });
  });

  it("should_return_close_for_escape_when_open", () => {
    expect(
      resolveComboboxKey({
        key: "Escape",
        isOpen: true,
        activeIndex: 1,
        optionCount: 3,
        canOpen: true,
      }),
    ).toEqual({ type: "close" });
  });

  it("should_return_none_for_unrelated_keys", () => {
    for (const key of ["a", "Tab", "Backspace", "ArrowLeft", " "]) {
      expect(
        resolveComboboxKey({
          key,
          isOpen: true,
          activeIndex: 0,
          optionCount: 3,
          canOpen: true,
        }),
      ).toEqual({ type: "none" });
    }
  });

  it("should_format_the_option_id_from_base_id_and_patient_id", () => {
    expect(getPatientOptionId("«r0»", 42)).toBe("«r0»-option-42");
    expect(getPatientOptionId("pp", 7)).toBe("pp-option-7");
  });
});
