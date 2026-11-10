const ARABIC_DIGITS = "٠١٢٣٤٥٦٧٨٩";
const PERSIAN_DIGITS = "۰۱۲۳۴۵۶۷۸۹";

function toLatinDigits(value: string): string {
  return value.replace(/[٠-٩۰-۹]/g, (ch) => {
    const idx = ARABIC_DIGITS.indexOf(ch);
    return String(idx >= 0 ? idx : PERSIAN_DIGITS.indexOf(ch));
  });
}

function toIso(day: number, month: number, year: number): string | null {
  const fullYear = year < 100 ? 2000 + year : year;
  const d = new Date(fullYear, month - 1, day);
  if (
    d.getFullYear() !== fullYear ||
    d.getMonth() !== month - 1 ||
    d.getDate() !== day
  ) {
    return null;
  }
  return `${fullYear}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

/**
 * Reads a typed date in any common form (Arabic or Latin digits):
 * 101126, 10112026, 10/11/26, 10-11-2026, 10.11.2026, 2026-11-10.
 * Day comes first, matching how the clinic writes dates.
 */
export function parseFlexibleDate(raw: string): string | null {
  const value = toLatinDigits(String(raw ?? "").trim());
  if (!value) return null;

  const ymd = value.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})$/);
  if (ymd) return toIso(Number(ymd[3]), Number(ymd[2]), Number(ymd[1]));

  const dmy = value.match(/^(\d{1,2})[-/.\s](\d{1,2})[-/.\s](\d{2}|\d{4})$/);
  if (dmy) return toIso(Number(dmy[1]), Number(dmy[2]), Number(dmy[3]));

  if (/^\d{6}$/.test(value)) {
    return toIso(Number(value.slice(0, 2)), Number(value.slice(2, 4)), Number(value.slice(4)));
  }
  if (/^\d{8}$/.test(value)) {
    return toIso(Number(value.slice(0, 2)), Number(value.slice(2, 4)), Number(value.slice(4)));
  }
  return null;
}

/** Splits a records search box value into a date filter or a text search sent to the server. */
export function toRecordsSearchFilters(raw: string): { search?: string; date?: string } {
  const trimmed = String(raw ?? "").trim();
  if (!trimmed) return {};
  const date = parseFlexibleDate(trimmed);
  if (date) return { date };
  return { search: toLatinDigits(trimmed) };
}
