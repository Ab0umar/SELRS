import { beforeEach, describe, expect, it, vi } from "vitest";
import { visitScheduleSchema, cairoDateIso } from "../../shared/visitSchedule";
import { visits, visitScheduleRequests } from "../../drizzle/schema";

vi.mock("../db", () => ({ getDb: vi.fn() }));
import { getDb } from "../db";
import { saveVisitSchedule } from "../services/visitSchedule";

const lockedRows = vi.fn();
const writes: Array<{ table: unknown; values: Record<string, unknown> }> = [];
const inserts: Array<{ table: unknown; values: Record<string, unknown> }> = [];
const tx = {
  select: () => {
    const query = {
      from: () => query,
      where: () => query,
      orderBy: () => query,
      limit: () => query,
      for: lockedRows,
    };
    return query;
  },
  update: (table: unknown) => ({
    set: (values: Record<string, unknown>) => ({
      where: async () => {
        writes.push({ table, values });
      },
    }),
  }),
  insert: (table: unknown) => ({
    values: async (values: Record<string, unknown>) => {
      inserts.push({ table, values });
      return [{ insertId: 80 }];
    },
  }),
};
const input = {
  fullName: "Patient",
  patientId: 7,
  service: "followup",
  patientType: "existing",
  visitDate: cairoDateIso(),
};

describe("visit schedule persistence", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    lockedRows.mockReset();
    writes.length = 0;
    inserts.length = 0;
    vi.mocked(getDb).mockResolvedValue({
      transaction: async (run: (transaction: typeof tx) => unknown) => run(tx),
    });
  });
  it("reuses the same-day visit and changes queue state without clinical writes", async () => {
    lockedRows
      .mockResolvedValueOnce([{ id: 7, fullName: "Saved patient" }])
      .mockResolvedValueOnce([{ id: 42 }]);
    await saveVisitSchedule(
      visitScheduleSchema.parse({ ...input, moveToCheckedIn: true }),
      123,
    );
    expect(inserts.filter((row) => row.table === visits)).toHaveLength(0);
    expect(writes).toEqual([
      {
        table: visits,
        values: {
          visitType: "followup",
          queueStatus: "checkedIn",
          checkedInAt: expect.any(Date),
          treatedAt: null,
        },
      },
    ]);
    expect(inserts[0]).toMatchObject({
      table: visitScheduleRequests,
      values: { patientId: 7, status: "registered", fullName: "Saved patient" },
    });
  });
  it("retains the cancelled request and only cancels the selected last pending booking", async () => {
    lockedRows
      .mockResolvedValueOnce([{ id: 7 }])
      .mockResolvedValueOnce([{ id: 19 }]);
    const result = await saveVisitSchedule(
      visitScheduleSchema.parse({ ...input, cancelPreviousAppointment: true }),
      123,
    );
    expect(result.cancelledRequestId).toBe(19);
    expect(writes).toEqual([
      { table: visitScheduleRequests, values: { status: "cancelled" } },
    ]);
    expect(inserts[0].values).toMatchObject({
      status: "scheduled",
      patientId: 7,
    });
  });
  it("creates a visit only when the selected day has no visit", async () => {
    lockedRows.mockResolvedValueOnce([{ id: 7 }]).mockResolvedValueOnce([]);
    await saveVisitSchedule(
      visitScheduleSchema.parse({ ...input, moveToCheckedIn: true }),
      123,
    );
    expect(inserts.filter((row) => row.table === visits)).toHaveLength(1);
  });
  it("does not write when a linked patient no longer exists", async () => {
    lockedRows.mockResolvedValueOnce([]);
    await expect(
      saveVisitSchedule(visitScheduleSchema.parse(input), 123),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
    expect(writes).toHaveLength(0);
    expect(inserts).toHaveLength(0);
  });
});
