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
