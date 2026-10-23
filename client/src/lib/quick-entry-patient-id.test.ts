import { describe, expect, it } from "vitest";
import { parseQuickEntryPatientId } from "./quick-entry-patient-id";

describe("quick entry patient id parser", () => {
  it("should_return_absent_for_undefined", () => {
    expect(parseQuickEntryPatientId(undefined)).toEqual({ status: "absent" });
  });

  it("should_return_absent_for_null", () => {
    expect(parseQuickEntryPatientId(null)).toEqual({ status: "absent" });
  });

  it("should_return_absent_for_empty_string", () => {
    expect(parseQuickEntryPatientId("")).toEqual({ status: "absent" });
  });

  it("should_return_valid_id_for_single_digit", () => {
    expect(parseQuickEntryPatientId("7")).toEqual({ status: "valid", id: 7 });
  });

  it("should_return_valid_id_for_multi_digit", () => {
    expect(parseQuickEntryPatientId("1024")).toEqual({
      status: "valid",
      id: 1024,
    });
  });

  it("should_return_invalid_for_non_numeric_id", () => {
    expect(parseQuickEntryPatientId("abc")).toEqual({
      status: "invalid",
      raw: "abc",
    });
  });

  it("should_return_invalid_for_zero", () => {
    expect(parseQuickEntryPatientId("0")).toEqual({
      status: "invalid",
      raw: "0",
    });
  });

  it("should_return_invalid_for_negative_id", () => {
    expect(parseQuickEntryPatientId("-3")).toEqual({
      status: "invalid",
      raw: "-3",
    });
  });

  it("should_return_invalid_for_decimal_id", () => {
    expect(parseQuickEntryPatientId("1.5")).toEqual({
      status: "invalid",
      raw: "1.5",
    });
  });

  it("should_return_invalid_for_trailing_letters_after_digits", () => {
    expect(parseQuickEntryPatientId("12abc")).toEqual({
      status: "invalid",
      raw: "12abc",
    });
  });

  it("should_return_invalid_for_leading_whitespace", () => {
    expect(parseQuickEntryPatientId(" 5")).toEqual({
      status: "invalid",
      raw: " 5",
    });
  });

  it("should_return_invalid_for_leading_zero_padding", () => {
    expect(parseQuickEntryPatientId("007")).toEqual({
      status: "invalid",
      raw: "007",
    });
  });

  it("should_return_invalid_for_exponent_notation", () => {
    expect(parseQuickEntryPatientId("1e3")).toEqual({
      status: "invalid",
      raw: "1e3",
    });
  });

  it("should_return_invalid_for_unsafe_large_integer", () => {
    expect(parseQuickEntryPatientId("99999999999999999999")).toEqual({
      status: "invalid",
      raw: "99999999999999999999",
    });
  });
});
