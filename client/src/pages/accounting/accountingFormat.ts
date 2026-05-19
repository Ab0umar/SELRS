/** Eastern Arabic-Indic digits for all accounting displays (screen + print). */
const AR = "٠١٢٣٤٥٦٧٨٩";

export function toArabicDigits(v: unknown): string {
  return String(v ?? "").replace(/\d/g, (d) => AR[Number(d)] as string);
}

/** Money: format with 2 decimals, using Arabic digits. */
export function formatMoneyAr(value: number | string): string {
  const num = typeof value === 'string' ? parseFloat(value) : value;
  if (isNaN(num)) return "—";
  return toArabicDigits(num.toFixed(2));
}

/** Count: format with 0 decimals, using Arabic digits. */
export function formatCountAr(value: number | string): string {
  const num = typeof value === 'string' ? parseInt(value) : value;
  if (isNaN(num)) return "٠";
  return toArabicDigits(num.toFixed(0));
}

/** ISO / date string: convert digit run to Arabic-Indic. */
export function formatDateAr(value: string | null | undefined): string {
  if (value == null || value === "") return "—";
  return toArabicDigits(String(value).slice(0, 10));
}

export function fmt(n: number | null | undefined): string {
  if (n == null) return "—";
  return n.toLocaleString("ar-EG", { minimumFractionDigits: 0, maximumFractionDigits: 2 });
}

export function fmtDate(iso: string): string {
  try {
    return new Date(`${iso}T12:00:00`).toLocaleDateString("ar-EG", { day: "numeric", month: "short", year: "numeric" });
  } catch { return iso; }
}

export function todayIso(): string { return new Date().toISOString().split("T")[0]; }
