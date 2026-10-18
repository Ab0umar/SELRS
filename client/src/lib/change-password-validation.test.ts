import { describe, expect, it } from "vitest";
import {
  validateChangePasswordForm,
  type ChangePasswordFieldErrors,
} from "./change-password-validation";

const VALID_CURRENT = "OldPass1";
const VALID_NEW = "NewPass1";

function validate(values: {
  currentPassword?: string;
  newPassword?: string;
  confirmPassword?: string;
} = {}) {
  return validateChangePasswordForm({
    currentPassword: values.currentPassword ?? "",
    newPassword: values.newPassword ?? "",
    confirmPassword: values.confirmPassword ?? "",
  });
}

describe("validateChangePasswordForm", () => {
  it("reports a required error under each field when the form is empty", () => {
    expect(validate()).toEqual({
      currentPassword: "كلمة المرور الحالية مطلوبة",
      newPassword: "كلمة المرور الجديدة مطلوبة",
      confirmPassword: "تأكيد كلمة المرور الجديدة مطلوب",
    });
  });

  it("reports only the current password as required when it is missing", () => {
    expect(
      validate({
        newPassword: VALID_NEW,
        confirmPassword: VALID_NEW,
      }),
    ).toEqual({ currentPassword: "كلمة المرور الحالية مطلوبة" });
  });

  it("reports only the new password as required when it is missing", () => {
    expect(
      validate({
        currentPassword: VALID_CURRENT,
        confirmPassword: VALID_NEW,
      }),
    ).toEqual({ newPassword: "كلمة المرور الجديدة مطلوبة" });
  });

  it("reports only the confirmation as required when it is missing", () => {
    expect(
      validate({
        currentPassword: VALID_CURRENT,
        newPassword: VALID_NEW,
      }),
    ).toEqual({ confirmPassword: "تأكيد كلمة المرور الجديدة مطلوب" });
  });

  it("reports the length error under newPassword for a 5-character password", () => {
    expect(
      validate({
        currentPassword: VALID_CURRENT,
        newPassword: "abcde",
        confirmPassword: "abcde",
      }),
    ).toEqual({
      newPassword: "كلمة المرور الجديدة يجب أن تكون 6 أحرف على الأقل",
    });
  });

  it("reports the mismatch error under confirmPassword only", () => {
    expect(
      validate({
        currentPassword: VALID_CURRENT,
        newPassword: VALID_NEW,
        confirmPassword: "Different1",
      }),
    ).toEqual({ confirmPassword: "تأكيد كلمة المرور الجديدة غير متطابق" });
  });

  it("reports the must-differ error under newPassword when it equals the current password", () => {
    expect(
      validate({
        currentPassword: VALID_NEW,
        newPassword: VALID_NEW,
        confirmPassword: VALID_NEW,
      }),
    ).toEqual({
      newPassword: "كلمة المرور الجديدة يجب أن تكون مختلفة عن الحالية",
    });
  });

  it("returns an empty object when every field is valid", () => {
    expect(
      validate({
        currentPassword: VALID_CURRENT,
        newPassword: VALID_NEW,
        confirmPassword: VALID_NEW,
      }),
    ).toEqual({} satisfies ChangePasswordFieldErrors);
  });

  it("treats whitespace-only fields as empty", () => {
    expect(
      validate({
        currentPassword: "   ",
        newPassword: VALID_NEW,
        confirmPassword: VALID_NEW,
      }),
    ).toEqual({ currentPassword: "كلمة المرور الحالية مطلوبة" });
  });

  it("measures the new password length after trimming", () => {
    expect(
      validate({
        currentPassword: VALID_CURRENT,
        newPassword: " abcde ",
        confirmPassword: "abcde",
      }),
    ).toEqual({
      newPassword: "كلمة المرور الجديدة يجب أن تكون 6 أحرف على الأقل",
    });
  });

  it("detects a mismatch after trimming surrounding whitespace", () => {
    expect(
      validate({
        currentPassword: VALID_CURRENT,
        newPassword: ` ${VALID_NEW} `,
        confirmPassword: `  ${VALID_NEW}x`,
      }),
    ).toEqual({ confirmPassword: "تأكيد كلمة المرور الجديدة غير متطابق" });
  });

  it("detects same-as-current after trimming surrounding whitespace", () => {
    expect(
      validate({
        currentPassword: VALID_CURRENT,
        newPassword: `  ${VALID_CURRENT}  `,
        confirmPassword: ` ${VALID_CURRENT} `,
      }),
    ).toEqual({
      newPassword: "كلمة المرور الجديدة يجب أن تكون مختلفة عن الحالية",
    });
  });

  it("accepts padded but otherwise valid fields", () => {
    expect(
      validate({
        currentPassword: ` ${VALID_CURRENT}\t`,
        newPassword: ` ${VALID_NEW} `,
        confirmPassword: ` ${VALID_NEW} `,
      }),
    ).toEqual({});
  });
});
