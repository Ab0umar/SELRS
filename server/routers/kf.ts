import { TRPCError } from "@trpc/server";
import { z } from "zod";
import {
  and,
  asc,
  desc,
  eq,
  gte,
  like,
  lte,
  or,
  sql,
} from "drizzle-orm";
import {
  kfPatients,
  kfVisits,
  kfExaminations,
  kfOperations,
  kfFollowups,
  kfLedger,
  patients,
} from "../../drizzle/schema";
import {
  router,
  makeKfProcedure,
  makeKfWriteProcedure,
} from "../_core/procedures";
import { getDb } from "../db";
import { uploadToS3 } from "../_core/s3";
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

const KF_PRICES: Record<string, number> = {
  consultation: 465,
  examination: 215,
};

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
  listPatients: makeKfProcedure("/kf/patients")
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

  getPatient: makeKfProcedure("/kf/patients")
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

  searchPatients: makeKfProcedure("/kf/patients")
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

  listVisits: makeKfProcedure("/kf/patients")
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

  listExaminations: makeKfProcedure("/kf/patients")
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

  getExamination: makeKfProcedure("/kf/patients")
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

  listOperations: makeKfProcedure("/kf/operations")
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

  listFollowups: makeKfProcedure("/kf/followups")
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

  bridgeLookupSelrsPatient: makeKfProcedure("/kf/patients")
    .input(kfBridgeLookupSelrsPatientInputSchema)
    .query(async ({ input }) => {
      const db = await requireDb();
      const code = input.code.trim();
      if (!code) return null;
      const [row] = await db
        .select({
          id: patients.id,
          patientCode: patients.patientCode,
          fullName: patients.fullName,
        })
        .from(patients)
        .where(eq(patients.patientCode, code))
        .limit(1);
      return row ?? null;
    }),

  createPatient: makeKfWriteProcedure("/kf/patients")
    .input(kfCreatePatientInputSchema)
    .mutation(async ({ input, ctx }) => {
      const db = await requireDb();
      const nationalId = String(input.nationalId ?? "").trim();
      if (nationalId) {
        const [duplicate] = await db
          .select({ kfId: kfPatients.kfId })
          .from(kfPatients)
          .where(eq(kfPatients.nationalId, nationalId))
          .limit(1);
        if (duplicate) {
          throw error("KF patient with this national ID already exists", "CONFLICT");
        }
      }
      const now = new Date();
      const result = await db.transaction(async (tx: any) => {
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
          doctorName: input.doctorName ?? null,
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

  updatePatient: makeKfWriteProcedure("/kf/patients")
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

  createVisit: makeKfWriteProcedure("/kf/patients")
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

  updateVisit: makeKfWriteProcedure("/kf/patients")
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

  createExamination: makeKfWriteProcedure("/kf/patients")
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

  updateExamination: makeKfWriteProcedure("/kf/patients")
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

  createOperation: makeKfWriteProcedure("/kf/operations")
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

  updateOperation: makeKfWriteProcedure("/kf/operations")
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

  createFollowup: makeKfWriteProcedure("/kf/followups")
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

  updateFollowup: makeKfWriteProcedure("/kf/followups")
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

  getDailyRevenue: makeKfProcedure("/kf/accounting/daily-revenue")
    .input(z.object({ fromDate: z.string(), toDate: z.string() }))
    .query(async ({ input }) => {
      const db = await requireDb();
      const rows = await db!
        .select({
          visitDate: kfVisits.visitDate,
          visitType: kfVisits.visitType,
          count: sql<number>`COUNT(*)`,
        })
        .from(kfVisits)
        .where(
          and(
            gte(kfVisits.visitDate, toMysqlDate(input.fromDate) as Date),
            lte(kfVisits.visitDate, toMysqlDate(input.toDate) as Date),
          )
        )
        .groupBy(kfVisits.visitDate, kfVisits.visitType)
        .orderBy(asc(kfVisits.visitDate));

      const byDate = new Map<string, {
        consultationCount: number; consultationTotal: number;
        examinationCount: number; examinationTotal: number;
        totalCount: number; total: number;
      }>();
      for (const row of rows) {
        const d = row.visitDate instanceof Date
          ? row.visitDate.toISOString().split("T")[0]
          : String(row.visitDate).slice(0, 10);
        const cnt = Number(row.count);
        const fee = KF_PRICES[row.visitType as string] ?? 0;
        if (!byDate.has(d)) byDate.set(d, { consultationCount: 0, consultationTotal: 0, examinationCount: 0, examinationTotal: 0, totalCount: 0, total: 0 });
        const e = byDate.get(d)!;
        e.totalCount += cnt;
        e.total += cnt * fee;
        if (row.visitType === "consultation") { e.consultationCount += cnt; e.consultationTotal += cnt * fee; }
        else if (row.visitType === "examination") { e.examinationCount += cnt; e.examinationTotal += cnt * fee; }
      }
      const dailyRows = Array.from(byDate.entries()).sort(([a], [b]) => a.localeCompare(b)).map(([date, d]) => ({ date, ...d }));
      const totals = dailyRows.reduce(
        (a, r) => ({ consultationCount: a.consultationCount + r.consultationCount, consultationTotal: a.consultationTotal + r.consultationTotal, examinationCount: a.examinationCount + r.examinationCount, examinationTotal: a.examinationTotal + r.examinationTotal, totalCount: a.totalCount + r.totalCount, total: a.total + r.total }),
        { consultationCount: 0, consultationTotal: 0, examinationCount: 0, examinationTotal: 0, totalCount: 0, total: 0 }
      );
      return { rows: dailyRows, totals };
    }),

  getServiceRevenue: makeKfProcedure("/kf/accounting/service-revenue")
    .input(z.object({ fromDate: z.string(), toDate: z.string() }))
    .query(async ({ input }) => {
      const db = await requireDb();
      const rows = await db!
        .select({ visitType: kfVisits.visitType, count: sql<number>`COUNT(*)` })
        .from(kfVisits)
        .where(
          and(
            gte(kfVisits.visitDate, toMysqlDate(input.fromDate) as Date),
            lte(kfVisits.visitDate, toMysqlDate(input.toDate) as Date),
          )
        )
        .groupBy(kfVisits.visitType);

      const KF_LABELS: Record<string, string> = { consultation: "كشف استشاري", examination: "كشف أخصائي", followup: "متابعة", operation: "عملية جراحية" };
      let grandTotal = 0; let totalCount = 0;
      const serviceRows = rows.map((r: any) => {
        const count = Number(r.count);
        const unitPrice = KF_PRICES[r.visitType as string] ?? 0;
        const total = count * unitPrice;
        grandTotal += total; totalCount += count;
        return { visitType: r.visitType as string, label: KF_LABELS[r.visitType as string] ?? r.visitType as string, count, unitPrice, total };
      });
      return { rows: serviceRows, grandTotal, totalCount };
    }),

  getLedgerSummary: makeKfProcedure("/kf/accounting/ledger")
    .input(z.object({ dateFrom: z.string().optional(), dateTo: z.string().optional() }))
    .query(async ({ input }) => {
      const db = await requireDb();
      const conds: any[] = [];
      if (input.dateFrom) conds.push(gte(kfLedger.entryDate, toMysqlDate(input.dateFrom) as Date));
      if (input.dateTo) conds.push(lte(kfLedger.entryDate, toMysqlDate(input.dateTo) as Date));
      const [row] = await db!
        .select({
          totalIncome: sql<number>`COALESCE(SUM(income), 0)`,
          totalExpense: sql<number>`COALESCE(SUM(expense), 0)`,
        })
        .from(kfLedger)
        .where(conds.length > 0 ? and(...(conds as [any, ...any[]])) : undefined);
      const totalIncome = Number(row?.totalIncome ?? 0);
      const totalExpense = Number(row?.totalExpense ?? 0);
      return { totalIncome, totalExpense, currentBalance: totalIncome - totalExpense };
    }),

  getLedger: makeKfProcedure("/kf/accounting/ledger")
    .input(z.object({
      page: z.number().int().min(1).default(1),
      pageSize: z.number().int().min(1).max(100).default(50),
      dateFrom: z.string().optional(),
      dateTo: z.string().optional(),
      notes: z.string().optional(),
      sortDir: z.enum(["asc", "desc"]).default("desc"),
    }))
    .query(async ({ input }) => {
      const db = await requireDb();
      const offset = (input.page - 1) * input.pageSize;
      const conds: any[] = [];
      if (input.dateFrom) conds.push(gte(kfLedger.entryDate, toMysqlDate(input.dateFrom) as Date));
      if (input.dateTo) conds.push(lte(kfLedger.entryDate, toMysqlDate(input.dateTo) as Date));
      if (input.notes) conds.push(like(kfLedger.notes, `%${input.notes}%`));
      const where = conds.length > 0 ? and(...(conds as [any, ...any[]])) : undefined;
      const [countRow] = await db!.select({ total: sql<number>`COUNT(*)` }).from(kfLedger).where(where);
      const rows = await db!
        .select()
        .from(kfLedger)
        .where(where)
        .orderBy(input.sortDir === "asc" ? asc(kfLedger.entryDate) : desc(kfLedger.entryDate))
        .limit(input.pageSize)
        .offset(offset);
      return { rows, total: Number(countRow?.total ?? 0) };
    }),

  addLedgerEntry: makeKfWriteProcedure("/kf/accounting/ledger")
    .input(z.object({
      entryDate: z.string(),
      income: z.number().min(0).default(0),
      expense: z.number().min(0).default(0),
      notes: z.string().max(500).optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await requireDb();
      const result = await db.insert(kfLedger).values({
        entryDate: toMysqlDate(input.entryDate) as Date,
        income: Math.round(input.income),
        expense: Math.round(input.expense),
        notes: input.notes ?? null,
        createdByUserId: ctx.user?.id ?? null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      return { kfLedgerId: insertIdOf(result) };
    }),

  deleteLedgerEntry: makeKfWriteProcedure("/kf/accounting/ledger")
    .input(z.object({ kfLedgerId: z.number().int() }))
    .mutation(async ({ input }) => {
      const db = await requireDb();
      await db.delete(kfLedger).where(eq(kfLedger.kfLedgerId, input.kfLedgerId));
      return { ok: true };
    }),

  getRevenue: makeKfProcedure("/kf/accounting")
    .input(z.object({ date: z.string().optional() }))
    .query(async ({ input }) => {
      const db = await requireDb();
      const targetDate = input.date ?? new Date().toISOString().split("T")[0];
      const rows = await db!
        .select({
          visitType: kfVisits.visitType,
          count: sql<number>`COUNT(*)`,
        })
        .from(kfVisits)
        .where(eq(kfVisits.visitDate, toMysqlDate(targetDate) as Date))
        .groupBy(kfVisits.visitType);
      let total = 0;
      const breakdown = rows.map((r: any) => {
        const fee = KF_PRICES[r.visitType] ?? 0;
        const subtotal = fee * Number(r.count);
        total += subtotal;
        return { visitType: r.visitType as string, count: Number(r.count), fee, subtotal };
      });
      return { date: targetDate, total, breakdown };
    }),

  listReceipts: makeKfProcedure("/kf/accounting/receipts")
    .input(z.object({
      fromDate: z.string().optional(),
      toDate: z.string().optional(),
      kfCode: z.string().optional(),
      page: z.number().int().min(1).default(1),
      pageSize: z.number().int().min(1).max(500).default(200),
    }))
    .query(async ({ input }) => {
      const db = await requireDb();
      const offset = (input.page - 1) * input.pageSize;
      const conditions: ReturnType<typeof eq>[] = [];
      if (input.fromDate) conditions.push(gte(kfVisits.visitDate, toMysqlDate(input.fromDate) as Date) as any);
      if (input.toDate) conditions.push(lte(kfVisits.visitDate, toMysqlDate(input.toDate) as Date) as any);
      if (input.kfCode) conditions.push(like(kfPatients.kfCode, `%${input.kfCode}%`) as any);
      const rows = await db!
        .select({
          kfVisitId: kfVisits.kfVisitId,
          visitDate: kfVisits.visitDate,
          visitType: kfVisits.visitType,
          doctorName: kfVisits.doctorName,
          status: kfVisits.status,
          patientName: kfPatients.fullName,
          kfCode: kfPatients.kfCode,
        })
        .from(kfVisits)
        .innerJoin(kfPatients, eq(kfVisits.kfPatientId, kfPatients.kfId))
        .where(conditions.length > 0 ? and(...(conditions as [any, ...any[]])) : undefined)
        .orderBy(desc(kfVisits.visitDate), desc(kfVisits.kfVisitId))
        .limit(input.pageSize)
        .offset(offset);
      return rows.map((r: any) => ({
        ...r,
        fee: KF_PRICES[r.visitType] ?? 0,
      }));
    }),

  deletePatient: makeKfWriteProcedure("/kf/patients")
    .input(z.object({ kfId: z.number().int() }))
    .mutation(async ({ input }) => {
      const db = await requireDb();
      await db.transaction(async (tx: any) => {
        await tx.delete(kfFollowups).where(eq(kfFollowups.kfPatientId, input.kfId));
        await tx.delete(kfExaminations).where(eq(kfExaminations.kfPatientId, input.kfId));
        await tx.delete(kfOperations).where(eq(kfOperations.kfPatientId, input.kfId));
        await tx.delete(kfVisits).where(eq(kfVisits.kfPatientId, input.kfId));
        await tx.delete(kfPatients).where(eq(kfPatients.kfId, input.kfId));
      });
      return { ok: true };
    }),

  deleteVisit: makeKfWriteProcedure("/kf/patients")
    .input(z.object({ kfVisitId: z.number().int() }))
    .mutation(async ({ input }) => {
      const db = await requireDb();
      await db.delete(kfVisits).where(eq(kfVisits.kfVisitId, input.kfVisitId));
      return { ok: true };
    }),

  deleteExamination: makeKfWriteProcedure("/kf/patients")
    .input(z.object({ kfExamId: z.number().int() }))
    .mutation(async ({ input }) => {
      const db = await requireDb();
      await db.delete(kfExaminations).where(eq(kfExaminations.kfExamId, input.kfExamId));
      return { ok: true };
    }),

  deleteOperation: makeKfWriteProcedure("/kf/operations")
    .input(z.object({ kfOpId: z.number().int() }))
    .mutation(async ({ input }) => {
      const db = await requireDb();
      await db.delete(kfOperations).where(eq(kfOperations.kfOpId, input.kfOpId));
      return { ok: true };
    }),

  deleteFollowup: makeKfWriteProcedure("/kf/followups")
    .input(z.object({ kfFollowupId: z.number().int() }))
    .mutation(async ({ input }) => {
      const db = await requireDb();
      await db.delete(kfFollowups).where(eq(kfFollowups.kfFollowupId, input.kfFollowupId));
      return { ok: true };
    }),

  uploadExamImage: makeKfWriteProcedure("/kf/patients")
    .input(z.object({
      kfPatientId: z.number().int().positive(),
      fileName: z.string().min(1),
      mimeType: z.string().min(1),
      fileDataBase64: z.string().min(1),
    }))
    .mutation(async ({ input }) => {
      const db = await requireDb();
      const fileBuffer = Buffer.from(input.fileDataBase64, "base64");
      if (fileBuffer.length > 20 * 1024 * 1024) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "الملف أكبر من 20 MB" });
      }
      const safeFileName = input.fileName.replace(/[^a-zA-Z0-9._-]/g, "_");
      const ts = Date.now();
      const s3Key = `kf-exam/${input.kfPatientId}/${ts}_${safeFileName}`;
      let uploadedS3Key: string | null = null;
      try {
        await uploadToS3(s3Key, fileBuffer, input.mimeType);
        uploadedS3Key = s3Key;
      } catch {
        // fall through — store in DB if S3 unavailable
      }
      const result = await db.execute(
        sql`INSERT INTO srv100_uploads
            (patient_id, document_id, file_name, mime_type, file_data, s3_key, source_printer)
            VALUES (
              ${input.kfPatientId},
              NULL,
              ${safeFileName},
              ${input.mimeType},
              ${uploadedS3Key ? null : fileBuffer},
              ${uploadedS3Key},
              'kf-exam'
            )`
      ) as any;
      const insertId = Number(result?.insertId ?? result?.[0]?.insertId ?? 0);
      return { id: insertId, viewUrl: `/api/srv100/uploads/${insertId}` };
    }),
});
