// Message parity with client/src/pages/ForcePasswordChange.tsx submitUsername toasts.
const REQUIRED_USERNAME = "اسم المستخدم مطلوب";
const MIN_LENGTH_USERNAME = "اسم المستخدم يجب أن يكون 3 أحرف على الأقل";

/** Returns the inline error message for the username field, or undefined when valid. */
export function validateUsernameField(value: string): string | undefined {
  const username = value.trim();

  if (!username) {
    return REQUIRED_USERNAME;
  }

  if (username.length < 3) {
    return MIN_LENGTH_USERNAME;
  }

  return undefined;
}
