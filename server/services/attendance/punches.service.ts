/**
 * Punches Service
 * Inserts raw punches with dedup via source_hash
 * All punches are insert-only - never update or delete
 */

import * as crypto from 'crypto';
import { getDb } from '../../db';
import { attendancePunches } from '../../../drizzle/schema';
import { eq, and, gte, lt, sql, asc } from 'drizzle-orm';
import { RawPunch } from './sources/AttendanceSource';

export class PunchesService {
  /**
   * INSERT IGNORE a punch using source_hash for dedup
   * Returns true if inserted, false if skipped (duplicate)
   */
  static async insertPunchIgnore(punch: RawPunch, source: 'access' | 'tcp' | 'manual'): Promise<boolean> {
    const db = await getDb();
    if (!db) throw new Error('Database not available');

    // Generate source hash: sha1(emp_cd|punchAt|source_row_id)
    const hashInput = `${punch.empCd}|${punch.punchAt.toISOString()}|${punch.sourceRowId}`;
    const sourceHash = crypto.createHash('sha1').update(hashInput).digest('hex');
    const now = new Date();

    try {
      const result = await db.execute(
        sql`INSERT IGNORE INTO ${attendancePunches}
          (emp_cd, punch_at, direction, device_id, source, source_row_id, source_hash, imported_at)
          VALUES (${punch.empCd}, ${punch.punchAt}, ${punch.direction ?? 'unknown'}, ${punch.deviceId ?? null},
                  ${source}, ${punch.sourceRowId}, ${sourceHash}, ${now})`
      );

      // INSERT IGNORE returns affectedRows=0 if duplicate, 1 if inserted
      return (result as any)?.[0]?.affectedRows > 0;
    } catch {
      // Likely duplicate, return false
      return false;
    }
  }

  /**
   * Insert a manual punch correction
   * Used by punch adjustment feature; creates new row with source='manual'
   */
  static async insertManualAdjustment(
    punch: RawPunch,
    insertedBy: number,
    note: string
  ): Promise<number> {
    const db = await getDb();
    if (!db) throw new Error('Database not available');

    const sourceHash = crypto.createHash('sha1').update(`manual_${Date.now()}_${Math.random()}`).digest('hex');
    const now = new Date();

    const result = await db.insert(attendancePunches).values({
      empCd: punch.empCd,
      punchAt: punch.punchAt,
      direction: punch.direction ?? 'unknown',
      deviceId: null,
      source: 'manual',
      sourceRowId: null,
      sourceHash,
      insertedBy,
      note,
      importedAt: now,
    });

    // Extract insertId from result
    const insertId = (result as any)?.[0]?.insertId ?? (result as any)?.insertId;
    return insertId ?? 0;
  }

  /**
   * Get raw punches for a date range (used by reports and UI)
   */
  static async getPunchesByRange(
    fromDate: Date,
    toDate: Date,
    empCd?: string,
    source?: 'access' | 'tcp' | 'manual'
  ): Promise<any[]> {
    const db = await getDb();
    if (!db) throw new Error('Database not available');

    const endDate = new Date(toDate.getTime() + 24 * 60 * 60 * 1000);

    const conditions = [gte(attendancePunches.punchAt, fromDate), lt(attendancePunches.punchAt, endDate)];

    if (empCd) {
      conditions.push(eq(attendancePunches.empCd, empCd));
    }

    if (source) {
      conditions.push(eq(attendancePunches.source, source));
    }

    const result = await db
      .select()
      .from(attendancePunches)
      .where(and(...(conditions as any)))
      .orderBy(attendancePunches.punchAt);

    return result;
  }
}
