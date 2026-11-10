import {
  createHmac,
  createHash,
  randomInt,
  randomUUID,
  timingSafeEqual,
} from "node:crypto";
import { and, eq, inArray, isNull, sql } from "drizzle-orm";
import jwt from "jsonwebtoken";
import { TRPCError } from "@trpc/server";
import type { MySql2Database } from "drizzle-orm/mysql2";
import {
  patients,
  patientPortalOtps,
  patientPortalSessions,
} from "../../drizzle/schema";
import { getDb, consumeLoginRateLimit } from "../db";
import { ENV } from "../_core/env";
import {
  patientOtpConfigured,
  sendPatientLoginOtp,
} from "./patientOtpWhatsApp";
import { patientBirthDate } from "../../shared/patient-login";
import { z } from "zod";

const OTP_TTL_MS = 5 * 60_000;
const SESSION_TTL_MS = 30 * 24 * 60 * 60_000;
const MAX_ATTEMPTS = 5;
type PortalTransaction = Parameters<
  Parameters<MySql2Database["transaction"]>[0]
>[0];

async function createPatientSession(
  tx: PortalTransaction,
  patient: Pick<
    typeof patients.$inferSelect,
    "id" | "fullName" | "patientCode"
  >,
  phone: string,
) {
  const token = jwt.sign(
    { type: "patient", patientId: patient.id, phone },
    ENV.JWT_SECRET,
    { expiresIn: SESSION_TTL_MS / 1000, jwtid: randomUUID() },
  );
  await tx
    .insert(patientPortalSessions)
    .values({
      patientId: patient.id,
      token,
      expiresAt: new Date(Date.now() + SESSION_TTL_MS),
    });
  return {
    token,
    patient: { name: patient.fullName, patientCode: patient.patientCode },
  };
}

const phoneMatches = (phone: string) =>
  inArray(patients.phone, [phone, `2${phone}`, `+2${phone}`]);

function patientMatches(phone: string, dateOfBirth?: string) {
  return and(
    phoneMatches(phone),
    dateOfBirth
      ? sql`${patients.dateOfBirth} = ${dateOfBirth}`
      : isNull(patients.dateOfBirth),
  );
}

const selectionClaims = z.object({
  type: z.literal("patient-selection"),
  phone: z.string().regex(/^01\d{9}$/),
  challengeId: z.string().uuid(),
  dateOfBirth: patientBirthDate,
});

function selectionHash(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

function codeHash(
  challengeId: string,
  patientId: number,
  phone: string,
  code: string,
  dateOfBirth?: string,
): string {
  return createHmac("sha256", ENV.JWT_SECRET)
    .update(
      JSON.stringify([
        "patient-login",
        challengeId,
        patientId,
        phone,
        code,
        dateOfBirth ?? null,
      ]),
    )
    .digest("hex");
}

async function limit(key: string, maximum: number, windowMs = 15 * 60_000) {
  const attempts = await consumeLoginRateLimit(key, new Date(), windowMs);
  if (attempts === null)
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "تعذر التحقق الآن، حاول لاحقًا",
    });
  if (attempts > maximum)
    throw new TRPCError({
      code: "TOO_MANY_REQUESTS",
      message: "محاولات كثيرة، انتظر قليلًا قبل المحاولة مجددًا",
    });
}

export async function requestPatientLoginOtp(
  input: { phone: string; dateOfBirth?: string },
  clientIp: string,
) {
  const phone = input.phone;
  await limit(`patient-portal:${clientIp}:${phone}`, 5);
  const db: MySql2Database | null = await getDb();
  if (!db)
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "DB unavailable",
    });
  if (!patientOtpConfigured())
    throw new TRPCError({
      code: "SERVICE_UNAVAILABLE",
      message: "دخول المرضى بكود واتساب غير متاح حاليًا، تواصل مع الاستقبال",
    });
  await limit(`patient-otp:send:ip:${clientIp}`, 20);

  const challengeId = randomUUID();
  const code = String(randomInt(100000, 1000000));
  const expiresAt = new Date(Date.now() + OTP_TTL_MS);
  const patientId = await db.transaction(async (tx) => {
    const [patient] = await tx
      .select({ id: patients.id })
      .from(patients)
      .where(patientMatches(phone, input.dateOfBirth))
      .orderBy(patients.id)
      .limit(1)
      .for("update");
    if (!patient) return null;
    try {
      await limit(`patient-otp:send:phone:${phone}`, 3);
      await limit(`patient-otp:cooldown:${phone}`, 1, 60_000);
    } catch (error) {
      if (error instanceof TRPCError && error.code === "TOO_MANY_REQUESTS") return null;
      throw error;
    }
    await tx
      .update(patientPortalOtps)
      .set({ verified: true })
      .where(
        and(
          eq(patientPortalOtps.phone, phone),
          eq(patientPortalOtps.verified, false),
        ),
      );
    await tx.insert(patientPortalOtps).values({
      phone,
      patientId: patient.id,
      challengeId,
      code: codeHash(challengeId, patient.id, phone, code, input.dateOfBirth),
      expiresAt,
    });
    return patient.id;
  });
  if (patientId !== null) {
    try {
      await sendPatientLoginOtp(phone, code);
    } catch {
      await db
        .update(patientPortalOtps)
        .set({ verified: true })
        .where(eq(patientPortalOtps.challengeId, challengeId));
      console.warn("[patient-portal] OTP_DELIVERY_FAILED");
    }
  }
  return {
    challengeId,
    expiresInSeconds: OTP_TTL_MS / 1000,
    resendAfterSeconds: 60,
  };
}

