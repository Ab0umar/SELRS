/**
 * T039 — Rules Engine unit tests (pure functions, no DB)
 * 28 cases: resolveShift (8) + pairPunches (6) + computeDay (14)
 */

import { describe, it, expect } from "vitest";
import {
  resolveShift,
  resolveShifts,
  partitionPunchesForShifts,
  applyApprovedPermissions,
  cycleOverridesDirectAssignment,
  pairPunches,
  mergeContinuousBothDeviceShifts,
  computeDay,
  resolveCycleShift,
  type Shift,
  type DayContext,
  type ShiftCycle,
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

describe("resolveCycleShift", () => {
  const assignment = {
    empCd: "001",
    cycleId: 1,
    effectiveFrom: d("2026-06-10T00:00:00"),
    effectiveTo: null,
  };

  it("uses anchor-relative modulo slots for a day cycle", () => {
    const cycle: ShiftCycle = {
      id: 1,
      period: "rotation",
      anchorDate: d("2026-06-10T00:00:00"),
      slots: [
        { slotIndex: 0, shiftId: 1 },
        { slotIndex: 1, shiftId: 2 },
      ],
    };
    const cycles = new Map([[1, cycle]]);

    expect(
      resolveCycleShift(
        "001",
        d("2026-06-10T00:00:00"),
        [assignment],
        cycles,
        shiftsById,
      )?.id,
    ).toBe(1);
    expect(
      resolveCycleShift(
        "001",
        d("2026-06-11T00:00:00"),
        [assignment],
        cycles,
        shiftsById,
      )?.id,
    ).toBe(2);
    expect(
      resolveCycleShift(
        "001",
        d("2026-06-12T00:00:00"),
        [assignment],
        cycles,
        shiftsById,
      )?.id,
    ).toBe(1);
  });

  it("keeps legacy day cycles mapped to weekdays regardless of anchorDate", () => {
    const cycle: ShiftCycle = {
      id: 1,
      period: "day",
      anchorDate: d("2026-06-10T00:00:00"),
      slots: [
        { slotIndex: 0, shiftId: 1 },
        { slotIndex: 3, shiftId: 2 },
      ],
    };
    const cycles = new Map([[1, cycle]]);

    expect(
      resolveCycleShift(
        "001",
        d("2026-06-14T00:00:00"),
        [assignment],
        cycles,
        shiftsById,
      )?.id,
    ).toBe(1);
    expect(
      resolveCycleShift(
        "001",
        d("2026-06-17T00:00:00"),
        [assignment],
        cycles,
        shiftsById,
      )?.id,
    ).toBe(2);
  });

  it("returns the configured rest slot for a monthly date without an assignment", () => {
    const cycle: ShiftCycle = {
      id: 1,
      period: "month",
      anchorDate: d("2026-06-01T00:00:00"),
      slots: [{ slotIndex: 1, shiftId: 1 }],
    };

    expect(
      resolveCycleShift(
        "001",
        d("2026-06-02T00:00:00"),
        [assignment],
        new Map([[1, cycle]]),
        shiftsById,
      ),
    ).toBeNull();
  });
});

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
      2,
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
  it.each([
    ["2026-08-01", "2026-08-01", true],
    ["2026-08-02", "2026-08-01", true],
    ["2026-08-01", "2026-08-02", false],
    [undefined, "2026-08-01", false],
    ["2026-08-01", undefined, true],
  ] as const)(
    "uses the appropriate schedule for cycle %s and direct assignment %s",
    (cycleFrom, directFrom, expected) => {
      expect(cycleOverridesDirectAssignment(cycleFrom, directFrom)).toBe(
        expected,
      );
    },
  );
  it("keeps two same-day shifts in one branch without duplicating an assignment", () => {
    const morning = makeShift({
      id: 11,
      branch: "center",
      startTime: "10:00",
      endTime: "16:00",
    });
    const evening = makeShift({
      id: 12,
      branch: "center",
      startTime: "13:00",
      endTime: "19:00",
    });
    const selected = resolveShifts(
      "23",
      d("2026-09-30T00:00:00"),
      [
        asn("23", 11, "2026-08-01T00:00:00"),
        asn("23", 12, "2026-08-01T00:00:00"),
        asn("23", 11, "2026-08-01T00:00:00"),
      ],
      null,
      new Map([
        [11, morning],
        [12, evening],
      ]),
    );
    expect(selected.map((shift) => shift.id)).toEqual([11, 12]);
    const scans = [
      punch("2026-09-30T10:00:00", "unknown"),
      punch("2026-09-30T19:00:00", "unknown"),
    ];
    const partitioned = partitionPunchesForShifts(
      scans,
      selected,
      d("2026-09-30T00:00:00"),
    );
    expect([...partitioned.values()].flat()).toHaveLength(2);
  });

  it.each([false, true])(
    "respects salary exemption flag %s on an entry permission",
    (notAffectSalary) => {
      const beforePermission = computeDay(
        baseCtx({
          punches: [
            punch("2026-06-10T09:00:00", "in"),
            punch("2026-06-10T16:00:00", "out"),
          ],
        }),
      );
      const afterPermission = applyApprovedPermissions(beforePermission, [
        { type: "in", durationMinutes: 60, notAffectSalary },
      ]);
      expect(afterPermission.lateMinutes).toBe(
        notAffectSalary ? 0 : beforePermission.lateMinutes,
      );
      expect(beforePermission.lateMinutes).toBeGreaterThan(0);
    },
  );
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
        {
          ...punch("2026-06-10T09:00:00", "in"),
          deviceId: "operations-device",
        },
        {
          ...punch("2026-06-10T15:00:00", "out"),
          deviceId: "operations-device",
        },
        { ...punch("2026-06-10T15:10:00", "in"), deviceId: "center-device" },
        { ...punch("2026-06-10T19:00:00", "out"), deviceId: "center-device" },
      ],
      [operations, center],
      d("2026-06-10T00:00:00"),
    );

    expect(groups.get(operations.id)?.map((item) => item.direction)).toEqual([
      "in",
      "out",
    ]);
    expect(groups.get(center.id)?.map((item) => item.direction)).toEqual([
      "in",
      "out",
    ]);
  });

  it("accepts FK and ZK punches for a both-devices shift", () => {
    const shared = makeShift({
      id: 30,
      name: "Shared",
      branch: "both",
      deviceId: "both",
    });
    const groups = partitionPunchesForShifts(
      [
        { ...punch("2026-06-10T08:00:00", "in"), deviceId: "fk_ef10k" },
        { ...punch("2026-06-10T16:00:00", "out"), deviceId: "zkTeco" },
        { ...punch("2026-06-10T16:30:00", "out"), deviceId: "12345678" },
        { ...punch("2026-06-10T17:00:00", "out"), deviceId: "other" },
      ],
      [shared],
      d("2026-06-10T00:00:00"),
    );

    expect(groups.get(shared.id)?.map((item) => item.deviceId)).toEqual([
      "fk_ef10k",
      "zkTeco",
      "12345678",
      "other",
    ]);
  });

  describe("shifts set to both devices", () => {
    const ops = makeShift({
      id: 24,
      name: "Operations",
      branch: "both",
      deviceId: "both",
      startTime: "09:00",
      endTime: "15:00",
    });
    const ctr = makeShift({
      id: 34,
      name: "Center evening",
      branch: "both",
      deviceId: "both",
      startTime: "15:00",
      endTime: "19:00",
    });
    const day = d("2026-06-10T00:00:00");
    const now = d("2026-06-11T12:00:00");
    const at = (hm: string, deviceId: string) => ({
      ...punch(`2026-06-10T${hm}:00`),
      deviceId,
    });
    const times = (group: { punchAt: Date }[] | undefined) =>
      (group ?? []).map((p) => p.punchAt.toTimeString().slice(0, 5));
    it("takes the first ZK scan as arrival and the last FK scan as departure", () => {
      const groups = partitionPunchesForShifts(
        [
          at("08:58", "zk_1.2.3.4"),
          at("15:28", "zk_1.2.3.4"),
          at("15:38", "fk_ef10k"),
          at("18:49", "fk_ef10k"),
        ],
        [ops, ctr],
        day,
      );
      expect(times(groups.get(ops.id))).toEqual(["08:58"]);
      expect(times(groups.get(ctr.id))).toEqual(["18:49"]);
    });

    it("gives one both-device shift the first ZK and last FK scan", () => {
      const single = makeShift({
        id: 20,
        startTime: "10:00",
        endTime: "20:00",
        deviceId: "both",
      });
      const groups = partitionPunchesForShifts(
        [
          at("09:55", "zk_1.2.3.4"),
          at("12:00", "fk_ef10k"),
          at("14:00", "zk_1.2.3.4"),
          at("19:58", "fk_ef10k"),
        ],
        [single],
        day,
      );
      expect(times(groups.get(single.id))).toEqual(["09:55", "19:58"]);
    });

    it("keeps the time-based split when only one device was used", () => {
      const groups = partitionPunchesForShifts(
        [at("08:58", "zk_1.2.3.4"), at("15:28", "zk_1.2.3.4")],
        [ops, ctr],
        day,
      );
      expect(times(groups.get(ops.id))).toEqual(["08:58"]);
      expect(times(groups.get(ctr.id))).toEqual(["15:28"]);
    });

    it("merges back-to-back both-device shifts into one continuous day", () => {
      const merged = mergeContinuousBothDeviceShifts([ctr, ops]);
      expect(merged).not.toBeNull();
      expect(merged!.startTime).toBe("09:00");
      expect(merged!.endTime).toBe("19:00");
      expect(merged!.id).toBe(ops.id);
    });

    it("gives one attendance result: first ZK in, last FK out", () => {
      const merged = mergeContinuousBothDeviceShifts([ops, ctr])!;
      const groups = partitionPunchesForShifts(
        [
          at("08:52", "zk_1.2.3.4"),
          at("15:28", "zk_1.2.3.4"),
          at("15:38", "fk_ef10k"),
          at("18:49", "fk_ef10k"),
        ],
        [merged],
        day,
      );
      const result = computeDay({
        empCd: "36",
        workDate: day,
        shift: merged,
        punches: groups.get(merged.id) ?? [],
        leaveApproved: false,
        isHoliday: false,
        breakMinutes: 0,
        now,
      });
      expect(result.firstIn?.toTimeString().slice(0, 5)).toBe("08:52");
      expect(result.lastOut?.toTimeString().slice(0, 5)).toBe("18:49");
      expect(result.lateMinutes).toBe(0);
      expect(result.earlyLeaveMin).toBe(11);
    });

    it("does not merge shifts that are far apart or not both-device", () => {
      const early = makeShift({ id: 40, startTime: "08:00", endTime: "11:00", deviceId: "both" });
      const late = makeShift({ id: 41, startTime: "15:00", endTime: "19:00", deviceId: "both" });
      expect(mergeContinuousBothDeviceShifts([early, late])).toBeNull();
      const zkOnly = makeShift({ id: 42, startTime: "15:00", endTime: "19:00", deviceId: "zk" });
      expect(mergeContinuousBothDeviceShifts([ops, zkOnly])).toBeNull();
    });
  });

  it("treats an alphanumeric ADMS serial as a ZK device", () => {
    const zkShift = makeShift({ id: 31, name: "ZK", deviceId: "zk" });
    const groups = partitionPunchesForShifts(
      [{ ...punch("2026-06-10T08:00:00", "in"), deviceId: "A6F4172360091" }],
      [zkShift],
      d("2026-06-10T00:00:00"),
    );
    expect(groups.get(zkShift.id)).toHaveLength(1);
  });

  it("keeps a punch from a device no shift is configured for", () => {
    const fkShift = makeShift({ id: 32, name: "FK only", deviceId: "fk" });
    const groups = partitionPunchesForShifts(
      [{ ...punch("2026-06-10T08:00:00", "in"), deviceId: "A6F4172360091" }],
      [fkShift],
      d("2026-06-10T00:00:00"),
    );
    expect(groups.get(fkShift.id)).toHaveLength(1);
  });

  it("does not assign following-day punches to a previous day's shifts by default", () => {
    const groups = partitionPunchesForShifts(
      [{ ...punch("2026-06-11T01:00:00", "in"), deviceId: "zkTeco" }],
      [operations],
      d("2026-06-10T00:00:00"),
    );
    expect(groups.get(operations.id)).toEqual([]);
  });

  it("only accepts a checkout inside a cross-midnight shift window", () => {
    const night = makeShift({
      id: 40,
      startTime: "22:00",
      endTime: "06:00",
      crossesMidnight: true,
      deviceId: "zk",
    });
    const groups = partitionPunchesForShifts(
      [
        { ...punch("2026-06-11T05:50:00", "out"), deviceId: "zkTeco" },
        { ...punch("2026-06-11T09:00:00", "in"), deviceId: "zkTeco" },
      ],
      [night],
      d("2026-06-10T00:00:00"),
      true,
    );
    expect(
      groups.get(night.id)?.map((item) => item.punchAt.getHours()),
    ).toEqual([5]);
  });

  it("keeps punches in the unassigned group on a day without a scheduled shift", () => {
    const punches = [
      punch("2026-08-29T10:59:50", "in"),
      punch("2026-08-29T15:58:56", "out"),
    ];
    const groups = partitionPunchesForShifts(
      punches,
      [],
      d("2026-08-29T00:00:00"),
    );

    expect(groups.get(0)).toEqual(punches);
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

  it("7 — two arrival punches do not fabricate a check-out", () => {
    const result = pairPunches(
      [punch("2026-06-10T08:00:00", "in"), punch("2026-06-10T09:00:00", "in")],
      SHIFT_1,
      d("2026-06-10T00:00:00"),
    );
    expect(result.firstIn).toEqual(d("2026-06-10T08:00:00"));
    expect(result.lastOut).toBeNull();
  });

  it("8 — departure punches do not fabricate a check-in", () => {
    const result = pairPunches(
      [
        punch("2026-06-10T13:00:00", "out"),
        punch("2026-06-10T16:00:00", "out"),
      ],
      SHIFT_1,
      d("2026-06-10T00:00:00"),
    );
    expect(result).toEqual({
      firstIn: null,
      lastOut: d("2026-06-10T16:00:00"),
    });
  });

  it("9 — inverted device direction does not reverse the attendance day", () => {
    const result = pairPunches(
      [punch("2026-06-10T08:00:00", "out"), punch("2026-06-10T16:00:00", "in")],
      SHIFT_1,
      d("2026-06-10T00:00:00"),
    );
    expect(result).toEqual({
      firstIn: d("2026-06-10T08:00:00"),
      lastOut: d("2026-06-10T16:00:00"),
    });
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

  it("does not mark an old missing-checkout day as inside now", () => {
    const result = computeDay(
      baseCtx({
        workDate: d("2026-06-09T00:00:00"),
        now: d("2026-06-10T12:00:00"),
        punches: [punch("2026-06-09T08:00:00")],
      }),
    );

    expect(result.status).toBe("missing_checkout");
    expect(result.insideNow).toBe(false);
  });

  it("7b — a single departure scan is not absence", () => {
    const result = computeDay(
      baseCtx({ punches: [punch("2026-06-10T16:00:00", "out")] }),
    );
    expect(result.status).toBe("missing_checkout");
    expect(result.firstIn).toBeNull();
    expect(result.lastOut).toEqual(d("2026-06-10T16:00:00"));
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
    const result = computeDay(baseCtx({ isHoliday: true, punches: [] }));
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
