/**
 * Device Settings Service
 * Manages fingerprint device configuration and state
 */

import { getDefaultDevice, DeviceAdapterService, DeviceStatus } from './deviceAdapter.service';

export interface DeviceSettings {
  enabled: boolean;
  ip: string;
  port: number;
  protocol: 'tcp' | 'udp'; // For future UDP support
  fallbackToAccess: boolean; // Use Access DB if device offline
  realTimeSync: boolean; // Process punches immediately vs batch
  lastConfigUpdate?: Date;
}

// In-memory settings (in production, would persist to DB)
let deviceSettings: DeviceSettings = {
  enabled: process.env.ATTENDANCE_DEVICE_ENABLED === 'true',
  ip: process.env.ATTENDANCE_DEVICE_IP || '192.168.1.100',
  port: parseInt(process.env.ATTENDANCE_DEVICE_PORT || '5005'),
  protocol: 'tcp',
  fallbackToAccess: true,
  realTimeSync: true,
};

export class DeviceSettingsService {
  static getSettings(): DeviceSettings {
    return { ...deviceSettings };
  }

  static updateSettings(updates: Partial<DeviceSettings>): DeviceSettings {
    // Validate IP format
    if (updates.ip && !this.isValidIP(updates.ip)) {
      throw new Error('Invalid IP address format');
    }

    // Validate port range
    if (updates.port && (updates.port < 1 || updates.port > 65535)) {
      throw new Error('Port must be between 1 and 65535');
    }

    deviceSettings = {
      ...deviceSettings,
      ...updates,
      lastConfigUpdate: new Date(),
    };

    return { ...deviceSettings };
  }

  static getDeviceStatus(): DeviceStatus {
    const device = getDefaultDevice();
    return device.getStatus();
  }

  static async connectDevice(): Promise<boolean> {
    if (!deviceSettings.enabled) {
      throw new Error('Device is disabled in settings');
    }

    const device = getDefaultDevice();
    return device.connect();
  }

  static disconnectDevice(): void {
    const device = getDefaultDevice();
    device.disconnect();
  }

  static isDeviceOnline(): boolean {
    const device = getDefaultDevice();
    return device.isHealthy();
  }

  static sendDeviceCommand(command: Buffer): boolean {
    const device = getDefaultDevice();
    return device.sendCommand(command);
  }

  static sendDeviceCommandHex(hex: string): boolean {
    // Parse hex string like "AABB0000"
    const buffer = Buffer.from(hex, 'hex');
    return this.sendDeviceCommand(buffer);
  }

  static resetDeviceConnection(): void {
    const device = getDefaultDevice();
    device.disconnect();
    setTimeout(() => {
      if (deviceSettings.enabled) {
        device.connect();
      }
    }, 1000);
  }

  private static isValidIP(ip: string): boolean {
    const ipRegex = /^(\d{1,3}\.){3}\d{1,3}$|^localhost$|^[a-zA-Z0-9-]+(\.[a-zA-Z0-9-]+)*$/;
    if (!ipRegex.test(ip)) return false;

    // Check each octet for numeric IPs
    if (/^\d/.test(ip)) {
      const parts = ip.split('.');
      return parts.length === 4 && parts.every((p) => {
        const num = parseInt(p);
        return num >= 0 && num <= 255;
      });
    }

    return true;
  }

  static getConnectionUrl(): string {
    return `${deviceSettings.protocol}://${deviceSettings.ip}:${deviceSettings.port}`;
  }
}
