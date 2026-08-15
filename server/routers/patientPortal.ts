import { z } from "zod";
import { TRPCError } from "@trpc/server";
import {
  router,
  publicProcedure,
  protectedProcedure,
  adminProcedure,
  patientPortalProcedure,
} from "../_core/procedures";
import {
  getDb,
  getGlassesRecordsByPatient,
  getMedicalHistoryByPatient,
  getPrescriptionsWithItemsByPatient,
} from "../db";
import {
  patientPortalSessions,
  patientPortalBookings,
  bookingScheduleConfig,
  bookingClosures,
  patients,
  visits,
  visitScheduleRequests,
} from "../../drizzle/schema";
import { eq, and, desc, ne, sql, lte, gte, count, type SQL } from "drizzle-orm";
import jwt from "jsonwebtoken";
import { ENV } from "../_core/env";
import {
  pushAppNotification,
  getAppNotificationSettings,
  DEFAULT_APP_NOTIFICATION_SETTINGS,
} from "../_core/appNotifications";
import { sendWebPushToSubscription } from "../_core/webPush";
import { broadcastBookingUpdate } from "../_core/ws";
import { sendBookingStatusEmail } from "../services/bookingEmail.service";
import { sendBookingStatusWhatsApp } from "../services/bookingWhatsApp.service";

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
  followup: "متابعة",
};

// weekdayMask: bit 0=Sun,1=Mon,2=Tue,3=Wed,4=Thu,5=Fri,6=Sat
function getAvailableDatesForMask(
  mask: number,
  from: Date,
  count: number,
  closures: Array<{ startDate: string; endDate: string }> = [],
): string[] {
  const dates: string[] = [];
  const cursor = new Date(from);
  cursor.setHours(0, 0, 0, 0);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  if (cursor < today) cursor.setTime(today.getTime());

  for (let tries = 0; tries < 365 && dates.length < count; tries++) {
    const dow = cursor.getDay();
    if ((mask >> dow) & 1) {
      const y = cursor.getFullYear();
      const m = String(cursor.getMonth() + 1).padStart(2, "0");
      const d = String(cursor.getDate()).padStart(2, "0");
      const dateStr = `${y}-${m}-${d}`;
      const inClosure = closures.some(
        (c) => dateStr >= c.startDate && dateStr <= c.endDate,
      );
      if (!inClosure) dates.push(dateStr);
    }
    cursor.setDate(cursor.getDate() + 1);
  }
  return dates;
}

