import { and, eq } from "drizzle-orm";
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import {
  attendanceHolidays,
  attendanceLeaves,
  attendancePermissions,
  attendancePunches,
} from "../../drizzle/schema";
import { DailyMaterializer } from "../services/attendance/dailyMaterializer";
import { makeCallerAs } from "./helpers/auth";
import { cleanupTables, getTestDb } from "./setup";
import { seedEmployee } from "./helpers/db";

vi.mock("child_process", async () => {
  const actual = await vi.importActual<typeof import("child_process")>(
    "child_process",
  );
  return {
    ...actual,
    execSync: vi.fn(() => ""),
  };
});

const { appRouter } = await import("../routers");

const TEST_EMP_CD = "TEST-EMP-ATT-001";
const LEAVE_1 = { from: "2026-02-01", to: "2026-02-03" };
const LEAVE_2 = { from: "2026-02-02", to: "2026-02-04" };

async function resetAttendanceTables() {
  const db = await getTestDb();
  await cleanupTables(
    db,
    "attendance_daily",
    "attendance_punches",
    "attendance_leave_balances",
    "attendance_leaves",
    "attendance_permissions",
    "attendance_holidays",
  );
}

async function seedTestEmployee() {
  const db = await getTestDb();
  await seedEmployee(db, {
    empCd: TEST_EMP_CD,
    fullName: "Attendance Test Employee",
    active: true,
  });
  return db;
}

async function getLeaveId(db: Awaited<ReturnType<typeof getTestDb>>) {
  const rows = await db
    .select()
    .from(attendanceLeaves)
    .where(eq(attendanceLeaves.empCd, TEST_EMP_CD))
    .orderBy(attendanceLeaves.id);
  expect(rows.length).toBeGreaterThan(0);
  return rows[0]!.id;
}

