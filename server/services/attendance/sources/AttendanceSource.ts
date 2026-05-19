/**
 * AttendanceSource — Adapter interface for different attendance data sources
 * Seam allowing Phase 3 TCP device integration without changes to sync engine or materializer
 */

export interface AttendanceSource {
  /** Logical adapter name; stored in attendance_sync_runs.source */
  readonly name: 'access' | 'tcp';

  /** Cheap reachability probe. MUST NOT throw; returns false on any error. */
  isReachable(): Promise<boolean>;

  /**
   * Stream raw punches whose source timestamp is >= sinceLocal.
   * - sinceLocal is facility-local Date (per research.md R7).
   * - Implementations MUST yield in roughly ascending punch_at order.
   * - Implementations MUST NOT throw on a single bad row; instead yield a
   *   { kind: 'quarantine', reason, rowRef } record so the sync engine can count it.
   */
  fetchPunchesSince(sinceLocal: Date): AsyncIterable<RawPunchOrQuarantine>;

  /**
   * Stream the current employee roster. Used to maintain attendance_employees mirror.
   * Implementations MAY return [] when the source has no notion of an employee table
   * (e.g., a raw TCP feed); the sync engine tolerates an empty roster.
   */
  fetchEmployees(): AsyncIterable<RawEmployee>;

  /** Release any open handles, temp files, sockets. Idempotent. */
  close(): Promise<void>;
}

export type RawPunchOrQuarantine =
  | { kind: 'punch'; row: RawPunch }
  | { kind: 'quarantine'; reason: string; rowRef: string };

export interface RawPunch {
  empCd: string;
  punchAt: Date;                          // facility-local; engine validates not >24h in future
  direction?: 'in' | 'out' | 'unknown';   // hint only (research.md R4)
  deviceId?: string;
  sourceRowId: string;                    // stable per-row identity in the source
}

export interface RawEmployee {
  empCd: string;
  fullName: string;
  department?: string;
}
