/** Auto-detect once; persisted per-device offsets require an explicit reset to change. */
export function mayAutoDetectAdmsOffset(
  currentOffset: number | undefined,
  manualOverride: string | undefined,
): boolean {
  return !manualOverride && currentOffset === undefined;
}
