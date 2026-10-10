import { z } from "zod";

export const testReferenceRangeSchema = z
  .object({
    name: z.string().trim().max(255),
    min: z.string().trim().max(32),
    max: z.string().trim().max(32),
    text: z.string().trim().max(255),
    unit: z.string().trim().max(64),
  })
  .superRefine((range, ctx) => {
    for (const key of ["min", "max"] as const) {
      if (range[key] && !/^[+-]?(?:\d+(?:\.\d+)?|\.\d+)$/.test(range[key])) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: [key],
          message: "أدخل قيمة رقمية صحيحة",
        });
      }
    }
    if (range.min && range.max && Number(range.min) > Number(range.max)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["max"],
        message: "أعلى طبيعي يجب ألا يقل عن أقل طبيعي",
      });
    }
    if (range.text && (range.min || range.max)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["text"],
        message: "اختر مدى رقميًا أو مرجعًا نصيًا",
      });
    }
    if (!range.min && !range.max && !range.text) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "أدخل مدى أو مرجعًا نصيًا",
      });
    }
  });

export const testReferenceRangesSchema = z
  .array(testReferenceRangeSchema)
  .max(100);
export type TestReferenceRange = z.infer<typeof testReferenceRangeSchema>;

export function emptyTestReferenceRange(): TestReferenceRange {
  return { name: "", min: "", max: "", text: "", unit: "" };
}

export function parseSimpleReferenceRange(
  raw: unknown,
): { min: string; max: string } | null {
  const match = String(raw ?? "")
    .trim()
    .match(
      /^([+-]?(?:\d+(?:\.\d+)?|\.\d+))\s*[-–—]\s*([+-]?(?:\d+(?:\.\d+)?|\.\d+))$/,
    );
  return match ? { min: match[1]!, max: match[2]! } : null;
}

export function referenceIsDisabled(row: { noNormalRange?: unknown }): boolean {
  return row.noNormalRange === true || row.noNormalRange === 1;
}

export function getTestReferenceRanges(row: {
  referenceRanges?: unknown;
  normalRange?: unknown;
  unit?: unknown;
  noNormalRange?: unknown;
}): TestReferenceRange[] {
  if (referenceIsDisabled(row)) return [];
  let raw = row.referenceRanges;
  if (typeof raw === "string") {
    try {
      raw = JSON.parse(raw);
    } catch (error) {
      if (!(error instanceof SyntaxError)) throw error;
      return [];
    }
  }
  if (raw != null) {
    const parsed = testReferenceRangesSchema.safeParse(raw);
    return parsed.success ? parsed.data : [];
  }
  const text = String(row.normalRange ?? "").trim();
  if (!text) return [];
  const parsedRange = parseSimpleReferenceRange(text);
  const numbers =
    parsedRange && Number(parsedRange.min) <= Number(parsedRange.max)
      ? parsedRange
      : null;
  return [
    {
      name: "",
      min: numbers?.min ?? "",
      max: numbers?.max ?? "",
      text: numbers ? "" : text,
      unit: String(row.unit ?? "").trim(),
    },
  ];
}

export function formatTestReferenceRange(range: TestReferenceRange): string {
  const value = range.text || `${range.min || "—"} - ${range.max || "—"}`;
  return [range.name ? `${range.name}:` : "", value, range.unit]
    .filter(Boolean)
    .join(" ");
}

export function legacyReferenceFields(ranges: TestReferenceRange[]): {
  normalRange: string;
  unit: string;
} {
  if (ranges.length !== 1 || ranges[0]!.name)
    return { normalRange: "", unit: "" };
  const range = ranges[0]!;
  return {
    normalRange: range.text || `${range.min || "—"} - ${range.max || "—"}`,
    unit: range.unit,
  };
}
