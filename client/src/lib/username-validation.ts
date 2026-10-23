// Message parity with server/routers.ts auth.changeUsername.
const REQUIRED = "اسم المستخدم مطلوب";
const MIN_LENGTH = "اسم المستخدم يجب أن يكون 3 أحرف على الأقل";
const TOO_LONG = "اسم المستخدم طويل جدًا";
const MUST_DIFFER = "اسم المستخدم الجديد يجب أن يختلف عن الحالي";
const ALREADY_EXISTS = "اسم المستخدم مستخدم بالفعل";

// English messages thrown by the server, keyed for field-error mapping.
const SERVER_MESSAGES: Record<string, string> = {
  "Username already exists": ALREADY_EXISTS,
  "New username must be different": MUST_DIFFER,
  "Username must be at least 3 characters": MIN_LENGTH,
  "Username is too long": TOO_LONG,
};

export function validateUsername(
  value: string,
  currentUsername?: string,
): string | undefined {
  const username = value.trim();

  if (!username) {
    return REQUIRED;
  }
  if (username.length < 3) {
    return MIN_LENGTH;
  }
  if (username.length > 64) {
    return TOO_LONG;
  }
  if (
    currentUsername !== undefined &&
    username.toLowerCase() === currentUsername.trim().toLowerCase()
  ) {
    return MUST_DIFFER;
  }
  return undefined;
}

/** Maps a server error message to an Arabic field error, or undefined when unknown. */
export function mapUsernameServerError(
  message: string,
): string | undefined {
  return SERVER_MESSAGES[message];
}
