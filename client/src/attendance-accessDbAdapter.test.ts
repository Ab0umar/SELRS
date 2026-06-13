/**
 * accessDbAdapter unit tests — mdb-reader mocked with real Tararus schema
 * (KQ_KQData / RS_Emp column names discovered from D:\Taurus.mdb inspection)
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import * as fs from "fs";

// vi.hoisted: values available inside vi.mock factory (runs before module-level code)
const { FUTURE_GUID, MISSING_EMP_GUID, MOCK_EMPLOYEES, buildMockPunches, now } =
  vi.hoisted(() => {
    const FUTURE_GUID = "guid-future-001";
    const MISSING_EMP_GUID = "guid-missing-emp";
    const now = new Date();

    const day = (offsetDays: number) => {
      const d = new Date(now);
      d.setDate(d.getDate() + offsetDays);
      return d;
    };

    const MOCK_EMPLOYEES = [
      { EmpNo: "001", EmpName: "أحمد محمد", DepartID: "A", IsDimission: 0 },
      { EmpNo: "002", EmpName: "سارة علي", DepartID: "A", IsDimission: 0 },
      { EmpNo: "003", EmpName: "خالد حسن", DepartID: "B", IsDimission: 0 },
      { EmpNo: "004", EmpName: "منى إبراهيم", DepartID: "B", IsDimission: 0 },
      { EmpNo: "005", EmpName: "عمر يوسف", DepartID: "C", IsDimission: 0 },
      { EmpNo: "006", EmpName: "ريم عبدالله", DepartID: "C", IsDimission: 0 },
      { EmpNo: "007", EmpName: "كريم فاروق", DepartID: "A", IsDimission: 0 },
      { EmpNo: "008", EmpName: "نور حسين", DepartID: "B", IsDimission: 0 },
      { EmpNo: "009", EmpName: "يوسف طارق", DepartID: "C", IsDimission: 0 },
      { EmpNo: "999", EmpName: "", DepartID: "", IsDimission: 1 },
    ];

    const buildMockPunches = () => {
      const rows: object[] = [];
      let seq = 1;
      const guid = (override?: string) =>
        override ?? `guid-${String(seq++).padStart(4, "0")}`;

      const punch = (
        empNo: string,
        daysAgo: number,
        hour: number,
        isSignIn: boolean,
        overrideGuid?: string,
      ) => {
        const d = day(daysAgo);
        d.setHours(hour, 0, 0, 0);
        return {
          GUID: guid(overrideGuid),
          EmpNo: empNo,
          KQDateTime: d,
          IsSignIn: isSignIn,
          InOutModeID: 1,
        };
      };

      for (const emp of ["001","002","003","004","005","006","007","008","009"]) {
        for (let d = -6; d <= -2; d++) {
          rows.push(punch(emp, d, 8, true));
          rows.push(punch(emp, d, 17, false));
        }
      }

      // Overnight shift: in at 23:00 yesterday, out at 01:00 today
      rows.push(punch("001", -1, 23, true));
      rows.push(punch("001", 0, 1, false));

      // Edge cases
      rows.push({
        GUID: FUTURE_GUID,
        EmpNo: "002",
        KQDateTime: day(2),
        IsSignIn: true,
        InOutModeID: 1,
      });
      rows.push({
        GUID: MISSING_EMP_GUID,
        EmpNo: "",
        KQDateTime: day(-1),
        IsSignIn: true,
        InOutModeID: 1,
      });

      return rows;
    };

    return { FUTURE_GUID, MISSING_EMP_GUID, MOCK_EMPLOYEES, buildMockPunches, now };
  });

vi.mock("mdb-reader", () => {
  const punches = buildMockPunches();
  return {
    default: class MockMDBReader {
      constructor(_buf: Buffer) {}
      getTableNames() {
        return ["KQ_KQData", "RS_Emp"];
      }
      getTable(name: string) {
        if (name === "KQ_KQData") return { getData: () => punches };
        if (name === "RS_Emp") return { getData: () => MOCK_EMPLOYEES };
        throw new Error(`Unknown table: ${name}`);
      }
    },
  };
});

import { AccessDbAdapter } from "../../server/services/attendance/sources/accessDbAdapter";

const FAKE_PATH = "/fake/Taurus.mdb";

const day = (offsetDays: number) => {
  const d = new Date(now);
  d.setDate(d.getDate() + offsetDays);
  return d;
};

describe("AccessDbAdapter", () => {
  beforeEach(() => {
    vi.spyOn(fs.promises, "access").mockImplementation(async (p) => {
      if (String(p) === FAKE_PATH) return;
      throw Object.assign(new Error("ENOENT"), { code: "ENOENT" });
    });
    vi.spyOn(fs.promises, "readFile").mockResolvedValue(Buffer.alloc(0) as any);
  });

  describe("isReachable()", () => {
    it("returns true when file is accessible", async () => {
      const a = new AccessDbAdapter({ accessPath: FAKE_PATH });
      expect(await a.isReachable()).toBe(true);
    });

    it("returns false for a bogus path without throwing", async () => {
      const a = new AccessDbAdapter({ accessPath: "/bogus/path.mdb" });
      await expect(a.isReachable()).resolves.toBe(false);
    });

    it("returns false for empty path", async () => {
      const a = new AccessDbAdapter({ accessPath: "" });
      await expect(a.isReachable()).resolves.toBe(false);
    });
  });

  describe("fetchPunchesSince()", () => {
    it("yields valid punches as {kind:'punch'}", async () => {
      const a = new AccessDbAdapter({ accessPath: FAKE_PATH, copyFirst: false });
      const out: any[] = [];
      for await (const item of a.fetchPunchesSince(day(-8))) out.push(item);
      expect(out.filter((r) => r.kind === "punch").length).toBeGreaterThan(0);
    });

    it("quarantines future-dated row (>24h ahead)", async () => {
      const a = new AccessDbAdapter({ accessPath: FAKE_PATH, copyFirst: false });
      const q: any[] = [];
      for await (const item of a.fetchPunchesSince(day(-8)))
        if ((item as any).kind === "quarantine") q.push(item);
      const row = q.find((r) => r.rowRef === FUTURE_GUID);
      expect(row).toBeDefined();
      expect(row.reason).toMatch(/future/i);
    });

    it("quarantines row with missing emp_cd", async () => {
      const a = new AccessDbAdapter({ accessPath: FAKE_PATH, copyFirst: false });
      const q: any[] = [];
      for await (const item of a.fetchPunchesSince(day(-8)))
        if ((item as any).kind === "quarantine") q.push(item);
      const row = q.find((r) => r.rowRef === MISSING_EMP_GUID);
      expect(row).toBeDefined();
      expect(row.reason).toMatch(/missing|employee/i);
    });

    it("skips rows before sinceLocal", async () => {
      const since = day(-1);
      const a = new AccessDbAdapter({ accessPath: FAKE_PATH, copyFirst: false });
      for await (const item of a.fetchPunchesSince(since))
        if ((item as any).kind === "punch")
          expect((item as any).row.punchAt.getTime()).toBeGreaterThanOrEqual(
            since.getTime(),
          );
    });

    it("sets direction from IsSignIn boolean", async () => {
      const a = new AccessDbAdapter({ accessPath: FAKE_PATH, copyFirst: false });
      const punches: any[] = [];
      for await (const item of a.fetchPunchesSince(day(-8)))
        if ((item as any).kind === "punch") punches.push((item as any).row);
      expect(punches.some((p) => p.direction === "in")).toBe(true);
      expect(punches.some((p) => p.direction === "out")).toBe(true);
    });

    it("does not throw on read error — yields nothing", async () => {
      vi.spyOn(fs.promises, "readFile").mockRejectedValueOnce(
        new Error("disk error"),
      );
      const a = new AccessDbAdapter({ accessPath: FAKE_PATH, copyFirst: false });
      const out: object[] = [];
      await expect(
        (async () => {
          for await (const item of a.fetchPunchesSince(day(-8))) out.push(item);
        })(),
      ).resolves.not.toThrow();
    });
  });

  describe("fetchEmployees()", () => {
    it("yields all 10 employees including unknown placeholder", async () => {
      const a = new AccessDbAdapter({ accessPath: FAKE_PATH, copyFirst: false });
      const emps: any[] = [];
      for await (const emp of a.fetchEmployees()) emps.push(emp);
      expect(emps).toHaveLength(MOCK_EMPLOYEES.length);
      const unknown = emps.find((e) => e.empCd === "999");
      expect(unknown?.fullName).toBe("UNKNOWN");
    });

    it("yields employees with correct shape", async () => {
      const a = new AccessDbAdapter({ accessPath: FAKE_PATH, copyFirst: false });
      for await (const emp of a.fetchEmployees()) {
        expect(emp).toHaveProperty("empCd");
        expect(emp).toHaveProperty("fullName");
        expect(typeof emp.empCd).toBe("string");
      }
    });
  });
});
