/**
 * Punch Reception Service
 * Handles real-time punch events from fingerprint device
 * Writes punches directly to attendance_punches table with deduplication
 */

import { EventEmitter } from 'events';
import { getDb } from '../../db';
import { attendancePunches } from '../../../drizzle/schema';
import { eq, and, gte, lte } from 'drizzle-orm';
import crypto from 'crypto';
import { getDefaultDevice, DevicePunch } from './deviceAdapter.service';
import { broadcastPunch } from '../../_core/ws';

export class PunchReceptionService extends EventEmitter {
  private isListening = false;

  static getInstance(): PunchReceptionService {
    if (!punchReceptionInstance) {
      punchReceptionInstance = new PunchReceptionService();
    }
    return punchReceptionInstance;
  }

  async startListening(): Promise<void> {
    if (this.isListening) return;

    const device = getDefaultDevice();
    device.on('punch', (punch: DevicePunch) => this.handlePunch(punch));
    this.isListening = true;
    console.log('[PunchReception] Started listening to device events');
  }

  stopListening(): void {
    this.isListening = false;
    console.log('[PunchReception] Stopped listening to device events');
  }

  private async handlePunch(punch: DevicePunch): Promise<void> {
    try {
      const db = await getDb();
      if (!db) {
        this.emit('error', new Error('Database not available'));
        return;
      }

      // Calculate source hash for deduplication
      const hashInput = `${punch.empNo}|${punch.timestamp.getTime()}|${punch.direction}`;
      const sourceHash = crypto.createHash('sha1').update(hashInput).digest('hex');

      // Check if punch already exists (deduplication)
      const existing = await db
        .select()
        .from(attendancePunches)
        .where(eq(attendancePunches.sourceHash, sourceHash))
        .limit(1);

      if (existing.length > 0) {
        console.log(`[PunchReception] Duplicate punch ignored: ${punch.empNo} at ${punch.timestamp}`);
        return;
      }

      // Insert new punch
      await db.insert(attendancePunches).values({
        empCd: punch.empNo,
        punchAt: punch.timestamp,
        direction: punch.direction,
        deviceId: punch.deviceId,
        source: 'tcp',
        sourceHash: sourceHash,
      });

      console.log(`[PunchReception] Punch recorded: ${punch.empNo} - ${punch.direction} at ${punch.timestamp}`);

      // Broadcast punch to all connected clients via WebSocket
      broadcastPunch(punch.empNo, punch.direction, punch.timestamp, punch.deviceId);

      // Emit event for subscribers
      this.emit('punch-recorded', {
        empCd: punch.empNo,
        timestamp: punch.timestamp,
        direction: punch.direction,
      });
    } catch (err) {
      console.error('[PunchReception] Error handling punch:', err);
      this.emit('error', err);
    }
  }
}

let punchReceptionInstance: PunchReceptionService | null = null;

export function getPunchReceptionService(): PunchReceptionService {
  return PunchReceptionService.getInstance();
}

export function startPunchReception(): void {
  const service = getPunchReceptionService();
  service.startListening().catch((err) => {
    console.error('[PunchReception] Failed to start:', err);
  });
}

export function stopPunchReception(): void {
  getPunchReceptionService().stopListening();
}
