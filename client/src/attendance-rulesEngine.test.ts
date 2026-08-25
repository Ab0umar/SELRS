/**
 * T039 — Rules Engine unit tests (pure functions, no DB)
 * Contract: specs/001-attendance-fingerprint/contracts/rules-engine.md
 * 28 cases: resolveShift (8) + pairPunches (6) + computeDay (14)
 */

import { describe, it, expect } from "vitest";
import {
  resolveShift,
  resolveShifts,
  partitionPunchesForShifts,
  applyApprovedPermissions,
  pairPunches,
  computeDay,
  type Shift,
  type DayContext,
} from "../../server/services/attendance/rulesEngine";

// ── Helpers ───────────────────────────────────────────────────────────────────

const d = (iso: string) => new Date(iso); // '2026-06-10T08:00:00' etc.

function makeShift(overrides: Partial<Shift> = {}): Shift {
  return {
    id: 1,
    name: "Morning",
    startTime: "08:00",
    endTime: "16:00",
    crossesMidnight: false,
    graceLateMin: 0,
    graceEarlyMin: 0,
    breakMinutes: 0,
    allowOT: true,
    requirePunch: true,
    weekdayMask: 127,
    ...overrides,
  };
}

const SHIFT_1 = makeShift({ id: 1 });
const SHIFT_2 = makeShift({ id: 2, startTime: "14:00", endTime: "22:00" });
const shiftsById = new Map<number, Shift>([
  [1, SHIFT_1],
  [2, SHIFT_2],
]);

function asn(
  empCd: string,
  shiftId: number,
  from: string,
  to: string | null = null,
  mask = 127,
) {
  return {
    empCd,
    shiftId,
    effectiveFrom: d(from),
    effectiveTo: to ? d(to) : null,
    weekdayMask: mask,
  };
}

function punch(iso: string, dir: "in" | "out" | "unknown" = "unknown") {
  return { punchAt: d(iso), direction: dir, source: "access" as const };
}

function baseCtx(overrides: Partial<DayContext> = {}): DayContext {
  return {
    empCd: "001",
    workDate: d("2026-06-10T00:00:00"),
    shift: SHIFT_1,
    punches: [],
    leaveApproved: false,
    isHoliday: false,
    breakMinutes: 0,
    now: d("2026-06-10T12:00:00"),
    ...overrides,
  };
}

// ── resolveShift ──────────────────────────────────────────────────────────────

describe("resolveShift", () => {
  it("1 — returns shift for exact matching assignment", () => {
    const result = resolveShift(
      "001",
      d("2026-06-10T00:00:00"),
      [asn("001", 1, "2026-06-01T00:00:00")],
      null,
      shiftsById,
    );
    expect(result?.id).toBe(1);
  });

  it("2 — latest effectiveFrom wins when two assignments overlap", () => {
    const result = resolveShift(
      "001",
      d("2026-06-10T00:00:00"),
      [
        asn("001", 1, "2026-06-01T00:00:00"),
        asn("001", 2, "2026-06-08T00:00:00"), // newer
      ],
      null,
      shiftsById,
    );
    expect(result?.id).toBe(2);
  });

  it("3 — weekday mask excludes assignment (Sunday=bit0; test on a Tuesday=bit2=4, mask=0b0000010=only Mon)", () => {
    const tuesdayMask = 0b0000100; // bit 2 = Tuesday — WRONG: only Tue excluded; let me use a mask that excludes Tue
    // 2026-06-10 is a Wednesday (getDay()=3). Use mask that excludes Wednesday (bit3=8).
    const noWedMask = 127 ^ (1 << 3); // all days except Wednesday
    const result = resolveShift(
      "001",
      d("2026-06-10T00:00:00"), // Wednesday
      [asn("001", 1, "2026-06-01T00:00:00", null, noWedMask)],
      null,
      shiftsById,
    );
    expect(result).toBeNull();
  });

  it("4 — falls back to defaultShiftId when no assignment matches", () => {
    const result = resolveShift(
      "001",
      d("2026-06-10T00:00:00"),
      [], // no assignments
      2,
      shiftsById,
    );
    expect(result?.id).toBe(2);
  });

  it("5 — returns null when no assignment and no default", () => {
    const result = resolveShift(
      "001",
      d("2026-06-10T00:00:00"),
      [],
      null,
      shiftsById,
    );
    expect(result).toBeNull();
  });

  it("6 — open-ended assignment (effectiveTo null) is active on any future date", () => {
    const result = resolveShift(
      "001",
      d("2030-01-01T00:00:00"),
      [asn("001", 1, "2026-01-01T00:00:00", null)],
      null,
      shiftsById,
    );
    expect(result?.id).toBe(1);
  });

  it("7 — effectiveTo exclusive boundary: assignment expired the day before", () => {
    const result = resolveShift(
      "001",
      d("2026-06-10T00:00:00"),
      [asn("001", 1, "2026-06-01T00:00:00", "2026-06-09T00:00:00")],
      null,
      shiftsById,
    );
    expect(result).toBeNull();
  });

  it("8 — assignment for a different employee is ignored", () => {
    const result = resolveShift(
      "001",
      d("2026-06-10T00:00:00"),
      [asn("002", 1, "2026-06-01T00:00:00")],
      null,
      shiftsById,
    );
    expect(result).toBeNull();
  });
});

