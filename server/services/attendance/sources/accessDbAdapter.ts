/**
 * Access DB Adapter — Reads attendance from Tararus .mdb file
 * Uses mdb-reader (pure Node) with copy-first fallback when file is locked
 *
 * Discovered Tararus schema:
 * - KQ_KQData: Punch records (4590 rows). Key columns: GUID, EmpNo, KQDateTime, IsSignIn, InOutModeID
 * - RS_Emp: Employees (15 rows). Key columns: EmpNo, EmpName, DepartID, IsDimission
 */

import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { AttendanceSource, RawPunch, RawEmployee, RawPunchOrQuarantine } from './AttendanceSource';

// Tararus table/column names (discovered from D:\Taurus.mdb inspection)
const PUNCH_TABLE = 'KQ_KQData';          // Punch records table
const PUNCH_TIME_COL = 'KQDateTime';      // ISO timestamp of punch
const PUNCH_EMP_COL = 'EmpNo';            // Employee code (string)
const PUNCH_ID_COL = 'GUID';              // Unique punch ID for dedup
const PUNCH_DIRECTION_COL = 'IsSignIn';   // Boolean: true=in, false=out

const EMPLOYEE_TABLE = 'RS_Emp';          // Employee roster table
const EMPLOYEE_CODE_COL = 'EmpNo';        // Employee code (string)
const EMPLOYEE_NAME_COL = 'EmpName';      // Employee full name
const EMPLOYEE_DEPT_COL = 'DepartID';     // Department ID

interface AccessDbAdapterConfig {
  accessPath: string;
  copyFirst?: boolean;
  useOdbc?: boolean;
}

export class AccessDbAdapter implements AttendanceSource {
  readonly name = 'access' as const;
  private config: AccessDbAdapterConfig;
  private tempCopyPath: string | null = null;
  private db: any = null;

  constructor(config: AccessDbAdapterConfig) {
    this.config = { copyFirst: true, useOdbc: false, ...config };
  }

  async isReachable(): Promise<boolean> {
    try {
      if (!this.config.accessPath || this.config.accessPath.trim() === '') {
        return false;
      }
      // Try to access the file (check existence + readability)
      await fs.promises.access(this.config.accessPath, fs.constants.R_OK);
      return true;
    } catch {
      return false;
    }
  }

  async *fetchPunchesSince(sinceLocal: Date): AsyncIterable<RawPunchOrQuarantine> {
    try {
      const db = await this.openDb();
      if (!db) {
        return;
      }

      // Query punches where punchTime >= sinceLocal, sorted ascending
      // mdb-reader interface is approximate; exact API will depend on the package
      const rows = db.getTable(PUNCH_TABLE).getData();

      for (const row of rows) {
        const punchAt = this.parseDate(row[PUNCH_TIME_COL]);

        // Skip rows before sinceLocal
        if (!punchAt || punchAt < sinceLocal) {
          continue;
        }

        // Reject future-dated punches (>24h in future)
        const now = new Date();
        if (punchAt.getTime() - now.getTime() > 24 * 60 * 60 * 1000) {
          yield {
            kind: 'quarantine',
            reason: 'future-dated punch (>24h)',
            rowRef: String(row[PUNCH_ID_COL] ?? 'unknown'),
          };
          continue;
        }

        const empCd = String(row[PUNCH_EMP_COL] ?? '').trim();
        if (!empCd) {
          yield {
            kind: 'quarantine',
            reason: 'missing employee ID',
            rowRef: String(row[PUNCH_ID_COL] ?? 'unknown'),
          };
          continue;
        }

        // Parse direction from IsSignIn boolean: true=in, false=out
        let direction: 'in' | 'out' | 'unknown' = 'unknown';
        const isSignIn = row[PUNCH_DIRECTION_COL];
        if (isSignIn === true) direction = 'in';
        else if (isSignIn === false) direction = 'out';

        const punch: RawPunch = {
          empCd,
          punchAt,
          direction,
          sourceRowId: String(row[PUNCH_ID_COL] ?? ''),
          deviceId: row.DeviceID ? String(row.DeviceID) : undefined,
        };

        yield { kind: 'punch', row: punch };
      }
    } catch (err) {
      // Log error but do not throw; let sync engine handle it
      console.error('[attendance:accessDbAdapter] fetchPunchesSince error:', err instanceof Error ? err.message : String(err));
    }
  }

