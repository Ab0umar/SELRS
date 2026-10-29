import { afterAll, beforeAll, describe, expect, it } from "vitest";
import mysql from "mysql2/promise";
import { readFile } from "node:fs/promises";
import { getTestDb } from "./setup";
import { randomUUID } from "node:crypto";

let connection: mysql.Connection | undefined;
const prefix = `mbf_${randomUUID().slice(0, 8)}_`;
const tables = [
  "visits",
  "examinations",
  "doctorReports",
  "sheet_entries",
  "followupSheets",
  "followupItems",
  "autorefractometryData",
  "afterRefractionData",
  "glassesRecords",
  "pentacamResults",
  "surgeries",
  "prescriptions",
  "testRequests",
  "diseases",
  "systemSettings",
  "symptomCatalog",
  "visitDiagnosisCodes",
  "visitSymptomCodes",
  "visitComplaints",
  "visitSymptoms",
  "visitDiagnoses",
  "visitTreatmentPlans",
  "visitDecisions",
  "visitMedicalHistory",
  "airPuffMeasurements",
  "examinationFindings",
  "examinationProcedurePlans",
  "fundusFindings",
  "medicalMigrationConflicts",
  "patientPageStates",
  "examination_checklist_items",
];
const tablePattern = new RegExp(
  "\\b(FROM|JOIN|INTO|UPDATE|TABLE(?:\\s+IF\\s+NOT\\s+EXISTS)?)\\s+`?(" +
    tables.join("|") +
    ")`?(?=\\s|\\(|;|$)",
  "gi",
);
const isolated = (sql: string) =>
  sql.replace(
    tablePattern,
    (_match, keyword: string, name: string) =>
      `${keyword} \`${prefix + name}\``,
  );
async function execute(sql: string, parameters: unknown[] = []) {
  return connection!.query(isolated(sql), parameters);
}
async function migrate() {
  for (const file of [
    "0044_backfill_medical_service_records.sql",
    "0045_backfill_typed_examination_records.sql",
    "0046_complete_typed_measurements.sql",
  ]) {
    const source = await readFile(
      new URL(`../../drizzle/${file}`, import.meta.url),
      "utf8",
    );
    for (const statement of source
      .split(/--> statement-breakpoint\s*/)
      .map((part) => part.trim())
      .filter(Boolean)) {
      try {
        await execute(statement);
      } catch (error) {
        if (
          (error as { code?: string }).code !== "ER_DUP_FIELDNAME" ||
          !/\bALTER TABLE\b[\s\S]*\bADD COLUMN\b/.test(statement)
        )
          throw error;
      }
    }
  }
}
async function rows(sql: string) {
  return (await connection!.query<mysql.RowDataPacket[]>(isolated(sql)))[0];
}