export async function verifyPatientLoginOtp(
  input: { challengeId: string; code: string; dateOfBirth?: string },
  clientIp: string,
) {
  await limit(`patient-otp:verify:ip:${clientIp}`, 30);
  const db: MySql2Database | null = await getDb();
  if (!db)
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "DB unavailable",
    });
  const result = await db.transaction(async (tx) => {
    const [challenge] = await tx
      .select()
      .from(patientPortalOtps)
      .where(eq(patientPortalOtps.challengeId, input.challengeId))
      .limit(1)
      .for("update");
    if (
      !challenge ||
      !challenge.patientId ||
      challenge.verified ||
      challenge.expiresAt.getTime() <= Date.now() ||
      challenge.attempts >= MAX_ATTEMPTS
    )
      return null;
    await tx
      .update(patientPortalOtps)
      .set({ attempts: challenge.attempts + 1 })
      .where(eq(patientPortalOtps.id, challenge.id));
    const expected = Buffer.from(
      codeHash(
        input.challengeId,
        challenge.patientId,
        challenge.phone,
        input.code,
        input.dateOfBirth,
      ),
      "hex",
    );
    const stored = Buffer.from(challenge.code, "hex");
    if (stored.length !== expected.length || !timingSafeEqual(stored, expected))
      return null;
    const linkedPatients = await tx
      .select({
        id: patients.id,
        fullName: patients.fullName,
        patientCode: patients.patientCode,
        phone: patients.phone,
      })
      .from(patients)
      .where(patientMatches(challenge.phone, input.dateOfBirth))
      .orderBy(patients.id);
    if (!linkedPatients.length) return null;
    if (linkedPatients.length > 1) {
      const selectionToken = jwt.sign(
        {
          type: "patient-selection",
          phone: challenge.phone,
          dateOfBirth: input.dateOfBirth,
          challengeId: input.challengeId,
        },
        ENV.JWT_SECRET,
        { expiresIn: OTP_TTL_MS / 1000, jwtid: randomUUID() },
      );
      await tx
        .update(patientPortalOtps)
        .set({
          verified: true,
          code: selectionHash(selectionToken),
          expiresAt: new Date(Date.now() + OTP_TTL_MS),
        })
        .where(eq(patientPortalOtps.id, challenge.id));
      return {
        requiresPatientSelection: true as const,
        selectionToken,
        patients: linkedPatients.map((patient) => ({
          id: patient.id,
          name: patient.fullName,
        })),
      };
    }
    await tx
      .update(patientPortalOtps)
      .set({ verified: true })
      .where(eq(patientPortalOtps.id, challenge.id));
    return {
      requiresPatientSelection: false as const,
      ...(await createPatientSession(tx, linkedPatients[0], challenge.phone)),
    };
  });
  if (!result)
    throw new TRPCError({
      code: "UNAUTHORIZED",
      message: "كود التحقق غير صحيح أو انتهت صلاحيته",
    });
  return result;
}

export async function selectPatientLogin(
  input: { selectionToken: string; patientId: number },
  clientIp: string,
) {
  await limit(`patient-otp:select:ip:${clientIp}`, 30);
  let ticket: z.infer<typeof selectionClaims>;
  try {
    ticket = selectionClaims.parse(
      jwt.verify(input.selectionToken, ENV.JWT_SECRET),
    );
  } catch {
    throw new TRPCError({
      code: "UNAUTHORIZED",
      message: "انتهت صلاحية اختيار المريض، اطلب كود تحقق جديدًا",
    });
  }
  const db: MySql2Database | null = await getDb();
  if (!db)
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "DB unavailable",
    });
  const result = await db.transaction(async (tx) => {
    const [challenge] = await tx
      .select()
      .from(patientPortalOtps)
      .where(eq(patientPortalOtps.challengeId, ticket.challengeId))
      .limit(1)
      .for("update");
    if (
      !challenge ||
      !challenge.verified ||
      challenge.phone !== ticket.phone ||
      challenge.expiresAt.getTime() <= Date.now() ||
      challenge.code !== selectionHash(input.selectionToken)
    )
      return null;
    const [patient] = await tx
      .select({
        id: patients.id,
        fullName: patients.fullName,
        patientCode: patients.patientCode,
      })
      .from(patients)
      .where(
        and(
          eq(patients.id, input.patientId),
          patientMatches(challenge.phone, ticket.dateOfBirth),
        ),
      )
      .limit(1);
    if (!patient) return null;
    await tx
      .update(patientPortalOtps)
      .set({ expiresAt: new Date(), code: "" })
      .where(eq(patientPortalOtps.id, challenge.id));
    return createPatientSession(tx, patient, challenge.phone);
  });
  if (!result)
    throw new TRPCError({
      code: "UNAUTHORIZED",
      message: "تعذر اختيار هذا الملف، اطلب كود تحقق جديدًا",
    });
  return result;
}
