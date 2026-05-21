/**
 * FK Attendance Log Puller Service
 * Uses FKOldLogPuller.exe to extract punch logs from device
 *
 * The .exe calls FKAttend.dll which has the device communication protocol
 * We just need to invoke it and parse the CSV output
 */

import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

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
    process.env.FK_PULLER_PATH ?? 'D:\\Programs\\fp\\FKOldLogPuller.exe';
  private static readonly DEFAULT_CONFIG: FKDeviceConfig = {
    ip: '192.168.0.10',
    port: 5005,
    machineNo: 1,
    password: 0,
    license: 1261,
    timeout: 5000,
    protocol: 0,
  };

  /**
   * Pull attendance logs from device
   */
  static async pullLogs(
    config?: Partial<FKDeviceConfig>
  ): Promise<FKPunch[]> {
    const fullConfig = { ...this.DEFAULT_CONFIG, ...config };

    // Create temp file for output
    const tempDir = os.tmpdir();
    const tempFile = path.join(tempDir, `fk_logs_${Date.now()}.csv`);

    try {
      // Build command with all parameters
      const cmd =
        `"${this.FK_PULLER_PATH}"` +
        ` --ip ${fullConfig.ip}` +
        ` --port ${fullConfig.port}` +
        ` --machine ${fullConfig.machineNo}` +
        ` --password ${fullConfig.password}` +
        ` --license ${fullConfig.license}` +
        ` --timeout ${fullConfig.timeout}` +
        ` --protocol ${fullConfig.protocol}` +
        ` --out "${tempFile}"`;

      console.log(`[FKAttend] Executing: ${cmd}`);

      // Execute the puller
      const output = execSync(cmd, { encoding: 'utf-8' });
      console.log(`[FKAttend] Output:\n${output}`);

      // Parse the CSV output
      const punches = this.parseCSV(tempFile);

      return punches;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      throw new Error(
        `Failed to pull logs from device: ${errorMsg}`
      );
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

    const content = fs.readFileSync(filePath, 'utf-8');
    const lines = content.trim().split('\n');

    const punches: FKPunch[] = [];

    // Skip header line
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      try {
        const parts = line.split(',');
        if (parts.length < 10) continue;

        const punch: FKPunch = {
          enrollNo: parseInt(parts[0], 10),
          verifyMode: parseInt(parts[1], 10),
          inOutMode: parseInt(parts[2], 10),
          timestamp: new Date(parts[3]), // LogDateTime format
          year: parseInt(parts[4], 10),
          month: parseInt(parts[5], 10),
          day: parseInt(parts[6], 10),
          hour: parseInt(parts[7], 10),
          minute: parseInt(parts[8], 10),
          second: parseInt(parts[9], 10),
        };

        // Validate timestamp is reasonable
        if (punch.timestamp.getFullYear() >= 2000) {
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
    config?: Partial<FKDeviceConfig>
  ): Promise<boolean> {
    try {
      const fullConfig = { ...this.DEFAULT_CONFIG, ...config };
      const tempFile = path.join(os.tmpdir(), `fk_test_${Date.now()}.csv`);

      const cmd =
        `"${this.FK_PULLER_PATH}"` +
        ` --ip ${fullConfig.ip}` +
        ` --port ${fullConfig.port}` +
        ` --machine ${fullConfig.machineNo}` +
        ` --password ${fullConfig.password}` +
        ` --license ${fullConfig.license}` +
        ` --timeout ${fullConfig.timeout}` +
        ` --protocol ${fullConfig.protocol}` +
        ` --out "${tempFile}"`;

      const output = execSync(cmd, { encoding: 'utf-8', stdio: 'pipe' });

      // Check for success indicators
      const success = output.toLowerCase().includes('done') ||
                     output.toLowerCase().includes('rows:') ||
                     output.toLowerCase().includes('handle:');

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
}

/**
 * Quick test function
 */
export async function testFKPuller() {
  console.log(`\n[FKAttend] Testing device connection...`);

  const available = FKAttendLogPuller.isPullerAvailable();
  console.log(`FKOldLogPuller.exe: ${available ? '✓ Found' : '✗ Not found'}`);

  if (!available) {
    console.log(`Expected at: ${FKAttendLogPuller.getPullerPath()}\n`);
    return;
  }

  try {
    const connected = await FKAttendLogPuller.testConnection();
    console.log(`Device connection: ${connected ? '✓ Connected' : '✗ Failed'}\n`);

    if (connected) {
      console.log(`[FKAttend] Pulling last 100 logs...`);
      const punches = await FKAttendLogPuller.pullLogs();
      console.log(`✓ Retrieved ${punches.length} punch records`);

      if (punches.length > 0) {
        console.log(`\nSample records:`);
        punches.slice(0, 3).forEach((p) => {
          console.log(
            `  - Emp: ${p.enrollNo}, Time: ${p.timestamp.toISOString()}, Dir: ${
              p.inOutMode === 1 ? 'IN' : 'OUT'
            }`
          );
        });
      }
    }
  } catch (error) {
    console.error(`✗ Error: ${error instanceof Error ? error.message : error}`);
  }
}
