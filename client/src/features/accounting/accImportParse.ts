// Parser for Excel account exports (bank / InstaPay app statements) into
// accInstapay / accHome ledger rows. Pure functions — shared with tests.

export type AccImportRow = {
  txDate: string;
  inAmount: number;
  outAmount: number;
  notes: string;
};

export type AccImportSheetParse = {
  rows: AccImportRow[];
  invalid: number;
  mappedColumns: string[];
};

// Reference token used for dedup on re-import (must match server regex).
const REF_RE = /(IPN[0-9a-f]{10,17}|[0-9a-f]{13})\b/i;

function normalizeHeader(v: unknown): string {
  return String(v ?? "")
    .trim()
    .toLowerCase()
    .replace(/[\s_]+/g, "");
}

type ColumnMap = {
  date?: number;
  amount?: number;
  in?: number;
  out?: number;
  desc?: number;
  hint?: number;
};

const HEADER_TESTS: Array<[keyof ColumnMap, RegExp]> = [
  ["date", /^(date|التاريخ|تاريخ)$/],
  [
    "amount",
    /^(amount|المبلغ|القيمة|القيمه|value|netamount|الصافي)$/,
  ],
  [
    "in",
    /^(in|income|credit|deposit|داخلة|داخله|داخل|منه|إيداع|ايداع|وارد)$/,
  ],
  [
    "out",
    /^(out|expense|debit|withdrawal|خارجة|خارجه|خارج|معاه|سحب|مدفوع|منصرف)$/,
  ],
  [
    "desc",
    /^(description|البيان|الوصف|البند|الاسم|name|from|sender|beneficiary|المستفيد|details)$/,
  ],
  ["hint", /^(hint|تفاصيل|الرسالة|sms|reference|المرجع)$/],
];

function detectColumns(header: unknown[]): ColumnMap {
  const map: ColumnMap = {};
  header.forEach((cell, idx) => {
    const h = normalizeHeader(cell);
    if (!h) return;
    for (const [key, re] of HEADER_TESTS) {
      if (map[key] === undefined && re.test(h)) {
        map[key] = idx;
        return;
      }
    }
  });
  return map;
}

const pad2 = (n: number) => String(n).padStart(2, "0");

export function parseAccDate(v: unknown): string | null {
  if (v == null || v === "") return null;
  if (v instanceof Date) {
    return Number.isNaN(v.getTime())
      ? null
      : `${v.getFullYear()}-${pad2(v.getMonth() + 1)}-${pad2(v.getDate())}`;
  }
  if (typeof v === "number" && Number.isFinite(v) && v > 20000 && v < 80000) {
    // Excel serial day (epoch 1899-12-30), resolved in UTC to avoid tz shifts
    return new Date(Math.round((v - 25569) * 86400000))
      .toISOString()
      .slice(0, 10);
  }
  const s = String(v).trim();
  let m = s.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})/);
  if (m) return `${m[1]}-${pad2(+m[2])}-${pad2(+m[3])}`;
  m = s.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})/);
  if (m) return `${m[3]}-${pad2(+m[2])}-${pad2(+m[1])}`; // dd/mm/yyyy
  const d = new Date(s);
  return Number.isNaN(d.getTime())
    ? null
    : `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

export function parseAccAmount(v: unknown): number | null {
  if (v == null || v === "") return null;
  if (typeof v === "number") return Number.isFinite(v) ? v : null;
  const s = String(v)
    .replace(/[,\s٬،]/g, "")
    .replace(/[^\d.\-]/g, "");
  const n = parseFloat(s);
  return Number.isFinite(n) ? n : null;
}

export function buildAccNotes(desc: unknown, hint: unknown): string {
  const d = String(desc ?? "").trim();
  const h = String(hint ?? "").trim();
  const ref = h.match(REF_RE)?.[1] ?? d.match(REF_RE)?.[1] ?? "";

  let name = "";
  const m1 = h.match(/(?:From|To)-(.+?),\s*ref/i);
  if (m1) name = m1[1].trim();
  if (!name) {
    // Arabic SMS form: "... ج.م من. NAME  يوم ..."
    const m2 = h.match(/من\.\s*(.+?)\s+يوم/);
    if (m2) name = m2[1].trim();
  }

  const extra = h.match(/description\s*:\s*([^,\-]+)/i)?.[1]?.trim() ?? "";
  const label = name || d;
  const parts = [label];
  if (extra && extra.toLowerCase() !== (label || d).toLowerCase()) {
    parts.push(extra);
  }
  if (ref) parts.push(`مرجع ${ref}`);
  return parts.filter(Boolean).join(" — ").slice(0, 500);
}

export function parseAccSheet(rows2d: unknown[][]): AccImportSheetParse {
  // Find the header row within the first 10 rows
  let headerIdx = -1;
  let cols: ColumnMap = {};
  for (let i = 0; i < Math.min(10, rows2d.length); i++) {
    const map = detectColumns(rows2d[i] ?? []);
    if (map.date !== undefined && (map.amount !== undefined || map.in !== undefined || map.out !== undefined)) {
      headerIdx = i;
      cols = map;
      break;
    }
  }
  if (headerIdx === -1) {
    return { rows: [], invalid: 0, mappedColumns: [] };
  }

  const mappedColumns = Object.entries(cols)
    .filter(([key]) => key !== "hint" || cols.desc === undefined)
    .map(([key]) => key);

  const out: AccImportRow[] = [];
  let invalid = 0;

  for (let i = headerIdx + 1; i < rows2d.length; i++) {
    const row = rows2d[i] ?? [];
    const txDate = parseAccDate(cols.date !== undefined ? row[cols.date] : null);
    let inAmount = 0;
    let outAmount = 0;

    if (cols.amount !== undefined) {
      const amt = parseAccAmount(row[cols.amount]);
      if (amt != null && amt > 0) inAmount = amt;
      else if (amt != null && amt < 0) outAmount = -amt;
    }
    if (cols.in !== undefined) {
      const amt = parseAccAmount(row[cols.in]);
      if (amt != null && amt > 0) inAmount = amt;
    }
    if (cols.out !== undefined) {
      const amt = parseAccAmount(row[cols.out]);
      if (amt != null && amt > 0) outAmount = amt;
    }

    if (!txDate || (inAmount === 0 && outAmount === 0)) {
      // trailing empty rows in huge sheets are expected, not user-facing errors
      if (row.some((c) => c != null && c !== "")) invalid++;
      continue;
    }

    out.push({
      txDate,
      inAmount: Math.round(inAmount * 100) / 100,
      outAmount: Math.round(outAmount * 100) / 100,
      notes: buildAccNotes(
        cols.desc !== undefined ? row[cols.desc] : null,
        cols.hint !== undefined ? row[cols.hint] : null,
      ),
    });
  }

  return { rows: out, invalid, mappedColumns };
}
