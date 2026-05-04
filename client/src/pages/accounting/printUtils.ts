import { formatCountAr, formatDateAr, formatMoneyAr, toArabicDigits } from "./accountingFormat";

export type PrintPayload = {
  /** Receipt and other specialized print layouts (optional; omit for default accounting reports). */
  printLayout?: "receipt";
  title: string;
  meta: {
    clinicName: string;
    fromDate?: string;
    toDate?: string;
    filters?: Record<string, string>;
  };
  groupBy?: string[];
  columns: { key: string; label: string; align?: "left" | "right" | "center" }[];
  rows: Record<string, any>[];
  totals?: { label: string; values: Record<string, number> }[];
  footer?: string;
};

export function formatPrintCellValue(
  value: unknown,
  col: { key: string; align?: string },
): string {
  if (value == null || value === "") return "";
  if (typeof value === "number") {
    if (col.key === "rowCount" || col.key.toLowerCase().includes("count")) {
      return formatCountAr(value);
    }
    return formatMoneyAr(value);
  }
  const s = String(value);
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return formatDateAr(s);
  return toArabicDigits(s);
}

export function firstNumericColumnIndex(cols: PrintPayload["columns"]): number {
  const idx = cols.findIndex((c) => c.align === "right");
  return idx >= 0 ? idx : cols.length;
}

export function sumNumericBlock(
  rows: Record<string, unknown>[],
  cols: PrintPayload["columns"],
): Record<string, number> {
  const acc: Record<string, number> = {};
  for (const c of cols) {
    if (c.align !== "right") continue;
    acc[c.key] = 0;
  }
  for (const row of rows) {
    for (const c of cols) {
      if (c.align !== "right") continue;
      const v = row[c.key];
      if (typeof v === "number") acc[c.key] = (acc[c.key] ?? 0) + v;
    }
  }
  return acc;
}

export function hasPrintableDateRange(meta: PrintPayload["meta"]): boolean {
  return Boolean(meta.fromDate && meta.toDate);
}

export function openPrint(payload: PrintPayload) {
  const id = `accounting:print:${Date.now()}`;
  sessionStorage.setItem(id, JSON.stringify(payload));
  window.location.href = `/accounting/print?payloadId=${id}`;
}
