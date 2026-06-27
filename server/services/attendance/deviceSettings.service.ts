/**
 * Device Settings Service
 * Manages fingerprint device configuration and state
 * Persists settings to MySQL database for durability across server restarts
 * Row id=1 → EF10K, Row id=2 → K40 Pro
 */

import {
  getDefaultDevice,
  DeviceAdapterService,
  DeviceStatus,
} from "./deviceAdapter.service";
import { getDb } from "../../db";
import { attendanceDeviceSettings } from "../../../drizzle/schema";
import { eq } from "drizzle-orm";

export interface DeviceSettings {
  enabled: boolean;
  ip: string;
  port: number;
  protocol: "tcp" | "udp";
  fallbackToAccess: boolean;
  realTimeSync: boolean;
  lastConfigUpdate?: Date;
  // K40 Pro extras (only meaningful for id=2)
  zk40Protocol?: "adms" | "tcp";
  fkProtocol?: number; // 0 or 1 — --protocol flag for FKOldLogPuller.exe
}

// In-memory caches keyed by device id
let ef10kSettings: DeviceSettings = {
  enabled: process.env.ATTENDANCE_DEVICE_ENABLED === "true",
  ip: process.env.ATTENDANCE_DEVICE_IP || "192.168.1.100",
  port: parseInt(process.env.ATTENDANCE_DEVICE_PORT || "5005"),
  protocol: "tcp",
  fallbackToAccess: true,
  realTimeSync: true,
};

let k40Settings: DeviceSettings = {
  enabled: false,
  ip: "",
  port: 4370,
  protocol: "tcp",
  fallbackToAccess: false,
  realTimeSync: true,
  zk40Protocol: "adms",
  fkProtocol: 0,
};

let settingsLoaded = false;

export class DeviceSettingsService {
  static async initializeSettings(): Promise<void> {
    if (settingsLoaded) return;

    try {
      const db = await getDb();
      if (!db) {
        console.warn("[DeviceSettings] Database not available, using environment defaults");
        settingsLoaded = true;
        return;
      }

      const rows = await db
        .select()
        .from(attendanceDeviceSettings)
        .where(eq(attendanceDeviceSettings.id, 1));

      // Also fetch id=2
      const rows2 = await db
        .select()
        .from(attendanceDeviceSettings)
        .where(eq(attendanceDeviceSettings.id, 2));

      const dbEF10K = rows[0];
      const dbK40 = rows2[0];

      if (dbEF10K) {
        ef10kSettings = {
          enabled: dbEF10K.enabled,
          ip: dbEF10K.ip,
          port: dbEF10K.port,
          protocol: dbEF10K.protocol as "tcp" | "udp",
          fallbackToAccess: dbEF10K.fallbackToAccess,
          realTimeSync: dbEF10K.realTimeSync,
          lastConfigUpdate: dbEF10K.lastConfigUpdate || undefined,
          fkProtocol: (dbEF10K as any).fkProtocol ?? 0,
        };
      } else {
        await db.insert(attendanceDeviceSettings).values({
          id: 1,
          enabled: ef10kSettings.enabled,
          ip: ef10kSettings.ip,
          port: ef10kSettings.port,
          protocol: ef10kSettings.protocol,
          fallbackToAccess: ef10kSettings.fallbackToAccess,
          realTimeSync: ef10kSettings.realTimeSync,
        } as any);
      }

      if (dbK40) {
        k40Settings = {
          enabled: dbK40.enabled,
          ip: dbK40.ip,
          port: dbK40.port,
          protocol: dbK40.protocol as "tcp" | "udp",
          fallbackToAccess: dbK40.fallbackToAccess,
          realTimeSync: dbK40.realTimeSync,
          lastConfigUpdate: dbK40.lastConfigUpdate || undefined,
          zk40Protocol: ((dbK40 as any).zk40Protocol ?? "adms") as "adms" | "tcp",
          fkProtocol: (dbK40 as any).fkProtocol ?? 0,
        };
      } else {
        // Migrate from old single-row: copy zk40_* columns from id=1 into id=2
        const src = dbEF10K as any;
        await db.insert(attendanceDeviceSettings).values({
          id: 2,
          enabled: src?.zk40Enabled ?? false,
          ip: src?.zk40Ip ?? "",
          port: src?.zk40Port ?? 4370,
          protocol: "tcp",
          fallbackToAccess: false,
          realTimeSync: true,
          zk40Protocol: src?.zk40Protocol ?? "adms",
          fkProtocol: src?.fkProtocol ?? 0,
        } as any);
        k40Settings = {
          enabled: src?.zk40Enabled ?? false,
          ip: src?.zk40Ip ?? "",
          port: src?.zk40Port ?? 4370,
          protocol: "tcp",
          fallbackToAccess: false,
          realTimeSync: true,
          zk40Protocol: src?.zk40Protocol ?? "adms",
          fkProtocol: src?.fkProtocol ?? 0,
        };
      }

      console.log("[DeviceSettings] Loaded — EF10K:", ef10kSettings.ip, "K40:", k40Settings.ip);
      settingsLoaded = true;
    } catch (err) {
      console.error("[DeviceSettings] Failed to initialize settings:", err);
      settingsLoaded = true;
    }
  }

