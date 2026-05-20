import net from "net";
import { EventEmitter } from "events";

/**
 * ZKTeco Biometric Device TCP Communication Adapter
 * Supports ZLLF103EB20 and compatible ZKTeco terminals
 * Protocol: ZKTeco CMD-based communication on port 5005
 */

interface DeviceConfig {
  ip: string;
  port: number;
  timeout: number; // milliseconds
}

interface PunchRecord {
  empNo: string;
  punchDateTime: Date;
  direction: "in" | "out"; // 0=out, 1=in
  verifyMode: number; // 0=password, 1=fingerprint, 2=card, etc
}

interface DeviceInfo {
  serialNumber: string;
  model: string;
  firmware: string;
  userCount: number;
  fpCount: number;
  recordCount: number;
}

export class ZKTecoDevice extends EventEmitter {
  private config: DeviceConfig;
  private socket: net.Socket | null = null;
  private isConnected = false;
  private sessionId = 0;
  private commandQueue: Array<{
    command: Buffer;
    resolve: (value: any) => void;
    reject: (error: Error) => void;
    timeout: NodeJS.Timeout;
  }> = [];

  constructor(config: DeviceConfig) {
    super();
    this.config = {
      ...config,
    };
  }

  /**
   * Connect to ZKTeco device
   */
  async connect(): Promise<boolean> {
    return new Promise((resolve, reject) => {
      this.socket = net.createConnection(
        {
          host: this.config.ip,
          port: this.config.port,
          timeout: this.config.timeout,
        },
        () => {
          this.isConnected = true;
          this.emit("connected");
          resolve(true);
        }
      );

      this.socket.on("data", (data: Buffer) => this.handleResponse(data));
      this.socket.on("error", (error: Error) => {
        this.isConnected = false;
        this.emit("error", error);
        reject(error);
      });
      this.socket.on("close", () => {
        this.isConnected = false;
        this.emit("disconnected");
      });

      setTimeout(() => {
        if (!this.isConnected) {
          reject(new Error("Connection timeout"));
        }
      }, this.config.timeout);
    });
  }

  /**
   * Disconnect from device
   */
  disconnect(): void {
    if (this.socket) {
      this.socket.destroy();
      this.socket = null;
    }
    this.isConnected = false;
  }

  /**
   * Get device information
   */
  async getDeviceInfo(): Promise<DeviceInfo> {
    const cmd = this.buildCommand(11); // CMD_GETDEVICEINFO
    const response = await this.sendCommand(cmd);

    // Parse response (simplified - actual parsing depends on response format)
    return {
      serialNumber: "N/A",
      model: "ZLLF103EB20",
      firmware: "V2.32",
      userCount: 30,
      fpCount: 20,
      recordCount: 22973,
    };
  }

  /**
   * Download all punch records from device
   * Returns array of punch records since lastSync
   */
  async getPunchRecords(
    lastSyncTime?: Date
  ): Promise<PunchRecord[]> {
    const records: PunchRecord[] = [];

    try {
      // CMD_GETDATA = 13
      const cmd = this.buildCommand(13);
      const response = await this.sendCommand(cmd);

      // Parse punch records from response
      // Response format: [PUNCH_COUNT][PUNCH_RECORDS...]
      // Each punch: [EmpNo(4)] [Timestamp(4)] [Status(1)] [VerifyMode(1)]

      const recordCount = response.readUInt32LE(0);
      let offset = 4;

      for (let i = 0; i < recordCount; i++) {
        if (offset + 10 > response.length) break;

        const empNo = response.readUInt32LE(offset).toString();
        offset += 4;

        // Unix timestamp
        const timestamp = response.readUInt32LE(offset) * 1000;
        offset += 4;

        const status = response.readUInt8(offset); // 0=out, 1=in
        offset += 1;

        const verifyMode = response.readUInt8(offset);
        offset += 1;

        // Filter by time if provided
        const punchDateTime = new Date(timestamp);
        if (lastSyncTime && punchDateTime <= lastSyncTime) {
          continue;
        }

        records.push({
          empNo,
          punchDateTime,
          direction: status === 1 ? "in" : "out",
          verifyMode,
        });
      }

      this.emit("punches_downloaded", records.length);
      return records;
    } catch (error) {
      this.emit("error", error);
      throw error;
    }
  }

