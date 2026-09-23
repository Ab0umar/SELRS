import { describe, expect, it } from "vitest";
import { zkSourceHash } from "../services/attendance/zk4370Sync.service";

describe("zkSourceHash", () => {
  it("uses SHA-1 so ZK source hashes fit attendance_punches.source_hash", () => {
    const hash = zkSourceHash("39|2026-09-20T05:18:52.000Z|0");

    expect(hash).toHaveLength(40);
    expect(hash).toMatch(/^[a-f0-9]{40}$/);
  });
});
