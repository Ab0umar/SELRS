/**
 * FK Attendance Log Puller Service
 * Uses FKOldLogPuller.exe to extract punch logs from device
 *
 * The .exe calls FKAttend.dll which has the device communication protocol
 * We just need to invoke it and parse the CSV output
 */

import { execFile } from "child_process";
import { promisify } from "util";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";

const execFileAsync = promisify(execFile);

export interface FKPunch {
  enrollNo: number;
  verifyMode: number;
  inOutMode: number; // 0=out, 1=in
  timestamp: Date;
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
}

export interface FKDeviceConfig {
  ip: string;
  port: number;
  machineNo: number;
  password: number;
  license: number;
  timeout: number;
  protocol: number; // 0 or 1
}

export class FKAttendLogPuller {
  private static readonly FK_PULLER_PATH =
    process.env.FK_PULLER_PATH ??
      path.join(process.cwd(), "server", "FKOldLogPuller.exe");
  private static readonly DEFAULT_CONFIG: FKDeviceConfig = {
    ip: process.env.ATTENDANCE_DEVICE_IP || "192.168.1.10",
    port: parseInt(process.env.ATTENDANCE_DEVICE_PORT || "5005", 10),
    machineNo: 1,
    password: 0,
    license: 1261,
    timeout: 5000,
    protocol: 0,
  };

