import { z } from "zod";
import { TRPCError } from "@trpc/server";
import {
  router,
  publicProcedure,
  doctorPortalProcedure,
} from "../_core/procedures";
import {
  getDb,
  getGlassesRecordsByPatient,
  getPrescriptionsWithItemsByPatient,
} from "../db";
import {
  externalDoctors,
  externalDoctorReferrals,
  externalDoctorAccessLogs,
  patients,
} from "../../drizzle/schema";
import { eq, and, desc, sql } from "drizzle-orm";
import jwt from "jsonwebtoken";
import bcryptjs from "bcryptjs";
import { ENV } from "../_core/env";

const DOCTOR_SESSION_TTL_S = 30 * 24 * 60 * 60; // 30 days

async function logAccess(
  doctorId: number,
  patientCode: string,
  action: string,
) {
  try {
    const db = await getDb();
    if (!db) return;
    await db
      .insert(externalDoctorAccessLogs)
      .values({ externalDoctorId: doctorId, patientCode, action } as any);
  } catch {
    // non-critical
  }
}

export const doctorPortalRouter = router({
  login: publicProcedure
    .input(
      z.object({
        username: z.string().min(1).max(100),
        password: z.string().min(1),
      }),
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db)
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "DB unavailable",
        });

      const [doctor] = await db
        .select()
        .from(externalDoctors)
        .where(eq(externalDoctors.username, input.username))
        .limit(1);

      if (!doctor || !doctor.isActive) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "Invalid credentials",
        });
      }

      const valid = await bcryptjs.compare(input.password, doctor.passwordHash);
      if (!valid) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "Invalid credentials",
        });
      }

      const secret = ENV.JWT_SECRET || "dev-only-change-me";
      const token = jwt.sign(
        {
          type: "externalDoctor",
          doctorId: doctor.id,
          username: doctor.username,
        },
        secret,
        { expiresIn: DOCTOR_SESSION_TTL_S },
      );

      await logAccess(doctor.id, "", "login");

      return {
        token,
        doctor: {
          id: doctor.id,
          fullName: doctor.fullName,
          username: doctor.username,
        },
      };
    }),

  getMyPatients: doctorPortalProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db)
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "DB unavailable",
      });

    const [doctor] = await db
      .select({ doctorCode: externalDoctors.doctorCode })
      .from(externalDoctors)
      .where(eq(externalDoctors.id, ctx.doctorSession.doctorId))
      .limit(1);

    const referrals = await db
      .select({
        id: externalDoctorReferrals.id,
        patientCode: externalDoctorReferrals.patientCode,
        createdAt: externalDoctorReferrals.createdAt,
      })
      .from(externalDoctorReferrals)
      .where(
        and(
          eq(
            externalDoctorReferrals.externalDoctorId,
            ctx.doctorSession.doctorId,
          ),
          eq(externalDoctorReferrals.isActive, true),
        ),
      )
      .orderBy(desc(externalDoctorReferrals.createdAt));

    const referralCodes = new Set(referrals.map((r: any) => r.patientCode));

    // Auto-mapped patients by doctorCode — only those with pentacam images
    let autoPatients: {
      patientCode: string;
      fullName: string | null;
      age: number | null;
      gender: "male" | "female" | null;
      lastVisit: Date | null;
      createdAt: Date;
    }[] = [];
    if (doctor?.doctorCode) {
      autoPatients = await db
        .select({
          patientCode: patients.patientCode,
          fullName: patients.fullName,
          age: patients.age,
          gender: patients.gender,
          lastVisit: patients.lastVisit,
          createdAt: patients.createdAt,
        })
        .from(patients)
        .where(
          and(
            eq(patients.doctorCode, doctor.doctorCode),
            sql`EXISTS (SELECT 1 FROM blackice_uploads WHERE patient_id = ${patients.id} LIMIT 1)`,
          ),
        )
        .orderBy(desc(patients.lastVisit));
    }

    const result: Array<{
      referralId: number | null;
      patientCode: string;
      fullName: string | null;
      age: number | null;
      gender: "male" | "female" | null;
      lastVisit: Date | null;
      assignedAt: Date | null;
      patientCreatedAt: Date | null;
      source: "referral" | "auto";
    }> = [];

    if (referrals.length > 0) {
      const codes = referrals.map((r: any) => r.patientCode);
      const patientRows = await db
        .select({
          patientCode: patients.patientCode,
          fullName: patients.fullName,
          age: patients.age,
          gender: patients.gender,
          lastVisit: patients.lastVisit,
          createdAt: patients.createdAt,
        })
        .from(patients)
        .where(
          and(
            sql`${patients.patientCode} IN ${codes}`,
            sql`EXISTS (SELECT 1 FROM blackice_uploads WHERE patient_id = ${patients.id} LIMIT 1)`,
          ),
        );

      const patientMap = new Map(patientRows.map((p: any) => [p.patientCode, p]));
      for (const r of referrals) {
        const p = patientMap.get(r.patientCode) as any;
        result.push({
          referralId: r.id,
          patientCode: r.patientCode,
          fullName: p?.fullName ?? null,
          age: p?.age ?? null,
          gender: p?.gender ?? null,
          lastVisit: p?.lastVisit ?? null,
          assignedAt: r.createdAt,
          patientCreatedAt: p?.createdAt ?? null,
          source: "referral",
        });
      }
    }

    for (const p of autoPatients) {
      if (!referralCodes.has(p.patientCode)) {
        result.push({
          referralId: null,
          patientCode: p.patientCode,
          fullName: p.fullName,
          age: p.age,
          gender: p.gender,
          lastVisit: p.lastVisit,
          assignedAt: null,
          patientCreatedAt: p.createdAt,
          source: "auto",
        });
      }
    }

    return result;
  }),

  getPatientImages: doctorPortalProcedure
    .input(z.object({ patientCode: z.string().min(1).max(50) }))
    .query(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db)
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "DB unavailable",
        });

      // Security: verify this patient is assigned to the logged-in doctor
      // via manual referral OR auto doctor-code mapping
      const [referral] = await db
        .select({ id: externalDoctorReferrals.id })
        .from(externalDoctorReferrals)
        .where(
          and(
            eq(
              externalDoctorReferrals.externalDoctorId,
              ctx.doctorSession.doctorId,
            ),
            eq(externalDoctorReferrals.patientCode, input.patientCode),
            eq(externalDoctorReferrals.isActive, true),
          ),
        )
        .limit(1);

      if (!referral) {
        // Check auto-mapping: doctor's doctorCode must match patient's doctorCode
        const [doctor] = await db
          .select({ doctorCode: externalDoctors.doctorCode })
          .from(externalDoctors)
          .where(eq(externalDoctors.id, ctx.doctorSession.doctorId))
          .limit(1);

        const [matched] = doctor?.doctorCode
          ? await db
              .select({ id: patients.id })
              .from(patients)
              .where(
                and(
                  eq(patients.patientCode, input.patientCode),
                  eq(patients.doctorCode, doctor.doctorCode),
                ),
              )
              .limit(1)
          : [];

        if (!matched) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "Patient not assigned to you",
          });
        }
      }

      // Look up patient DB id and profile details
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
        .where(eq(patients.patientCode, input.patientCode))
        .limit(1);

      if (!patient) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Patient not found",
        });
      }

      // Fetch images
      const rows = (await db.execute(
        sql`SELECT id, file_name, mime_type, created_at
            FROM blackice_uploads
            WHERE patient_id = ${patient.id}
            ORDER BY id DESC
            LIMIT 200`,
      )) as any;

      await logAccess(
        ctx.doctorSession.doctorId,
        input.patientCode,
        "view_images",
      );

      const raw: any[] = Array.isArray(rows)
        ? Array.isArray(rows[0])
          ? rows[0]
          : rows
        : [];
      const images = raw.map((row: any) => ({
        id: Number(row.id),
        fileName: String(row.file_name ?? ""),
        mimeType: String(row.mime_type ?? "application/octet-stream"),
        createdAt: row.created_at ? new Date(row.created_at).toISOString() : "",
        viewUrl: `/api/blackice/uploads/${row.id}`,
      }));

      // Fetch refractions and prescriptions
      const refractions = await getGlassesRecordsByPatient(patient.id);
      const prescriptions = await getPrescriptionsWithItemsByPatient(
        patient.id,
      );

      return {
        patientCode: input.patientCode,
        patientName: patient.fullName,
        patient,
        images,
        refractions,
        prescriptions,
      };
    }),
});
