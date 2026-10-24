/**
 * Decide whether a device sync run is worth a row in attendance_sync_runs.
 * Successful polls with no new rows are heartbeats and are skipped; failures
 * are always kept for diagnosis. `checkpointAdvanced` means the run moved
 * the device high-water mark forward (max punch beyond the previous HWM),
 * which can matter even with zero inserts. Nightly pruning in
 * syncRunRetention.ts keeps each device's newest checkpoint no
 * matter how old. See docs/ATTENDANCE_SYNC.md, High-water mark and safety
 * window.
 */
export function shouldPersistSyncRun(result: {
  success: boolean;
  recordsInserted: number;
  checkpointAdvanced?: boolean;
}): boolean {
  // Successful polls with no new rows are heartbeats, not useful run history.
  // Failures must still be retained for diagnosis.
  return (
    !result.success ||
    result.recordsInserted > 0 ||
    result.checkpointAdvanced === true
  );
}
