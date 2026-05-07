import "dotenv/config";
import mysql from "mysql2/promise";

type Counters = {
  scanned: number;
  migrated: number;
  skippedExisting: number;
  skippedNoChecklist: number;
  skippedNoExamination: number;
  failed: number;
};

type ExamPageStateRow = {
  id: number;
  patientId: number;
  data: unknown;
  updatedAt: Date;
};

type ChecklistPayload = {
  generalDiseases?: boolean;
  pregnancyOrLactation?: boolean;
  usesAllergySupplementsSteroidsOrPressureMeds?: boolean;
  acneTreatment?: boolean;
  familyKeratoconus?: boolean;
  usesTearSubstituteOrExcessTearsOrSandySensation?: boolean;
  symptomsWorseWithAirOrAC?: boolean;
  glaucomaTreatment?: boolean;
};

const CHECKLIST_KEYS: Array<keyof ChecklistPayload> = [
  "generalDiseases",
  "pregnancyOrLactation",
  "usesAllergySupplementsSteroidsOrPressureMeds",
  "acneTreatment",
  "familyKeratoconus",
  "usesTearSubstituteOrExcessTearsOrSandySensation",
  "symptomsWorseWithAirOrAC",
  "glaucomaTreatment",
];

function parseArgs() {
  const args = new Set(process.argv.slice(2));
  return {
    dryRun: args.has("--dry-run") || args.has("-d"),
    overwriteExisting: args.has("--overwrite-existing"),
  };
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value) return null;
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      return parsed && typeof parsed === "object" ? (parsed as Record<string, unknown>) : null;
    } catch {
      return null;
    }
  }
  if (typeof value === "object") {
    return value as Record<string, unknown>;
  }
  return null;
}

function extractChecklist(rawData: unknown): ChecklistPayload | null {
  const root = asRecord(rawData);
  const rawChecklist = root?.medicalChecklist;
  const checklist = asRecord(rawChecklist);
  if (!checklist) return null;

  const result: ChecklistPayload = {};
  let hasAny = false;
  for (const key of CHECKLIST_KEYS) {
    if (Object.prototype.hasOwnProperty.call(checklist, key)) {
      result[key] = Boolean(checklist[key]);
      hasAny = true;
    }
  }
  return hasAny ? result : null;
}

async function main() {
  const { dryRun, overwriteExisting } = parseArgs();
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) throw new Error("DATABASE_URL is required");

  const counters: Counters = {
    scanned: 0,
    migrated: 0,
    skippedExisting: 0,
    skippedNoChecklist: 0,
    skippedNoExamination: 0,
    failed: 0,
  };

  const conn = await mysql.createConnection(databaseUrl);
  try {
    const [rows] = await conn.query<ExamPageStateRow[]>(
      `
      SELECT id, patientId, data, updatedAt
      FROM patientPageStates
      WHERE page = 'examination'
      ORDER BY updatedAt DESC, id DESC
      `,
    );

    for (const row of rows) {
      counters.scanned += 1;
      try {
        const checklist = extractChecklist(row.data);
        if (!checklist) {
          counters.skippedNoChecklist += 1;
          continue;
        }

        const [examRows] = await conn.query<Array<{ id: number }>>(
          `
          SELECT id
          FROM examinations
          WHERE patientId = ?
          ORDER BY updatedAt DESC, createdAt DESC, id DESC
          LIMIT 1
          `,
          [row.patientId],
        );

        const examinationId = Number(examRows[0]?.id ?? 0);
        if (!examinationId) {
          counters.skippedNoExamination += 1;
          continue;
        }

        const [existingRows] = await conn.query<Array<{ id: number }>>(
          `SELECT id FROM examination_checklist_items WHERE examinationId = ? LIMIT 1`,
          [examinationId],
        );

        const hasExisting = existingRows.length > 0;
        if (hasExisting && !overwriteExisting) {
          counters.skippedExisting += 1;
          continue;
        }

        if (dryRun) {
          counters.migrated += 1;
          continue;
        }

        if (hasExisting && overwriteExisting) {
          await conn.query(
            `
            UPDATE examination_checklist_items
            SET
              patientId = ?,
              generalDiseases = ?,
              pregnancyOrLactation = ?,
              usesAllergySupplementsSteroidsOrPressureMeds = ?,
              acneTreatment = ?,
              familyKeratoconus = ?,
              usesTearSubstituteOrExcessTearsOrSandySensation = ?,
              symptomsWorseWithAirOrAC = ?,
              glaucomaTreatment = ?,
              updatedAt = CURRENT_TIMESTAMP
            WHERE examinationId = ?
            `,
            [
              row.patientId,
              checklist.generalDiseases ? 1 : 0,
              checklist.pregnancyOrLactation ? 1 : 0,
              checklist.usesAllergySupplementsSteroidsOrPressureMeds ? 1 : 0,
              checklist.acneTreatment ? 1 : 0,
              checklist.familyKeratoconus ? 1 : 0,
              checklist.usesTearSubstituteOrExcessTearsOrSandySensation ? 1 : 0,
              checklist.symptomsWorseWithAirOrAC ? 1 : 0,
              checklist.glaucomaTreatment ? 1 : 0,
              examinationId,
            ],
          );
        } else {
          await conn.query(
            `
            INSERT INTO examination_checklist_items (
              examinationId,
              patientId,
              generalDiseases,
              pregnancyOrLactation,
              usesAllergySupplementsSteroidsOrPressureMeds,
              acneTreatment,
              familyKeratoconus,
              usesTearSubstituteOrExcessTearsOrSandySensation,
              symptomsWorseWithAirOrAC,
              glaucomaTreatment
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `,
            [
              examinationId,
              row.patientId,
              checklist.generalDiseases ? 1 : 0,
              checklist.pregnancyOrLactation ? 1 : 0,
              checklist.usesAllergySupplementsSteroidsOrPressureMeds ? 1 : 0,
              checklist.acneTreatment ? 1 : 0,
              checklist.familyKeratoconus ? 1 : 0,
              checklist.usesTearSubstituteOrExcessTearsOrSandySensation ? 1 : 0,
              checklist.symptomsWorseWithAirOrAC ? 1 : 0,
              checklist.glaucomaTreatment ? 1 : 0,
            ],
          );
        }

        counters.migrated += 1;
      } catch (error) {
        counters.failed += 1;
        console.error(`[backfill-exam-checklist] row id=${row.id} patientId=${row.patientId} failed`, error);
      }
    }

    console.log("[backfill-exam-checklist] done", {
      mode: dryRun ? "dry-run" : "apply",
      overwriteExisting,
      ...counters,
    });
  } finally {
    await conn.end();
  }
}

main().catch((error) => {
  console.error("[backfill-exam-checklist] fatal", error);
  process.exit(1);
});
