import { z } from "zod";
import { TRPCError } from "@trpc/server";
import {
  router,
  protectedProcedure,
  adminProcedure,
} from "../_core/procedures";
import { getDb } from "../db";
import {
  externalDoctors,
  externalDoctorReferrals,
  externalDoctorAccessLogs,
  patients,
  doctorsLookup,
} from "../../drizzle/schema";
import { eq, and, desc, sql } from "drizzle-orm";
import bcryptjs from "bcryptjs";

export const externalDoctorsRouter = router({
  // ── Doctors CRUD (admin only) ─────────────────────────────────────────────

  listDoctors: adminProcedure.query(async () => {
    const db = await getDb();
    if (!db)
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "DB unavailable",
      });
    return db
      .select({
        id: externalDoctors.id,
        username: externalDoctors.username,
        fullName: externalDoctors.fullName,
        email: externalDoctors.email,
        phone: externalDoctors.phone,
        doctorCode: externalDoctors.doctorCode,
        isActive: externalDoctors.isActive,
        createdAt: externalDoctors.createdAt,
      })
      .from(externalDoctors)
      .orderBy(desc(externalDoctors.createdAt));
  }),

  createDoctor: adminProcedure
    .input(
      z.object({
        username: z.string().min(3).max(100),
        password: z.string().min(6),
        fullName: z.string().min(1).max(255),
        email: z.string().email().optional().or(z.literal("")),
        phone: z.string().max(20).optional(),
        doctorCode: z.string().max(64).optional().or(z.literal("")),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db)
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "DB unavailable",
        });

      const existing = await db
        .select({ id: externalDoctors.id })
        .from(externalDoctors)
        .where(eq(externalDoctors.username, input.username))
        .limit(1);
      if (existing.length > 0) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "Username already exists",
        });
      }

      const passwordHash = await bcryptjs.hash(input.password, 10);
      const [res] = await db.insert(externalDoctors).values({
        username: input.username,
        passwordHash,
        fullName: input.fullName,
        email: input.email || null,
        phone: input.phone || null,
        doctorCode: input.doctorCode || null,
      } as any);
      return { id: (res as any).insertId as number };
    }),

  updateDoctor: adminProcedure
    .input(
      z.object({
        id: z.number().int().positive(),
        fullName: z.string().min(1).max(255).optional(),
        email: z.string().email().optional().or(z.literal("")),
        phone: z.string().max(20).optional(),
        doctorCode: z.string().max(64).nullable().optional(),
        isActive: z.boolean().optional(),
      }),
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db)
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "DB unavailable",
        });
      const { id, ...fields } = input;
      const update: Record<string, any> = {};
      if (fields.fullName !== undefined) update.fullName = fields.fullName;
      if (fields.email !== undefined) update.email = fields.email || null;
      if (fields.phone !== undefined) update.phone = fields.phone || null;
      if (fields.doctorCode !== undefined)
        update.doctorCode = fields.doctorCode || null;
      if (fields.isActive !== undefined) update.isActive = fields.isActive;
      if (Object.keys(update).length === 0) return { success: true };
      await db
        .update(externalDoctors)
        .set(update)
        .where(eq(externalDoctors.id, id));
      return { success: true };
    }),

  resetPassword: adminProcedure
    .input(
      z.object({
        id: z.number().int().positive(),
        newPassword: z.string().min(6),
      }),
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db)
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "DB unavailable",
        });
      const passwordHash = await bcryptjs.hash(input.newPassword, 10);
      await db
        .update(externalDoctors)
        .set({ passwordHash } as any)
        .where(eq(externalDoctors.id, input.id));
      return { success: true };
    }),

  // ── Referrals (admin only) ────────────────────────────────────────────────

  listReferrals: adminProcedure
    .input(
      z
        .object({
          doctorId: z.number().int().positive().optional(),
          activeOnly: z.boolean().optional(),
        })
        .optional(),
    )
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db)
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "DB unavailable",
        });

      const rows = await db
        .select({
          id: externalDoctorReferrals.id,
          externalDoctorId: externalDoctorReferrals.externalDoctorId,
          doctorName: externalDoctors.fullName,
          doctorUsername: externalDoctors.username,
          patientCode: externalDoctorReferrals.patientCode,
          isActive: externalDoctorReferrals.isActive,
          createdAt: externalDoctorReferrals.createdAt,
        })
        .from(externalDoctorReferrals)
        .leftJoin(
          externalDoctors,
          eq(externalDoctorReferrals.externalDoctorId, externalDoctors.id),
        )
        .where(
          input?.doctorId
            ? and(
                eq(externalDoctorReferrals.externalDoctorId, input.doctorId),
                input?.activeOnly
                  ? eq(externalDoctorReferrals.isActive, true)
                  : undefined,
              )
            : input?.activeOnly
              ? eq(externalDoctorReferrals.isActive, true)
              : undefined,
        )
        .orderBy(desc(externalDoctorReferrals.createdAt));

      // Enrich with patient name
      const codes = [...new Set(rows.map((r) => r.patientCode))];
      const patientMap = new Map<string, string>();
      if (codes.length > 0) {
        const patientRows = await db
          .select({
            patientCode: patients.patientCode,
            fullName: patients.fullName,
          })
          .from(patients)
          .where(sql`${patients.patientCode} IN ${codes}`);
        for (const p of patientRows) patientMap.set(p.patientCode, p.fullName);
      }

      return rows.map((r) => ({
        ...r,
        patientName: patientMap.get(r.patientCode) ?? null,
      }));
    }),

  createReferral: adminProcedure
    .input(
      z.object({
        externalDoctorId: z.number().int().positive(),
        patientCode: z.string().min(1).max(50),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db)
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "DB unavailable",
        });

      // Verify doctor exists
      const [doctor] = await db
        .select({ id: externalDoctors.id })
        .from(externalDoctors)
        .where(eq(externalDoctors.id, input.externalDoctorId))
        .limit(1);
      if (!doctor)
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "External doctor not found",
        });

      // Verify patient exists
      const [patient] = await db
        .select({ id: patients.id })
        .from(patients)
        .where(eq(patients.patientCode, input.patientCode))
        .limit(1);
      if (!patient)
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Patient not found",
        });

      // Check for existing active referral
      const [existing] = await db
        .select({ id: externalDoctorReferrals.id })
        .from(externalDoctorReferrals)
        .where(
          and(
            eq(
              externalDoctorReferrals.externalDoctorId,
              input.externalDoctorId,
            ),
            eq(externalDoctorReferrals.patientCode, input.patientCode),
            eq(externalDoctorReferrals.isActive, true),
          ),
        )
        .limit(1);
      if (existing)
        throw new TRPCError({
          code: "CONFLICT",
          message: "Referral already exists",
        });

      await db.insert(externalDoctorReferrals).values({
        externalDoctorId: input.externalDoctorId,
        patientCode: input.patientCode,
        createdBy: ctx.user.id,
      } as any);

      return { success: true };
    }),

  toggleReferral: adminProcedure
    .input(
      z.object({
        id: z.number().int().positive(),
        isActive: z.boolean(),
      }),
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db)
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "DB unavailable",
        });
      await db
        .update(externalDoctorReferrals)
        .set({ isActive: input.isActive })
        .where(eq(externalDoctorReferrals.id, input.id));
      return { success: true };
    }),

  deleteReferral: adminProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db)
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "DB unavailable",
        });
      await db
        .delete(externalDoctorReferrals)
        .where(eq(externalDoctorReferrals.id, input.id));
      return { success: true };
    }),

  // ── Internal doctors lookup (for doctor code mapping) ────────────────────

  listInternalDoctors: adminProcedure.query(async () => {
    const db = await getDb();
    if (!db)
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "DB unavailable",
      });
    return db
      .select({
        id: doctorsLookup.id,
        code: doctorsLookup.code,
        name: doctorsLookup.name,
      })
      .from(doctorsLookup)
      .where(eq(doctorsLookup.isActive, 1))
      .orderBy(doctorsLookup.name);
  }),

  // ── Access logs (admin) ───────────────────────────────────────────────────

  listAccessLogs: adminProcedure
    .input(
      z
        .object({
          doctorId: z.number().int().positive().optional(),
          limit: z.number().int().min(1).max(500).default(100),
        })
        .optional(),
    )
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db)
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "DB unavailable",
        });
      return db
        .select({
          id: externalDoctorAccessLogs.id,
          externalDoctorId: externalDoctorAccessLogs.externalDoctorId,
          doctorName: externalDoctors.fullName,
          patientCode: externalDoctorAccessLogs.patientCode,
          action: externalDoctorAccessLogs.action,
          createdAt: externalDoctorAccessLogs.createdAt,
        })
        .from(externalDoctorAccessLogs)
        .leftJoin(
          externalDoctors,
          eq(externalDoctorAccessLogs.externalDoctorId, externalDoctors.id),
        )
        .where(
          input?.doctorId
            ? eq(externalDoctorAccessLogs.externalDoctorId, input.doctorId)
            : undefined,
        )
        .orderBy(desc(externalDoctorAccessLogs.createdAt))
        .limit(input?.limit ?? 100);
    }),
});
