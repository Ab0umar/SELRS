import { z } from "zod";

const dateStringSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const emptyToUndefined = (value: unknown) => {
  if (typeof value !== "string") return value;
  const trimmed = value.trim();
  return trimmed === "" ? undefined : trimmed;
};

const optionalDateSchema = z.preprocess(
  emptyToUndefined,
  dateStringSchema.optional().nullable(),
);

const optionalTextSchema = (maxLength: number) =>
  z.preprocess(
    emptyToUndefined,
    z.string().max(maxLength).optional().nullable(),
  );

const optionalIntSchema = z.preprocess((value) => {
  if (value === "" || value === null || value === undefined) return undefined;
  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : undefined;
  }
  return value;
}, z.number().int().optional().nullable());

export const kfGenderSchema = z.enum(["male", "female"]);
export const kfVisitTypeSchema = z.enum([
  "consultation",
  "examination",
  "followup",
  "operation",
]);
export const kfVisitStatusSchema = z.enum([
  "scheduled",
  "arrived",
  "in_progress",
  "completed",
  "cancelled",
]);
export const kfOperationEyeSchema = z.enum(["right", "left", "both"]);
export const kfOperationStatusSchema = z.enum([
  "scheduled",
  "completed",
  "cancelled",
]);
export const kfFollowupStatusSchema = z.enum([
  "scheduled",
  "completed",
  "missed",
]);

export const kfPatientSchema = z.object({
  kfId: z.number().int(),
  kfCode: z.string(),
  fullName: z.string(),
  dateOfBirth: z.union([dateStringSchema, z.date()]).nullable().optional(),
  age: z.number().int().nullable().optional(),
  gender: kfGenderSchema.nullable().optional(),
  nationalId: z.string().nullable().optional(),
  phone: z.string().nullable().optional(),
  alternatePhone: z.string().nullable().optional(),
  address: z.string().nullable().optional(),
  occupation: z.string().nullable().optional(),
  medicalHistory: z.string().nullable().optional(),
  allergies: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
  selrsPatientCode: z.string().nullable().optional(),
  createdByUserId: z.number().int().nullable().optional(),
  createdAt: z.union([z.date(), z.string()]),
  updatedAt: z.union([z.date(), z.string()]),
});
export type KfPatient = z.infer<typeof kfPatientSchema>;

export const kfVisitSchema = z.object({
  kfVisitId: z.number().int(),
  kfPatientId: z.number().int(),
  visitDate: z.union([dateStringSchema, z.date()]),
  visitType: kfVisitTypeSchema.nullable().optional(),
  doctorName: z.string().nullable().optional(),
  status: kfVisitStatusSchema.nullable().optional(),
  notes: z.string().nullable().optional(),
  createdByUserId: z.number().int().nullable().optional(),
  createdAt: z.union([z.date(), z.string()]),
  updatedAt: z.union([z.date(), z.string()]),
});
export type KfVisit = z.infer<typeof kfVisitSchema>;

export const kfExaminationSchema = z.object({
  kfExamId: z.number().int(),
  kfPatientId: z.number().int(),
  kfVisitId: z.number().int().nullable().optional(),
  examDate: z.union([dateStringSchema, z.date()]),
  rightVa: z.string().nullable().optional(),
  leftVa: z.string().nullable().optional(),
  rightRefraction: z.unknown().nullable().optional(),
  leftRefraction: z.unknown().nullable().optional(),
  iopRight: z.string().nullable().optional(),
  iopLeft: z.string().nullable().optional(),
  diagnosis: z.string().nullable().optional(),
  plan: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
  doctorName: z.string().nullable().optional(),
  examinedByUserId: z.number().int().nullable().optional(),
  createdAt: z.union([z.date(), z.string()]),
  updatedAt: z.union([z.date(), z.string()]),
});
export type KfExamination = z.infer<typeof kfExaminationSchema>;

