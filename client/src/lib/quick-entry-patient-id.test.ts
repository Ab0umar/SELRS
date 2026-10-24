import { describe, expect, it } from "vitest";
import { parseQuickEntryPatientId } from "./quick-entry-patient-id";

describe("quick entry patient id parser", () => {
  it("should_treat_missing_id_as_absent", () => {
    expect(parseQuickEntryPatientId(undefined)).toEqual({ status: "absent" });
    expect(parseQuickEntryPatientId(null)).toEqual({ status: "absent" });
    expect(parseQuickEntryPatientId("")).toEqual({ status: "absent" });
  });

  it("should_accept_positive_integer_ids", () => {
    expect(parseQuickEntryPatientId("1")).toEqual({
      status: "valid",
      patientId: 1,
    });
    expect(parseQuickEntryPatientId("42")).toEqual({
      status: "valid",
      patientId: 42,
    });
    expect(parseQuickEntryPatientId("9007199254740991")).toEqual({
      status: "valid",
      patientId: 9007199254740991,
    });
  });

  it("should_reject_non_numeric_ids", () => {
    expect(parseQuickEntryPatientId("abc")).toEqual({
      status: "invalid",
      raw: "abc",
    });
  });

  it("should_reject_partially_numeric_ids", () => {
    expect(parseQuickEntryPatientId("12abc")).toEqual({
      status: "invalid",
      raw: "12abc",
    });
  });

  it("should_reject_zero_and_negative_ids", () => {
    expect(parseQuickEntryPatientId("0")).toEqual({
      status: "invalid",
      raw: "0",
    });
    expect(parseQuickEntryPatientId("-5")).toEqual({
      status: "invalid",
      raw: "-5",
    });
  });

  it("should_reject_decimal_ids", () => {
    expect(parseQuickEntryPatientId("1.5")).toEqual({
      status: "invalid",
      raw: "1.5",
    });
  });

  it("should_reject_leading_whitespace_ids", () => {
    expect(parseQuickEntryPatientId(" 12")).toEqual({
      status: "invalid",
      raw: " 12",
    });
  });

  it("should_reject_leading_zero_padding_ids", () => {
    expect(parseQuickEntryPatientId("007")).toEqual({
      status: "invalid",
      raw: "007",
    });
  });

  it("should_reject_exponent_notation_ids", () => {
    expect(parseQuickEntryPatientId("1e3")).toEqual({
      status: "invalid",
      raw: "1e3",
    });
  });

  it("should_reject_unsafe_integers", () => {
    expect(parseQuickEntryPatientId("9007199254740993")).toEqual({
      status: "invalid",
      raw: "9007199254740993",
    });
  });
});