describe("multiple branch shifts", () => {
  const operations = makeShift({
    id: 10,
    name: "Operations",
    branch: "operations",
    deviceId: "operations-device",
    startTime: "09:00",
    endTime: "15:00",
  });
  const center = makeShift({
    id: 20,
    name: "Center",
    branch: "center",
    deviceId: "center-device",
    startTime: "13:00",
    endTime: "19:00",
  });
  const branchShifts = new Map<number, Shift>([
    [operations.id, operations],
    [center.id, center],
  ]);

  it("keeps active assignments from different branches", () => {
    const result = resolveShifts(
      "001",
      d("2026-06-10T00:00:00"),
      [
        asn("001", operations.id, "2026-06-01T00:00:00"),
        asn("001", center.id, "2026-06-08T00:00:00"),
      ],
      null,
      branchShifts,
    );
    expect(result.map((shift) => shift.id).sort()).toEqual([10, 20]);
  });

  it("maps four punches to the shift device before using time", () => {
    const groups = partitionPunchesForShifts(
      [
        { ...punch("2026-06-10T09:00:00", "in"), deviceId: "operations-device" },
        { ...punch("2026-06-10T15:00:00", "out"), deviceId: "operations-device" },
        { ...punch("2026-06-10T15:10:00", "in"), deviceId: "center-device" },
        { ...punch("2026-06-10T19:00:00", "out"), deviceId: "center-device" },
      ],
      [operations, center],
      d("2026-06-10T00:00:00"),
    );

    expect(groups.get(operations.id)?.map((item) => item.direction)).toEqual(["in", "out"]);
    expect(groups.get(center.id)?.map((item) => item.direction)).toEqual(["in", "out"]);
  });

  it("applies a full-day mission independently to both assigned shifts", () => {
    for (const shift of [operations, center]) {
      const result = computeDay(
        baseCtx({ shift, punches: [], now: d("2026-06-10T20:00:00") }),
      );
      const adjusted = applyApprovedPermissions(result, [
        { type: "mission", durationMinutes: 480 },
      ]);
      expect(adjusted).toMatchObject({
        shiftId: shift.id,
        status: "present",
        lateMinutes: 0,
        earlyLeaveMin: 0,
      });
    }
  });
});

// ── pairPunches ───────────────────────────────────────────────────────────────

