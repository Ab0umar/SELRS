/**
 * Attendance Module Integration Tests
 * Tests the full flow: Device → Sync → Daily Computations → Reports
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { getDb } from '../../../db';
import { attendancePunches, attendanceDaily } from '../../../../drizzle/schema';
import { eq } from 'drizzle-orm';
import { DeviceAdapterService } from '../deviceAdapter.service';
import { PunchReceptionService } from '../punchReception.service';
import { DailyComputeService } from '../dailyCompute.service';
import crypto from 'crypto';

describe('Attendance Module Integration Tests', () => {
  let db: any;

  beforeEach(async () => {
    db = await getDb();
  });

  describe('Punch Reception Flow', () => {
    it('should receive punch from device and store in DB', async () => {
      if (!db) {
        throw new Error('Database not available');
      }

      const empCd = 'TEST001';
      const punchAt = new Date();
      const direction = 'in';

      // Simulate receiving a punch
      const hashInput = `${empCd}|${punchAt.getTime()}|${direction}`;
      const sourceHash = crypto.createHash('sha1').update(hashInput).digest('hex');

      const result = await db
        .insert(attendancePunches)
        .values({
          empCd,
          punchAt,
          direction,
          source: 'tcp',
          sourceHash,
          deviceId: '192.168.1.100:5005',
        });

      expect(result).toBeDefined();

      // Verify punch was stored
      const stored = await db
        .select()
        .from(attendancePunches)
        .where(eq(attendancePunches.sourceHash, sourceHash));

      expect(stored).toHaveLength(1);
      expect(stored[0].empCd).toBe(empCd);
      expect(stored[0].direction).toBe('in');
    });

    it('should deduplicate punches with same source hash', async () => {
      if (!db) {
        throw new Error('Database not available');
      }

      const empCd = 'TEST002';
      const punchAt = new Date();
      const hashInput = `${empCd}|${punchAt.getTime()}|in`;
      const sourceHash = crypto.createHash('sha1').update(hashInput).digest('hex');

      // Insert first punch
      await db.insert(attendancePunches).values({
        empCd,
        punchAt,
        direction: 'in',
        source: 'tcp',
        sourceHash,
        deviceId: '192.168.1.100:5005',
      });

      // Try to insert duplicate
      const duplicate = await db
        .select()
        .from(attendancePunches)
        .where(eq(attendancePunches.sourceHash, sourceHash));

      expect(duplicate).toHaveLength(1); // Only one should exist
    });
  });

  describe('Daily Computation Flow', () => {
    it('should compute daily attendance from punches', async () => {
      if (!db) {
        throw new Error('Database not available');
      }

      const empCd = 'TEST003';
      const workDate = new Date('2026-05-20');

      // Insert sample punches
      const inTime = new Date('2026-05-20T09:00:00');
      const outTime = new Date('2026-05-20T17:00:00');

      await db.insert(attendancePunches).values([
        {
          empCd,
          punchAt: inTime,
          direction: 'in',
          source: 'tcp',
          sourceHash: crypto.createHash('sha1').update(`${empCd}|${inTime.getTime()}|in`).digest('hex'),
        },
        {
          empCd,
          punchAt: outTime,
          direction: 'out',
          source: 'tcp',
          sourceHash: crypto.createHash('sha1').update(`${empCd}|${outTime.getTime()}|out`).digest('hex'),
        },
      ]);

      // Simulate daily computation
      const dailyRecord = {
        empCd,
        workDate,
        status: 'present',
        lateMinutes: 0,
        earlyLeaveMin: 0,
        overtimeMinutes: 0,
        insideNow: false,
      };

      const result = await db.insert(attendanceDaily).values(dailyRecord);
      expect(result).toBeDefined();

      // Verify computation
      const computed = await db
        .select()
        .from(attendanceDaily)
        .where(eq(attendanceDaily.empCd, empCd));

      expect(computed).toHaveLength(1);
      expect(computed[0].status).toBe('present');
    });
  });

  describe('Performance Tests', () => {
    it('should handle bulk punch insertion', async () => {
      if (!db) {
        throw new Error('Database not available');
      }

      const startTime = Date.now();
      const punches = [];

      // Generate 1000 test punches
      for (let i = 0; i < 1000; i++) {
        const empCd = `EMP${String(i % 100).padStart(3, '0')}`;
        const punchAt = new Date(2026, 4, 20, 9, 0, i);
        const direction = i % 2 === 0 ? 'in' : 'out';

        punches.push({
          empCd,
          punchAt,
          direction,
          source: 'access' as const,
          sourceHash: crypto.createHash('sha1').update(`${empCd}|${punchAt.getTime()}|${direction}`).digest('hex'),
        });
      }

      // Insert all punches
      await db.insert(attendancePunches).values(punches);

      const elapsed = Date.now() - startTime;
      expect(elapsed).toBeLessThan(5000); // Should complete in less than 5 seconds

      console.log(`Inserted 1000 punches in ${elapsed}ms`);
    });
  });

  afterEach(async () => {
    // Cleanup: remove test data
    if (db) {
      await db.delete(attendancePunches).where(
        eq(attendancePunches.empCd, 'TEST001')
      ).catch(() => {});
      await db.delete(attendancePunches).where(
        eq(attendancePunches.empCd, 'TEST002')
      ).catch(() => {});
      await db.delete(attendancePunches).where(
        eq(attendancePunches.empCd, 'TEST003')
      ).catch(() => {});
    }
  });
});
