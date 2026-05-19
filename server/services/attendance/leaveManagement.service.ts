import { getDb } from '../../db';
import { attendanceLeaves, attendanceEmployees } from '../../../drizzle/schema';
import { eq, and, gte, lte, or } from 'drizzle-orm';

export type LeaveType = 'annual' | 'sick' | 'unpaid' | 'other';

export interface LeaveRequest {
  empCd: string;
  dateFrom: Date;
  dateTo: Date;
  type: LeaveType;
  note?: string;
}

export class LeaveManagementService {
  static async createLeave(req: LeaveRequest, createdBy?: number): Promise<any> {
    const db = await getDb();
    if (!db) throw new Error('Database not available');

    const result = await db.insert(attendanceLeaves).values({
      empCd: req.empCd,
      dateFrom: req.dateFrom,
      dateTo: req.dateTo,
      type: req.type,
      note: req.note || null,
      approved: false,
    });

    return result;
  }

  static async getEmployeeLeaves(empCd: string, fromDate?: Date, toDate?: Date): Promise<any[]> {
    const db = await getDb();
    if (!db) throw new Error('Database not available');

    const conditions = [eq(attendanceLeaves.empCd, empCd)];

    if (fromDate) {
      conditions.push(lte(attendanceLeaves.dateTo, toDate || new Date()));
    }

    if (toDate) {
      conditions.push(gte(attendanceLeaves.dateFrom, fromDate || new Date(2020, 0, 1)));
    }

    const leaves = await db
      .select()
      .from(attendanceLeaves)
      .where(and(...conditions))
      .orderBy(attendanceLeaves.dateFrom);

    return leaves.map((l) => ({
      id: l.id,
      empCd: l.empCd,
      dateFrom: l.dateFrom.toISOString().split('T')[0],
      dateTo: l.dateTo.toISOString().split('T')[0],
      type: l.type,
      approved: l.approved,
      note: l.note,
      createdAt: l.createdAt.toISOString(),
    }));
  }

  static async approveLeave(leaveId: number): Promise<any> {
    const db = await getDb();
    if (!db) throw new Error('Database not available');

    const result = await db
      .update(attendanceLeaves)
      .set({ approved: true })
      .where(eq(attendanceLeaves.id, leaveId));

    return result;
  }

  static async deleteLeave(leaveId: number): Promise<any> {
    const db = await getDb();
    if (!db) throw new Error('Database not available');

    const result = await db
      .delete(attendanceLeaves)
      .where(eq(attendanceLeaves.id, leaveId));

    return result;
  }

  static async getPendingLeaves(): Promise<any[]> {
    const db = await getDb();
    if (!db) throw new Error('Database not available');

    const leaves = await db
      .select()
      .from(attendanceLeaves)
      .where(eq(attendanceLeaves.approved, false))
      .orderBy(attendanceLeaves.dateFrom);

    return leaves.map((l) => ({
      id: l.id,
      empCd: l.empCd,
      empName: 'TBD', // Will be enriched
      dateFrom: l.dateFrom.toISOString().split('T')[0],
      dateTo: l.dateTo.toISOString().split('T')[0],
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
    if (!db) throw new Error('Database not available');

    const yearStart = new Date(year, 0, 1);
    const yearEnd = new Date(year, 11, 31);

    const leaves = await db
      .select()
      .from(attendanceLeaves)
      .where(
        and(
          eq(attendanceLeaves.empCd, empCd),
          eq(attendanceLeaves.type, 'annual'),
          eq(attendanceLeaves.approved, true),
          gte(attendanceLeaves.dateFrom, yearStart),
          lte(attendanceLeaves.dateTo, yearEnd)
        )
      );

    const usedDays = leaves.reduce((sum, l) => {
      return sum + this.calculateLeaveDays(l.dateFrom, l.dateTo);
    }, 0);

    return {
      empCd,
      year,
      annualAllocation: 21, // Standard in many countries
      usedDays,
      remainingDays: Math.max(0, 21 - usedDays),
    };
  }
}
