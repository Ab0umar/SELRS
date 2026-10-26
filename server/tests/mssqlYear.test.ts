import { afterEach, describe, expect, it } from "vitest";
import {
  assertMssqlWritable,
  cairoYear,
  currentMssqlYear,
  getMssqlYear,
  mssqlDbName,
  mssqlTable,
  runWithMssqlYear,
  setMssqlRequestUser,
  withCurrentMssqlYear,
} from "../integrations/mssqlYear";

afterEach(() => {
  delete process.env.MSSQL_DB_YEAR;
});

describe("year selection", () => {
  it("switches at local midnight on 1 January (Cairo), not at UTC midnight", () => {
    expect(cairoYear(new Date("2026-12-31T21:59:59Z"))).toBe(2026);
    expect(cairoYear(new Date("2026-12-31T22:00:00Z"))).toBe(2027);
    expect(cairoYear(new Date("2027-01-01T00:00:00Z"))).toBe(2027);
  });

  it("uses the session year inside a request and the current year outside", () => {
    const now = new Date("2027-01-02T10:00:00Z");
    expect(getMssqlYear(now)).toBe(2027);
    runWithMssqlYear(2026, () => expect(getMssqlYear(now)).toBe(2026));
    runWithMssqlYear(null, () => expect(getMssqlYear(now)).toBe(2027));
  });

  it("ignores an invalid session year instead of building a bad database name", () => {
    const now = new Date("2027-01-02T10:00:00Z");
    runWithMssqlYear(99999, () => expect(getMssqlYear(now)).toBe(2027));
    runWithMssqlYear(2026.5 as number, () => expect(getMssqlYear(now)).toBe(2027));
  });

  it("lets MSSQL_DB_YEAR pin the automatic year", () => {
    process.env.MSSQL_DB_YEAR = "2026";
    expect(currentMssqlYear(new Date("2027-03-01T00:00:00Z"))).toBe(2026);
    process.env.MSSQL_DB_YEAR = "abc";
    expect(currentMssqlYear(new Date("2027-03-01T00:00:00Z"))).toBe(2027);
  });
});

describe("names", () => {
  it("builds database and table names from the active year", () => {
    runWithMssqlYear(2027, () => {
      expect(mssqlDbName()).toBe("op2027");
      expect(mssqlTable("PAPAT_SRV")).toBe("op2027.dbo.PAPAT_SRV");
    });
    expect(mssqlTable("PAJRNRCVH", 2026)).toBe("op2026.dbo.PAJRNRCVH");
  });

  it("refuses anything that is not a plain identifier", () => {
    expect(() => mssqlTable("X; DROP TABLE Y")).toThrow();
    expect(() => mssqlDbName(1999)).toThrow();
  });
});

describe("write guard", () => {
  const now = new Date("2026-10-26T10:00:00Z");

  it("allows writes outside a request (schedulers)", () => {
    expect(() => assertMssqlWritable(now)).not.toThrow();
  });

  it("allows everyone to write the current year", () => {
    runWithMssqlYear(null, () => {
      setMssqlRequestUser({ role: "reception" });
      expect(() => assertMssqlWritable(now)).not.toThrow();
    });
    runWithMssqlYear(2026, () => {
      setMssqlRequestUser({ role: "accountant" });
      expect(() => assertMssqlWritable(now)).not.toThrow();
    });
  });

  it("limits writes to an older year to admins", () => {
    runWithMssqlYear(2025, () => {
      setMssqlRequestUser({ role: "accountant" });
      expect(() => assertMssqlWritable(now)).toThrow(/للأدمن فقط/);
      setMssqlRequestUser(null);
      expect(() => assertMssqlWritable(now)).toThrow();
      setMssqlRequestUser({ role: "admin" });
      expect(() => assertMssqlWritable(now)).not.toThrow();
    });
  });

  it("keeps the user but resets the year for current-year-only work", () => {
    runWithMssqlYear(2025, () => {
      setMssqlRequestUser({ role: "admin" });
      withCurrentMssqlYear(() => expect(getMssqlYear(now)).toBe(2026));
    });
  });
});
