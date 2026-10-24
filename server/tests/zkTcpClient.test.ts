import { describe, expect, it } from "vitest";
import { parseAttlogBuffer } from "../services/attendance/zkTcpClient";

function record(uid: number, userId: string, verify: number, ts: Date, inOut: number): Buffer {
  const b = Buffer.alloc(40);
  b.writeUInt16LE(uid, 0);
  b.write(userId, 2, "ascii");
  b.writeUInt8(verify, 26);
  const enc =
    ((ts.getFullYear() - 2000) * 12 * 31 + ts.getMonth() * 31 + (ts.getDate() - 1)) * 86400 +
    (ts.getHours() * 60 + ts.getMinutes()) * 60 +
    ts.getSeconds();
  b.writeUInt32LE(enc, 27);
  b.writeUInt8(inOut, 31);
  return b;
}

describe("parseAttlogBuffer", () => {
  it("reads user id after the uid field, plus verify, time and in/out", () => {
    const t = new Date(2026, 9, 24, 8, 30, 15);
    const out = parseAttlogBuffer(Buffer.concat([record(7, "123", 1, t, 0), record(300, "4567", 15, t, 1)]));
    expect(out).toHaveLength(2);
    expect(out[0]).toMatchObject({ enrollNo: "123", verifyMode: 1, inOutMode: 0 });
    expect(out[0].timestamp.getTime()).toBe(t.getTime());
    expect(out[1]).toMatchObject({ enrollNo: "4567", verifyMode: 15, inOutMode: 1 });
  });
});
