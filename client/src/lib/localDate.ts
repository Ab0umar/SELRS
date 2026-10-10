/** Format a date using the user's local calendar day (not UTC). */
export function toLocalDateKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

export function getLocalToday(): string {
  return toLocalDateKey(new Date());
}