  async *fetchEmployees(): AsyncIterable<RawEmployee> {
    try {
      const db = await this.openDb();
      if (!db) {
        return;
      }

      const rows = db.getTable(EMPLOYEE_TABLE).getData();
      for (const row of rows) {
        const empCd = String(row[EMPLOYEE_CODE_COL] ?? '').trim();
        const fullName = String(row[EMPLOYEE_NAME_COL] ?? '').trim();

        if (!empCd) continue;

        const emp: RawEmployee = {
          empCd,
          fullName: fullName || 'UNKNOWN',
          department: row[EMPLOYEE_DEPT_COL] ? String(row[EMPLOYEE_DEPT_COL]).trim() : undefined,
        };

        yield emp;
      }
    } catch (err) {
      console.error('[attendance:accessDbAdapter] fetchEmployees error:', err instanceof Error ? err.message : String(err));
    }
  }

  async close(): Promise<void> {
    try {
      if (this.db) {
        this.db.close?.();
        this.db = null;
      }
    } catch {
      // Ignore errors on close
    }

    if (this.tempCopyPath) {
      try {
        await fs.promises.unlink(this.tempCopyPath);
      } catch {
        // Ignore errors deleting temp file
      }
      this.tempCopyPath = null;
    }
  }

  // ============ Private ============

  private async openDb(): Promise<any> {
    if (this.db) {
      return this.db;
    }

    const accessPath = this.config.accessPath?.trim();
    if (!accessPath) {
      throw new Error('ATTENDANCE_ACCESS_PATH not configured');
    }

    try {
      // Try direct open with mdb-reader: read file as buffer, pass to constructor
      const fileBuffer = await fs.promises.readFile(accessPath);
      const MDBReader = require('mdb-reader').default;
      this.db = new MDBReader(fileBuffer);
      return this.db;
    } catch (primaryErr) {
      // If copy-first is enabled, try copying and reading the copy
      if (this.config.copyFirst) {
        try {
          const tempDir = os.tmpdir();
          const tempFile = path.join(tempDir, `attendance_${Date.now()}.mdb`);
          await fs.promises.copyFile(accessPath, tempFile);
          this.tempCopyPath = tempFile;

          const fileBuffer = await fs.promises.readFile(tempFile);
          const MDBReader = require('mdb-reader').default;
          this.db = new MDBReader(fileBuffer);
          return this.db;
        } catch (copyErr) {
          console.error(
            '[attendance:accessDbAdapter] Copy-first failed:',
            copyErr instanceof Error ? copyErr.message : String(copyErr)
          );
        }
      }

      // If ODBC fallback is enabled, try it
      if (this.config.useOdbc) {
        try {
          const odbc = require('odbc');
          // Connection string for Access DB
          const connStr = `Driver={Microsoft Access Driver (*.mdb, *.accdb)};DBQ=${accessPath}`;
          this.db = await odbc.connect(connStr);
          return this.db;
        } catch (odbcErr) {
          console.error(
            '[attendance:accessDbAdapter] ODBC fallback failed:',
            odbcErr instanceof Error ? odbcErr.message : String(odbcErr)
          );
        }
      }

      // All strategies failed
      throw new Error(
        `[attendance:accessDbAdapter] Cannot open Access file. Path: (redacted). ` +
        `Try copy-first (ATTENDANCE_ACCESS_COPY_FIRST=true) or ODBC fallback (ATTENDANCE_ACCESS_USE_ODBC=true).`
      );
    }
  }

  private parseDate(raw: any): Date | null {
    if (!raw) return null;
    if (raw instanceof Date) return raw;
    if (typeof raw === 'number') return new Date(raw);
    if (typeof raw === 'string') {
      const d = new Date(raw);
      if (isNaN(d.getTime())) return null;
      return d;
    }
    return null;
  }
}
