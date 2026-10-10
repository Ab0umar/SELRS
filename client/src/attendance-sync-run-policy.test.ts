import { describe, expect, it } from "vitest";
import { shouldPersistSyncRun } from "../../server/services/attendance/syncRunPolicy";

describe("attendance sync run persistence", () => {
  it("keeps a successfully recovered checkpoint even when its punches were inserted by a failed run", () => {
    expect(
      shouldPersistSyncRun({
        success: true,
        recordsInserted: 0,
        checkpointAdvanced: true,
      }),
    ).toBe(true);
  });
  it("skips successful polls with no inserted punches", () => {
    expect(shouldPersistSyncRun({ success: true, recordsInserted: 0 })).toBe(
      false,
    );
    expect(shouldPersistSyncRun({ success: true, recordsInserted: 2 })).toBe(
      true,
    );
  });

  it("keeps failed polls even when they inserted nothing", () => {
    expect(shouldPersistSyncRun({ success: false, recordsInserted: 0 })).toBe(
      true,
    );
  });
});
