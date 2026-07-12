/**
 * Facade over the two ZK log-pulling implementations:
 *  - ZKTcpClient    — pure Node TCP, no win32/COM/exe (default)
 *  - ZK4370LogPuller — legacy PowerShell + zkemkeeper COM path (kept, disabled by default)
 *
 * Flip ZK_USE_LEGACY_PULLER=true in .env to fall back to the old PS1/COM path
 * if the TCP client misbehaves against real hardware.
 */

import type { ZKPunch, ZKDeviceUser, ZKDeviceInfo } from "./zkTcpClient";

const USE_LEGACY = process.env.ZK_USE_LEGACY_PULLER === "true";

export class ZKDevicePuller {
  static readonly usingLegacy = USE_LEGACY;

  static async setDeviceTime(ip: string, port: number, commKey = 258288): Promise<void> {
    if (USE_LEGACY) {
      const { ZK4370LogPuller } = await import("./zk4370LogPuller");
      return ZK4370LogPuller.setDeviceTime(ip, port, commKey);
    }
    const { ZKTcpClient } = await import("./zkTcpClient");
    const client = new ZKTcpClient(ip, port);
    await client.connect(commKey);
    try {
      await client.setDeviceTime();
    } finally {
      await client.exit();
    }
  }

  static async pullLogs(ip: string, port: number, commKey = 258288): Promise<ZKPunch[]> {
    if (USE_LEGACY) {
      const { ZK4370LogPuller } = await import("./zk4370LogPuller");
      return ZK4370LogPuller.pullLogs(ip, port, commKey);
    }
    const { ZKTcpClient } = await import("./zkTcpClient");
    const client = new ZKTcpClient(ip, port);
    await client.connect(commKey);
    try {
      return await client.pullLogs();
    } finally {
      await client.exit();
    }
  }

  static async pullUsers(ip: string, port: number, commKey = 258288): Promise<ZKDeviceUser[]> {
    if (USE_LEGACY) {
      const { ZK4370LogPuller } = await import("./zk4370LogPuller");
      return ZK4370LogPuller.pullUsers(ip, port, commKey);
    }
    const { ZKTcpClient } = await import("./zkTcpClient");
    const client = new ZKTcpClient(ip, port);
    await client.connect(commKey);
    try {
      return await client.pullUsers();
    } finally {
      await client.exit();
    }
  }

  static async getDeviceInfo(ip: string, port: number, commKey = 258288): Promise<ZKDeviceInfo> {
    if (USE_LEGACY) {
      const { ZK4370LogPuller } = await import("./zk4370LogPuller");
      return ZK4370LogPuller.getDeviceInfo(ip, port);
    }
    const { ZKTcpClient } = await import("./zkTcpClient");
    const client = new ZKTcpClient(ip, port);
    try {
      await client.connect(commKey);
      return await client.getDeviceInfo();
    } catch (err) {
      return { ok: false, error: err instanceof Error ? err.message : String(err) };
    } finally {
      client.disconnect();
    }
  }
}