export const patientPortalRouter = router({
  // ── Public ────────────────────────────────────────────────────────────────

  login: publicProcedure
    .input(
      z.object({
        phone: z.string().min(8).max(20),
        patientCode: z.string().min(1).max(30),
      }),
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db)
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "DB unavailable",
        });

      const phone = normalizePhone(input.phone);

      const [patient] = await db
        .select({
          id: patients.id,
          fullName: patients.fullName,
          patientCode: patients.patientCode,
        })
        .from(patients)
        .where(eq(patients.phone, phone))
        .limit(1);

      if (!patient) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "البيانات غير مسجلة — تواصل مع الاستقبال",
        });
      }

      const storedCode = String(patient.patientCode ?? "")
        .trim()
        .toLowerCase();
      const inputCode = input.patientCode.trim().toLowerCase();
      if (!storedCode || storedCode !== inputCode) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "البيانات غير صحيحة — تواصل مع الاستقبال",
        });
      }

      const token = jwt.sign(
        { type: "patient", patientId: patient.id, phone },
        ENV.JWT_SECRET,
        { expiresIn: Math.floor(SESSION_TTL_MS / 1000) },
      );

      const expiresAt = new Date(Date.now() + SESSION_TTL_MS);
      await db
        .insert(patientPortalSessions)
        .values({ patientId: patient.id, token, expiresAt });

      return {
        token,
        patient: { name: patient.fullName, patientCode: patient.patientCode },
      };
    }),

  // ── Patient-authenticated ─────────────────────────────────────────────────

  getMyProfile: patientPortalProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db)
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "DB unavailable",
      });

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

    if (!patient)
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "لم يتم العثور على الملف",
      });

    const [{ visitCount }] = await db
      .select({ visitCount: count() })
      .from(visits)
      .where(eq(visits.patientId, ctx.patientSession.patientId));

    const medicalHistoryChecklist = await getMedicalHistoryByPatient(
      ctx.patientSession.patientId,
    );

    return {
      ...patient,
      visitCount: visitCount ?? 0,
      medicalHistoryChecklist: medicalHistoryChecklist[0] ?? null,
    };
  }),

  getMyScans: patientPortalProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db)
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "DB unavailable",
      });

    const rows = (await db.execute(
      sql`SELECT id, file_name, mime_type, created_at
          FROM srv100_uploads
          WHERE patient_id = ${ctx.patientSession.patientId}
          ORDER BY id DESC
          LIMIT 100`,
    )) as any;

    const list: Array<{
      id: number;
      fileName: string;
      mimeType: string;
      createdAt: string;
      viewUrl: string;
    }> = [];
    const raw: any[] = Array.isArray(rows)
      ? Array.isArray(rows[0])
        ? rows[0]
        : rows
      : [];
    for (const row of raw) {
      list.push({
        id: Number(row.id),
        fileName: String(row.file_name ?? ""),
        mimeType: String(row.mime_type ?? "application/octet-stream"),
        createdAt: row.created_at ? new Date(row.created_at).toISOString() : "",
        viewUrl: `/api/srv100/uploads/${row.id}`,
      });
    }
    return list;
  }),

  getMyRefractions: patientPortalProcedure.query(async ({ ctx }) => {
    return await getGlassesRecordsByPatient(ctx.patientSession.patientId);
  }),

  getMyPrescriptions: patientPortalProcedure.query(async ({ ctx }) => {
    return await getPrescriptionsWithItemsByPatient(
      ctx.patientSession.patientId,
    );
  }),

  getAvailableDates: publicProcedure
    .input(
      z.object({
        bookingType: z.enum([
          "consultant",
          "specialist",
          "lasik",
          "external",
          "followup",
        ]),
        branch: z.enum(["tanta", "kfs"]).optional(),
        fromDate: z.string().optional(),
      }),
    )
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db)
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "DB unavailable",
        });

      // Try branch-specific config first, fallback to default (branch='')
      let config: typeof bookingScheduleConfig.$inferSelect | undefined;
      if (input.branch) {
        [config] = await db
          .select()
          .from(bookingScheduleConfig)
          .where(
            and(
              eq(bookingScheduleConfig.bookingType, input.bookingType),
              eq(bookingScheduleConfig.branch, input.branch),
            ),
          )
          .limit(1);
      }
      if (!config) {
        [config] = await db
          .select()
          .from(bookingScheduleConfig)
          .where(
            and(
              eq(bookingScheduleConfig.bookingType, input.bookingType),
              eq(bookingScheduleConfig.branch, ""),
            ),
          )
          .limit(1);
      }

      const mask = config?.weekdayMask ?? 127;
      const isActive = config?.isActive ?? true;

      if (!isActive)
        return { dates: [], label: BOOKING_TYPE_LABELS[input.bookingType] };

      const from = input.fromDate ? new Date(input.fromDate) : new Date();

      // Fetch active closures that overlap the potential date range (next ~6 months)
      const rangeEnd = new Date(from);
      rangeEnd.setMonth(rangeEnd.getMonth() + 6);
      const closureRows = await db
        .select({
          startDate: bookingClosures.startDate,
          endDate: bookingClosures.endDate,
          bookingType: bookingClosures.bookingType,
        })
        .from(bookingClosures)
        .where(
          and(
            lte(bookingClosures.startDate, rangeEnd),
            gte(bookingClosures.endDate, from),
          ),
        );
      // Only closures that apply to this booking type AND branch (null = all)
      const closures = closureRows
        .filter(
          (r: any) =>
            (r.bookingType == null || r.bookingType === input.bookingType) &&
            (r.branch == null || r.branch === "" || r.branch === input.branch),
        )
        .map((r: any) => ({
          startDate:
            typeof r.startDate === "string"
              ? r.startDate
              : (r.startDate as Date).toISOString().slice(0, 10),
          endDate:
            typeof r.endDate === "string"
              ? r.endDate
              : (r.endDate as Date).toISOString().slice(0, 10),
        }));

      const dates = getAvailableDatesForMask(mask, from, 14, closures);
      return { dates, label: BOOKING_TYPE_LABELS[input.bookingType] };
    }),

  createBooking: patientPortalProcedure
    .input(
      z.object({
        bookingType: z.enum([
          "consultant",
          "specialist",
          "lasik",
          "external",
          "followup",
        ]),
        branch: z.enum(["tanta", "kfs"]).optional(),
        requestedDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
        notes: z.string().max(500).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db)
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "DB unavailable",
        });

      await db.insert(patientPortalBookings).values({
        patientId: ctx.patientSession.patientId,
        bookingType: input.bookingType,
        branch: input.branch ?? null,
        requestedDate: new Date(input.requestedDate),
        notes: input.notes ?? undefined,
        status: "pending",
      });

      broadcastBookingUpdate();

      const typeLabel =
        BOOKING_TYPE_LABELS[input.bookingType] ?? input.bookingType;
      getAppNotificationSettings()
        .catch(() => DEFAULT_APP_NOTIFICATION_SETTINGS)
        .then((ns) => {
          if (!ns.bookings.enabled) return;
          const targetUserIds =
            ns.bookings.userIds.length > 0 ? ns.bookings.userIds : null;
          pushAppNotification({
            title: "طلب حجز جديد",
            message: `${typeLabel} — ${input.requestedDate}`,
            kind: "info",
            targetRoles: targetUserIds ? null : ["admin", "reception"],
            targetUserIds,
            source: "booking",
            entityType: "booking",
            channels: {
              inApp: ns.bookings.inApp,
              push: ns.bookings.push,
              local: ns.bookings.local,
            },
          }).catch(() => {});
        });

      return { ok: true };
    }),

  createGuestBooking: publicProcedure
    .input(
      z.object({
        guestName: z.string().min(2).max(100),
        guestPhone: z.string().min(8).max(20),
        guestEmail: z.string().trim().email().max(320).optional(),
        bookingType: z.enum([
          "consultant",
          "specialist",
          "lasik",
          "external",
          "followup",
        ]),
        branch: z.enum(["tanta", "kfs"]).optional(),
        requestedDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
        notes: z.string().max(500).optional(),
      }),
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db)
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "DB unavailable",
        });

      await db.insert(patientPortalBookings).values({
        guestName: input.guestName,
        guestPhone: normalizePhone(input.guestPhone),
        guestEmail: input.guestEmail || undefined,
        bookingType: input.bookingType,
        branch: input.branch ?? null,
        requestedDate: new Date(input.requestedDate),
        notes: input.notes ?? undefined,
        status: "pending",
      });

      broadcastBookingUpdate();

      const typeLabel2 =
        BOOKING_TYPE_LABELS[input.bookingType] ?? input.bookingType;
      getAppNotificationSettings()
        .catch(() => DEFAULT_APP_NOTIFICATION_SETTINGS)
        .then((ns) => {
          if (!ns.bookings.enabled) return;
          const targetUserIds =
            ns.bookings.userIds.length > 0 ? ns.bookings.userIds : null;
          pushAppNotification({
            title: "طلب حجز جديد (زائر)",
            message: `${input.guestName} — ${typeLabel2} — ${input.requestedDate}`,
            kind: "info",
            targetRoles: targetUserIds ? null : ["admin", "reception"],
            targetUserIds,
            source: "booking",
            entityType: "booking",
            channels: {
              inApp: ns.bookings.inApp,
              push: ns.bookings.push,
              local: ns.bookings.local,
            },
          }).catch(() => {});
        });

      return { ok: true };
    }),

  getMyBookings: patientPortalProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db)
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "DB unavailable",
      });

    const rows = await db
      .select()
      .from(patientPortalBookings)
      .where(eq(patientPortalBookings.patientId, ctx.patientSession.patientId))
      .orderBy(desc(patientPortalBookings.createdAt))
      .limit(50);

    return rows.map((r: any) => ({
      ...r,
      typeLabel: BOOKING_TYPE_LABELS[r.bookingType] ?? r.bookingType,
    }));
  }),

  getNotifications: patientPortalProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db)
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "DB unavailable",
      });

    const rows = await db
      .select()
      .from(patientPortalBookings)
      .where(
        and(
          eq(patientPortalBookings.patientId, ctx.patientSession.patientId),
          ne(patientPortalBookings.status, "pending"),
        ),
      )
      .orderBy(desc(patientPortalBookings.createdAt))
      .limit(20);

    return rows.map((r: any) => ({
      id: r.id,
      bookingType: r.bookingType,
      typeLabel: BOOKING_TYPE_LABELS[r.bookingType] ?? r.bookingType,
      status: r.status,
      confirmedDate: r.confirmedDate,
      staffNotes: r.staffNotes,
      requestedDate: r.requestedDate,
      createdAt: r.createdAt,
    }));
  }),

  // ── Staff / Admin ─────────────────────────────────────────────────────────

  listBookings: protectedProcedure
    .input(
      z.object({
        date: z.string().optional(),
        status: z
          .enum(["pending", "confirmed", "cancelled", "completed"])
          .optional(),
        branch: z.enum(["tanta", "kfs"]).optional(),
        limit: z.number().int().min(1).max(200).default(100),
      }),
    )
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db)
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "DB unavailable",
        });

      const conditions: SQL[] = [];
      if (input.date) {
        const dayStart = new Date(`${input.date}T00:00:00`);
        const dayEnd = new Date(`${input.date}T23:59:59.999`);
        conditions.push(
          gte(patientPortalBookings.requestedDate, dayStart),
          lte(patientPortalBookings.requestedDate, dayEnd),
        );
      }
      if (input.status)
        conditions.push(eq(patientPortalBookings.status, input.status));
      if (input.branch)
        conditions.push(eq(patientPortalBookings.branch, input.branch));

      const rows = await db
        .select({
          booking: patientPortalBookings,
          patientName: patients.fullName,
          patientCode: patients.patientCode,
          patientPhone: patients.phone,
          patientEmail: patients.email,
        })
        .from(patientPortalBookings)
        .leftJoin(patients, eq(patientPortalBookings.patientId, patients.id))
        .where(conditions.length > 0 ? and(...conditions) : undefined)
        .orderBy(desc(patientPortalBookings.createdAt))
        .limit(input.limit);

      return rows.map((r: any) => ({
        ...r.booking,
        typeLabel:
          BOOKING_TYPE_LABELS[r.booking.bookingType] ?? r.booking.bookingType,
        patientName: r.patientName ?? r.booking.guestName ?? null,
        patientCode: r.patientCode ?? null,
        patientPhone: r.patientPhone ?? r.booking.guestPhone ?? null,
        patientEmail: r.patientEmail ?? r.booking.guestEmail ?? null,
        isGuest: r.booking.patientId === null,
      }));
    }),

  createStaffBooking: protectedProcedure
    .input(
      z.object({
        patientId: z.number().int(),
        bookingType: z.enum([
          "consultant",
          "specialist",
          "lasik",
          "external",
          "followup",
        ]),
        branch: z.enum(["tanta", "kfs"]).optional(),
        requestedDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
        confirmedDate: z
          .string()
          .regex(/^\d{4}-\d{2}-\d{2}$/)
          .optional(),
        status: z
          .enum(["pending", "confirmed", "cancelled", "completed"])
          .default("confirmed"),
        notes: z.string().max(500).optional(),
        staffNotes: z.string().max(1000).optional(),
      }),
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db)
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "DB unavailable",
        });

      await db.insert(patientPortalBookings).values({
        patientId: input.patientId,
        bookingType: input.bookingType,
        branch: input.branch ?? null,
        requestedDate: new Date(input.requestedDate),
        confirmedDate: input.confirmedDate
          ? new Date(input.confirmedDate)
          : undefined,
        status: input.status,
        notes: input.notes ?? undefined,
        staffNotes: input.staffNotes ?? undefined,
      });

      const [staffPat] = await db
        .select({
          fullName: patients.fullName,
          phone: patients.phone,
          email: patients.email,
          serviceType: patients.serviceType,
        })
        .from(patients)
        .where(eq(patients.id, input.patientId))
        .limit(1);
      await db.insert(visitScheduleRequests).values({
        fullName: staffPat?.fullName ?? "مريض",
        phone: staffPat?.phone ?? null,
        visitDate: input.requestedDate as any,
        service: input.bookingType,
        patientType: "existing",
        branch: input.branch ?? null,
      } as any);

      if (input.status === "confirmed") {
        void sendBookingStatusEmail({
          recipientEmail: staffPat?.email,
          patientName: staffPat?.fullName,
          bookingTypeLabel:
            BOOKING_TYPE_LABELS[input.bookingType] ?? input.bookingType,
          bookingDate: input.confirmedDate ?? input.requestedDate,
          branch: input.branch,
          status: "confirmed",
        }).catch((error) =>
          console.error(
            "[booking-email] Failed to send staff booking confirmation",
            error,
          ),
        );
        void sendBookingStatusWhatsApp({
          recipientPhone: staffPat?.phone,
          patientName: staffPat?.fullName,
          bookingTypeLabel:
            BOOKING_TYPE_LABELS[input.bookingType] ?? input.bookingType,
          bookingDate: input.confirmedDate ?? input.requestedDate,
          branch: input.branch,
          status: "confirmed",
          bookingType: input.bookingType,
          patientServiceType: staffPat?.serviceType,
        }).catch((error) =>
          console.error(
            "[booking-whatsapp] Failed to send staff booking confirmation",
            error,
          ),
        );
      }

      broadcastBookingUpdate();

      return { ok: true };
    }),

  createStaffGuestBooking: protectedProcedure
    .input(
      z.object({
        guestName: z.string().min(1).max(255),
        guestPhone: z.string().max(32).optional(),
        guestEmail: z.string().trim().email().max(320).optional(),
        bookingType: z.enum([
          "consultant",
          "specialist",
          "lasik",
          "external",
          "followup",
        ]),
        branch: z.enum(["tanta", "kfs"]).optional(),
        requestedDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
        notes: z.string().max(500).optional(),
      }),
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db)
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "DB unavailable",
        });

      await db.insert(patientPortalBookings).values({
        guestName: input.guestName,
        guestPhone: input.guestPhone ?? undefined,
        guestEmail: input.guestEmail || undefined,
        bookingType: input.bookingType,
        branch: input.branch ?? null,
        requestedDate: new Date(input.requestedDate),
        status: "confirmed",
        notes: input.notes ?? undefined,
      });

      await db.insert(visitScheduleRequests).values({
        fullName: input.guestName,
        phone: input.guestPhone ?? null,
        visitDate: input.requestedDate as any,
        service: input.bookingType,
        patientType: "guest",
        branch: input.branch ?? null,
      } as any);

      void sendBookingStatusEmail({
        recipientEmail: input.guestEmail,
        patientName: input.guestName,
        bookingTypeLabel:
          BOOKING_TYPE_LABELS[input.bookingType] ?? input.bookingType,
        bookingDate: input.requestedDate,
        branch: input.branch,
        status: "confirmed",
      }).catch((error) =>
        console.error(
          "[booking-email] Failed to send guest booking confirmation",
          error,
        ),
      );
      void sendBookingStatusWhatsApp({
        recipientPhone: input.guestPhone,
        patientName: input.guestName,
        bookingTypeLabel:
          BOOKING_TYPE_LABELS[input.bookingType] ?? input.bookingType,
        bookingDate: input.requestedDate,
        branch: input.branch,
        status: "confirmed",
        bookingType: input.bookingType,
      }).catch((error) =>
        console.error(
          "[booking-whatsapp] Failed to send guest booking confirmation",
          error,
        ),
      );

      broadcastBookingUpdate();
      return { ok: true };
    }),

  deleteBooking: protectedProcedure
    .input(z.object({ id: z.number().int() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db)
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "DB unavailable",
        });
      await db
        .delete(patientPortalBookings)
        .where(eq(patientPortalBookings.id, input.id));
      broadcastBookingUpdate();

      return { ok: true };
    }),

  registerPatientPushToken: patientPortalProcedure
    .input(z.object({ subscription: z.string().min(10) }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db)
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "DB unavailable",
        });
      await db
        .update(patientPortalSessions)
        .set({ pushSubscription: input.subscription })
        .where(eq(patientPortalSessions.token, ctx.patientSession.token));
      return { ok: true };
    }),

  updateBooking: protectedProcedure
    .input(
      z.object({
        id: z.number().int(),
        status: z.enum(["pending", "confirmed", "cancelled", "completed"]),
        patientId: z.number().int().positive().optional(),
        staffNotes: z.string().max(1000).optional(),
        confirmedDate: z.string().optional(),
      }),
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db)
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "DB unavailable",
        });

      const [booking] = await db
        .select({
          status: patientPortalBookings.status,
          patientId: patientPortalBookings.patientId,
          bookingType: patientPortalBookings.bookingType,
          requestedDate: patientPortalBookings.requestedDate,
          confirmedDate: patientPortalBookings.confirmedDate,
          branch: patientPortalBookings.branch,
          guestName: patientPortalBookings.guestName,
          guestPhone: patientPortalBookings.guestPhone,
          guestEmail: patientPortalBookings.guestEmail,
          patientName: patients.fullName,
          patientPhone: patients.phone,
          patientEmail: patients.email,
          patientServiceType: patients.serviceType,
        })
        .from(patientPortalBookings)
        .leftJoin(patients, eq(patientPortalBookings.patientId, patients.id))
        .where(eq(patientPortalBookings.id, input.id))
        .limit(1);
      if (!booking) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Booking not found",
        });
      }

      await db
        .update(patientPortalBookings)
        .set({
          status: input.status,
          patientId: input.patientId ?? undefined,
          staffNotes: input.staffNotes ?? undefined,
          confirmedDate: input.confirmedDate
            ? new Date(input.confirmedDate)
            : undefined,
        })
        .where(eq(patientPortalBookings.id, input.id));

      const statusChanged = booking.status !== input.status;
      if (
        statusChanged &&
        (input.status === "confirmed" || input.status === "cancelled")
      ) {
        void sendBookingStatusEmail({
          recipientEmail: booking.patientEmail ?? booking.guestEmail,
          patientName: booking.patientName ?? booking.guestName,
          bookingTypeLabel:
            BOOKING_TYPE_LABELS[booking.bookingType] ?? booking.bookingType,
          bookingDate:
            input.confirmedDate ??
            booking.confirmedDate ??
            booking.requestedDate,
          branch: booking.branch,
          status: input.status,
        }).catch((error) =>
          console.error(
            "[booking-email] Failed to send booking status update",
            error,
          ),
        );
        void sendBookingStatusWhatsApp({
          recipientPhone: booking.patientPhone ?? booking.guestPhone,
          patientName: booking.patientName ?? booking.guestName,
          bookingTypeLabel:
            BOOKING_TYPE_LABELS[booking.bookingType] ?? booking.bookingType,
          bookingDate:
            input.confirmedDate ??
            booking.confirmedDate ??
            booking.requestedDate,
          branch: booking.branch,
          status: input.status,
          bookingType: booking.bookingType,
          patientServiceType: booking.patientServiceType,
        }).catch((error) =>
          console.error(
            "[booking-whatsapp] Failed to send booking status update",
            error,
          ),
        );

        if (booking.patientId) {
          const sessions = await db
            .select({
              pushSubscription: patientPortalSessions.pushSubscription,
            })
            .from(patientPortalSessions)
            .where(eq(patientPortalSessions.patientId, booking.patientId));

          const statusLabel =
            input.status === "confirmed"
              ? "تم تأكيد موعدك"
              : "تم رفض طلب الحجز";
          const typeLabel =
            BOOKING_TYPE_LABELS[booking.bookingType] ?? booking.bookingType;

          for (const session of sessions) {
            if (session.pushSubscription) {
              sendWebPushToSubscription(session.pushSubscription, {
                notificationId: `booking-${input.id}-${input.status}`,
                title: statusLabel,
                body: typeLabel,
                kind: input.status === "confirmed" ? "success" : "warning",
                path: "/my/bookings",
              })
                .then((result) => {
                  if (result === "expired") {
                    db.update(patientPortalSessions)
                      .set({ pushSubscription: null })
                      .where(
                        eq(
                          patientPortalSessions.pushSubscription,
                          session.pushSubscription!,
                        ),
                      )
                      .catch(() => {});
                  }
                })
                .catch(() => {});
            }
          }
        }
      }

      broadcastBookingUpdate();

      return { ok: true };
    }),

  getSchedule: protectedProcedure
    .input(z.object({ branch: z.string().optional() }).optional())
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db)
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "DB unavailable",
        });

      const branchFilter = input?.branch ?? "";
      const rows = await db
        .select()
        .from(bookingScheduleConfig)
        .where(eq(bookingScheduleConfig.branch, branchFilter));
      const types = [
        "consultant",
        "specialist",
        "lasik",
        "external",
        "followup",
      ] as const;
      return types.map((t) => {
        const found = rows.find((r: any) => r.bookingType === t);
        return {
          bookingType: t,
          label: BOOKING_TYPE_LABELS[t],
          weekdayMask: found?.weekdayMask ?? 127,
          isActive: found?.isActive ?? true,
          id: found?.id ?? null,
          branch: branchFilter,
        };
      });
    }),

  // ── Closure periods ───────────────────────────────────────────────────────

  listClosures: protectedProcedure.query(async () => {
    const db = await getDb();
    if (!db)
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "DB unavailable",
      });
    return db.select().from(bookingClosures).orderBy(bookingClosures.startDate);
  }),

  addClosure: protectedProcedure
    .input(
      z.object({
        label: z.string().min(1).max(255),
        startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
        endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
        bookingType: z
          .enum(["consultant", "specialist", "lasik", "external", "followup"])
          .nullable()
          .optional(),
      }),
    )
    .mutation(async ({ input }) => {
      if (input.endDate < input.startDate) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "تاريخ النهاية يجب أن يكون بعد تاريخ البداية",
        });
      }
      const db = await getDb();
      if (!db)
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "DB unavailable",
        });
      await db.insert(bookingClosures).values({
        label: input.label,
        startDate: input.startDate,
        endDate: input.endDate,
        bookingType: input.bookingType ?? null,
      } as any);
      return { ok: true };
    }),

  deleteClosure: protectedProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db)
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "DB unavailable",
        });
      await db.delete(bookingClosures).where(eq(bookingClosures.id, input.id));
      return { ok: true };
    }),

  updateSchedule: protectedProcedure
    .input(
      z.object({
        bookingType: z.enum([
          "consultant",
          "specialist",
          "lasik",
          "external",
          "followup",
        ]),
        branch: z.string().optional(),
        weekdayMask: z.number().int().min(0).max(127),
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

      const branchVal = input.branch ?? "";
      const [existing] = await db
        .select({ id: bookingScheduleConfig.id })
        .from(bookingScheduleConfig)
        .where(
          and(
            eq(bookingScheduleConfig.bookingType, input.bookingType),
            eq(bookingScheduleConfig.branch, branchVal),
          ),
        )
        .limit(1);

      if (existing) {
        await db
          .update(bookingScheduleConfig)
          .set({ weekdayMask: input.weekdayMask, isActive: input.isActive })
          .where(eq(bookingScheduleConfig.id, existing.id));
      } else {
        await db.insert(bookingScheduleConfig).values({
          bookingType: input.bookingType,
          branch: branchVal,
          weekdayMask: input.weekdayMask,
          isActive: input.isActive,
        });
      }

      return { ok: true };
    }),
});
