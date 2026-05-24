import { z } from 'zod';
import { router, attendanceManagerProcedure as managerProcedure } from '../_core/procedures';
import { getDb } from '../db';
import { shiftStaff, shiftAttendance } from '../../drizzle/schema';
import { eq, and } from 'drizzle-orm';

export const shiftStaffRouter = router({
  // ── Staff CRUD ───────────────────────────────────────────
  listStaff: managerProcedure.query(async () => {
    const db = await getDb();
    if (!db) throw new Error('DB unavailable');
    return db.select().from(shiftStaff).orderBy(shiftStaff.type, shiftStaff.name);
  }),

  addStaff: managerProcedure
    .input(z.object({
      name: z.string().min(1),
      type: z.enum(['doctor', 'tech']),
      ratePerShift: z.number().min(0),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error('DB unavailable');
      const result = await db.insert(shiftStaff).values({
        name: input.name,
        type: input.type,
        ratePerShift: String(input.ratePerShift) as any,
      });
      return { id: (result as any).insertId };
    }),

  updateStaff: managerProcedure
    .input(z.object({
      id: z.number(),
      name: z.string().min(1),
      type: z.enum(['doctor', 'tech']),
      ratePerShift: z.number().min(0),
      active: z.boolean(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error('DB unavailable');
      await db.update(shiftStaff)
        .set({ name: input.name, type: input.type, ratePerShift: String(input.ratePerShift) as any, active: input.active })
        .where(eq(shiftStaff.id, input.id));
      return { success: true };
    }),

  // ── Schedule ─────────────────────────────────────────────
  getSchedule: managerProcedure
    .input(z.object({ year: z.number(), month: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error('DB unavailable');
      const [staff, attendance] = await Promise.all([
        db.select().from(shiftStaff).where(eq(shiftStaff.active, true)).orderBy(shiftStaff.type, shiftStaff.name),
        db.select().from(shiftAttendance).where(
          and(eq(shiftAttendance.year, input.year), eq(shiftAttendance.month, input.month))
        ),
      ]);
      return { staff, attendance };
    }),

  addShift: managerProcedure
    .input(z.object({
      staffId: z.number(),
      year: z.number(),
      month: z.number(),
      workDate: z.string(),
      shiftName: z.string().min(1),
      present: z.boolean().default(true),
      notes: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error('DB unavailable');
      await db.insert(shiftAttendance)
        .values({
          staffId: input.staffId,
          year: input.year,
          month: input.month,
          workDate: input.workDate as any,
          shiftName: input.shiftName,
          present: input.present,
          notes: input.notes ?? null,
        })
        .onDuplicateKeyUpdate({
          set: { present: input.present, notes: input.notes ?? null },
        });
      return { success: true };
    }),

  togglePresent: managerProcedure
    .input(z.object({ id: z.number(), present: z.boolean() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error('DB unavailable');
      await db.update(shiftAttendance).set({ present: input.present }).where(eq(shiftAttendance.id, input.id));
      return { success: true };
    }),

  deleteShift: managerProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error('DB unavailable');
      await db.delete(shiftAttendance).where(eq(shiftAttendance.id, input.id));
      return { success: true };
    }),

  // ── Payroll ───────────────────────────────────────────────
  computePayroll: managerProcedure
    .input(z.object({ year: z.number(), month: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error('DB unavailable');
      const [staff, attendance] = await Promise.all([
        db.select().from(shiftStaff).where(eq(shiftStaff.active, true)),
        db.select().from(shiftAttendance).where(
          and(eq(shiftAttendance.year, input.year), eq(shiftAttendance.month, input.month))
        ),
      ]);

      return staff.map(s => {
        const rows = attendance.filter(a => a.staffId === s.id);
        const scheduled = rows.length;
        const attended = rows.filter(a => a.present).length;
        const absent = scheduled - attended;
        const rate = Number(s.ratePerShift);
        const totalPay = Math.round(attended * rate * 100) / 100;
        return { id: s.id, name: s.name, type: s.type, ratePerShift: rate, scheduled, attended, absent, totalPay };
      });
    }),
});
