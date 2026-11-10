/**
 * Completeness of an Autoref / Refraction record. Mirrors recordStatusConditions in server/db.ts.
 *
 * - complete:   both eyes have a measurement (sphere, cylinder or axis) together with UCVA and BCVA.
 * - partial:    some data but not complete (one eye only, or a measured eye missing UCVA/BCVA).
 *               A reviewer can convert a partial record that has one full eye to complete.
 * - empty:      nothing recorded at all.
 */
export type RecordStatus = "complete" | "partial" | "empty";

const recorded = (value: unknown) => {
  const text = String(value ?? "").trim();
  return text !== "" && text !== "---" && text !== "-";
};

type EyeSide = "OD" | "OS";

function eyeOf(row: Record<string, unknown>, side: EyeSide) {
  const measured =
    recorded(row[`sphere${side}`]) ||
    recorded(row[`cylinder${side}`]) ||
    recorded(row[`axis${side}`]);
  const vision = recorded(row[`ucva${side}`]) && recorded(row[`bcva${side}`]);
  const anyData =
    measured || recorded(row[`ucva${side}`]) || recorded(row[`bcva${side}`]) || recorded(row[`iop${side}`]);
  return { full: measured && vision, anyData };
}

/** True when at least one eye is fully recorded (the case a reviewer may confirm as complete). */
export function hasFullEye(row: Record<string, unknown>): boolean {
  return eyeOf(row, "OD").full || eyeOf(row, "OS").full;
}

export function classifyRecord(
  row: Record<string, unknown>,
  markedComplete = false,
): RecordStatus {
  const od = eyeOf(row, "OD");
  const os = eyeOf(row, "OS");
  if (od.full && os.full) return "complete";
  if (markedComplete && (od.full || os.full)) return "complete";
  return od.anyData || os.anyData ? "partial" : "empty";
}
