import { describe, expect, it } from "vitest";
import { decodeFkRecords } from "../services/attendance/fkTcpClient";

// Raw records captured from an EF10K and matched against FKOldLogPuller.exe output.
const RAW =
  "0800000001011409e671e10d" + // 8,  verify 20, 2021-07-01 15:03:09
  "1200000001011418e671e111"; // 18, verify 20, 2021-07-01 15:04:24

describe("decodeFkRecords", () => {
  it("decodes enroll, verify mode and packed timestamp", () => {
    const out = decodeFkRecords(Buffer.from(RAW, "hex"));
    expect(out.map((p) => p.enrollNo)).toEqual([8, 18]);
    expect(out[0].verifyMode).toBe(20);
    expect(out[0].timestamp).toEqual(new Date(2021, 6, 1, 15, 3, 9));
    expect(out[1].timestamp).toEqual(new Date(2021, 6, 1, 15, 4, 24));
  });

  it("drops records with an impossible date", () => {
    const bad = Buffer.alloc(12);
    bad.writeUInt32LE(5, 0);
    expect(decodeFkRecords(bad)).toHaveLength(0);
  });
});