export const kfOperationSchema = z.object({
  kfOpId: z.number().int(),
  kfPatientId: z.number().int(),
  kfVisitId: z.number().int().nullable().optional(),
  opDate: z.union([dateStringSchema, z.date()]),
  opType: z.string(),
  eye: kfOperationEyeSchema.nullable().optional(),
  doctorName: z.string().nullable().optional(),
  status: kfOperationStatusSchema.nullable().optional(),
  notes: z.string().nullable().optional(),
  createdByUserId: z.number().int().nullable().optional(),
  createdAt: z.union([z.date(), z.string()]),
  updatedAt: z.union([z.date(), z.string()]),
});
export type KfOperation = z.infer<typeof kfOperationSchema>;

export const kfFollowupSchema = z.object({
  kfFollowupId: z.number().int(),
  kfPatientId: z.number().int(),
  kfVisitId: z.number().int().nullable().optional(),
  kfOpId: z.number().int().nullable().optional(),
  followupDate: z.union([dateStringSchema, z.date()]),
  notes: z.string().nullable().optional(),
  status: kfFollowupStatusSchema.nullable().optional(),
  createdByUserId: z.number().int().nullable().optional(),
  createdAt: z.union([z.date(), z.string()]),
  updatedAt: z.union([z.date(), z.string()]),
});
export type KfFollowup = z.infer<typeof kfFollowupSchema>;

export const kfListPatientsInputSchema = z.object({
  search: z.string().trim().optional().default(""),
  page: z.number().int().min(1).default(1),
  pageSize: z.number().int().min(1).max(100).default(20),
});
export type KfListPatientsInput = z.infer<typeof kfListPatientsInputSchema>;

export const kfSearchPatientsInputSchema = z.object({
  term: z.string().trim().default(""),
});
export type KfSearchPatientsInput = z.infer<typeof kfSearchPatientsInputSchema>;

export const kfGetPatientInputSchema = z.object({
  kfId: z.number().int().positive(),
});
export type KfGetPatientInput = z.infer<typeof kfGetPatientInputSchema>;

export const kfListVisitsInputSchema = z.object({
  kfPatientId: z.number().int().positive(),
});
export type KfListVisitsInput = z.infer<typeof kfListVisitsInputSchema>;

export const kfListExaminationsInputSchema = z.object({
  kfPatientId: z.number().int().positive(),
});
export type KfListExaminationsInput = z.infer<
  typeof kfListExaminationsInputSchema
>;

export const kfGetExaminationInputSchema = z.object({
  kfExamId: z.number().int().positive(),
});
export type KfGetExaminationInput = z.infer<typeof kfGetExaminationInputSchema>;

export const kfListOperationsInputSchema = z.object({
  kfPatientId: z.number().int().positive().optional(),
  date: optionalDateSchema,
  status: kfOperationStatusSchema.optional(),
});
export type KfListOperationsInput = z.infer<typeof kfListOperationsInputSchema>;

export const kfListFollowupsInputSchema = z.object({
  kfPatientId: z.number().int().positive().optional(),
  date: optionalDateSchema,
  status: kfFollowupStatusSchema.optional(),
});
export type KfListFollowupsInput = z.infer<typeof kfListFollowupsInputSchema>;

export const kfBridgeLookupSelrsPatientInputSchema = z.object({
  code: z.string().trim().min(1),
});
export type KfBridgeLookupSelrsPatientInput = z.infer<
  typeof kfBridgeLookupSelrsPatientInputSchema
>;

export const kfCreatePatientInputSchema = z.object({
  fullName: z.string().trim().min(1).max(255),
  dateOfBirth: optionalDateSchema,
  age: optionalIntSchema,
  gender: kfGenderSchema.optional().nullable(),
  nationalId: optionalTextSchema(20),
  phone: optionalTextSchema(20),
  alternatePhone: optionalTextSchema(20),
  address: optionalTextSchema(1000),
  occupation: optionalTextSchema(255),
  medicalHistory: optionalTextSchema(4000),
  allergies: optionalTextSchema(4000),
  notes: optionalTextSchema(4000),
  selrsPatientCode: optionalTextSchema(50),
});
export type KfCreatePatientInput = z.infer<typeof kfCreatePatientInputSchema>;

