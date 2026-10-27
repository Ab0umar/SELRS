import { describe, expect, it } from "vitest";
import { runWithMssqlYear } from "../integrations/mssqlYear";
import {
  decodeLegacyPatientId,
  encodeLegacyPatientId,
  escapeLike,
  legacyDatabaseName,
  legacyGetAllPatients,
  legacyGetPatientById,
  legacySearchPatients,
  legacyYearForSession,
} from "../lib/legacyYearPatients";

describe("legacy year selection", () => {
  it("only old-year sessions use the legacy databases", () => {
    expect(legacyYearForSession()).toBeNull();
    runWithMssqlYear(null, () => expect(legacyYearForSession()).toBeNull());
    runWithMssqlYear(2025, () => expect(legacyYearForSession()).toBe(2025));
    runWithMssqlYear(2013, () => expect(legacyYearForSession()).toBe(2013));
  });

  it("maps a year to its database", () => {
    expect(legacyDatabaseName(2013)).toBe("selrs13");
    expect(legacyDatabaseName(2025)).toBe("selrs25");
    expect(() => legacyDatabaseName(2012)).toThrow();
    expect(() => legacyDatabaseName(2026)).toThrow();
  });
});

describe("legacy patient ids", () => {
  it("round-trips and never collides with live (positive) ids", () => {
    const encoded = encodeLegacyPatientId(2025, 4629);
    expect(encoded).toBeLessThan(0);
    expect(decodeLegacyPatientId(encoded)).toEqual({ year: 2025, id: 4629 });
    expect(decodeLegacyPatientId(17)).toBeNull();
    expect(decodeLegacyPatientId(0)).toBeNull();
    expect(decodeLegacyPatientId(-5)).toBeNull();
  });
});

describe("escapeLike", () => {
  it("neutralises wildcards", () => {
    expect(escapeLike("100%_a\\b")).toBe("100\\%\\_a\\\\b");
  });
});

// Reads the real selrs25 database when this machine has it; skipped elsewhere.
describe("legacy reads against selrs25", async () => {
  let available = false;
  try {
    const rows = await legacyGetAllPatients(2025, { limit: 3 });
    available = rows.rows.length > 0;
  } catch {
    available = false;
  }
  const run = available ? it : it.skip;

  run("lists, searches and opens patients with negative ids", async () => {
    const list = await legacyGetAllPatients(2025, { limit: 5 });
    expect(list.rows).toHaveLength(5);
    expect(list.rows.every((row: any) => row.id < 0 && row.legacyYear === 2025)).toBe(true);
    expect(list.hasMore).toBe(true);
    expect(list.nextCursor?.id).toBeGreaterThan(0);

    const next = await legacyGetAllPatients(2025, { limit: 5, cursor: list.nextCursor! });
    expect(next.rows[0].id).not.toBe(list.rows[4].id);

    const code = String((list.rows[0] as any).patientCode);
    const found = await legacySearchPatients(2025, code, 20);
    expect(found.some((row: any) => row.patientCode === code)).toBe(true);

    const opened = await legacyGetPatientById(list.rows[0].id as number);
    expect((opened as any).patientCode).toBe(code);
  });
});