beforeAll(async () => {
  await getTestDb();
  connection = await mysql.createConnection(process.env.DATABASE_TEST_URL!);
  // Unique tables isolate migration writes; MySQL cannot reopen temporary targets.
  for (const table of tables) {
    const [definition] = await connection.query<mysql.RowDataPacket[]>(
      `SHOW CREATE TABLE \`${table}\``,
    );
    const ddl = String(definition[0]["Create Table"])
      .replace(/^CREATE TABLE `[^`]+`/, `CREATE TABLE \`${prefix + table}\``)
      .split("\n")
      .filter((line) => !/^\s*CONSTRAINT\b/.test(line))
      .join("\n")
      .replace(/,\n\)/g, "\n)");
    await connection.query(ddl);
  }
  await execute(
    "INSERT INTO visits(id,patientId,visitDate) VALUES (10,1,'2026-03-15 12:00:00'),(11,2,'2026-03-16 12:00:00'),(12,2,'2026-03-16 14:00:00')",
  );
  await execute(
    "INSERT INTO diseases(id,name,abbrev) VALUES (7,'Cataract','CAT')",
  );
  await execute(
    "INSERT INTO doctorReports(id,patientId,visitId,diagnosis,clinicalOpinion,diseases,recommendations) VALUES (30,1,10,'Cataract','Blurred vision','[\"CAT\"]','Review'),(31,2,11,'First diagnosis',NULL,NULL,NULL),(32,2,11,'Different diagnosis',NULL,NULL,NULL)",
  );
  await execute(
    "INSERT INTO visitComplaints(patientId,visitId,complaint) VALUES (1,10,'')",
  );
  await execute(
    "INSERT INTO examinations(id,patientId,visitId,bcvaOD,iopOD,posteriorSegmentOD) VALUES (20,1,10,'6/12','18',?)",
    [
      JSON.stringify({
        discStatus: "Disc finding",
        otherFindings: "Fundus note",
      }),
    ],
  );
  await execute(
    "INSERT INTO autorefractometryData(patientId,examinationId,sphereOD,bcvaOD,iopOD) VALUES (1,20,'1','6/9','18')",
  );
  await execute("UPDATE examinations SET radiologyLabsNotes=? WHERE id=20", [
    JSON.stringify({ notes: "Investigation note", tests: [123] }),
  ]);
  await execute(
    "INSERT INTO glassesRecords(patientId,examinationId,bcvaOD) VALUES (1,20,NULL)",
  );
  await execute(
    "INSERT INTO sheet_entries(patientId,sheetType,content) VALUES (1,'consultant',?)",
    [
      JSON.stringify({
        visitId: 10,
        readingValue: "J2",
        examData: {
          glasses: { os: { pd: "invalid measurement exceeding twenty characters" } },
          autorefraction: { od: { s2: "2", c2: "-2", a2: "100" } },
          pentacam: { od: { k1: "43", k2: "44", ax1: "90", ax2: "150" } },
        },
        officeNotes: "Visit note",
        consultantExam: { externalPtosis: false, muscleNormal: true },
        treatmentPlan: { OD: { target: "Procedure target" } },
      }),
    ],
  );
  await execute(
    "INSERT INTO followupSheets(id,patientId,sheetType) VALUES (40,1,'consultant'),(41,2,'consultant')",
  );
  await execute(
    "INSERT INTO followupItems(id,followupSheetId,tableIndex,followupDate,refracOD,notes) VALUES (50,40,0,'2026-03-15 12:00:00',?,'Visit note'),(51,41,0,'2026-03-16 12:00:00',NULL,NULL)",
    [JSON.stringify({ s: "1", c: "-1", a: "90" })],
  );
  await execute(
    "INSERT INTO prescriptions(id,patientId,prescriptionDate) VALUES (60,1,'2026-03-15 12:00:00')",
  );
  await execute(
    "INSERT INTO testRequests(id,patientId,visitId) VALUES (70,2,10)",
  );
  await execute(
    "INSERT INTO systemSettings(`key`,value) VALUES ('symptoms_directory',?)",
    [JSON.stringify([{ id: "sym-test", name: "Synthetic symptom" }])],
  );
  await execute(
    "INSERT INTO patientPageStates(patientId,page,data) VALUES (1,'examination',?),(2,'examination',?)",
    [
      JSON.stringify({
        visitDate: "2026-03-15",
        medicalChecklist: { glaucomaTreatment: true },
      }),
      JSON.stringify({
        visitDate: "1900-01-01",
        medicalChecklist: { generalDiseases: true },
      }),
    ],
  );
}, 30000);
afterAll(async () => {
  if (!connection) return;
  try {
    for (const table of [...tables].reverse()) {
      const target = prefix + table;
      if (!/^mbf_[a-f0-9]{8}_[A-Za-z0-9_]+$/.test(target))
        throw new Error("Invalid test cleanup target");
      await connection.query(`DROP TABLE IF EXISTS \`${target}\``);
    }
  } finally {
    await connection.end();
  }
});

