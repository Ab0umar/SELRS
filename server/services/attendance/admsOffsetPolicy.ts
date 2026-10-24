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
