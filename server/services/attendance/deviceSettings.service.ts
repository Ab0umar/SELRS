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
  commPassword?: number; // Comm Key / Net Pwd on the device
  admsEnabled?: boolean; // accept ADMS push for this device
  admsDetectedOffsetHours?: number | null; // auto-detected ADMS clock drift (K40 only)
}

// Verified working LAN address for the EF10K device (FK_DLL_DISCOVERY.md) — used
// as the fallback when ATTENDANCE_DEVICE_IP isn't set.
const EF10K_DEFAULT_IP = "41.199.252.107";

// Connection fields (ip, port, comm key) come from environment variables only —
// never from the DB — so device wiring lives in one place (.env) and can't drift
// out of sync with what's actually reachable on the LAN.
function ef10kEnvConfig() {
  return {
    ip: process.env.ATTENDANCE_DEVICE_IP || EF10K_DEFAULT_IP,
    port: parseInt(process.env.ATTENDANCE_DEVICE_PORT || "5005", 10),
    commPassword: parseInt(process.env.ATTENDANCE_DEVICE_COMM_KEY || "0", 10),
  };
}

function k40EnvConfig() {
  return {
    ip: process.env.ZK_DEVICE_IP || "",
    port: parseInt(process.env.ZK_DEVICE_PORT || "4370", 10),
    commPassword: parseInt(process.env.ZK_COMM_KEY || "0", 10),
  };
}

// In-memory caches keyed by device id
let ef10kSettings: DeviceSettings = {
  enabled: process.env.ATTENDANCE_DEVICE_ENABLED === "true",
  ...ef10kEnvConfig(),
  protocol: "tcp",
  fallbackToAccess: true,
  realTimeSync: true,
  admsEnabled: true,
};

let k40Settings: DeviceSettings = {
  enabled: process.env.ZK_DEVICE_ENABLED === "true",
  ...k40EnvConfig(),
  protocol: "tcp",
  fallbackToAccess: false,
  realTimeSync: true,
  zk40Protocol: "tcp",
  fkProtocol: 0,
  admsEnabled: true,
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
          ...ef10kEnvConfig(),
          protocol: dbEF10K.protocol as "tcp" | "udp",
          fallbackToAccess: dbEF10K.fallbackToAccess,
          realTimeSync: dbEF10K.realTimeSync,
          lastConfigUpdate: dbEF10K.lastConfigUpdate || undefined,
          zk40Protocol: ((dbEF10K as any).zk40Protocol ?? "tcp") as "adms" | "tcp",
          fkProtocol: (dbEF10K as any).fkProtocol ?? 0,
          admsEnabled: (dbEF10K as any).admsEnabled ?? true,
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
          enabled: process.env.ZK_DEVICE_ENABLED === "true" || dbK40.enabled,
          ...k40EnvConfig(),
          protocol: dbK40.protocol as "tcp" | "udp",
          fallbackToAccess: dbK40.fallbackToAccess,
          realTimeSync: dbK40.realTimeSync,
          lastConfigUpdate: dbK40.lastConfigUpdate || undefined,
          zk40Protocol: ((dbK40 as any).zk40Protocol ?? "tcp") as "adms" | "tcp",
          fkProtocol: (dbK40 as any).fkProtocol ?? 0,
          admsEnabled: (dbK40 as any).admsEnabled ?? true,
          admsDetectedOffsetHours: (dbK40 as any).admsDetectedOffsetHours ?? null,
        };
      } else {
        // Migrate from old single-row: copy zk40_* columns from id=1 into id=2
        const src = dbEF10K as any;
        await db.insert(attendanceDeviceSettings).values({
          id: 2,
          enabled: src?.zk40Enabled ?? false,
          ip: k40Settings.ip,
          port: k40Settings.port,
          protocol: "tcp",
          fallbackToAccess: false,
          realTimeSync: true,
          zk40Protocol: src?.zk40Protocol ?? "tcp",
          fkProtocol: src?.fkProtocol ?? 0,
        } as any);
        k40Settings = {
          enabled: src?.zk40Enabled ?? false,
          ...k40EnvConfig(),
          protocol: "tcp",
          fallbackToAccess: false,
          realTimeSync: true,
          zk40Protocol: src?.zk40Protocol ?? "tcp",
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

  /** EF10K settings (id=1). ip/port/commPassword always reflect current env vars. */
  static getSettings(): DeviceSettings {
    return { ...ef10kSettings, ...ef10kEnvConfig() };
  }

  /** K40 Pro settings (id=2). ip/port/commPassword always reflect current env vars. */
  static getK40Settings(): DeviceSettings {
    return { ...k40Settings, ...k40EnvConfig() };
  }

  /** Persist the auto-detected ADMS clock offset for K40 (id=2) so it survives restarts. */
  static async setK40AdmsDetectedOffset(hours: number): Promise<void> {
    k40Settings = { ...k40Settings, admsDetectedOffsetHours: hours };
    await this.persistRow(2, k40Settings);
  }

  static async updateSettings(
    updates: Partial<DeviceSettings> & { deviceId?: number },
  ): Promise<DeviceSettings> {
    const deviceId = updates.deviceId ?? 1;
    // ip/port/commPassword are env-only (see ef10kEnvConfig/k40EnvConfig) and are
    // not editable through this API — silently ignored if passed.
    const { deviceId: _, ip: _ip, port: _port, commPassword: _cp, ...rest } =
      updates as any;

    if (deviceId === 2) {
      k40Settings = { ...k40Settings, ...rest, ...k40EnvConfig(), lastConfigUpdate: new Date() };
      await this.persistRow(2, k40Settings);
      return { ...k40Settings };
    } else {
      ef10kSettings = { ...ef10kSettings, ...rest, ...ef10kEnvConfig(), lastConfigUpdate: new Date() };
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
        zk40Protocol: s.zk40Protocol ?? "tcp",
        fkProtocol: s.fkProtocol ?? 0,
        commPassword: s.commPassword ?? 0,
        admsEnabled: s.admsEnabled ?? true,
        admsDetectedOffsetHours: s.admsDetectedOffsetHours ?? null,
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

  static getConnectionUrl(): string {
    return `${ef10kSettings.protocol}://${ef10kSettings.ip}:${ef10kSettings.port}`;
  }
}