describe.sequential("legacy medical backfill on isolated MySQL tables", () => {
  it("copies consistent values and preserves canonical clears and ambiguous links", async () => {
    await migrate();
    expect(
      await rows("SELECT diagnosis FROM visitDiagnoses WHERE visitId=10"),
    ).toMatchObject([{ diagnosis: "Cataract" }]);
    expect(
      await rows("SELECT diseaseId FROM visitDiagnosisCodes WHERE visitId=10"),
    ).toMatchObject([{ diseaseId: 7 }]);
    expect(
      await rows("SELECT complaint FROM visitComplaints WHERE visitId=10"),
    ).toMatchObject([{ complaint: "" }]);
    expect(
      await rows("SELECT * FROM visitDiagnoses WHERE visitId=11"),
    ).toHaveLength(0);
    expect(
      await rows("SELECT bcvaOD FROM glassesRecords WHERE examinationId=20"),
    ).toMatchObject([{ bcvaOD: null }]);
    expect(
      await rows("SELECT candidateValue FROM medicalMigrationConflicts WHERE fieldName='oversize:glassesRecords:pdOS'"),
    ).toMatchObject([{ candidateValue: "invalid measurement exceeding twenty characters" }]);
    expect(
      await rows(
        "SELECT iopOD FROM airPuffMeasurements WHERE examinationId=20",
      ),
    ).toMatchObject([{ iopOD: "18" }]);
    expect(
      await rows(
        "SELECT sphere2OD,cylinder2OD,axis2OD FROM autorefractometryData WHERE examinationId=20",
      ),
    ).toMatchObject([{ sphere2OD: "2", cylinder2OD: "-2", axis2OD: "100" }]);
    expect(
      await rows(
        "SELECT k1OD,k2OD,axis2OD FROM pentacamResults WHERE visitId=10",
      ),
    ).toMatchObject([{ k1OD: "43", k2OD: "44", axis2OD: "150" }]);
    expect(
      await rows(
        "SELECT investigationNotes FROM examinationFindings WHERE examinationId=20",
      ),
    ).toMatchObject([{ investigationNotes: "Investigation note" }]);
    expect(await rows("SELECT visitId FROM sheet_entries")).toMatchObject([
      { visitId: 10 },
    ]);
    expect(
      await rows(
        "SELECT glaucomaTreatment FROM examination_checklist_items WHERE examinationId=20",
      ),
    ).toMatchObject([{ glaucomaTreatment: 1 }]);
    expect(
      (
        await rows(
          "SELECT COUNT(*) AS count FROM medicalMigrationConflicts WHERE patientId=2 AND fieldName='checklist:generalDiseases'",
        )
      )[0].count,
    ).toBe(1);
    expect(
      await rows(
        "SELECT readingValue,muscleNormal,externalPtosis FROM examinationFindings WHERE examinationId=20",
      ),
    ).toMatchObject([
      { readingValue: "J2", muscleNormal: 1, externalPtosis: 0 },
    ]);
    expect(
      await rows(
        "SELECT discStatus FROM fundusFindings WHERE examinationId=20 AND eye='OD'",
      ),
    ).toMatchObject([{ discStatus: "Disc finding" }]);
    expect(
      await rows(
        "SELECT target FROM examinationProcedurePlans WHERE examinationId=20 AND eye='OD'",
      ),
    ).toMatchObject([{ target: "Procedure target" }]);
    expect(
      await rows("SELECT visitId FROM followupItems WHERE id=50"),
    ).toMatchObject([{ visitId: 10 }]);
    expect(
      await rows("SELECT visitId FROM followupItems WHERE id=51"),
    ).toMatchObject([{ visitId: null }]);
    expect(
      await rows("SELECT visitId FROM prescriptions WHERE id=60"),
    ).toMatchObject([{ visitId: 10 }]);
    expect(
      await rows("SELECT visitId FROM testRequests WHERE id=70"),
    ).toMatchObject([{ visitId: 10 }]);
    expect(
      (
        await rows(
          "SELECT COUNT(*) AS count FROM medicalMigrationConflicts WHERE fieldName='diagnosis' AND visitId=11",
        )
      )[0].count,
    ).toBe(2);
    expect(await rows("SELECT id FROM symptomCatalog")).toMatchObject([
      { id: "sym-test" },
    ]);
  });
  it("can run again without adding duplicate canonical records or changing archived values", async () => {
    const before = await rows(
      "SELECT COUNT(*) AS count FROM medicalMigrationConflicts",
    );
    await migrate();
    expect(
      await rows("SELECT COUNT(*) AS count FROM medicalMigrationConflicts"),
    ).toEqual(before);
    expect(
      await rows(
        "SELECT COUNT(*) AS count FROM visitDiagnoses WHERE visitId=10",
      ),
    ).toMatchObject([{ count: 1 }]);
    expect(
      await rows("SELECT diagnosis FROM doctorReports WHERE id=31"),
    ).toMatchObject([{ diagnosis: "First diagnosis" }]);
  });
});
