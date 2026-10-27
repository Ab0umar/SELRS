import type { z } from "zod";
export function readPending<T>(
  key: string,
  schema: z.ZodType<T>,
): T | undefined {
  try {
    const parsed = schema.safeParse(
      JSON.parse(sessionStorage.getItem(key) ?? "null"),
    );
    return parsed.success ? parsed.data : undefined;
  } catch {
    return undefined;
  }
}
export function savePending(key: string, context: unknown) {
  try {
    sessionStorage.setItem(key, JSON.stringify(context));
  } catch {
    /* Server tracking remains authoritative. */
  }
}
export function removePending(key: string) {
  try {
    sessionStorage.removeItem(key);
  } catch {
    /* The current view can still clear its local state. */
  }
}
