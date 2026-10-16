/**
 * TCP Device Adapter Service
 * Handles communication with fingerprint device via TCP/IP
 * Supports real-time punch reception
 */

import { EventEmitter } from "events";
import * as net from "net";
import { DeviceSettingsService } from "./deviceSettings.service";

export interface DeviceConfig {
  ip: string;
  port: number;
  timeout: number; // milliseconds
  reconnectInterval: number;
  maxRetries: number;
}

export interface DevicePunch {
  empNo: string;
  timestamp: Date;
  direction: "in" | "out" | "unknown";
  deviceId: string;
}

export interface DeviceStatus {
  connected: boolean;
  lastConnected?: Date;
  connectionError?: string;
  lastPunch?: Date;
  punchCount: number;
  uptime: number; // seconds
}

export class DeviceAdapterService extends EventEmitter {
  private socket: net.Socket | null = null;
  private config: DeviceConfig;
  private isConnecting = false;
  private reconnectAttempts = 0;
  private buffer = Buffer.alloc(0);
  private startTime = Date.now();
  private lastPunch?: Date;
  private punchCount = 0;
  private lastConnected?: Date;
  private connectionError?: string;
  /** When true, raw TCP must stay down so FKOldLogPuller can own port 5005. */
  private exclusiveUse = false;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(config: DeviceConfig) {
    super();
    this.config = config;
  }

  /**
   * Connect to the fingerprint device
   */
  async connect(): Promise<boolean> {
    if (this.exclusiveUse) {
      return false;
    }
    if (this.socket) {
      return true; // already connected
    }
    if (this.isConnecting) {
      return false; // connection in progress
    }

    this.isConnecting = true;

    return new Promise((resolve) => {
      const socket = net.createConnection(
        {
          host: this.config.ip,
          port: this.config.port,
          timeout: this.config.timeout,
        },
        () => {
          if (this.exclusiveUse) {
            this.isConnecting = false;
            this.socket = null;
            socket.destroy();
            resolve(false);
            return;
          }
          this.isConnecting = false;
          this.reconnectAttempts = 0;
          this.connectionError = undefined;
          this.lastConnected = new Date();
          this.emit("connected");
          console.log(
            `[Device] Connected to ${this.config.ip}:${this.config.port}`,
          );
          resolve(true);
        },
      );

      socket.on("data", (data: Buffer) => this.handleData(data));
      socket.on("error", (err: Error) => {
        if (this.socket !== socket) return;
        this.handleError(err);
      });
      socket.on("close", () => {
        if (this.socket !== socket) return;
        this.handleClose();
      });
      socket.setTimeout(this.config.timeout, () => socket.destroy());

      this.socket = socket;

      setTimeout(() => {
        if (this.isConnecting) {
          this.isConnecting = false;
          this.connectionError = "Connection timeout";
          socket.destroy();
          resolve(false);
        }
      }, this.config.timeout);
    });
  }

  /**
   * Disconnect from the device
   */
  disconnect(): void {
    if (this.socket) {
      const socket = this.socket;
      this.socket = null;
      this.isConnecting = false;
      socket.destroy();
    }
  }

  /**
   * Drop the raw TCP session and block reconnects while FKOldLogPuller runs.
   * The EF10K accepts only one session on :5005; a competing socket causes Load failed.
   */
  async releaseForPull(): Promise<void> {
    this.exclusiveUse = true;
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    const hadSocket = this.socket !== null;
    const socket = this.socket;
    this.disconnect();
    console.log(
      `[Device] Released for FK pull (wasConnected=${hadSocket}, exclusive=true)`,
    );
    if (socket && !socket.destroyed) {
      await new Promise<void>((resolve) => {
        socket.once("close", () => resolve());
        setTimeout(resolve, 2000);
      });
    }
    // Extra settle so the device drops the prior session before the puller connects.
    await new Promise((resolve) => setTimeout(resolve, 1500));
  }

  resumeAfterPull(): void {
    this.exclusiveUse = false;
    this.reconnectAttempts = 0;
    console.log("[Device] Resuming after FK pull");
    void this.connect();
  }

  /**
   * Send raw command to device
   */
  sendCommand(command: Buffer | string): boolean {
    if (!this.socket || !this.socket.writable) {
      return false;
    }

    try {
      let data: Buffer;
      if (typeof command === "string") {
        data = Buffer.from(command, "utf8");
      } else {
        data = command;
      }
      this.socket.write(data);
      return true;
    } catch (err) {
      this.connectionError = `Send error: ${err}`;
      return false;
    }
  }

