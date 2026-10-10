/**
 * Punches Service
 * Inserts raw punches with dedup via source_hash
 * All punches are insert-only - never update or delete
 */

import * as crypto from "crypto";
import { getDb } from "../../db";
import { attendancePunches } from "../../../drizzle/schema";
import { eq, and, gte, lt, sql, asc, inArray } from "drizzle-orm";
import { RawPunch } from "./sources/AttendanceSource";

export class PunchesService {
  /**
   * INSERT IGNORE a punch using source_hash for dedup
   * Returns true if inserted, false if skipped (duplicate)
   */
  static async insertPunchIgnore(
    punch: RawPunch,
    source: "access" | "tcp" | "manual",
  ): Promise<boolean> {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    // Generate source hash: sha1(emp_cd|punchAt|source_row_id)
    const hashInput = `${punch.empCd}|${punch.punchAt.toISOString()}|${punch.sourceRowId}`;
    const sourceHash = crypto
      .createHash("sha1")
      .update(hashInput)
      .digest("hex");
    const now = new Date();

    try {
      // Use Drizzle insert with proper structure
      await db.insert(attendancePunches).values({
        empCd: punch.empCd,
        punchAt: punch.punchAt,
        direction: punch.direction ?? "unknown",
        deviceId: punch.deviceId ?? null,
        source,
        sourceRowId: punch.sourceRowId,
        sourceHash,
        importedAt: now,
      });

      return true;
    } catch (err: any) {
      // If error is duplicate key (error code 1062), return false (not inserted)
      if (err?.code === "ER_DUP_ENTRY" || err?.errno === 1062) {
        return false; // Duplicate, skipped
      }
      // Log unexpected errors
      console.error("[PunchesService] insertPunchIgnore unexpected error:", {
        empCd: punch.empCd,
        punchAt: punch.punchAt.toISOString(),
        sourceRowId: punch.sourceRowId,
        error: err instanceof Error ? err.message : String(err),
        code: err?.code,
        errno: err?.errno,
      });
      throw err;
    }
  }

  /**
   * Insert a manual punch correction
   * Used by punch adjustment feature; creates new row with source='manual'
   */
  static async insertManualAdjustment(
    punch: RawPunch,
    insertedBy: number,
    note: string,
    dbOverride?: any,
  ): Promise<number> {
    const db = dbOverride ?? (await getDb());
    if (!db) throw new Error("Database not available");

    const sourceHash = crypto
      .createHash("sha1")
      .update(`manual_${Date.now()}_${Math.random()}`)
      .digest("hex");
    const now = new Date();

    const result = await db.insert(attendancePunches).values({
      empCd: punch.empCd,
      punchAt: punch.punchAt,
      direction: punch.direction ?? "unknown",
      deviceId: null,
      source: "manual",
      sourceRowId: punch.sourceRowId ?? null,
      sourceHash,
      insertedBy,
      note,
      importedAt: now,
    });

    // Extract insertId from result
    const insertId =
      (result as any)?.[0]?.insertId ?? (result as any)?.insertId;
    return insertId ?? 0;
  }

  /**
   * Get raw punches for a date range (used by reports and UI)
   */
  static async getPunchesByRange(
    fromDate: Date,
    toDate: Date,
    empCd?: string | string[],
    source?: "access" | "tcp" | "manual",
    dbOverride?: any,
  ): Promise<any[]> {
    const db = dbOverride ?? (await getDb());
    if (!db) throw new Error("Database not available");

    const endDate = new Date(toDate);
    // Existing callers use either the same date for an inclusive one-day
    // range or an exclusive next-day boundary for multi-day ranges.
    if (
      fromDate.getFullYear() === endDate.getFullYear() &&
      fromDate.getMonth() === endDate.getMonth() &&
      fromDate.getDate() === endDate.getDate()
    ) {
      endDate.setHours(0, 0, 0, 0);
      endDate.setDate(endDate.getDate() + 1);
    } else {
      endDate.setHours(0, 0, 0, 0);
    }

    const conditions = [
      gte(attendancePunches.punchAt, fromDate),
      lt(attendancePunches.punchAt, endDate),
    ];

    if (empCd) {
      if (Array.isArray(empCd)) {
        if (empCd.length === 0) return [];
        conditions.push(inArray(attendancePunches.empCd, empCd));
      } else conditions.push(eq(attendancePunches.empCd, empCd));
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
