import {
  boolean,
  int,
  mysqlEnum,
  mysqlTable,
  text,
  timestamp,
  uniqueIndex,
  varchar,
} from "drizzle-orm/mysql-core";

const visitIdentity = () => ({
  id: int("id").autoincrement().primaryKey(),
  patientId: int("patientId").notNull(),
  visitId: int("visitId").notNull(),
  doctorId: int("doctorId"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export const visitComplaints = mysqlTable(
  "visitComplaints",
  { ...visitIdentity(), complaint: text("complaint") },
  (table) => [uniqueIndex("uq_visit_complaint").on(table.visitId)],
);
export const visitSymptoms = mysqlTable(
  "visitSymptoms",
  { ...visitIdentity(), symptoms: text("symptoms") },
  (table) => [uniqueIndex("uq_visit_symptoms").on(table.visitId)],
);
export const visitDiagnoses = mysqlTable(
  "visitDiagnoses",
  { ...visitIdentity(), diagnosis: text("diagnosis") },
  (table) => [uniqueIndex("uq_visit_diagnosis").on(table.visitId)],
);
export const visitDiagnosisCodes = mysqlTable(
  "visitDiagnosisCodes",
  {
    id: int("id").autoincrement().primaryKey(),
    patientId: int("patientId").notNull(),
    visitId: int("visitId").notNull(),
    diseaseId: int("diseaseId").notNull(),
  },
  (table) => [
    uniqueIndex("uq_visit_disease").on(table.visitId, table.diseaseId),
  ],
);
export const visitTreatmentPlans = mysqlTable(
  "visitTreatmentPlans",
  { ...visitIdentity(), treatment: text("treatment") },
  (table) => [uniqueIndex("uq_visit_treatment").on(table.visitId)],
);
export const visitDecisions = mysqlTable(
  "visitDecisions",
  {
    ...visitIdentity(),
    decision: text("decision"),
    followUpDate: timestamp("followUpDate"),
  },
  (table) => [uniqueIndex("uq_visit_decision").on(table.visitId)],
);
export const visitMedicalHistory = mysqlTable(
  "visitMedicalHistory",
  { ...visitIdentity(), history: text("history") },
  (table) => [uniqueIndex("uq_visit_history").on(table.visitId)],
);

export const symptomCatalog = mysqlTable("symptomCatalog", {
  id: varchar("id", { length: 100 }).primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export const visitSymptomCodes = mysqlTable(
  "visitSymptomCodes",
  {
    id: int("id").autoincrement().primaryKey(),
    patientId: int("patientId").notNull(),
    visitId: int("visitId").notNull(),
    symptomId: varchar("symptomId", { length: 100 }).notNull(),
  },
  (table) => [
    uniqueIndex("uq_visit_symptom_code").on(table.visitId, table.symptomId),
  ],
);
export const airPuffMeasurements = mysqlTable(
  "airPuffMeasurements",
  {
    id: int("id").autoincrement().primaryKey(),
    patientId: int("patientId").notNull(),
    visitId: int("visitId").notNull(),
    examinationId: int("examinationId").notNull(),
    iopOD: varchar("iopOD", { length: 50 }),
    iopOS: varchar("iopOS", { length: 50 }),
    iop2OD: varchar("iop2OD", { length: 50 }),
    iop2OS: varchar("iop2OS", { length: 50 }),
    iop3OD: varchar("iop3OD", { length: 50 }),
    iop3OS: varchar("iop3OS", { length: 50 }),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  (table) => [uniqueIndex("uq_airpuff_examination").on(table.examinationId)],
);

export const examinationFindings = mysqlTable(
  "examinationFindings",
  {
    id: int("id").autoincrement().primaryKey(),
    patientId: int("patientId").notNull(),
    visitId: int("visitId").notNull(),
    examinationId: int("examinationId").notNull(),
    externalPtosis: boolean("externalPtosis"),
    externalSquint: boolean("externalSquint"),
    externalOthers: boolean("externalOthers"),
    externalOthersNote: text("externalOthersNote"),
    muscleNormal: boolean("muscleNormal"),
    muscleAbnormal: boolean("muscleAbnormal"),
    muscleAbnormalNote: text("muscleAbnormalNote"),
    otherAbnormalities: text("otherAbnormalities"),
    fundusNormal: boolean("fundusNormal"),
    fundusAbnormal: boolean("fundusAbnormal"),
    fundusAbnormalNote: text("fundusAbnormalNote"),
    readingValue: varchar("readingValue", { length: 100 }),
    clinicNotes: text("clinicNotes"),
    investigationNotes:text("investigationNotes"),
    consultantDrawing: text("consultantDrawing"),
    consultantDrawingDescription: text("consultantDrawingDescription"),
    glassesCheck: boolean("glassesCheck"),
    xrayCheck: boolean("xrayCheck"),
    flapEdgesOD: text("flapEdgesOD"),
    flapBedOD: text("flapBedOD"),
    flapEdgesOS: text("flapEdgesOS"),
    flapBedOS: text("flapBedOS"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  (table) => [uniqueIndex("uq_examination_findings").on(table.examinationId)],
);
export const examinationProcedurePlans = mysqlTable(
  "examinationProcedurePlans",
  {
    id: int("id").autoincrement().primaryKey(),
    patientId: int("patientId").notNull(),
    visitId: int("visitId").notNull(),
    examinationId: int("examinationId").notNull(),
    eye: mysqlEnum("eye", ["OD", "OS"]).notNull(),
    target: text("target"),
    beforeFlap: text("beforeFlap"),
    afterFlap: text("afterFlap"),
    afterTreatment: text("afterTreatment"),
    flapReposition: text("flapReposition"),
    ciclo: text("ciclo"),
    note: text("note"),
  },
  (table) => [
    uniqueIndex("uq_examination_procedure_eye").on(
      table.examinationId,
      table.eye,
    ),
  ],
);
export const fundusFindings = mysqlTable(
  "fundusFindings",
  {
    id: int("id").autoincrement().primaryKey(),
    patientId: int("patientId").notNull(),
    visitId: int("visitId").notNull(),
    examinationId: int("examinationId").notNull(),
    eye: mysqlEnum("eye", ["OD", "OS"]).notNull(),
    discStatus: text("discStatus"),
    cupDiscRatio: text("cupDiscRatio"),
    macuaStatus: text("macuaStatus"),
    vesselStatus: text("vesselStatus"),
    otherFindings: text("otherFindings"),
  },
  (table) => [
    uniqueIndex("uq_fundus_examination_eye").on(table.examinationId, table.eye),
  ],
);

export const medicalMigrationConflicts = mysqlTable(
  "medicalMigrationConflicts",
  {
    id: int("id").autoincrement().primaryKey(),
    patientId: int("patientId").notNull(),
    visitId: int("visitId"),
    fieldName: varchar("fieldName", { length: 100 }).notNull(),
    sourceRef: varchar("sourceRef", { length: 191 }).notNull(),
    candidateValue: text("candidateValue").notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("uq_medical_migration_conflict").on(
      table.patientId,
      table.fieldName,
      table.sourceRef,
    ),
  ],
);
