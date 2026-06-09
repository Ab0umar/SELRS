import { TRPCError } from "@trpc/server";
import {
  and,
  asc,
  desc,
  eq,
  like,
  or,
  sql,
} from "drizzle-orm";
import {
  kfPatients,
  kfVisits,
  kfExaminations,
  kfOperations,
  kfFollowups,
  patients,
} from "../../drizzle/schema";
import {
  router,
  kfProcedure,
} from "../_core/procedures";
import { getDb } from "../db";
import {
  kfBridgeLookupSelrsPatientInputSchema,
  kfCreateExaminationInputSchema,
  kfCreateFollowupInputSchema,
  kfCreateOperationInputSchema,
  kfCreatePatientInputSchema,
  kfCreateVisitInputSchema,
  kfGetExaminationInputSchema,
  kfGetPatientInputSchema,
  kfListExaminationsInputSchema,
  kfListFollowupsInputSchema,
  kfListOperationsInputSchema,
  kfListPatientsInputSchema,
  kfListPatientsResultSchema,
  kfListVisitsInputSchema,
  kfSearchPatientsInputSchema,
  kfUpdateExaminationInputSchema,
  kfUpdateFollowupInputSchema,
  kfUpdateOperationInputSchema,
  kfUpdatePatientInputSchema,
  kfUpdateVisitInputSchema,
} from "../../shared/kf/contracts";

function error(message: string, code: TRPCError["code"] = "INTERNAL_SERVER_ERROR") {
  return new TRPCError({ code, message });
}

async function requireDb() {
  const db = await getDb();
  if (!db) throw error("DB unavailable");
  return db;
}

function insertIdOf(result: unknown) {
  const anyResult = result as any;
  const raw =
    anyResult?.insertId ??
    anyResult?.[0]?.insertId ??
    anyResult?.id ??
    anyResult?.[0]?.id;
  const id = Number(raw);
  if (!Number.isFinite(id) || id <= 0) {
    throw error("Could not read insert id");
  }
  return id;
}

function toMysqlDate(value: string | Date | null | undefined) {
  if (value === null || value === undefined || value === "") return null;
  if (value instanceof Date) return value;
  return new Date(`${value}T00:00:00`);
}

async function ensurePatientExists(db: Awaited<ReturnType<typeof getDb>>, kfPatientId: number) {
  const [row] = await db!
    .select({ kfId: kfPatients.kfId })
    .from(kfPatients)
    .where(eq(kfPatients.kfId, kfPatientId))
    .limit(1);
  if (!row) throw error("KF patient not found", "NOT_FOUND");
  return row;
}

async function ensureVisitExists(db: Awaited<ReturnType<typeof getDb>>, kfVisitId: number) {
  const [row] = await db!
    .select({ kfVisitId: kfVisits.kfVisitId })
    .from(kfVisits)
    .where(eq(kfVisits.kfVisitId, kfVisitId))
    .limit(1);
  if (!row) throw error("KF visit not found", "NOT_FOUND");
  return row;
}

async function ensureExaminationExists(db: Awaited<ReturnType<typeof getDb>>, kfExamId: number) {
  const [row] = await db!
    .select({ kfExamId: kfExaminations.kfExamId })
    .from(kfExaminations)
    .where(eq(kfExaminations.kfExamId, kfExamId))
    .limit(1);
  if (!row) throw error("KF examination not found", "NOT_FOUND");
  return row;
}

async function ensureOperationExists(db: Awaited<ReturnType<typeof getDb>>, kfOpId: number) {
  const [row] = await db!
    .select({ kfOpId: kfOperations.kfOpId })
    .from(kfOperations)
    .where(eq(kfOperations.kfOpId, kfOpId))
    .limit(1);
  if (!row) throw error("KF operation not found", "NOT_FOUND");
  return row;
}

async function ensureFollowupExists(db: Awaited<ReturnType<typeof getDb>>, kfFollowupId: number) {
  const [row] = await db!
    .select({ kfFollowupId: kfFollowups.kfFollowupId })
    .from(kfFollowups)
    .where(eq(kfFollowups.kfFollowupId, kfFollowupId))
    .limit(1);
  if (!row) throw error("KF follow-up not found", "NOT_FOUND");
  return row;
}