  /**
   * Request device time/status
   */
  requestStatus(): boolean {
    // Standard command: query device status
    return this.sendCommand(Buffer.from([0xaa, 0xbb, 0x00, 0x00, 0x00, 0x00]));
  }

  /**
   * Request employee data (for offline sync)
   */
  requestEmployeeData(): boolean {
    // Command to get employee list from device
    return this.sendCommand(Buffer.from([0xaa, 0xbb, 0x01, 0x00, 0x00, 0x00]));
  }

  /**
   * Get current device status
   */
  getStatus(): DeviceStatus {
    return {
      connected: this.socket !== null && this.socket.writable === true,
      lastConnected: this.lastConnected,
      connectionError: this.connectionError,
      lastPunch: this.lastPunch,
      punchCount: this.punchCount,
      uptime: Math.floor((Date.now() - this.startTime) / 1000),
    };
  }

  /**
   * Handle incoming data from device
   */
  private handleData(data: Buffer): void {
    this.buffer = Buffer.concat([this.buffer, data]);

    // Parse punches from buffer (device-specific format)
    // This is a generic parser - real implementation depends on device protocol
    while (this.buffer.length >= 24) {
      // Minimum punch record size (assumed)
      const punch = this.parsePunch(this.buffer.slice(0, 24));

      if (punch) {
        this.punchCount++;
        this.lastPunch = punch.timestamp;
        this.emit("punch", punch);
        this.buffer = this.buffer.slice(24);
      } else {
        break;
      }
    }
  }

  /**
   * Parse a punch record from device data
   * Format (assumed): [empNo:8][timestamp:8][direction:1][reserved:7]
   */
  private parsePunch(data: Buffer): DevicePunch | null {
    try {
      // Extract employee number (8 bytes, ASCII)
      const empNo = data.slice(0, 8).toString("ascii").trim();

      // Extract timestamp (8 bytes, Unix timestamp in big-endian)
      const timestampMs = data.readBigUInt64BE(8) as any;
      const timestamp = new Date(Number(timestampMs) * 1000);

      // Extract direction (1 byte: 0=out, 1=in, others=unknown)
      const directionByte = data[16];
      const direction: "in" | "out" | "unknown" =
        directionByte === 1 ? "in" : directionByte === 0 ? "out" : "unknown";

      if (!empNo || isNaN(timestamp.getTime())) {
        return null;
      }

      return {
        empNo,
        timestamp,
        direction,
        deviceId: `${this.config.ip}:${this.config.port}`,
      };
    } catch (err) {
      return null;
    }
  }

  /**
   * Handle device errors
   */
  private handleError(err: Error): void {
    this.connectionError = err.message;
    if (this.listenerCount("error") > 0) {
      this.emit("error", err);
    }
    console.error(`[Device] Error: ${err.message}`);
    this.attemptReconnect();
  }

  /**
   * Handle device disconnect
   */
  private handleClose(): void {
    this.socket = null;
    this.isConnecting = false;
    this.emit("disconnected");
    console.log("[Device] Disconnected");
    this.attemptReconnect();
  }

  /**
   * Attempt to reconnect to device
   */
  private attemptReconnect(): void {
    if (this.exclusiveUse) return;
    if (this.reconnectAttempts >= this.config.maxRetries) {
      this.connectionError = "Max reconnection attempts reached";
      return;
    }

    this.reconnectAttempts++;
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      if (this.exclusiveUse) return;
      void this.connect();
    }, this.config.reconnectInterval);
  }

  /**
   * Check device health
   */
  isHealthy(): boolean {
    return this.socket !== null && this.socket.writable === true;
  }
}

// Singleton instance for the default device
let defaultDevice: DeviceAdapterService | null = null;

export function getDefaultDevice(): DeviceAdapterService {
  if (!defaultDevice) {
    const settings = DeviceSettingsService.getSettings();

    const config: DeviceConfig = {
      ip: settings.ip,
      port: settings.port,
      timeout: 10000,
      reconnectInterval: 5000,
      maxRetries: 10,
    };

    defaultDevice = new DeviceAdapterService(config);
  }

  return defaultDevice;
}

export function setDefaultDevice(device: DeviceAdapterService): void {
  defaultDevice = device;
}
