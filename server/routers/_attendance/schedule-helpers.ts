/** Format a DB date value (Date object or string) as YYYY-MM-DD using local time parts. */
export function fmtDate(d: Date | string | null | undefined): string {
  if (!d) return "";
  if (typeof d === "string") return d.slice(0, 10);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}