  /**
   * Pull attendance logs from device
   */
  static async pullLogs(config?: Partial<FKDeviceConfig>): Promise<FKPunch[]> {
    const fullConfig = { ...this.DEFAULT_CONFIG, ...config };

    const tempDir = os.tmpdir();
    const tempFile = path.join(tempDir, `fk_logs_${Date.now()}.csv`);

    try {
      const { stdout } = await execFileAsync(
        this.FK_PULLER_PATH,
        [
          "--ip", fullConfig.ip,
          "--port", String(fullConfig.port),
          "--machine", String(fullConfig.machineNo),
          "--password", String(fullConfig.password),
          "--license", String(fullConfig.license),
          "--timeout", String(fullConfig.timeout),
          "--protocol", String(fullConfig.protocol),
          "--out", tempFile,
        ],
        {
          encoding: "utf8",
          timeout: this.processTimeoutMs(fullConfig.timeout),
          windowsHide: true,
        },
      );
      console.log(`[FKAttend] Output:\n${stdout}`);

      const punches = this.parseCSV(tempFile);

      return punches;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to pull logs from device: ${errorMsg}`);
    } finally {
      // Clean up temp file
      try {
        if (fs.existsSync(tempFile)) {
          fs.unlinkSync(tempFile);
        }
      } catch (e) {
        // Ignore cleanup errors
      }
    }
  }

  /**
   * Parse CSV output from FKOldLogPuller.exe
   * Format: EnrollNo,VerifyMode,InOutMode,LogDateTime,Year,Month,Day,Hour,Minute,Second
   */
  private static parseCSV(filePath: string): FKPunch[] {
    if (!fs.existsSync(filePath)) {
      return [];
    }

    const content = fs.readFileSync(filePath, "utf-8");
    const lines = content.trim().split("\n");

    const punches: FKPunch[] = [];

    // Skip header line
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      try {
        const parts = line.split(",");
        if (parts.length < 10) continue;

        const yr = parseInt(parts[4], 10);
        const mo = parseInt(parts[5], 10);
        const dy = parseInt(parts[6], 10);
        const hr = parseInt(parts[7], 10);
        const mn = parseInt(parts[8], 10);
        const sc = parseInt(parts[9], 10);
        // Build timestamp from numeric columns — avoids locale-dependent Date string parsing
        const ts = new Date(yr, mo - 1, dy, hr, mn, sc);

        const enrollNo = Number(parts[0]);
        if (!Number.isSafeInteger(enrollNo) || enrollNo < 0) continue;

        const punch: FKPunch = {
          enrollNo,
          verifyMode: parseInt(parts[1], 10),
          inOutMode: parseInt(parts[2], 10),
          timestamp: ts,
          year: yr,
          month: mo,
          day: dy,
          hour: hr,
          minute: mn,
          second: sc,
        };

        if (
          Number.isFinite(punch.timestamp.getTime()) &&
          punch.timestamp.getFullYear() >= 2000 &&
          punch.timestamp.getFullYear() === yr &&
          punch.timestamp.getMonth() === mo - 1 &&
          punch.timestamp.getDate() === dy
        ) {
          punches.push(punch);
        }
      } catch (e) {
        // Skip malformed lines
        console.warn(`[FKAttend] Skipped malformed line: ${line}`);
      }
    }

    return punches;
  }

  /**
   * Test device connection
   */
  static async testConnection(
    config?: Partial<FKDeviceConfig>,
  ): Promise<boolean> {
    try {
      const fullConfig = { ...this.DEFAULT_CONFIG, ...config };
      const tempFile = path.join(os.tmpdir(), `fk_test_${Date.now()}.csv`);

      const { stdout } = await execFileAsync(
        this.FK_PULLER_PATH,
        [
          "--ip", fullConfig.ip,
          "--port", String(fullConfig.port),
          "--machine", String(fullConfig.machineNo),
          "--password", String(fullConfig.password),
          "--license", String(fullConfig.license),
          "--timeout", String(fullConfig.timeout),
          "--protocol", String(fullConfig.protocol),
          "--out", tempFile,
        ],
        {
          encoding: "utf8",
          timeout: this.processTimeoutMs(fullConfig.timeout),
          windowsHide: true,
        },
      );

      const success =
        stdout.toLowerCase().includes("done") ||
        stdout.toLowerCase().includes("rows:") ||
        stdout.toLowerCase().includes("handle:");

      // Clean up
      try {
        if (fs.existsSync(tempFile)) {
          fs.unlinkSync(tempFile);
        }
      } catch (e) {
        // Ignore
      }

      return success;
    } catch (error) {
      console.error(`[FKAttend] Connection test failed: ${error}`);
      return false;
    }
  }

  /**
   * Get available puller info
   */
  static getPullerPath(): string {
    return this.FK_PULLER_PATH;
  }

  static isPullerAvailable(): boolean {
    return fs.existsSync(this.FK_PULLER_PATH);
  }

  private static processTimeoutMs(deviceTimeout: number): number {
    const safeDeviceTimeout = Number.isFinite(deviceTimeout)
      ? Math.max(0, deviceTimeout)
      : 5000;
    return Math.max(10_000, Math.min(safeDeviceTimeout + 10_000, 60_000));
  }
}

/**
 * Quick test function
 */
export async function testFKPuller() {
  console.log(`\n[FKAttend] Testing device connection...`);

  const available = FKAttendLogPuller.isPullerAvailable();
  console.log(`FKOldLogPuller.exe: ${available ? "✓ Found" : "✗ Not found"}`);

  if (!available) {
    console.log(`Expected at: ${FKAttendLogPuller.getPullerPath()}\n`);
    return;
  }

  try {
    const connected = await FKAttendLogPuller.testConnection();
    console.log(
      `Device connection: ${connected ? "✓ Connected" : "✗ Failed"}\n`,
    );

    if (connected) {
      console.log(`[FKAttend] Pulling last 100 logs...`);
      const punches = await FKAttendLogPuller.pullLogs();
      console.log(`✓ Retrieved ${punches.length} punch records`);

      if (punches.length > 0) {
        console.log(`\nSample records:`);
        punches.slice(0, 3).forEach((p) => {
          console.log(
            `  - Emp: ${p.enrollNo}, Time: ${p.timestamp.toISOString()}, Dir: ${
              p.inOutMode === 1 ? "IN" : "OUT"
            }`,
          );
        });
      }
    }
  } catch (error) {
    console.error(`✗ Error: ${error instanceof Error ? error.message : error}`);
  }
}
