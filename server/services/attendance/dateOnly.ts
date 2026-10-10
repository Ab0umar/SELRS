/** Convert SQL DATE values into a stable YYYY-MM-DD key for query predicates. */
export function toDateOnlyKey(value: Date | string): string {
  if (typeof value === "string") return value.slice(0, 10);

  return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, "0")}-${String(value.getDate()).padStart(2, "0")}`;
}
