/**
 * Gate for ADMS clock-offset auto-detection. Truth table:
 *
 *   manualOverride set   -> false: ZK_ADMS_PUNCH_OFFSET_HOURS wins and
 *                           silently disables auto-detect
 *   currentOffset known  -> false: already detected and persisted, one shot
 *   neither              -> true
 *
 * One-shot on purpose: a forged or late punch batch must not be able to
 * retune a persisted value payroll depends on. To re-detect, clear the
 * persisted offset in the device settings. See docs/ATTENDANCE_SYNC.md,
 * "Auto-detect guard rules".
 */
export function mayAutoDetectAdmsOffset(
  currentOffset: number | undefined,
  manualOverride: string | undefined,
): boolean {
  return !manualOverride && currentOffset === undefined;
}

export interface AdmsOffsetDecision {
  offset: number | undefined;
  pending: number | undefined;
  changed: boolean;
}

/**
 * Track the device-ahead offset continuously: the first observation calibrates,
 * a different value must be seen twice in a row before it replaces the current
 * one (DST switch, firmware TZ change) so a single delayed or forged batch
 * cannot retune a calibrated device. A manual override always wins.
 */
export function decideAdmsOffset(
  current: number | undefined,
  observed: number,
  pending: number | undefined,
  manualOverride: string | undefined,
): AdmsOffsetDecision {
  if (manualOverride)
    return { offset: current, pending: undefined, changed: false };
  if (current === undefined)
    return { offset: observed, pending: undefined, changed: true };
  if (observed === current)
    return { offset: current, pending: undefined, changed: false };
  if (pending === observed)
    return { offset: observed, pending: undefined, changed: true };
  return { offset: current, pending: observed, changed: false };
}

export interface AdmsTimeFix {
  sn: string;
  from: Date;
  to: Date;
  offsetMinutes: number;
}

/**
 * Parse ZK_ADMS_TIME_FIXES: "SN|YYYY-MM-DD HH:mm:ss|YYYY-MM-DD HH:mm:ss|minutes;..."
 * A fix covers punches whose raw device time falls in [from, to) and adds
 * `minutes` to them (use a negative number when the device clock ran ahead).
 */
export function parseAdmsTimeFixes(raw: string | undefined): AdmsTimeFix[] {
  const fixes: AdmsTimeFix[] = [];
  for (const entry of (raw ?? "").split(";")) {
    const parts = entry.split("|").map((part) => part.trim());
    if (parts.length !== 4) continue;
    const from = new Date(parts[1].replace(" ", "T"));
    const to = new Date(parts[2].replace(" ", "T"));
    const offsetMinutes = Number(parts[3]);
    if (!parts[0] || isNaN(from.getTime()) || isNaN(to.getTime()) || !Number.isFinite(offsetMinutes)) continue;
    fixes.push({ sn: parts[0], from, to, offsetMinutes });
  }
  return fixes;
}

export function applyAdmsTimeFix(sn: string, raw: Date, fixes: AdmsTimeFix[]): Date {
  const fix = fixes.find((f) => f.sn === sn && raw >= f.from && raw < f.to);
  return fix ? new Date(raw.getTime() + fix.offsetMinutes * 60_000) : raw;
}

