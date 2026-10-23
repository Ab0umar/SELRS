import { describe, expect, it } from "vitest";
import {
  mapUsernameServerError,
  validateUsername,
} from "./username-validation";

const CURRENT = "doctor.hassan";
const NEW_USERNAME = "dr.hassan";

describe("validateUsername", () => {
  it("should_reject_an_empty_username", () => {
    expect(validateUsername("")).toBe("اسم المستخدم مطلوب");
  });

  it("should_reject_a_whitespace_only_username", () => {
    expect(validateUsername("   ")).toBe("اسم المستخدم مطلوب");
  });

  it("should_reject_a_username_shorter_than_3_characters", () => {
    expect(validateUsername("ab")).toBe(
      "اسم المستخدم يجب أن يكون 3 أحرف على الأقل",
    );
  });

  it("should_accept_a_username_of_exactly_3_characters", () => {
    expect(validateUsername("abc")).toBeUndefined();
  });

  it("should_accept_a_username_of_exactly_64_characters", () => {
    expect(validateUsername("a".repeat(64))).toBeUndefined();
  });

  it("should_reject_a_username_longer_than_64_characters", () => {
    expect(validateUsername("a".repeat(65))).toBe("اسم المستخدم طويل جدًا");
  });

  it("should_reject_username_equal_to_current_ignoring_case", () => {
    expect(validateUsername(NEW_USERNAME.toUpperCase(), NEW_USERNAME)).toBe(
      "اسم المستخدم الجديد يجب أن يختلف عن الحالي",
    );
  });

  it("should_detect_same_as_current_after_trimming_both_sides", () => {
    expect(
      validateUsername(` ${NEW_USERNAME} `, `  ${NEW_USERNAME}  `),
    ).toBe("اسم المستخدم الجديد يجب أن يختلف عن الحالي");
  });

  it("should_accept_a_padded_but_otherwise_valid_username", () => {
    expect(validateUsername(` ${NEW_USERNAME} `)).toBeUndefined();
  });

  it("should_accept_a_username_different_from_current", () => {
    expect(validateUsername(NEW_USERNAME, CURRENT)).toBeUndefined();
  });

  it("should_apply_no_current_check_when_current_is_omitted", () => {
    expect(validateUsername(CURRENT)).toBeUndefined();
  });

  it("should_measure_length_after_trimming", () => {
    expect(validateUsername(" ab ")).toBe(
      "اسم المستخدم يجب أن يكون 3 أحرف على الأقل",
    );
  });
});

describe("mapUsernameServerError", () => {
  it("should_map_already_exists_to_its_arabic_message", () => {
    expect(mapUsernameServerError("Username already exists")).toBe(
      "اسم المستخدم مستخدم بالفعل",
    );
  });

  it("should_map_must_be_different_to_its_arabic_message", () => {
    expect(mapUsernameServerError("New username must be different")).toBe(
      "اسم المستخدم الجديد يجب أن يختلف عن الحالي",
    );
  });

  it("should_map_minimum_length_to_its_arabic_message", () => {
    expect(
      mapUsernameServerError("Username must be at least 3 characters"),
    ).toBe("اسم المستخدم يجب أن يكون 3 أحرف على الأقل");
  });

  it("should_map_too_long_to_its_arabic_message", () => {
    expect(mapUsernameServerError("Username is too long")).toBe(
      "اسم المستخدم طويل جدًا",
    );
  });

  it("should_return_undefined_for_an_unknown_message", () => {
    expect(mapUsernameServerError("Something unexpected")).toBeUndefined();
  });
});
