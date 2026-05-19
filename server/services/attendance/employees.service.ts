/**
 * Employees Service
 * Maintains the attendance_employees mirror table
 */

import * as crypto from 'crypto';
import { getDb } from '../../db';
import { attendanceEmployees } from '../../../drizzle/schema';
import { eq, sql } from 'drizzle-orm';
import { RawEmployee } from './sources/AttendanceSource';

export class EmployeesService {
  /**
   * UPSERT an employee from the source
   * Updates if emp_cd exists; inserts if new
   */
  static async upsertEmployee(emp: RawEmployee): Promise<void> {
    const db = await getDb();
    if (!db) throw new Error('Database not available');

    const sourceHash = crypto.createHash('sha1').update(JSON.stringify(emp)).digest('hex');
    const now = new Date();

    await db
      .insert(attendanceEmployees)
      .values({
        empCd: emp.empCd,
        fullName: emp.fullName,
        department: emp.department ?? null,
        sourceHash,
        active: true,
        createdAt: now,
        updatedAt: now,
      })
      .onDuplicateKeyUpdate({
        set: {
          fullName: emp.fullName,
          department: emp.department ?? null,
          sourceHash,
          updatedAt: now,
        },
      });
  }

  /**
   * Insert placeholder for unknown employee codes
   * Ensures unmatched punches don't crash reports
   */
  static async insertUnknownPlaceholder(): Promise<void> {
    const db = await getDb();
    if (!db) throw new Error('Database not available');

    const now = new Date();
    try {
      await db.execute(
        sql`INSERT IGNORE INTO ${attendanceEmployees} (emp_cd, full_name, active, created_at, updated_at)
          VALUES ('UNKNOWN', 'UNKNOWN', 0, ${now}, ${now})`
      );
    } catch {
      // Row may already exist, which is fine
    }
  }

  /**
   * Get an employee by code
   */
  static async getByCode(empCd: string): Promise<any | null> {
    const db = await getDb();
    if (!db) throw new Error('Database not available');

    const result = await db
      .select()
      .from(attendanceEmployees)
      .where(eq(attendanceEmployees.empCd, empCd))
      .limit(1);

    return result[0] ?? null;
  }
}
