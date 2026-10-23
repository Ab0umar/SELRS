import { describe, expect, it } from "vitest";
import { validateUsernameField } from "./force-password-change-validation";

describe("validateUsernameField", () => {
  it("should_require_username", () => {
    expect(validateUsernameField("")).toBe("اسم المستخدم مطلوب");
  });

  it("should_reject_whitespace_only_username", () => {
    expect(validateUsernameField("   ")).toBe("اسم المستخدم مطلوب");
  });

  it("should_reject_username_shorter_than_three_chars", () => {
    expect(validateUsernameField("ab")).toBe(
      "اسم المستخدم يجب أن يكون 3 أحرف على الأقل",
    );
  });

  it("should_measure_length_after_trimming", () => {
    expect(validateUsernameField(" ab ")).toBe(
      "اسم المستخدم يجب أن يكون 3 أحرف على الأقل",
    );
  });

  it("should_accept_username_of_exactly_three_chars", () => {
    expect(validateUsernameField("abc")).toBeUndefined();
  });

  it("should_accept_trimmed_valid_username", () => {
    expect(validateUsernameField("  ahmed  ")).toBeUndefined();
  });
});
