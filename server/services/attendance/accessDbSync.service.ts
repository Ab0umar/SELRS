/**
 * Access Database Sync Service
 * Phase 1: Read attendance data from Taratus Access DB
 *
 * When direct device TCP communication is unavailable or locked,
 * falls back to reading punch data from Access DB (Taurus.mdb)
 */

import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

interface AccessPunch {
  empNo: string;
  punchDateTime: Date;
  direction: 0 | 1; // 0=out, 1=in
}

interface AccessEmployee {
  empNo: string;
  name: string;
}

export class AccessDbSyncService {
  private accessDbPath: string;

  constructor(accessDbPath?: string) {
    // Default to known Taratus location
    this.accessDbPath = accessDbPath || 'D:\\Taurus V3.0\\Taurus.mdb';
  }

  /**
   * Check if Access DB is available and accessible
   */
  async checkAccessDb(): Promise<{ available: boolean; error?: string }> {
    try {
      if (!fs.existsSync(this.accessDbPath)) {
        return {
          available: false,
          error: `Access DB not found at ${this.accessDbPath}`,
        };
      }

      // Try to read file stats to verify it's not locked
      const stats = fs.statSync(this.accessDbPath);
      if (stats.size === 0) {
        return {
          available: false,
          error: 'Access DB file is empty or corrupted',
        };
      }

      return { available: true };
    } catch (error) {
      return {
        available: false,
        error: `Cannot access DB: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  }

  /**
   * Get punch records from Access DB using ODBC
   * Requires: Microsoft Access Driver (installed with Office)
   */
  async getPunchRecords(since: Date): Promise<AccessPunch[]> {
    try {
      // Connection string for Access DB via ODBC
      const connectionString = `Driver={Microsoft Access Driver (*.mdb)};DBQ=${this.accessDbPath};`;

      // SQL query to get punch records from KQ_KQData (main punch table)
      // Taratus schema: KQ_KQData contains EmpNo, KQDateTime, KQStatus
      const query = `
        SELECT
          EmpNo,
          KQDateTime,
          KQStatus
        FROM KQ_KQData
        WHERE KQDateTime > '${since.toISOString()}'
        ORDER BY KQDateTime DESC
      `;

      // Use PowerShell to query Access DB via ODBC
      const psCommand = `
$connStr = "${connectionString}"
$query = @"
${query}
"@

$conn = New-Object System.Data.OleDb.OleDbConnection($connStr)
$cmd = New-Object System.Data.OleDb.OleDbCommand($query, $conn)
$conn.Open()
$reader = $cmd.ExecuteReader()

$results = @()
while ($reader.Read()) {
  $results += @{
    empNo = $reader["EmpNo"].ToString()
    punchDateTime = $reader["KQDateTime"]
    direction = if ($reader["KQStatus"] -eq 1) { 1 } else { 0 }
  }
}
$reader.Close()
$conn.Close()

$results | ConvertTo-Json
`;

      // Execute PowerShell command
      const result = execSync(`powershell -NoProfile -Command "${psCommand}"`, {
        encoding: 'utf-8',
      });

      // Parse results
      const records = JSON.parse(result);
      return Array.isArray(records)
        ? records.map((r: any) => ({
            empNo: r.empNo,
            punchDateTime: new Date(r.punchDateTime),
            direction: r.direction,
          }))
        : [];
    } catch (error) {
      throw new Error(
        `Failed to read Access DB: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Get employee list from Access DB
   */
  async getEmployees(): Promise<AccessEmployee[]> {
    try {
      const connectionString = `Driver={Microsoft Access Driver (*.mdb)};DBQ=${this.accessDbPath};`;

      const query = `
        SELECT
          EmpCode as EmpNo,
          EmpName as Name
        FROM DI_User
        ORDER BY EmpCode
      `;

      const psCommand = `
$connStr = "${connectionString}"
$query = @"
${query}
"@

$conn = New-Object System.Data.OleDb.OleDbConnection($connStr)
$cmd = New-Object System.Data.OleDb.OleDbCommand($query, $conn)
$conn.Open()
$reader = $cmd.ExecuteReader()

$results = @()
while ($reader.Read()) {
  $results += @{
    empNo = $reader["EmpNo"].ToString()
    name = $reader["Name"].ToString()
  }
}
$reader.Close()
$conn.Close()

$results | ConvertTo-Json
`;

      const result = execSync(`powershell -NoProfile -Command "${psCommand}"`, {
        encoding: 'utf-8',
      });

      const records = JSON.parse(result);
      return Array.isArray(records) ? records : [];
    } catch (error) {
      throw new Error(
        `Failed to read employee list: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }
}

let accessSyncInstance: AccessDbSyncService | null = null;

export function getAccessDbSync(
  dbPath?: string
): AccessDbSyncService {
  if (!accessSyncInstance) {
    accessSyncInstance = new AccessDbSyncService(dbPath);
  }
  return accessSyncInstance;
}
