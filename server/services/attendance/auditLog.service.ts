/**
 * Audit logging for attendance operations
 * Tracks all significant actions for compliance and debugging
 */

export interface AuditLogEntry {
  timestamp: Date;
  action: string; // 'sync_run', 'leave_created', 'leave_approved', 'daily_recomputed', etc.
  empCd?: string;
  details: Record<string, any>;
  userId?: number;
  status: 'success' | 'error' | 'warning';
  error?: string;
}

// In-memory audit log (in production, would write to database)
const auditLogs: AuditLogEntry[] = [];
const MAX_LOGS = 1000;

export class AuditLogService {
  static log(entry: Omit<AuditLogEntry, 'timestamp'>): void {
    const logEntry: AuditLogEntry = {
      ...entry,
      timestamp: new Date(),
    };

    auditLogs.push(logEntry);

    // Keep only recent logs in memory
    if (auditLogs.length > MAX_LOGS) {
      auditLogs.shift();
    }

    // Log to console in development
    if (process.env.NODE_ENV !== 'production') {
      console.log(
        `[AUDIT] ${entry.action} - ${entry.status}${entry.error ? `: ${entry.error}` : ''}`
      );
    }
  }

  static logSyncRun(source: string, trigger: string, rowsInserted: number, error?: string): void {
    this.log({
      action: 'sync_run',
      details: { source, trigger, rowsInserted },
      status: error ? 'error' : 'success',
      error,
    });
  }

  static logLeaveCreated(empCd: string, dateFrom: Date, dateTo: Date): void {
    this.log({
      action: 'leave_created',
      empCd,
      details: { dateFrom: dateFrom.toISOString(), dateTo: dateTo.toISOString() },
      status: 'success',
    });
  }

  static logLeaveApproved(empCd: string, leaveId: number): void {
    this.log({
      action: 'leave_approved',
      empCd,
      details: { leaveId },
      status: 'success',
    });
  }

  static logDailyRecomputed(empCd: string, recordsUpdated: number): void {
    this.log({
      action: 'daily_recomputed',
      empCd,
      details: { recordsUpdated },
      status: 'success',
    });
  }

  static getRecentLogs(limit: number = 50): AuditLogEntry[] {
    return auditLogs.slice(-limit).reverse();
  }

  static getLogsByAction(action: string, limit: number = 50): AuditLogEntry[] {
    return auditLogs
      .filter((log) => log.action === action)
      .slice(-limit)
      .reverse();
  }

  static getSyncHistory(limit: number = 20): AuditLogEntry[] {
    return this.getLogsByAction('sync_run', limit);
  }

  static getStats(): any {
    const now = new Date();
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    const recentLogs = auditLogs.filter((log) => log.timestamp > oneDayAgo);
    const syncRuns = recentLogs.filter((log) => log.action === 'sync_run');
    const leaveActions = recentLogs.filter((log) =>
      log.action.startsWith('leave_')
    );
    const errors = recentLogs.filter((log) => log.status === 'error');

    return {
      totalLogsLast24h: recentLogs.length,
      syncRunsLast24h: syncRuns.length,
      leaveActionsLast24h: leaveActions.length,
      errorsLast24h: errors.length,
      totalRowsInsertedLast24h: syncRuns.reduce(
        (sum, log) => sum + (log.details?.rowsInserted || 0),
        0
      ),
      lastSyncRun: syncRuns.length > 0 ? syncRuns[syncRuns.length - 1].timestamp : null,
    };
  }
}