describe("pairPunches", () => {
  it("1 — empty input returns null/null", () => {
    expect(pairPunches([])).toEqual({ firstIn: null, lastOut: null });
  });

  it("2 — single punch: firstIn set, lastOut null (missing checkout)", () => {
    const result = pairPunches([punch("2026-06-10T08:00:00")]);
    expect(result.firstIn).toEqual(d("2026-06-10T08:00:00"));
    expect(result.lastOut).toBeNull();
  });

  it("3 — two punches: firstIn and lastOut", () => {
    const result = pairPunches([
      punch("2026-06-10T08:00:00"),
      punch("2026-06-10T16:00:00"),
    ]);
    expect(result.firstIn).toEqual(d("2026-06-10T08:00:00"));
    expect(result.lastOut).toEqual(d("2026-06-10T16:00:00"));
  });

  it("4 — three+ punches: firstIn=first, lastOut=last", () => {
    const result = pairPunches([
      punch("2026-06-10T08:00:00"),
      punch("2026-06-10T12:00:00"),
      punch("2026-06-10T16:30:00"),
    ]);
    expect(result.firstIn).toEqual(d("2026-06-10T08:00:00"));
    expect(result.lastOut).toEqual(d("2026-06-10T16:30:00"));
  });

  it("5 — punches within 30s are collapsed (treated as one)", () => {
    // Two punches 20s apart → collapse to one → no lastOut
    const result = pairPunches([
      punch("2026-06-10T08:00:00"),
      punch("2026-06-10T08:00:20"),
    ]);
    expect(result.firstIn).toEqual(d("2026-06-10T08:00:00"));
    expect(result.lastOut).toBeNull();
  });

  it("6 — exactly 30s apart: the boundary is > 30000ms, so 30s exactly IS collapsed", () => {
    // getTime diff = 30000 ms; condition is > 30000, so this pair is collapsed
    const result = pairPunches([
      punch("2026-06-10T08:00:00"),
      punch("2026-06-10T08:00:30"),
    ]);
    expect(result.lastOut).toBeNull();
  });
});

// ── computeDay ────────────────────────────────────────────────────────────────

