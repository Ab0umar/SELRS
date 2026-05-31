import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { router, publicProcedure, protectedProcedure, adminProcedure, patientPortalProcedure } from "../_core/procedures";
import { getDb } from "../db";
import {
  patientPortalSessions,
  patientPortalBookings,
  bookingScheduleConfig,
  patients,
} from "../../drizzle/schema";
import { eq, and, desc, sql } from "drizzle-orm";
import jwt from "jsonwebtoken";
import { ENV } from "../_core/env";

const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

function normalizePhone(raw: string): string {
  let p = raw.replace(/\s+/g, "").replace(/[^\d+]/g, "");
  if (p.startsWith("+20")) p = "0" + p.slice(3);
  else if (p.startsWith("20") && p.length === 12) p = "0" + p.slice(2);
  return p;
}

const BOOKING_TYPE_LABELS: Record<string, string> = {
  consultant: "كشف استشاري",
  specialist: "كشف أخصائي",
  lasik: "فحوصات الليزك",
  external: "أشعة خارجي",
};

// weekdayMask: bit 0=Sun,1=Mon,2=Tue,3=Wed,4=Thu,5=Fri,6=Sat
function getAvailableDatesForMask(mask: number, from: Date, count: number): string[] {
  const dates: string[] = [];
  const cursor = new Date(from);
  cursor.setHours(0, 0, 0, 0);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  if (cursor < today) cursor.setTime(today.getTime());

  for (let tries = 0; tries < 365 && dates.length < count; tries++) {
    const dow = cursor.getDay(); // 0=Sun ... 6=Sat
    if ((mask >> dow) & 1) {
      dates.push(cursor.toISOString().slice(0, 10));
    }
    cursor.setDate(cursor.getDate() + 1);
  }
  return dates;
}

