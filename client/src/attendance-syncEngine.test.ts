/**
 * T040 — Sync engine service-layer tests
 * Contract: specs/001-attendance-fingerprint/contracts/attendance-source.md + research.md §R3/R13
 * Uses FakeAttendanceSource (in-test) + vi.mock for DB/service dependencies
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import type {
  AttendanceSource,
  RawPunchOrQuarantine,
  RawEmployee,
} from "../../server/services/attendance/sources/AttendanceSource";

// ── All mocks must be hoisted before vi.mock factory runs ─────────────────────

const {
  mockExecute,
  mockInsert,
  mockUpdate,
  mockSelect,
  mockUpsertEmployee,
  mockInsertUnknown,
  mockInsertPunchIgnore,
  mockRecomputeRange,
} = vi.hoisted(() => {
  return {
    mockExecute: vi.fn(),
    mockInsert: vi.fn(),
    mockUpdate: vi.fn(),
    mockSelect: vi.fn(),
    mockUpsertEmployee: vi.fn().mockResolvedValue(undefined),
    mockInsertUnknown: vi.fn().mockResolvedValue(undefined),
    mockInsertPunchIgnore: vi.fn().mockResolvedValue(true),
    mockRecomputeRange: vi.fn().mockResolvedValue(0),
  };
});

vi.mock("../../server/db", () => ({
  getDb: vi.fn(async () => ({
    execute: mockExecute,
    insert: mockInsert,
    update: mockUpdate,
    select: mockSelect,
    $client: {},
  })),
}));

vi.mock("../../server/services/attendance/employees.service", () => ({
  EmployeesService: {
    upsertEmployee: mockUpsertEmployee,
    insertUnknownPlaceholder: mockInsertUnknown,
  },
}));

vi.mock("../../server/services/attendance/punches.service", () => ({
  PunchesService: {
    insertPunchIgnore: mockInsertPunchIgnore,
  },
}));

vi.mock("../../server/services/attendance/dailyMaterializer", () => ({
  dailyMaterializer: {
    recomputeRange: mockRecomputeRange,
  },
}));

import { runSyncOnce } from "../../server/services/attendance/syncEngine";

// ── FakeAttendanceSource ──────────────────────────────────────────────────────

class FakeAttendanceSource implements AttendanceSource {
  readonly name = "access" as const;
  shouldThrow: Error | null = null;

  constructor(
    private punches: RawPunchOrQuarantine[] = [],
    private employees: RawEmployee[] = [],
  ) {}

  async isReachable() { return true; }

  async *fetchPunchesSince(_since: Date): AsyncIterable<RawPunchOrQuarantine> {
    if (this.shouldThrow) throw this.shouldThrow;
    for (const p of this.punches) yield p;
  }

  async *fetchEmployees(): AsyncIterable<RawEmployee> {
    for (const e of this.employees) yield e;
  }

  async close() {}
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const daysAgo = (n: number) => {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d;
};

function validPunch(empCd = "001", daysBack = 1): RawPunchOrQuarantine {
  return {
    kind: "punch",
    row: {
      empCd,
      punchAt: daysAgo(daysBack),
      direction: "in",
      sourceRowId: `guid-${empCd}-${daysBack}`,
    },
  };
}

function quarantinePunch(ref = "bad-guid"): RawPunchOrQuarantine {
  return { kind: "quarantine", reason: "future-dated punch", rowRef: ref };
}

// ── Setup ──────────────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks();

  // db.execute: always return [[{lockAcquired:1}]]; RELEASE_LOCK ignores return value
  mockExecute.mockResolvedValue([[{ lockAcquired: 1 }]]);

  // db.insert(table).values({}) → [{insertId:1}]
  mockInsert.mockImplementation(() => ({
    values: vi.fn().mockResolvedValue([{ insertId: 1 }]),
  }));

  // db.update(table).set({}).where() → resolves
  mockUpdate.mockImplementation(() => {
    const chain: any = { set: vi.fn(), where: vi.fn().mockResolvedValue([]) };
    chain.set.mockReturnValue(chain);
    return chain;
  });

  // db.select({}).from().where().orderBy().limit() → []
  mockSelect.mockImplementation(() => {
    const chain: any = {
      from: vi.fn(),
      where: vi.fn(),
      orderBy: vi.fn(),
      limit: vi.fn().mockResolvedValue([]),
    };
    chain.from.mockReturnValue(chain);
    chain.where.mockReturnValue(chain);
    chain.orderBy.mockReturnValue(chain);
    return chain;
  });

  mockInsertPunchIgnore.mockResolvedValue(true);
  mockRecomputeRange.mockResolvedValue(0);
  mockUpsertEmployee.mockResolvedValue(undefined);
  mockInsertUnknown.mockResolvedValue(undefined);
});

// ── Tests ──────────────────────────────────────────────────────────────────────

describe("runSyncOnce", () => {
  it("1 — valid punches are passed to PunchesService.insertPunchIgnore", async () => {
    const source = new FakeAttendanceSource([
      validPunch("001", 1),
      validPunch("002", 1),
    ]);
    await runSyncOnce({ trigger: "cron" }, source);
    expect(mockInsertPunchIgnore).toHaveBeenCalledTimes(2);
  });

  it("2 — duplicate punch (insertPunchIgnore returns false) → rowsInserted stays 0", async () => {
    const source = new FakeAttendanceSource([validPunch("001", 1)]);
    mockInsertPunchIgnore.mockResolvedValue(false);
    const result = await runSyncOnce({ trigger: "cron" }, source);
    expect(result.rowsInserted).toBe(0);
  });

  it("3 — quarantine row drives status=partial", async () => {
    const source = new FakeAttendanceSource([
      validPunch("001", 1),
      quarantinePunch("bad-1"),
    ]);
    const result = await runSyncOnce({ trigger: "cron" }, source);
    expect(result.status).toBe("partial");
  });

  it("4 — advisory lock failure → status=locked, no punch inserts", async () => {
    mockExecute.mockResolvedValue([[{ lockAcquired: 0 }]]);

    const result = await runSyncOnce(
      { trigger: "manual", triggeredBy: 99 },
      new FakeAttendanceSource([validPunch()]),
    );

    expect(result.status).toBe("locked");
    expect(mockInsertPunchIgnore).not.toHaveBeenCalled();
  });

  it("5 — employees are upserted before any punch insert", async () => {
    const callOrder: string[] = [];
    mockUpsertEmployee.mockImplementation(async () => { callOrder.push("upsert"); });
    mockInsertPunchIgnore.mockImplementation(async () => { callOrder.push("punch"); return true; });

    await runSyncOnce(
      { trigger: "cron" },
      new FakeAttendanceSource(
        [validPunch("001", 1)],
        [{ empCd: "001", fullName: "Ahmed" }],
      ),
    );

    expect(callOrder[0]).toBe("upsert");
    expect(callOrder).toContain("punch");
  });

  it("6 — unknown placeholder is always inserted regardless of punch count", async () => {
    await runSyncOnce({ trigger: "cron" }, new FakeAttendanceSource([]));
    expect(mockInsertUnknown).toHaveBeenCalled();
  });

  it("7 — adapter throw before yielding any row → status=failed", async () => {
    const source = new FakeAttendanceSource();
    source.shouldThrow = new Error("disk error");
    const result = await runSyncOnce({ trigger: "cron" }, source);
    expect(result.status).toBe("failed");
  });

  it("8 — materializer called after successful sync with at least one punch", async () => {
    await runSyncOnce(
      { trigger: "cron" },
      new FakeAttendanceSource([validPunch("001", 1)]),
    );
    expect(mockRecomputeRange).toHaveBeenCalled();
  });

  it("9 — materializer NOT called when zero punches were seen", async () => {
    await runSyncOnce({ trigger: "cron" }, new FakeAttendanceSource([]));
    expect(mockRecomputeRange).not.toHaveBeenCalled();
  });

  it("10 — result always has a numeric runId", async () => {
    const result = await runSyncOnce(
      { trigger: "cron" },
      new FakeAttendanceSource([validPunch()]),
    );
    expect(typeof result.runId).toBe("number");
  });
});