describe("computeDay", () => {
  it("1 — present on time (no late, no OT)", () => {
    const result = computeDay(
      baseCtx({
        punches: [punch("2026-06-10T08:00:00"), punch("2026-06-10T16:00:00")],
      }),
    );
    expect(result.status).toBe("present");
    expect(result.lateMinutes).toBe(0);
    expect(result.overtimeMinutes).toBe(0);
    expect(result.workedMinutes).toBe(480);
  });

  it("2 — present but late (30 min, grace=0)", () => {
    const result = computeDay(
      baseCtx({
        punches: [punch("2026-06-10T08:30:00"), punch("2026-06-10T16:30:00")],
      }),
    );
    expect(result.lateMinutes).toBe(30);
    expect(result.status).toBe("partial");
  });

  it("3 — grace absorbs lateness (15-min grace, 10 min late)", () => {
    const result = computeDay(
      baseCtx({
        shift: makeShift({ graceLateMin: 15 }),
        punches: [punch("2026-06-10T08:10:00"), punch("2026-06-10T16:10:00")],
      }),
    );
    expect(result.lateMinutes).toBe(0);
    expect(result.status).toBe("present");
  });

  it("4 — present with overtime (shift ends 16:00, out at 17:00 = 60 min OT)", () => {
    const result = computeDay(
      baseCtx({
        shift: makeShift({ allowOT: true }),
        punches: [punch("2026-06-10T08:00:00"), punch("2026-06-10T17:00:00")],
      }),
    );
    expect(result.overtimeMinutes).toBe(60);
    expect(result.status).toBe("present");
  });

  it("counts arrival overtime independently", () => {
    const result = computeDay(
      baseCtx({
        shift: makeShift({ allowOTIn: true, allowOTOut: false }),
        punches: [punch("2026-06-10T07:30:00"), punch("2026-06-10T17:00:00")],
      }),
    );
    expect(result.overtimeInMinutes).toBe(30);
    expect(result.overtimeOutMinutes).toBe(0);
    expect(result.overtimeMinutes).toBe(30);
  });

  it("counts departure overtime independently", () => {
    const result = computeDay(
      baseCtx({
        shift: makeShift({ allowOTIn: false, allowOTOut: true }),
        punches: [punch("2026-06-10T07:30:00"), punch("2026-06-10T17:00:00")],
      }),
    );
    expect(result.overtimeInMinutes).toBe(0);
    expect(result.overtimeOutMinutes).toBe(60);
    expect(result.overtimeMinutes).toBe(60);
  });

  it("applies separate minimums and one shared maximum", () => {
    const result = computeDay(
      baseCtx({
        shift: makeShift({
          allowOTIn: true,
          allowOTOut: true,
          otMinInMinutes: 45,
          otMinOutMinutes: 30,
          otMaxMinutes: 90,
        }),
        punches: [punch("2026-06-10T07:20:00"), punch("2026-06-10T17:00:00")],
      }),
    );
    expect(result.overtimeInMinutes).toBe(0);
    expect(result.overtimeOutMinutes).toBe(60);
    expect(result.overtimeMinutes).toBe(60);

    const capped = computeDay(
      baseCtx({
        shift: makeShift({
          allowOTIn: true,
          allowOTOut: true,
          otMinInMinutes: 30,
          otMinOutMinutes: 30,
          otMaxMinutes: 90,
        }),
        punches: [punch("2026-06-10T07:00:00"), punch("2026-06-10T17:00:00")],
      }),
    );
    expect(capped.overtimeInMinutes).toBe(60);
    expect(capped.overtimeOutMinutes).toBe(60);
    expect(capped.overtimeMinutes).toBe(90);
  });

  it("5 — OT disabled: overtime not counted even if worked past shift end", () => {
    const result = computeDay(
      baseCtx({
        shift: makeShift({ allowOT: false }),
        punches: [punch("2026-06-10T08:00:00"), punch("2026-06-10T17:00:00")],
      }),
    );
    expect(result.overtimeMinutes).toBe(0);
  });

  it("6 — early leave (shift ends 16:00, out at 15:00 = 60 min early)", () => {
    const result = computeDay(
      baseCtx({
        punches: [punch("2026-06-10T08:00:00"), punch("2026-06-10T15:00:00")],
      }),
    );
    expect(result.earlyLeaveMin).toBe(60);
    expect(result.status).toBe("partial");
  });

  it("7 — missing checkout: status=missing_checkout, workedMinutes=null", () => {
    const result = computeDay(
      baseCtx({ punches: [punch("2026-06-10T08:00:00")] }),
    );
    expect(result.status).toBe("missing_checkout");
    expect(result.workedMinutes).toBeNull();
    expect(result.insideNow).toBe(true);
  });

  it("8 — absent on scheduled day (requirePunch=true, no punches)", () => {
    const result = computeDay(baseCtx({ punches: [] }));
    expect(result.status).toBe("absent");
  });

  it("9 — requirePunch=false auto-presents even with no punches", () => {
    const result = computeDay(
      baseCtx({ shift: makeShift({ requirePunch: false }), punches: [] }),
    );
    expect(result.status).toBe("present");
    expect(result.workedMinutes).toBeGreaterThan(0);
  });

  it("10 — approved leave overrides everything (even with punches)", () => {
    const result = computeDay(
      baseCtx({
        leaveApproved: true,
        punches: [punch("2026-06-10T08:00:00"), punch("2026-06-10T16:00:00")],
      }),
    );
    expect(result.status).toBe("leave");
    expect(result.lateMinutes).toBe(0);
    expect(result.overtimeMinutes).toBe(0);
  });

  it("11 — holiday with no punches: status=holiday, all minutes zero", () => {
    const result = computeDay(
      baseCtx({ isHoliday: true, punches: [] }),
    );
    expect(result.status).toBe("holiday");
    expect(result.workedMinutes).toBeNull();
    expect(result.lateMinutes).toBe(0);
  });

  it("12 — holiday with punches: retains attendance for extra-day approval", () => {
    const result = computeDay(
      baseCtx({
        isHoliday: true,
        punches: [punch("2026-06-10T08:00:00"), punch("2026-06-10T16:00:00")],
      }),
    );
    expect(result.status).toBe("holiday");
    expect(result.firstIn).not.toBeNull();
    expect(result.lastOut).not.toBeNull();
    expect(result.workedMinutes).toBe(480);
  });

  it("13 — no shift resolved with punches: status=partial or missing_checkout", () => {
    const result = computeDay(
      baseCtx({
        shift: null,
        punches: [punch("2026-06-10T08:00:00"), punch("2026-06-10T16:00:00")],
      }),
    );
    expect(["partial", "present"]).toContain(result.status);
    expect(result.lateMinutes).toBe(0);
    expect(result.overtimeMinutes).toBe(0);
  });

  it("14 — break minutes reduce worked time", () => {
    const result = computeDay(
      baseCtx({
        breakMinutes: 30,
        punches: [punch("2026-06-10T08:00:00"), punch("2026-06-10T16:00:00")],
      }),
    );
    expect(result.workedMinutes).toBe(450); // 480 - 30
  });
});
