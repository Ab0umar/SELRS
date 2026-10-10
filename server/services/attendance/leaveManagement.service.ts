import { getDb } from "../../db";
import {
  attendanceLeaves,
  attendanceEmployees,
  attendanceLeaveBalances,
} from "../../../drizzle/schema";
import { eq, and, gte, lte, or } from "drizzle-orm";
import { accountLeaveDays } from "./leaveAccounting";
import { loadLeaveDayExclusions } from "./leaveDayExclusions";

function fmtDate(d: Date | string | null | undefined): string {
  if (!d) return "";
  if (typeof d === "string") return d.slice(0, 10);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export type LeaveType = "annual" | "sick" | "salary" | "unpaid" | "other";

export interface LeaveRequest {
  empCd: string;
  dateFrom: string; // YYYY-MM-DD
  dateTo: string; // YYYY-MM-DD
  type: LeaveType;
  note?: string;
  approved?: boolean;
  notAffectCommission?: boolean;
}

export class LeaveManagementService {
  static async createLeave(
    req: LeaveRequest,
    createdBy?: number,
  ): Promise<any> {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    const result = await db.insert(attendanceLeaves).values({
      empCd: req.empCd,
      dateFrom: req.dateFrom as any,
      dateTo: req.dateTo as any,
      type: req.type,
      note: req.note || null,
      approved: req.approved ?? false,
      notAffectCommission: req.notAffectCommission ?? false,
    });

    return result;
  }

  static async getEmployeeLeaves(
    empCd: string,
    fromDate?: Date,
    toDate?: Date,
  ): Promise<any[]> {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    const conditions = [eq(attendanceLeaves.empCd, empCd)];

    if (fromDate) {
      conditions.push(gte(attendanceLeaves.dateTo, fromDate as any));
    }

    if (toDate) {
      conditions.push(lte(attendanceLeaves.dateFrom, toDate as any));
    }

    const leaves = await db
      .select()
      .from(attendanceLeaves)
      .where(and(...conditions))
      .orderBy(attendanceLeaves.dateFrom);

    return leaves.map((l: any) => ({
      id: l.id,
      empCd: l.empCd,
      dateFrom: fmtDate(l.dateFrom as any),
      dateTo: fmtDate(l.dateTo as any),
      type: l.type,
      approved: l.approved,
      notAffectCommission: l.notAffectCommission,
      note: l.note,
      createdAt: l.createdAt.toISOString(),
    }));
  }

  static async approveLeave(leaveId: number): Promise<any> {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    const result = await db
      .update(attendanceLeaves)
      .set({ approved: true })
      .where(eq(attendanceLeaves.id, leaveId));

    return result;
  }

  static async deleteLeave(leaveId: number): Promise<any> {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    const result = await db
      .delete(attendanceLeaves)
      .where(eq(attendanceLeaves.id, leaveId));

    return result;
  }

  static async getPendingLeaves(): Promise<any[]> {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    const leaves = await db
      .select()
      .from(attendanceLeaves)
      .where(eq(attendanceLeaves.approved, false))
      .orderBy(attendanceLeaves.dateFrom);

    return leaves.map((l: any) => ({
      id: l.id,
      empCd: l.empCd,
      empName: "TBD", // Will be enriched
      dateFrom: fmtDate(l.dateFrom as any),
      dateTo: fmtDate(l.dateTo as any),
      type: l.type,
      note: l.note,
      createdAt: l.createdAt.toISOString(),
    }));
  }

  static calculateLeaveDays(dateFrom: Date, dateTo: Date): number {
    const diffMs = dateTo.getTime() - dateFrom.getTime();
    return Math.floor(diffMs / (1000 * 60 * 60 * 24)) + 1;
  }

  static async getLeaveBalance(empCd: string, year: number): Promise<any> {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    const yearStartStr = `${year}-01-01`;
    const yearEndStr = `${year}-12-31`;

    // Annual, sick, and available "other" leave all consume the configured balance.
    const leaves = await db
      .select()
      .from(attendanceLeaves)
      .where(
        and(
          eq(attendanceLeaves.empCd, empCd),
          or(
            eq(attendanceLeaves.type, "annual"),
            eq(attendanceLeaves.type, "sick"),
            eq(attendanceLeaves.type, "other"),
          ),
          eq(attendanceLeaves.approved, true),
          lte(attendanceLeaves.dateFrom, yearEndStr as any),
          gte(attendanceLeaves.dateTo, yearStartStr as any),
        ),
      );

    const balanceRows = await db
      .select()
      .from(attendanceLeaveBalances)
      .where(
        and(
          eq(attendanceLeaveBalances.empCd, empCd),
          eq(attendanceLeaveBalances.year, year),
        ),
      )
      .limit(1);
    const annualAllocation = balanceRows[0]?.annualAllocation ?? 21;
    const carryOver = balanceRows[0]?.carryOver ?? 0;
    const isRestOrHoliday = await loadLeaveDayExclusions(db, [empCd], year);
    const usedDays = accountLeaveDays(
      leaves as any[],
      annualAllocation + carryOver,
      year,
      (key) => isRestOrHoliday(empCd, key),
    ).balanceDays;

    return {
      empCd,
      year,
      annualAllocation,
      carryOver,
      usedDays,
      remainingDays: Math.max(0, annualAllocation + carryOver - usedDays),
    };
  }
}