function buildPatientSearchWhere(search: string) {
  const term = String(search ?? "").trim();
  if (!term) return undefined;
  const pattern = `%${term}%`;
  return or(
    like(kfPatients.kfCode, pattern),
    like(kfPatients.fullName, pattern),
    like(kfPatients.phone, pattern),
    like(kfPatients.nationalId, pattern),
    like(kfPatients.selrsPatientCode, pattern),
  );
}

function setDefined<T extends Record<string, unknown>>(target: T, key: keyof T, value: unknown) {
  if (value !== undefined) {
    target[key] = value as T[keyof T];
  }
}

export const kfRouter = router({
  listPatients: kfProcedure
    .input(kfListPatientsInputSchema)
    .query(async ({ input }) => {
      const db = await requireDb();
      const where = buildPatientSearchWhere(input.search);
      const countQuery = where
        ? db.select({ total: sql<number>`cast(count(*) as signed)`.mapWith(Number) }).from(kfPatients).where(where)
        : db.select({ total: sql<number>`cast(count(*) as signed)`.mapWith(Number) }).from(kfPatients);
      const [countRow] = await countQuery;
      const baseQuery = db.select().from(kfPatients);
      const filteredQuery = where ? baseQuery.where(where) : baseQuery;
      const patients = await filteredQuery
        .orderBy(desc(kfPatients.createdAt), desc(kfPatients.kfId))
        .limit(input.pageSize)
        .offset((input.page - 1) * input.pageSize);
      return kfListPatientsResultSchema.parse({
        patients,
        total: Number(countRow?.total ?? 0),
      });
    }),

  getPatient: kfProcedure
    .input(kfGetPatientInputSchema)
    .query(async ({ input }) => {
      const db = await requireDb();
      const [row] = await db
        .select()
        .from(kfPatients)
        .where(eq(kfPatients.kfId, input.kfId))
        .limit(1);
      if (!row) throw error("KF patient not found", "NOT_FOUND");
      return row;
    }),

  searchPatients: kfProcedure
    .input(kfSearchPatientsInputSchema)
    .query(async ({ input }) => {
      const db = await requireDb();
      const where = buildPatientSearchWhere(input.term);
      const query = where
        ? db.select().from(kfPatients).where(where)
        : db.select().from(kfPatients);
      return query
        .orderBy(desc(kfPatients.createdAt), desc(kfPatients.kfId))
        .limit(50);
    }),

  listVisits: kfProcedure
    .input(kfListVisitsInputSchema)
    .query(async ({ input }) => {
      const db = await requireDb();
      await ensurePatientExists(db, input.kfPatientId);
      return db
        .select()
        .from(kfVisits)
        .where(eq(kfVisits.kfPatientId, input.kfPatientId))
        .orderBy(desc(kfVisits.visitDate), desc(kfVisits.kfVisitId));
    }),

  listExaminations: kfProcedure
    .input(kfListExaminationsInputSchema)
    .query(async ({ input }) => {
      const db = await requireDb();
      await ensurePatientExists(db, input.kfPatientId);
      return db
        .select()
        .from(kfExaminations)
        .where(eq(kfExaminations.kfPatientId, input.kfPatientId))
        .orderBy(desc(kfExaminations.examDate), desc(kfExaminations.kfExamId));
    }),

  getExamination: kfProcedure
    .input(kfGetExaminationInputSchema)
    .query(async ({ input }) => {
      const db = await requireDb();
      const [row] = await db
        .select()
        .from(kfExaminations)
        .where(eq(kfExaminations.kfExamId, input.kfExamId))
        .limit(1);
      if (!row) throw error("KF examination not found", "NOT_FOUND");
      return row;
    }),

  listOperations: kfProcedure
    .input(kfListOperationsInputSchema)
    .query(async ({ input }) => {
      const db = await requireDb();
      const whereParts = [];
      if (input.kfPatientId) whereParts.push(eq(kfOperations.kfPatientId, input.kfPatientId));
      if (input.date) whereParts.push(eq(kfOperations.opDate, toMysqlDate(input.date) as Date));
      if (input.status) whereParts.push(eq(kfOperations.status, input.status));
      const where = whereParts.length ? and(...whereParts) : undefined;
      const base = db
        .select({
          kfOpId: kfOperations.kfOpId,
          kfPatientId: kfOperations.kfPatientId,
          patientName: kfPatients.fullName,
          kfVisitId: kfOperations.kfVisitId,
          opDate: kfOperations.opDate,
          opType: kfOperations.opType,
          eye: kfOperations.eye,
          doctorName: kfOperations.doctorName,
          status: kfOperations.status,
          notes: kfOperations.notes,
          createdByUserId: kfOperations.createdByUserId,
          createdAt: kfOperations.createdAt,
          updatedAt: kfOperations.updatedAt,
        })
        .from(kfOperations)
        .leftJoin(kfPatients, eq(kfOperations.kfPatientId, kfPatients.kfId));
      const query = where ? base.where(where) : base;
      return query.orderBy(desc(kfOperations.opDate), desc(kfOperations.kfOpId));
    }),

  listFollowups: kfProcedure
    .input(kfListFollowupsInputSchema)
    .query(async ({ input }) => {
      const db = await requireDb();
      const whereParts = [];
      if (input.kfPatientId) whereParts.push(eq(kfFollowups.kfPatientId, input.kfPatientId));
      if (input.date) whereParts.push(eq(kfFollowups.followupDate, toMysqlDate(input.date) as Date));
      if (input.status) whereParts.push(eq(kfFollowups.status, input.status));
      const where = whereParts.length ? and(...whereParts) : undefined;
      const base = db
        .select({
          kfFollowupId: kfFollowups.kfFollowupId,
          kfPatientId: kfFollowups.kfPatientId,
          patientName: kfPatients.fullName,
          kfVisitId: kfFollowups.kfVisitId,
          kfOpId: kfFollowups.kfOpId,
          followupDate: kfFollowups.followupDate,
          notes: kfFollowups.notes,
          status: kfFollowups.status,
          createdByUserId: kfFollowups.createdByUserId,
          createdAt: kfFollowups.createdAt,
          updatedAt: kfFollowups.updatedAt,
        })
        .from(kfFollowups)
        .leftJoin(kfPatients, eq(kfFollowups.kfPatientId, kfPatients.kfId));
      const query = where ? base.where(where) : base;
      return query.orderBy(desc(kfFollowups.followupDate), desc(kfFollowups.kfFollowupId));
    }),

  bridgeLookupSelrsPatient: kfProcedure
    .input(kfBridgeLookupSelrsPatientInputSchema)
    .query(async ({ input }) => {
      const db = await requireDb();
      const code = input.code.trim();
      if (!code) return null;
      const [row] = await db
        .select({
          patientCode: patients.patientCode,
          fullName: patients.fullName,
        })
        .from(patients)
        .where(eq(patients.patientCode, code))
        .limit(1);
      return row ?? null;
    }),

  createPatient: kfProcedure
    .input(kfCreatePatientInputSchema)
    .mutation(async ({ input, ctx }) => {
      const db = await requireDb();
      const now = new Date();
      const result = await db.transaction(async (tx) => {
        const tempCode = `TMP${Date.now().toString(36)}${Math.random()
          .toString(36)
          .slice(2, 6)}`.slice(0, 20);
        const inserted = await tx.insert(kfPatients).values({
          kfCode: tempCode,
          fullName: input.fullName,
          dateOfBirth: toMysqlDate(input.dateOfBirth),
          age: input.age ?? null,
          gender: input.gender ?? null,
          nationalId: input.nationalId ?? null,
          phone: input.phone ?? null,
          alternatePhone: input.alternatePhone ?? null,
          address: input.address ?? null,
          occupation: input.occupation ?? null,
          medicalHistory: input.medicalHistory ?? null,
          allergies: input.allergies ?? null,
          notes: input.notes ?? null,
          selrsPatientCode: input.selrsPatientCode ?? null,
          createdByUserId: ctx.user?.id ?? null,
          createdAt: now,
          updatedAt: now,
        });
        const kfId = insertIdOf(inserted);
        const kfCode = `KF-${String(kfId).padStart(4, "0")}`;
        await tx
          .update(kfPatients)
          .set({ kfCode, updatedAt: now })
          .where(eq(kfPatients.kfId, kfId));
        return { kfId, kfCode };
      });
      return result;
    }),

  updatePatient: kfProcedure
    .input(kfUpdatePatientInputSchema)
    .mutation(async ({ input }) => {
      const db = await requireDb();
      const patch: Record<string, unknown> = { updatedAt: new Date() };
      setDefined(patch, "fullName", input.fullName);
      if (input.dateOfBirth !== undefined) {
        patch.dateOfBirth = toMysqlDate(input.dateOfBirth);
      }
      setDefined(patch, "age", input.age);
      setDefined(patch, "gender", input.gender);
      setDefined(patch, "nationalId", input.nationalId);
      setDefined(patch, "phone", input.phone);
      setDefined(patch, "alternatePhone", input.alternatePhone);
      setDefined(patch, "address", input.address);
      setDefined(patch, "occupation", input.occupation);
      setDefined(patch, "medicalHistory", input.medicalHistory);
      setDefined(patch, "allergies", input.allergies);
      setDefined(patch, "notes", input.notes);
      setDefined(patch, "selrsPatientCode", input.selrsPatientCode);
      const result = await db
        .update(kfPatients)
        .set(patch)
        .where(eq(kfPatients.kfId, input.kfId));
      const rows = (result as any)?.affectedRows ?? 0;
      if (rows === 0) throw error("KF patient not found", "NOT_FOUND");
      return { ok: true };
    }),

  createVisit: kfProcedure
    .input(kfCreateVisitInputSchema)
    .mutation(async ({ input, ctx }) => {
      const db = await requireDb();
      await ensurePatientExists(db, input.kfPatientId);
      const result = await db.insert(kfVisits).values({
        kfPatientId: input.kfPatientId,
        visitDate: toMysqlDate(input.visitDate) as Date,
        visitType: input.visitType ?? "consultation",
        doctorName: input.doctorName ?? null,
        status: input.status ?? "scheduled",
        notes: input.notes ?? null,
        createdByUserId: ctx.user?.id ?? null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      return { kfVisitId: insertIdOf(result) };
    }),

  updateVisit: kfProcedure
    .input(kfUpdateVisitInputSchema)
    .mutation(async ({ input }) => {
      const db = await requireDb();
      await ensureVisitExists(db, input.kfVisitId);
      if (input.kfPatientId) await ensurePatientExists(db, input.kfPatientId);
      const patch: Record<string, unknown> = { updatedAt: new Date() };
      setDefined(patch, "kfPatientId", input.kfPatientId);
      if (input.visitDate !== undefined) {
        patch.visitDate = toMysqlDate(input.visitDate);
      }
      setDefined(patch, "visitType", input.visitType);
      setDefined(patch, "doctorName", input.doctorName);
      setDefined(patch, "status", input.status);
      setDefined(patch, "notes", input.notes);
      await db.update(kfVisits).set(patch).where(eq(kfVisits.kfVisitId, input.kfVisitId));
      return { ok: true };
    }),

  createExamination: kfProcedure
    .input(kfCreateExaminationInputSchema)
    .mutation(async ({ input, ctx }) => {
      const db = await requireDb();
      await ensurePatientExists(db, input.kfPatientId);
      if (input.kfVisitId) await ensureVisitExists(db, input.kfVisitId);
      const result = await db.insert(kfExaminations).values({
        kfPatientId: input.kfPatientId,
        kfVisitId: input.kfVisitId ?? null,
        examDate: toMysqlDate(input.examDate) as Date,
        rightVa: input.rightVa ?? null,
        leftVa: input.leftVa ?? null,
        rightRefraction: input.rightRefraction ?? null,
        leftRefraction: input.leftRefraction ?? null,
        iopRight: input.iopRight ?? null,
        iopLeft: input.iopLeft ?? null,
        diagnosis: input.diagnosis ?? null,
        plan: input.plan ?? null,
        notes: input.notes ?? null,
        doctorName: input.doctorName ?? null,
        examinedByUserId: ctx.user?.id ?? null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      return { kfExamId: insertIdOf(result) };
    }),

  updateExamination: kfProcedure
    .input(kfUpdateExaminationInputSchema)
    .mutation(async ({ input }) => {
      const db = await requireDb();
      await ensureExaminationExists(db, input.kfExamId);
      if (input.kfPatientId) await ensurePatientExists(db, input.kfPatientId);
      if (input.kfVisitId) await ensureVisitExists(db, input.kfVisitId);
      const patch: Record<string, unknown> = { updatedAt: new Date() };
      setDefined(patch, "kfPatientId", input.kfPatientId);
      setDefined(patch, "kfVisitId", input.kfVisitId);
      if (input.examDate !== undefined) {
        patch.examDate = toMysqlDate(input.examDate);
      }
      setDefined(patch, "rightVa", input.rightVa);
      setDefined(patch, "leftVa", input.leftVa);
      setDefined(patch, "rightRefraction", input.rightRefraction);
      setDefined(patch, "leftRefraction", input.leftRefraction);
      setDefined(patch, "iopRight", input.iopRight);
      setDefined(patch, "iopLeft", input.iopLeft);
      setDefined(patch, "diagnosis", input.diagnosis);
      setDefined(patch, "plan", input.plan);
      setDefined(patch, "notes", input.notes);
      setDefined(patch, "doctorName", input.doctorName);
      await db
        .update(kfExaminations)
        .set(patch)
        .where(eq(kfExaminations.kfExamId, input.kfExamId));
      return { ok: true };
    }),

  createOperation: kfProcedure
    .input(kfCreateOperationInputSchema)
    .mutation(async ({ input, ctx }) => {
      const db = await requireDb();
      await ensurePatientExists(db, input.kfPatientId);
      if (input.kfVisitId) await ensureVisitExists(db, input.kfVisitId);
      const result = await db.insert(kfOperations).values({
        kfPatientId: input.kfPatientId,
        kfVisitId: input.kfVisitId ?? null,
        opDate: toMysqlDate(input.opDate) as Date,
        opType: input.opType,
        eye: input.eye ?? null,
        doctorName: input.doctorName ?? null,
        status: input.status ?? "scheduled",
        notes: input.notes ?? null,
        createdByUserId: ctx.user?.id ?? null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      return { kfOpId: insertIdOf(result) };
    }),

  updateOperation: kfProcedure
    .input(kfUpdateOperationInputSchema)
    .mutation(async ({ input }) => {
      const db = await requireDb();
      await ensureOperationExists(db, input.kfOpId);
      if (input.kfPatientId) await ensurePatientExists(db, input.kfPatientId);
      if (input.kfVisitId) await ensureVisitExists(db, input.kfVisitId);
      const patch: Record<string, unknown> = { updatedAt: new Date() };
      setDefined(patch, "kfPatientId", input.kfPatientId);
      setDefined(patch, "kfVisitId", input.kfVisitId);
      if (input.opDate !== undefined) {
        patch.opDate = toMysqlDate(input.opDate);
      }
      setDefined(patch, "opType", input.opType);
      setDefined(patch, "eye", input.eye);
      setDefined(patch, "doctorName", input.doctorName);
      setDefined(patch, "status", input.status);
      setDefined(patch, "notes", input.notes);
      await db
        .update(kfOperations)
        .set(patch)
        .where(eq(kfOperations.kfOpId, input.kfOpId));
      return { ok: true };
    }),

  createFollowup: kfProcedure
    .input(kfCreateFollowupInputSchema)
    .mutation(async ({ input, ctx }) => {
      const db = await requireDb();
      await ensurePatientExists(db, input.kfPatientId);
      if (input.kfVisitId) await ensureVisitExists(db, input.kfVisitId);
      if (input.kfOpId) await ensureOperationExists(db, input.kfOpId);
      const result = await db.insert(kfFollowups).values({
        kfPatientId: input.kfPatientId,
        kfVisitId: input.kfVisitId ?? null,
        kfOpId: input.kfOpId ?? null,
        followupDate: toMysqlDate(input.followupDate) as Date,
        notes: input.notes ?? null,
        status: input.status ?? "scheduled",
        createdByUserId: ctx.user?.id ?? null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      return { kfFollowupId: insertIdOf(result) };
    }),

  updateFollowup: kfProcedure
    .input(kfUpdateFollowupInputSchema)
    .mutation(async ({ input }) => {
      const db = await requireDb();
      await ensureFollowupExists(db, input.kfFollowupId);
      if (input.kfPatientId) await ensurePatientExists(db, input.kfPatientId);
      if (input.kfVisitId) await ensureVisitExists(db, input.kfVisitId);
      if (input.kfOpId) await ensureOperationExists(db, input.kfOpId);
      const patch: Record<string, unknown> = { updatedAt: new Date() };
      setDefined(patch, "kfPatientId", input.kfPatientId);
      setDefined(patch, "kfVisitId", input.kfVisitId);
      setDefined(patch, "kfOpId", input.kfOpId);
      if (input.followupDate !== undefined) {
        patch.followupDate = toMysqlDate(input.followupDate);
      }
      setDefined(patch, "notes", input.notes);
      setDefined(patch, "status", input.status);
      await db
        .update(kfFollowups)
        .set(patch)
        .where(eq(kfFollowups.kfFollowupId, input.kfFollowupId));
      return { ok: true };
    }),
});