export const kfUpdatePatientInputSchema = kfCreatePatientInputSchema.partial().extend({
  kfId: z.number().int().positive(),
});
export type KfUpdatePatientInput = z.infer<typeof kfUpdatePatientInputSchema>;

export const kfCreateVisitInputSchema = z.object({
  kfPatientId: z.number().int().positive(),
  visitDate: dateStringSchema,
  visitType: kfVisitTypeSchema.optional(),
  doctorName: z.string().trim().max(255).optional().nullable(),
  status: kfVisitStatusSchema.optional(),
  notes: z.string().trim().max(4000).optional().nullable(),
});
export type KfCreateVisitInput = z.infer<typeof kfCreateVisitInputSchema>;

export const kfUpdateVisitInputSchema = kfCreateVisitInputSchema.partial().extend({
  kfVisitId: z.number().int().positive(),
});
export type KfUpdateVisitInput = z.infer<typeof kfUpdateVisitInputSchema>;

export const kfCreateExaminationInputSchema = z.object({
  kfPatientId: z.number().int().positive(),
  kfVisitId: z.number().int().positive().optional().nullable(),
  examDate: dateStringSchema,
  rightVa: z.string().trim().max(20).optional().nullable(),
  leftVa: z.string().trim().max(20).optional().nullable(),
  rightRefraction: z.unknown().optional().nullable(),
  leftRefraction: z.unknown().optional().nullable(),
  iopRight: z.string().trim().max(20).optional().nullable(),
  iopLeft: z.string().trim().max(20).optional().nullable(),
  diagnosis: z.string().trim().max(4000).optional().nullable(),
  plan: z.string().trim().max(4000).optional().nullable(),
  notes: z.string().trim().max(4000).optional().nullable(),
  doctorName: z.string().trim().max(255).optional().nullable(),
});
export type KfCreateExaminationInput = z.infer<
  typeof kfCreateExaminationInputSchema
>;

export const kfUpdateExaminationInputSchema =
  kfCreateExaminationInputSchema.partial().extend({
    kfExamId: z.number().int().positive(),
  });
export type KfUpdateExaminationInput = z.infer<
  typeof kfUpdateExaminationInputSchema
>;

export const kfCreateOperationInputSchema = z.object({
  kfPatientId: z.number().int().positive(),
  kfVisitId: z.number().int().positive().optional().nullable(),
  opDate: dateStringSchema,
  opType: z.string().trim().min(1).max(255),
  eye: kfOperationEyeSchema.optional().nullable(),
  doctorName: z.string().trim().max(255).optional().nullable(),
  status: kfOperationStatusSchema.optional(),
  notes: z.string().trim().max(4000).optional().nullable(),
});
export type KfCreateOperationInput = z.infer<typeof kfCreateOperationInputSchema>;

export const kfUpdateOperationInputSchema =
  kfCreateOperationInputSchema.partial().extend({
    kfOpId: z.number().int().positive(),
  });
export type KfUpdateOperationInput = z.infer<
  typeof kfUpdateOperationInputSchema
>;

export const kfCreateFollowupInputSchema = z.object({
  kfPatientId: z.number().int().positive(),
  kfVisitId: z.number().int().positive().optional().nullable(),
  kfOpId: z.number().int().positive().optional().nullable(),
  followupDate: dateStringSchema,
  notes: z.string().trim().max(4000).optional().nullable(),
  status: kfFollowupStatusSchema.optional(),
});
export type KfCreateFollowupInput = z.infer<typeof kfCreateFollowupInputSchema>;

export const kfUpdateFollowupInputSchema =
  kfCreateFollowupInputSchema.partial().extend({
    kfFollowupId: z.number().int().positive(),
  });
export type KfUpdateFollowupInput = z.infer<
  typeof kfUpdateFollowupInputSchema
>;

export const kfListPatientsResultSchema = z.object({
  patients: z.array(kfPatientSchema),
  total: z.number().int(),
});
export type KfListPatientsResult = z.infer<typeof kfListPatientsResultSchema>;