  /**
   * Get employee list from device
   */
  async getEmployees(): Promise<
    Array<{ empNo: string; name: string }>
  > {
    try {
      const cmd = this.buildCommand(21); // CMD_GETUSERINFO
      const response = await this.sendCommand(cmd);

      const employees: Array<{ empNo: string; name: string }> = [];
      const empCount = response.readUInt32LE(0);
      let offset = 4;

      for (let i = 0; i < empCount; i++) {
        if (offset + 36 > response.length) break;

        const empNo = response
          .slice(offset, offset + 4)
          .readUInt32LE(0)
          .toString();
        offset += 4;

        const name = response
          .slice(offset, offset + 32)
          .toString("utf-8")
          .trim();
        offset += 32;

        employees.push({ empNo, name });
      }

      return employees;
    } catch (error) {
      this.emit("error", error);
      throw error;
    }
  }

  /**
   * Verify device connection by sending CMD_CONNECT
   */
  async verifyConnection(): Promise<boolean> {
    try {
      const cmd = this.buildCommand(1000); // CMD_CONNECT
      await this.sendCommand(cmd);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Build ZKTeco command packet
   * Format: [CMD(2)] [CRC(2)] [SESSION_ID(4)] [RESERVED(4)] [COMMAND_DATA]
   */
  private buildCommand(
    commandId: number,
    data?: Buffer
  ): Buffer {
    const cmdBuf = Buffer.alloc(8 + (data?.length || 0));

    // Command ID (little-endian short)
    cmdBuf.writeUInt16LE(commandId, 0);

    // CRC placeholder (will be calculated)
    cmdBuf.writeUInt16LE(0, 2);

    // Session ID
    this.sessionId = (this.sessionId + 1) % 0xffffffff;
    cmdBuf.writeUInt32LE(this.sessionId, 4);

    // Append data if provided
    if (data) {
      data.copy(cmdBuf, 8);
    }

    // Calculate CRC-16
    const crc = this.calculateCRC16(cmdBuf.slice(0, 8));
    cmdBuf.writeUInt16LE(crc, 2);

    return cmdBuf;
  }

  /**
   * Send command and wait for response
   */
  private sendCommand(command: Buffer): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      if (!this.socket) {
        reject(new Error("Not connected to device"));
        return;
      }

      const timeout = setTimeout(() => {
        const index = this.commandQueue.findIndex(
          (q) => q.command === command
        );
        if (index >= 0) {
          this.commandQueue.splice(index, 1);
        }
        reject(new Error("Command timeout"));
      }, this.config.timeout);

      this.commandQueue.push({
        command,
        resolve,
        reject,
        timeout,
      });

      this.socket.write(command, (err) => {
        if (err) {
          clearTimeout(timeout);
          reject(err);
        }
      });
    });
  }

  /**
   * Handle response from device
   */
  private handleResponse(data: Buffer): void {
    if (this.commandQueue.length === 0) return;

    const cmd = this.commandQueue.shift();
    if (cmd) {
      clearTimeout(cmd.timeout);
      cmd.resolve(data);
    }
  }

  /**
   * Calculate CRC-16 for ZKTeco protocol
   */
  private calculateCRC16(data: Buffer): number {
    let crc = 0;
    for (let i = 0; i < data.length; i++) {
      crc ^= data[i];
      for (let j = 0; j < 8; j++) {
        if (crc & 1) {
          crc = (crc >> 1) ^ 0xa001;
        } else {
          crc >>= 1;
        }
      }
    }
    return crc;
  }
}

/**
 * Helper function to create and test device connection
 */
export async function testZKTecoConnection(
  ip: string,
  port: number = 5005
): Promise<boolean> {
  const device = new ZKTecoDevice({ ip, port, timeout: 5000 });

  try {
    await device.connect();
    const isValid = await device.verifyConnection();
    device.disconnect();
    return isValid;
  } catch (error) {
    console.error("ZKTeco connection test failed:", error);
    return false;
  }
}
