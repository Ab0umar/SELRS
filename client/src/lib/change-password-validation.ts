export type ChangePasswordFormValues = {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
};

export type ChangePasswordFieldErrors = {
  currentPassword?: string;
  newPassword?: string;
  confirmPassword?: string;
};

/** Pre-submit helper text shown under the new password field. */
export const CHANGE_PASSWORD_RULES_HINT =
  "6 أحرف على الأقل ويجب أن تختلف عن كلمة المرور الحالية";

// Message parity with server/routers.ts auth.changePassword.
const REQUIRED_CURRENT = "كلمة المرور الحالية مطلوبة";
const REQUIRED_NEW = "كلمة المرور الجديدة مطلوبة";
const REQUIRED_CONFIRM = "تأكيد كلمة المرور الجديدة مطلوب";
const MIN_LENGTH_NEW = "كلمة المرور الجديدة يجب أن تكون 6 أحرف على الأقل";
const MUST_DIFFER_NEW = "كلمة المرور الجديدة يجب أن تكون مختلفة عن الحالية";
const MISMATCH_CONFIRM = "تأكيد كلمة المرور الجديدة غير متطابق";

export function validateChangePasswordForm(
  input: ChangePasswordFormValues,
): ChangePasswordFieldErrors {
  const currentPassword = input.currentPassword.trim();
  const newPassword = input.newPassword.trim();
  const confirmPassword = input.confirmPassword.trim();

  const errors: ChangePasswordFieldErrors = {};

  if (!currentPassword) {
    errors.currentPassword = REQUIRED_CURRENT;
  }

  if (!newPassword) {
    errors.newPassword = REQUIRED_NEW;
  } else if (newPassword.length < 6) {
    errors.newPassword = MIN_LENGTH_NEW;
  } else if (newPassword === currentPassword) {
    errors.newPassword = MUST_DIFFER_NEW;
  }

  if (!confirmPassword) {
    errors.confirmPassword = REQUIRED_CONFIRM;
  } else if (!errors.newPassword && newPassword !== confirmPassword) {
    errors.confirmPassword = MISMATCH_CONFIRM;
  }

  return errors;
}
