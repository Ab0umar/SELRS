import { z } from "zod";
import { and, eq, isNull, notInArray, or, sql, type SQL } from "drizzle-orm";
import { protectedProcedure } from "../_core/procedures";
import * as db from "../db";
import {
  doctorReports,
  glassesRecords,
  operationListItems,
  operationLists,
  patients,
  pentacamResults,
} from "../../drizzle/schema";

const EXTERNAL_PATIENT_SERVICE_TYPES = [
  "external",
  "pentacam_ex",
  "pentacam_ex_c",
  "pentacam_external",
  "surgery_external",
] as const;

const eyeSchema = z.enum(["OD", "OS", "either", "both"]);
const rangeSchema = z.object({ min: z.number().optional(), max: z.number().optional() });

const criterionSchema = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("refraction"),
    metric: z.enum(["sphere", "cylinder", "axis"]),
    eye: eyeSchema,
    range: rangeSchema,
  }),
  z.object({
    kind: z.literal("pentacam"),
    metric: z.enum(["k1", "k2", "thickness"]),
    eye: eyeSchema,
    range: rangeSchema,
  }),
  z.object({
    kind: z.literal("diagnosis"),
    field: z.enum(["diagnosis", "diseases", "symptoms", "any"]),
    text: z.string().trim().min(1).max(200),
  }),
  z.object({
    kind: z.literal("operation"),
    text: z.string().trim().min(1).max(200),
  }),
]);

const numericValue = (column: unknown) =>
  sql`CAST(NULLIF(REPLACE(REPLACE(TRIM(${column as any}), '+', ''), ',', '.'), '') AS DECIMAL(12,3))`;

function rangeCondition(column: unknown, range: { min?: number; max?: number }) {
  const value = numericValue(column);
  const conditions: SQL[] = [];
  if (range.min != null) conditions.push(sql`${value} >= ${range.min}`);
  if (range.max != null) conditions.push(sql`${value} <= ${range.max}`);
  return conditions.length ? and(...conditions)! : sql`1 = 1`;
}

function eyeCondition(
  eye: z.infer<typeof eyeSchema>,
  odColumn: unknown,
  osColumn: unknown,
  range: { min?: number; max?: number },
) {
  const od = rangeCondition(odColumn, range);
  const os = rangeCondition(osColumn, range);
  if (eye === "OD") return od;
  if (eye === "OS") return os;
  if (eye === "both") return and(od, os)!;
  return or(od, os)!;
}

function buildCriterion(criterion: z.infer<typeof criterionSchema>): SQL {
  if (criterion.kind === "refraction") {
    const columns = {
      sphere: [glassesRecords.sOD, glassesRecords.sOS],
      cylinder: [glassesRecords.cOD, glassesRecords.cOS],
      axis: [glassesRecords.axisOD, glassesRecords.axisOS],
    } as const;
    const [od, os] = columns[criterion.metric];
    const match = eyeCondition(criterion.eye, od, os, criterion.range);
    return sql`EXISTS (SELECT 1 FROM ${glassesRecords} WHERE ${glassesRecords.patientId} = patients.id AND ${match})`;
  }

  if (criterion.kind === "pentacam") {
    const columns = {
      k1: [pentacamResults.k1OD, pentacamResults.k1OS],
      k2: [pentacamResults.k2OD, pentacamResults.k2OS],
      thickness: [
        pentacamResults.thinnestPointOD,
        pentacamResults.thinnestPointOS,
      ],
    } as const;
    const [od, os] = columns[criterion.metric];
    const match = eyeCondition(criterion.eye, od, os, criterion.range);
    return sql`EXISTS (SELECT 1 FROM ${pentacamResults} WHERE ${pentacamResults.patientId} = patients.id AND ${match})`;
  }

  if (criterion.kind === "diagnosis") {
    const pattern = `%${criterion.text}%`;
    const fields: SQL[] = [];
    if (criterion.field === "diagnosis" || criterion.field === "any") fields.push(sql`${doctorReports.diagnosis} LIKE ${pattern}`);
    if (criterion.field === "diseases" || criterion.field === "any") fields.push(sql`${doctorReports.diseases} LIKE ${pattern}`);
    if (criterion.field === "symptoms" || criterion.field === "any") fields.push(sql`${doctorReports.clinicalOpinion} LIKE ${pattern}`);
    return sql`EXISTS (SELECT 1 FROM ${doctorReports} WHERE ${doctorReports.patientId} = patients.id AND ${or(...fields)})`;
  }

  const pattern = `%${criterion.text}%`;
  return sql`(
    EXISTS (SELECT 1 FROM ${doctorReports} WHERE ${doctorReports.patientId} = patients.id AND ${doctorReports.operationType} LIKE ${pattern})
    OR EXISTS (
      SELECT 1 FROM ${operationListItems}
      INNER JOIN ${operationLists} ON ${operationLists.id} = ${operationListItems.listId}
      WHERE ${operationListItems.code} = patients.patientCode
        AND (${operationListItems.operation} LIKE ${pattern} OR ${operationLists.operationType} LIKE ${pattern})
    )
  )`;
}