export const patientPortalRouter = router({
  // ── Public ────────────────────────────────────────────────────────────────

  login: publicProcedure
    .input(z.object({
      phone: z.string().min(8).max(20),
      dateOfBirth: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "تاريخ الميلاد غير صحيح"),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });

      const phone = normalizePhone(input.phone);

      const [patient] = await db
        .select({ id: patients.id, fullName: patients.fullName, patientCode: patients.patientCode, dateOfBirth: patients.dateOfBirth })
        .from(patients)
        .where(eq(patients.phone, phone))
        .limit(1);

      if (!patient || !patient.dateOfBirth) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "البيانات غير مسجلة — تواصل مع الاستقبال",
        });
      }

      const storedDob = String(patient.dateOfBirth).slice(0, 10);
      if (storedDob !== input.dateOfBirth) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "البيانات غير صحيحة — تواصل مع الاستقبال",
        });
      }

      const secret = ENV.JWT_SECRET || "dev-only-change-me";
      const token = jwt.sign(
        { type: "patient", patientId: patient.id, phone },
        secret,
        { expiresIn: Math.floor(SESSION_TTL_MS / 1000) },
      );

      const expiresAt = new Date(Date.now() + SESSION_TTL_MS);
      await db.insert(patientPortalSessions).values({ patientId: patient.id, token, expiresAt });

      return { token, patient: { name: patient.fullName, patientCode: patient.patientCode } };
    }),

  // ── Patient-authenticated ─────────────────────────────────────────────────

  getMyProfile: patientPortalProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });

    const [patient] = await db
      .select({
        id: patients.id,
        fullName: patients.fullName,
        patientCode: patients.patientCode,
        phone: patients.phone,
        dateOfBirth: patients.dateOfBirth,
        age: patients.age,
        gender: patients.gender,
        address: patients.address,
        medicalHistory: patients.medicalHistory,
        allergies: patients.allergies,
        serviceType: patients.serviceType,
        lastVisit: patients.lastVisit,
        status: patients.status,
      })
      .from(patients)
      .where(eq(patients.id, ctx.patientSession.patientId))
      .limit(1);

    if (!patient) throw new TRPCError({ code: "NOT_FOUND", message: "لم يتم العثور على الملف" });
    return patient;
  }),

  getMyScans: patientPortalProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });

    const rows = await db.execute(
      sql`SELECT id, file_name, mime_type, created_at
          FROM blackice_uploads
          WHERE patient_id = ${ctx.patientSession.patientId}
          ORDER BY id DESC
          LIMIT 100`,
    ) as any;

    const list: Array<{ id: number; fileName: string; mimeType: string; createdAt: string; viewUrl: string }> = [];
    const raw: any[] = Array.isArray(rows) ? (Array.isArray(rows[0]) ? rows[0] : rows) : [];
    for (const row of raw) {
      list.push({
        id: Number(row.id),
        fileName: String(row.file_name ?? ""),
        mimeType: String(row.mime_type ?? "application/octet-stream"),
        createdAt: row.created_at ? new Date(row.created_at).toISOString() : "",
        viewUrl: `/api/blackice/uploads/${row.id}`,
      });
    }
    return list;
  }),

  getAvailableDates: patientPortalProcedure
    .input(
      z.object({
        bookingType: z.enum(["consultant", "specialist", "lasik", "external"]),
        fromDate: z.string().optional(),
      }),
    )
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });

      const [config] = await db
        .select()
        .from(bookingScheduleConfig)
        .where(eq(bookingScheduleConfig.bookingType, input.bookingType))
        .limit(1);

      const mask = config?.weekdayMask ?? 127;
      const isActive = config?.isActive ?? true;

      if (!isActive) return { dates: [], label: BOOKING_TYPE_LABELS[input.bookingType] };

      const from = input.fromDate ? new Date(input.fromDate) : new Date();
      const dates = getAvailableDatesForMask(mask, from, 14);
      return { dates, label: BOOKING_TYPE_LABELS[input.bookingType] };
    }),

  createBooking: patientPortalProcedure
    .input(
      z.object({
        bookingType: z.enum(["consultant", "specialist", "lasik", "external"]),
        requestedDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
        notes: z.string().max(500).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });

      await db.insert(patientPortalBookings).values({
        patientId: ctx.patientSession.patientId,
        bookingType: input.bookingType,
        requestedDate: input.requestedDate,
        notes: input.notes ?? null,
        status: "pending",
      });

      return { ok: true };
    }),

  getMyBookings: patientPortalProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });

    const rows = await db
      .select()
      .from(patientPortalBookings)
      .where(eq(patientPortalBookings.patientId, ctx.patientSession.patientId))
      .orderBy(desc(patientPortalBookings.createdAt))
      .limit(50);

    return rows.map((r) => ({ ...r, typeLabel: BOOKING_TYPE_LABELS[r.bookingType] ?? r.bookingType }));
  }),

  // ── Staff / Admin ─────────────────────────────────────────────────────────

  listBookings: protectedProcedure
    .input(
      z.object({
        date: z.string().optional(),
        status: z.enum(["pending", "confirmed", "cancelled", "completed"]).optional(),
        limit: z.number().int().min(1).max(200).default(100),
      }),
    )
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });

      const conditions = [];
      if (input.date) conditions.push(eq(patientPortalBookings.requestedDate, input.date));
      if (input.status) conditions.push(eq(patientPortalBookings.status, input.status));

      const rows = await db
        .select({
          booking: patientPortalBookings,
          patientName: patients.fullName,
          patientCode: patients.patientCode,
          patientPhone: patients.phone,
        })
        .from(patientPortalBookings)
        .leftJoin(patients, eq(patientPortalBookings.patientId, patients.id))
        .where(conditions.length > 0 ? and(...conditions) : undefined)
        .orderBy(desc(patientPortalBookings.createdAt))
        .limit(input.limit);

      return rows.map((r) => ({
        ...r.booking,
        typeLabel: BOOKING_TYPE_LABELS[r.booking.bookingType] ?? r.booking.bookingType,
        patientName: r.patientName,
        patientCode: r.patientCode,
        patientPhone: r.patientPhone,
      }));
    }),

  updateBooking: protectedProcedure
    .input(
      z.object({
        id: z.number().int(),
        status: z.enum(["pending", "confirmed", "cancelled", "completed"]),
        staffNotes: z.string().max(1000).optional(),
        confirmedDate: z.string().optional(),
      }),
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });

      await db
        .update(patientPortalBookings)
        .set({
          status: input.status,
          staffNotes: input.staffNotes ?? null,
          confirmedDate: input.confirmedDate ?? null,
        })
        .where(eq(patientPortalBookings.id, input.id));

      return { ok: true };
    }),

  getSchedule: protectedProcedure.query(async () => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });

    const rows = await db.select().from(bookingScheduleConfig);
    const types = ["consultant", "specialist", "lasik", "external"] as const;
    return types.map((t) => {
      const found = rows.find((r) => r.bookingType === t);
      return {
        bookingType: t,
        label: BOOKING_TYPE_LABELS[t],
        weekdayMask: found?.weekdayMask ?? 127,
        isActive: found?.isActive ?? true,
        id: found?.id ?? null,
      };
    });
  }),

  updateSchedule: adminProcedure
    .input(
      z.object({
        bookingType: z.enum(["consultant", "specialist", "lasik", "external"]),
        weekdayMask: z.number().int().min(0).max(127),
        isActive: z.boolean(),
      }),
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });

      const [existing] = await db
        .select({ id: bookingScheduleConfig.id })
        .from(bookingScheduleConfig)
        .where(eq(bookingScheduleConfig.bookingType, input.bookingType))
        .limit(1);

      if (existing) {
        await db
          .update(bookingScheduleConfig)
          .set({ weekdayMask: input.weekdayMask, isActive: input.isActive })
          .where(eq(bookingScheduleConfig.id, existing.id));
      } else {
        await db.insert(bookingScheduleConfig).values({
          bookingType: input.bookingType,
          weekdayMask: input.weekdayMask,
          isActive: input.isActive,
        });
      }

      return { ok: true };
    }),
});
