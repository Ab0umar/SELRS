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
  getPrescriptionsWithItemsByPatient,
} from "../db";
import {
  patientPortalSessions,
  patientPortalBookings,
  bookingScheduleConfig,
  bookingClosures,
  patients,
  visits,
} from "../../drizzle/schema";
import { eq, and, desc, ne, sql, lte, gte, count, type SQL } from "drizzle-orm";
import jwt from "jsonwebtoken";
import { ENV } from "../_core/env";
import { sendFcmPushToRegisteredDevices } from "../_core/fcmPush";
import { sendWebPushToSubscription } from "../_core/webPush";
import { broadcastBookingUpdate } from "../_core/ws";

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

      const secret = ENV.JWT_SECRET || "dev-only-change-me";
      const token = jwt.sign(
        { type: "patient", patientId: patient.id, phone },
        secret,
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

    return { ...patient, visitCount: visitCount ?? 0 };
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
          FROM blackice_uploads
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
        viewUrl: `/api/blackice/uploads/${row.id}`,
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

      const [config] = await db
        .select()
        .from(bookingScheduleConfig)
        .where(eq(bookingScheduleConfig.bookingType, input.bookingType))
        .limit(1);

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
      // Only closures that apply to this booking type (null = all types)
      const closures = closureRows
        .filter(
          (r) => r.bookingType == null || r.bookingType === input.bookingType,
        )
        .map((r) => ({
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
        requestedDate: new Date(input.requestedDate),
        notes: input.notes ?? undefined,
        status: "pending",
      });

      broadcastBookingUpdate();

      const typeLabel =
        BOOKING_TYPE_LABELS[input.bookingType] ?? input.bookingType;
      sendFcmPushToRegisteredDevices({
        notificationId: `booking-new-${Date.now()}`,
        title: "طلب حجز جديد",
        body: `${typeLabel} — ${input.requestedDate}`,
        kind: "info",
        targetRoles: ["admin", "reception"],
        path: "/admin-hub/portal-bookings",
        entityType: "booking",
      }).catch(() => {});

      return { ok: true };
    }),

  createGuestBooking: publicProcedure
    .input(
      z.object({
        guestName: z.string().min(2).max(100),
        guestPhone: z.string().min(8).max(20),
        bookingType: z.enum([
          "consultant",
          "specialist",
          "lasik",
          "external",
          "followup",
        ]),
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
        bookingType: input.bookingType,
        requestedDate: new Date(input.requestedDate),
        notes: input.notes ?? undefined,
        status: "pending",
      });

      broadcastBookingUpdate();

      const typeLabel =
        BOOKING_TYPE_LABELS[input.bookingType] ?? input.bookingType;
      sendFcmPushToRegisteredDevices({
        notificationId: `booking-guest-${Date.now()}`,
        title: "طلب حجز جديد (زائر)",
        body: `${input.guestName} — ${typeLabel} — ${input.requestedDate}`,
        kind: "info",
        targetRoles: ["admin", "reception"],
        path: "/admin-hub/portal-bookings",
        entityType: "booking",
      }).catch(() => {});

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

    return rows.map((r) => ({
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

    return rows.map((r) => ({
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

      const conditions: ReturnType<typeof eq>[] = [];
      if (input.date)
        conditions.push(
          eq(patientPortalBookings.requestedDate, new Date(input.date)),
        );
      if (input.status)
        conditions.push(eq(patientPortalBookings.status, input.status));

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
        typeLabel:
          BOOKING_TYPE_LABELS[r.booking.bookingType] ?? r.booking.bookingType,
        patientName: r.patientName ?? r.booking.guestName ?? null,
        patientCode: r.patientCode ?? null,
        patientPhone: r.patientPhone ?? r.booking.guestPhone ?? null,
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
        requestedDate: new Date(input.requestedDate),
        confirmedDate: input.confirmedDate
          ? new Date(input.confirmedDate)
          : undefined,
        status: input.status,
        notes: input.notes ?? undefined,
        staffNotes: input.staffNotes ?? undefined,
      });

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

      await db
        .update(patientPortalBookings)
        .set({
          status: input.status,
          staffNotes: input.staffNotes ?? undefined,
          confirmedDate: input.confirmedDate
            ? new Date(input.confirmedDate)
            : undefined,
        })
        .where(eq(patientPortalBookings.id, input.id));

      // Notify patient if status changed to confirmed or cancelled
      if (input.status === "confirmed" || input.status === "cancelled") {
        const [booking] = await db
          .select({
            patientId: patientPortalBookings.patientId,
            bookingType: patientPortalBookings.bookingType,
          })
          .from(patientPortalBookings)
          .where(eq(patientPortalBookings.id, input.id))
          .limit(1);

        if (booking?.patientId) {
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

  getSchedule: protectedProcedure.query(async () => {
    const db = await getDb();
    if (!db)
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "DB unavailable",
      });

    const rows = await db.select().from(bookingScheduleConfig);
    const types = [
      "consultant",
      "specialist",
      "lasik",
      "external",
      "followup",
    ] as const;
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