  /** EF10K settings (id=1) */
  static getSettings(): DeviceSettings {
    return { ...ef10kSettings };
  }

  /** K40 Pro settings (id=2) */
  static getK40Settings(): DeviceSettings {
    return { ...k40Settings };
  }

  static async updateSettings(
    updates: Partial<DeviceSettings> & { deviceId?: number },
  ): Promise<DeviceSettings> {
    const deviceId = updates.deviceId ?? 1;
    const { deviceId: _, ...rest } = updates as any;

    if (rest.ip && !this.isValidIP(rest.ip)) throw new Error("Invalid IP address format");
    if (rest.port && (rest.port < 1 || rest.port > 65535)) throw new Error("Port must be between 1 and 65535");

    if (deviceId === 2) {
      k40Settings = { ...k40Settings, ...rest, lastConfigUpdate: new Date() };
      await this.persistRow(2, k40Settings);
      return { ...k40Settings };
    } else {
      ef10kSettings = { ...ef10kSettings, ...rest, lastConfigUpdate: new Date() };
      await this.persistRow(1, ef10kSettings);
      return { ...ef10kSettings };
    }
  }

  private static async persistRow(id: number, s: DeviceSettings): Promise<void> {
    try {
      const db = await getDb();
      if (!db) return;
      const row: any = {
        id,
        enabled: s.enabled,
        ip: s.ip,
        port: s.port,
        protocol: s.protocol,
        fallbackToAccess: s.fallbackToAccess,
        realTimeSync: s.realTimeSync,
        lastConfigUpdate: s.lastConfigUpdate,
        zk40Protocol: s.zk40Protocol ?? "adms",
        fkProtocol: s.fkProtocol ?? 0,
      };
      await db
        .insert(attendanceDeviceSettings)
        .values(row)
        .onDuplicateKeyUpdate({ set: row } as any);
      console.log(`[DeviceSettings] Saved device ${id}: ip=${s.ip} port=${s.port}`);
    } catch (err) {
      console.error("[DeviceSettings] Failed to persist settings:", err);
    }
  }

  static getDeviceStatus(): DeviceStatus {
    const device = getDefaultDevice();
    return device.getStatus();
  }

  static async connectDevice(): Promise<boolean> {
    if (!ef10kSettings.enabled) throw new Error("Device is disabled in settings");
    const device = getDefaultDevice();
    return device.connect();
  }

  static disconnectDevice(): void {
    getDefaultDevice().disconnect();
  }

  static isDeviceOnline(): boolean {
    return getDefaultDevice().isHealthy();
  }

  static sendDeviceCommand(command: Buffer): boolean {
    return getDefaultDevice().sendCommand(command);
  }

  static sendDeviceCommandHex(hex: string): boolean {
    return this.sendDeviceCommand(Buffer.from(hex, "hex"));
  }

  static resetDeviceConnection(): void {
    const device = getDefaultDevice();
    device.disconnect();
    setTimeout(() => {
      if (ef10kSettings.enabled) device.connect();
    }, 1000);
  }

  private static isValidIP(ip: string): boolean {
    if (!ip) return true; // empty is ok (K40 not configured yet)
    const ipRegex = /^(\d{1,3}\.){3}\d{1,3}$|^localhost$|^[a-zA-Z0-9-]+(\.[a-zA-Z0-9-]+)*$/;
    if (!ipRegex.test(ip)) return false;
    if (/^\d/.test(ip)) {
      const parts = ip.split(".");
      return parts.length === 4 && parts.every((p) => { const n = parseInt(p); return n >= 0 && n <= 255; });
    }
    return true;
  }

  static getConnectionUrl(): string {
    return `${ef10kSettings.protocol}://${ef10kSettings.ip}:${ef10kSettings.port}`;
  }
}