export const medicalReferenceRoutes = {
  searchMedicalReference: protectedProcedure
    .input(
      z.object({
        mode: z.enum(["and", "or"]).default("and"),
        search: z.string().trim().max(100).default(""),
        criteria: z.array(criterionSchema).max(20).default([]),
        page: z.number().int().min(1).default(1),
        pageSize: z.number().int().min(10).max(100).default(25),
      }),
    )
    .query(async ({ input }) => {
      const conn = await db.getDb();
      if (!conn) return { rows: [], total: 0, page: input.page, pageSize: input.pageSize };

      const conditions: SQL[] = [
        and(
          eq(patients.locationType, "center"),
          or(
            isNull(patients.serviceType),
            notInArray(patients.serviceType, [...EXTERNAL_PATIENT_SERVICE_TYPES]),
          ),
        )!,
      ];
      if (input.search) {
        const pattern = `%${input.search}%`;
        conditions.push(or(sql`${patients.fullName} LIKE ${pattern}`, sql`${patients.patientCode} LIKE ${pattern}`)!);
      }
      const criterionConditions = input.criteria.map(buildCriterion);
      if (criterionConditions.length) {
        conditions.push(input.mode === "and" ? and(...criterionConditions)! : or(...criterionConditions)!);
      }
      const where = conditions.length ? and(...conditions) : undefined;
      const offset = (input.page - 1) * input.pageSize;

      const [countRows, rows] = await Promise.all([
        conn.select({ total: sql<number>`COUNT(*)` }).from(patients).where(where),
        conn
          .select({
            id: patients.id,
            patientCode: patients.patientCode,
            fullName: patients.fullName,
            age: patients.age,
            gender: patients.gender,
            lastVisit: patients.lastVisit,
            sphereOD: sql<string | null>`(SELECT g.sOD FROM glassesRecords g WHERE g.patientId = patients.id AND NULLIF(TRIM(g.sOD), '') IS NOT NULL ORDER BY g.createdAt DESC LIMIT 1)`,
            cylinderOD: sql<string | null>`(SELECT g.cOD FROM glassesRecords g WHERE g.patientId = patients.id AND NULLIF(TRIM(g.cOD), '') IS NOT NULL ORDER BY g.createdAt DESC LIMIT 1)`,
            axisOD: sql<string | null>`(SELECT g.axisOD FROM glassesRecords g WHERE g.patientId = patients.id AND NULLIF(TRIM(g.axisOD), '') IS NOT NULL ORDER BY g.createdAt DESC LIMIT 1)`,
            sphereOS: sql<string | null>`(SELECT g.sOS FROM glassesRecords g WHERE g.patientId = patients.id AND NULLIF(TRIM(g.sOS), '') IS NOT NULL ORDER BY g.createdAt DESC LIMIT 1)`,
            cylinderOS: sql<string | null>`(SELECT g.cOS FROM glassesRecords g WHERE g.patientId = patients.id AND NULLIF(TRIM(g.cOS), '') IS NOT NULL ORDER BY g.createdAt DESC LIMIT 1)`,
            axisOS: sql<string | null>`(SELECT g.axisOS FROM glassesRecords g WHERE g.patientId = patients.id AND NULLIF(TRIM(g.axisOS), '') IS NOT NULL ORDER BY g.createdAt DESC LIMIT 1)`,
            k1OD: sql<string | null>`(SELECT pc.k1OD FROM pentacamResults pc WHERE pc.patientId = patients.id ORDER BY pc.createdAt DESC LIMIT 1)`,
            k2OD: sql<string | null>`(SELECT pc.k2OD FROM pentacamResults pc WHERE pc.patientId = patients.id ORDER BY pc.createdAt DESC LIMIT 1)`,
            thicknessOD: sql<string | null>`(SELECT pc.thinnestPointOD FROM pentacamResults pc WHERE pc.patientId = patients.id AND NULLIF(TRIM(pc.thinnestPointOD), '') IS NOT NULL ORDER BY pc.createdAt DESC LIMIT 1)`,
            k1OS: sql<string | null>`(SELECT pc.k1OS FROM pentacamResults pc WHERE pc.patientId = patients.id ORDER BY pc.createdAt DESC LIMIT 1)`,
            k2OS: sql<string | null>`(SELECT pc.k2OS FROM pentacamResults pc WHERE pc.patientId = patients.id ORDER BY pc.createdAt DESC LIMIT 1)`,
            thicknessOS: sql<string | null>`(SELECT pc.thinnestPointOS FROM pentacamResults pc WHERE pc.patientId = patients.id AND NULLIF(TRIM(pc.thinnestPointOS), '') IS NOT NULL ORDER BY pc.createdAt DESC LIMIT 1)`,
            diagnosis: sql<string | null>`(SELECT dr.diagnosis FROM doctorReports dr WHERE dr.patientId = patients.id ORDER BY dr.createdAt DESC LIMIT 1)`,
            operationType: sql<string | null>`(SELECT dr.operationType FROM doctorReports dr WHERE dr.patientId = patients.id AND dr.operationType IS NOT NULL ORDER BY dr.createdAt DESC LIMIT 1)`,
          })
          .from(patients)
          .where(where)
          .orderBy(sql`${patients.lastVisit} DESC`, sql`${patients.id} DESC`)
          .limit(input.pageSize)
          .offset(offset),
      ]);

      return {
        rows,
        total: Number(countRows[0]?.total ?? 0),
        page: input.page,
        pageSize: input.pageSize,
      };
    }),
};