describe.sequential("attendance leave and permission mutations", () => {
  beforeEach(async () => {
    await resetAttendanceTables();
  });

  afterEach(async () => {
    await resetAttendanceTables();
  });

  it("createLeave happy path creates an approved leave", async () => {
    const db = await seedTestEmployee();
    const caller = appRouter.createCaller(makeCallerAs("admin"));

    await expect(
      caller.attendance.createLeave({
        empCd: TEST_EMP_CD,
        dateFrom: LEAVE_1.from,
        dateTo: LEAVE_1.to,
        type: "annual",
        note: "integration test",
      }),
    ).resolves.toEqual({ success: true });

    const rows = await db
      .select()
      .from(attendanceLeaves)
      .where(
        and(
          eq(attendanceLeaves.empCd, TEST_EMP_CD),
          eq(attendanceLeaves.dateFrom, LEAVE_1.from as any),
          eq(attendanceLeaves.dateTo, LEAVE_1.to as any),
        ),
      );

    expect(rows).toHaveLength(1);
    expect(rows[0]?.approved).toBe(true);
  });

  it("createLeave with overlapping dates returns validation error", async () => {
    const db = await seedTestEmployee();
    const caller = appRouter.createCaller(makeCallerAs("admin"));

    await caller.attendance.createLeave({
      empCd: TEST_EMP_CD,
      dateFrom: LEAVE_1.from,
      dateTo: LEAVE_1.to,
      type: "annual",
    });

    await expect(
      caller.attendance.createLeave({
        empCd: TEST_EMP_CD,
        dateFrom: LEAVE_2.from,
        dateTo: LEAVE_2.to,
        type: "annual",
      }),
    ).rejects.toMatchObject({
      code: "BAD_REQUEST",
      message: expect.stringContaining("متداخلة"),
    });

    const rows = await db
      .select()
      .from(attendanceLeaves)
      .where(eq(attendanceLeaves.empCd, TEST_EMP_CD));
    expect(rows).toHaveLength(1);
  });

  it("approveLeave by authorized role succeeds", async () => {
    const db = await seedTestEmployee();
    const caller = appRouter.createCaller(makeCallerAs("admin"));

    await caller.attendance.createLeave({
      empCd: TEST_EMP_CD,
      dateFrom: "2026-02-10",
      dateTo: "2026-02-12",
      type: "sick",
    });

    const leaveId = await getLeaveId(db);

    await expect(caller.attendance.approveLeave({ leaveId })).resolves.toEqual({
      success: true,
      leaveId,
    });
  });

  it("approveLeave by unauthorized role throws FORBIDDEN", async () => {
    const db = await seedTestEmployee();
    const adminCaller = appRouter.createCaller(makeCallerAs("admin"));
    await adminCaller.attendance.createLeave({
      empCd: TEST_EMP_CD,
      dateFrom: "2026-02-14",
      dateTo: "2026-02-15",
      type: "other",
    });

    const leaveId = await getLeaveId(db);
    const caller = appRouter.createCaller(makeCallerAs("viewer"));

    await expect(caller.attendance.approveLeave({ leaveId })).rejects.toMatchObject(
      { code: "FORBIDDEN" },
    );
  });

  it("deleteLeave removes the record", async () => {
    const db = await seedTestEmployee();
    const caller = appRouter.createCaller(makeCallerAs("admin"));

    await caller.attendance.createLeave({
      empCd: TEST_EMP_CD,
      dateFrom: "2026-02-17",
      dateTo: "2026-02-18",
      type: "annual",
    });

    const leaveId = await getLeaveId(db);

    await expect(caller.attendance.deleteLeave({ leaveId })).resolves.toEqual({
      success: true,
    });

    const rows = await db
      .select()
      .from(attendanceLeaves)
      .where(eq(attendanceLeaves.id, leaveId));
    expect(rows).toHaveLength(0);
  });

  it("createPermission happy path creates a permission record", async () => {
    const db = await seedTestEmployee();
    const caller = appRouter.createCaller(makeCallerAs("manager"));

    await expect(
      caller.attendance.createPermission({
        empCd: TEST_EMP_CD,
        date: "2026-03-01",
        type: "in",
        durationMinutes: 45,
        note: "doctor visit",
      }),
    ).resolves.toMatchObject({ success: true });

    const rows = await db
      .select()
      .from(attendancePermissions)
      .where(eq(attendancePermissions.empCd, TEST_EMP_CD));
    expect(rows).toHaveLength(1);
    expect(rows[0]?.approved).toBe(true);
  });

  it("deletePermission removes the permission record", async () => {
    const db = await seedTestEmployee();
    const caller = appRouter.createCaller(makeCallerAs("manager"));

    await caller.attendance.createPermission({
      empCd: TEST_EMP_CD,
      date: "2026-03-02",
      type: "out",
      durationMinutes: 30,
    });

    const rows = await db
      .select()
      .from(attendancePermissions)
      .where(eq(attendancePermissions.empCd, TEST_EMP_CD));
    expect(rows.length).toBe(1);

    await expect(caller.attendance.deletePermission({ id: rows[0]!.id })).resolves.toEqual(
      { success: true },
    );

    const afterRows = await db
      .select()
      .from(attendancePermissions)
      .where(eq(attendancePermissions.empCd, TEST_EMP_CD));
    expect(afterRows).toHaveLength(0);
  });

  it("rolls back a manual punch when daily recomputation fails", async () => {
    const db = await seedTestEmployee();
    const caller = appRouter.createCaller(makeCallerAs("admin"));
    const recompute = vi
      .spyOn(DailyMaterializer, "recomputeRange")
      .mockRejectedValueOnce(new Error("forced recompute failure"));

    await expect(
      caller.attendance.addManualPunch({
        empCd: TEST_EMP_CD,
        date: "2026-03-03",
        time: "09:00",
        direction: "in",
      }),
    ).rejects.toThrow("forced recompute failure");

    const rows = await db
      .select()
      .from(attendancePunches)
      .where(eq(attendancePunches.empCd, TEST_EMP_CD));
    expect(rows).toHaveLength(0);
    recompute.mockRestore();
  });

  it("rolls back manual punch deletion when daily recomputation fails", async () => {
    const db = await seedTestEmployee();
    const caller = appRouter.createCaller(makeCallerAs("admin"));
    const punchAt = new Date("2026-03-03T17:00:00");
    const result = await db.insert(attendancePunches).values({
      empCd: TEST_EMP_CD,
      punchAt,
      direction: "out",
      source: "manual",
      sourceHash: "manual-delete-rollback-test",
      insertedBy: 123,
    });
    const id = Number(
      (result as any)?.[0]?.insertId ?? (result as any)?.insertId ?? 0,
    );
    expect(id).toBeGreaterThan(0);

    const recompute = vi
      .spyOn(DailyMaterializer, "recomputeRange")
      .mockRejectedValueOnce(new Error("forced delete recompute failure"));
    await expect(
      caller.attendance.deleteManualPunch({ id }),
    ).rejects.toThrow("forced delete recompute failure");

    const rows = await db
      .select()
      .from(attendancePunches)
      .where(eq(attendancePunches.id, id));
    expect(rows).toHaveLength(1);
    recompute.mockRestore();
  });

  it("addHoliday creates a holiday record", async () => {
    const db = await getTestDb();
    const caller = appRouter.createCaller(makeCallerAs("admin"));

    await expect(
      caller.attendance.addHoliday({
        date: "2026-04-01",
        label: "Founders Day",
        paid: true,
      }),
    ).resolves.toEqual({ success: true });

    const rows = await db
      .select()
      .from(attendanceHolidays)
      .where(eq(attendanceHolidays.date, "2026-04-01" as any));
    expect(rows).toHaveLength(1);
    expect(rows[0]?.label).toBe("Founders Day");
    expect(rows[0]?.paid).toBe(true);
  });

  it("deleteHoliday removes the holiday record", async () => {
    const db = await getTestDb();
    const caller = appRouter.createCaller(makeCallerAs("admin"));

    await caller.attendance.addHoliday({
      date: "2026-04-02",
      label: "Spring Holiday",
      paid: false,
    });

    await expect(
      caller.attendance.deleteHoliday({ date: "2026-04-02" }),
    ).resolves.toEqual({ success: true });

    const rows = await db
      .select()
      .from(attendanceHolidays)
      .where(eq(attendanceHolidays.date, "2026-04-02" as any));
    expect(rows).toHaveLength(0);
  });
});
