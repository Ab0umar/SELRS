/**
 * Audit logging for attendance operations
 * Tracks all significant actions for compliance and debugging
 */

import { getDb } from "../../db";
import { auditLog } from "../../../drizzle/schema";
import { and, desc, eq, gte } from "drizzle-orm";

export interface AuditLogEntry {
  timestamp: Date;
  action: string; // 'sync_run', 'leave_created', 'leave_approved', 'daily_recomputed', etc.
  empCd?: string;
  details: Record<string, any>;
  userId?: number;
  status: "success" | "error" | "warning";
  error?: string;
}

function decodeAuditRow(row: typeof auditLog.$inferSelect): AuditLogEntry {
  const storedEntry = JSON.parse(row.changes!) as AuditLogEntry;
  return { ...storedEntry, timestamp: new Date(row.createdAt) };
}

export class AuditLogService {
  static async log(entry: Omit<AuditLogEntry, "timestamp">): Promise<void> {
    const logEntry: AuditLogEntry = {
      ...entry,
      timestamp: new Date(),
    };

    const db = await getDb();
    if (!db) throw new Error("Database not available for attendance audit");
    await db.insert(auditLog).values({
      adminId: entry.userId,
      action: entry.action,
      entityType: "attendance",
      changes: JSON.stringify(logEntry),
      createdAt: logEntry.timestamp,
    });

    // Log to console in development
    if (process.env.NODE_ENV !== "production") {
      console.log(
        `[AUDIT] ${entry.action} - ${entry.status}${entry.error ? `: ${entry.error}` : ""}`,
      );
    }
  }

  static async getRecentLogs(limit: number = 50): Promise<AuditLogEntry[]> {
    const db = await getDb();
    if (!db) throw new Error("Database not available for attendance audit");
    const rows = await db
      .select()
      .from(auditLog)
      .where(eq(auditLog.entityType, "attendance"))
      .orderBy(desc(auditLog.id))
      .limit(limit);
    return rows.map(decodeAuditRow);
  }

  static async getStats() {
    const now = new Date();
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    const db = await getDb();
    if (!db) throw new Error("Database not available for attendance audit");
    const rows = await db
      .select()
      .from(auditLog)
      .where(
        and(
          eq(auditLog.entityType, "attendance"),
          gte(auditLog.createdAt, oneDayAgo),
        ),
      )
      .orderBy(desc(auditLog.id));
    const recentLogs: AuditLogEntry[] = rows.map(decodeAuditRow);
    const syncRuns = recentLogs.filter((log) => log.action === "sync_run");
    const leaveActions = recentLogs.filter((log) =>
      log.action.startsWith("leave_"),
    );
    const errors = recentLogs.filter((log) => log.status === "error");

    return {
      totalLogsLast24h: recentLogs.length,
      syncRunsLast24h: syncRuns.length,
      leaveActionsLast24h: leaveActions.length,
      errorsLast24h: errors.length,
      totalRowsInsertedLast24h: syncRuns.reduce(
        (sum, log) => sum + (log.details?.rowsInserted || 0),
        0,
      ),
      lastSyncRun: syncRuns.length > 0 ? syncRuns[0].timestamp : null,
    };
  }
}
