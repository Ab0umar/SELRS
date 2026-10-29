import { eq, inArray } from "drizzle-orm";
import { beforeEach, afterEach, describe, expect, it } from "vitest";
import {
  autorefractometryData,
  doctorReports,
  examinations,
  followupItems,
  followupSheets,
  medications,
  patients,
  pentacamResults,
  prescriptionItems,
  prescriptions,
  postOpFollowups,
  surgeries,
  testRequestItems,
  testRequests,
  tests as medicalTests,
  visits,
  visitDiagnoses,
  visitMedicalHistory,
  visitDiagnosisCodes,
  diseases,
  airPuffMeasurements,
} from "../../drizzle/schema";
import { appRouter } from "../routers";
import { makeCallerAs } from "./helpers/auth";
import { getTestDb } from "./setup";

async function cleanupTables(
  conn: Awaited<ReturnType<typeof getTestDb>>,
  ...names: string[]
) {
  for (const name of names) {
    await conn.execute(`DELETE FROM \`${name}\`` as any);
  }
  await conn
    .delete(medications)
    .where(
      inArray(medications.name, [
        "MFIX new medication",
        "MFIX original medication",
        "MFIX rejected medication",
      ]),
    );
  await conn.delete(medicalTests).where(eq(medicalTests.name, "MFIX lab"));
  await conn
    .delete(diseases)
    .where(inArray(diseases.name, ["MFIX disease a", "MFIX disease b"]));
}

// Children first: TRUNCATE is rejected for tables referenced by foreign keys.
const TABLES = [
  "medicalMigrationConflicts",
  "visitDiagnosisCodes",
  "visitSymptomCodes",
  "visitComplaints",
  "visitSymptoms",
  "visitDiagnoses",
  "visitTreatmentPlans",
  "visitDecisions",
  "visitMedicalHistory",
  "airPuffMeasurements",
  "examinationProcedurePlans",
  "fundusFindings",
  "examinationFindings",
  "sheet_entries",
  "prescriptionItems",
  "prescriptions",
  "testRequestItems",
  "testRequests",
  "followupItems",
  "followupSheets",
  "afterRefractionData",
  "glassesRecords",
  "autorefractometryData",
  "pentacamResults",
  "doctorReports",
  "postOpFollowups",
  "surgeries",
  "examinations",
  "visits",
  "patients",
];

async function seedPatient(code = "MFIX-001") {
  const conn = await getTestDb();
  await conn
    .insert(patients)
    .values({ patientCode: code, fullName: "Fix Patient" });
  const [row] = await conn
    .select()
    .from(patients)
    .where(eq(patients.patientCode, code))
    .limit(1);
  return Number(row.id);
}

const caller = (role: string) => appRouter.createCaller(makeCallerAs(role));

describe.sequential("medical review fixes", () => {
  beforeEach(async () => cleanupTables(await getTestDb(), ...TABLES));
  afterEach(async () => cleanupTables(await getTestDb(), ...TABLES));

  it("saves confirmed named items without catalog inserts and reads them after replacement", async () => {
    const patientId = await seedPatient();
    const doctor = caller("doctor");
    const conn = await getTestDb();
    const medicinesBefore = await conn.select().from(medications);
    const testsBefore = await conn.select().from(medicalTests);
    const saved = await doctor.medical.saveExaminationForm({
      patientId, visitDate: "2026-03-15", visitType: "examination",
      data: {
        diagnosis: "Doctor confirmed uncommon diagnosis",
        treatment: [
          {medicationName: "Confirmed drops A", catalogConfirmed: true, frequency: "مرتين"},
          {medicationName: "Confirmed drops B", catalogConfirmed: true, instructions: "تعليمات ب"},
        ],
        tests: [{testName: "OCT", testType: "imaging", catalogConfirmed: true, notes: "راجع النوع"}],
      },
    });
    const visitId = Number(saved.visitId);
    const prescriptionsRead = await doctor.medical.getPrescriptionsWithItemsByPatient({patientId});
    const items = prescriptionsRead.flatMap(prescription => prescription.items);
    expect(items).toEqual(expect.arrayContaining([
      expect.objectContaining({medicationId: null, medicationName: "Confirmed drops A", frequency: "مرتين", dosage: ""}),
      expect.objectContaining({medicationId: null, medicationName: "Confirmed drops B", instructions: "تعليمات ب"}),
    ]));
    const rawItems = await conn.select().from(prescriptionItems);
    expect(rawItems.every(item => item.dosage === null)).toBe(true);
    expect(await doctor.medical.getTestRequestsByVisit({visitId})).toEqual(expect.arrayContaining([
      expect.objectContaining({items: [expect.objectContaining({testId: null, testName: "OCT", testType: "imaging", result: "راجع النوع"})]}),
    ]));
    await doctor.medical.replacePrescriptionWithItems({patientId, visitId, items: [
      {medicationName: "Confirmed drops A", catalogConfirmed: true},
      {medicationName: "Confirmed drops B", catalogConfirmed: true},
    ]});
    const replaced = (await doctor.medical.getPrescriptionsWithItemsByPatient({patientId})).flatMap(prescription => prescription.items);
    expect(replaced.find(item => item.medicationName === "Confirmed drops A")?.frequency).toBe("مرتين");
    expect(replaced.find(item => item.medicationName === "Confirmed drops B")?.instructions).toBe("تعليمات ب");
    expect(await conn.select().from(medications)).toEqual(medicinesBefore);
    expect(await conn.select().from(medicalTests)).toEqual(testsBefore);
    await expect(doctor.medical.replacePrescriptionWithItems({patientId, visitId, items:[{medicationId:2147483647, medicationName:"Confirmed drops A", catalogConfirmed:true}]})).rejects.toThrow();
    expect((await doctor.medical.getPrescriptionsWithItemsByPatient({patientId})).flatMap(prescription=>prescription.items)).toHaveLength(2);
    await expect(doctor.medical.replaceTestRequest({patientId, visitId, items: [{testId: 2147483647, testName:"OCT", catalogConfirmed:true}]})).rejects.toThrow();
    expect((await doctor.medical.getTestRequestsByVisit({visitId}))[0].items[0].testName).toBe("OCT");
  });

  it("rejects unconfirmed named visit items before writing clinical records", async () => {
    const patientId = await seedPatient();
    await expect(caller("doctor").medical.saveExaminationForm({patientId, visitDate:"2026-03-15",visitType:"examination",data:{treatment:[{medicationName:"Unreviewed"}]}})).rejects.toThrow();
    expect(await (await getTestDb()).select().from(prescriptions)).toHaveLength(0);
  });

  it("clinical reads reject roles without patient access", async () => {
    await expect(caller("worker").medical.getVisits()).rejects.toMatchObject({
      code: "FORBIDDEN",
    });
    await expect(
      caller("reception").medical.getVisits(),
    ).resolves.toBeDefined();
  });

  it("getSystemSetting hides sensitive keys from non-admins", async () => {
    await expect(
      caller("reception").medical.getSystemSetting({
        key: "team_permissions_v1",
      }),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(
      caller("reception").medical.getSystemSetting({
        key: "mssql_sync_state_v1",
      }),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("saveMedicalVisit is idempotent for the same visit", async () => {
    const patientId = await seedPatient();
    const input = {
      patientId,
      visitDate: "2026-03-15",
      diagnosis: "Dx",
      pentacam: { od: { k1: "43.1" }, os: { k1: "43.5" } },
    };
    const doctor = caller("doctor");
    await doctor.medical.saveMedicalVisit(input);
    await doctor.medical.saveMedicalVisit({ ...input, diagnosis: "Dx2" });

    const conn = await getTestDb();
    expect(await conn.select().from(visits)).toHaveLength(1);
    expect(await conn.select().from(examinations)).toHaveLength(1);
    expect(await conn.select().from(pentacamResults)).toHaveLength(1);
    const reports = await conn.select().from(doctorReports);
    expect(reports).toHaveLength(1);
    const [diagnosis] = await conn.select().from(visitDiagnoses);
    expect(diagnosis.diagnosis).toBe("Dx2");
  });

  it("saveExaminationForm updates pentacam instead of duplicating it", async () => {
    const patientId = await seedPatient();
    const doctor = caller("doctor");
    const base = {
      patientId,
      visitDate: "2026-03-15",
      visitType: "examination",
    };
    await doctor.medical.saveExaminationForm({
      ...base,
      data: { pentacam: { od: { k1: "42" }, os: {} } },
    });
    await doctor.medical.saveExaminationForm({
      ...base,
      data: { pentacam: { od: { k1: "44" }, os: {} } },
    });
    const rows = await (await getTestDb()).select().from(pentacamResults);
    expect(rows).toHaveLength(1);
    expect(rows[0].k1OD).toBe("44");
  });

  it("updateExamination cannot reassign the patient and can clear refraction", async () => {
    const patientId = await seedPatient();
    const otherId = await seedPatient("MFIX-002");
    const doctor = caller("doctor");
    await doctor.medical.saveMedicalVisit({
      patientId,
      visitDate: "2026-03-15",
      diagnosis: "Dx",
      autoref: { od: { s: "-2.00" } },
    });
    const conn = await getTestDb();
    const [exam] = await conn.select().from(examinations);

    await doctor.medical.updateExamination({
      examinationId: exam.id,
      updates: { patientId: otherId, sphereOD: "" },
    });

    const [after] = await conn.select().from(examinations);
    expect(after.patientId).toBe(patientId);
    const [refraction] = await conn.select().from(autorefractometryData);
    expect(refraction.sphereOD).toBe("");
  });

  it("updatePentacamResult creating a record stores the values", async () => {
    const patientId = await seedPatient();
    await caller("doctor").medical.updatePentacamResult({
      visitId: 1,
      patientId,
      k1OD: "43.0",
      thinnestPointOS: "520",
    });
    const [row] = await (await getTestDb()).select().from(pentacamResults);
    expect(row.k1OD).toBe("43.0");
    expect(row.thinnestPointOS).toBe("520");
  });

  it("updateDoctorReport writes diseases without clobbering additionalNotes", async () => {
    const patientId = await seedPatient();
    const doctor = caller("doctor");
    const conn = await getTestDb();
    const [visit] = await conn
      .insert(visits)
      .values({ patientId, visitDate: new Date("2026-03-15T12:00:00") });
    const [first] = await conn
      .insert(diseases)
      .values({ name: "MFIX disease a" });
    const [second] = await conn
      .insert(diseases)
      .values({ name: "MFIX disease b" });
    await doctor.medical.createDoctorReport({
      visitId: visit.insertId,
      patientId,
      diagnosis: "Dx",
      additionalNotes: "keep me",
    });
    const [report] = await conn.select().from(doctorReports);
    await doctor.medical.updateDoctorReport({
      reportId: report.id,
      diseases: [first.insertId, second.insertId],
    });
    const [after] = await conn.select().from(visitMedicalHistory);
    expect(after.history).toBe("keep me");
    const codes = await conn.select().from(visitDiagnosisCodes);
    expect(codes.map((code) => code.diseaseId).sort()).toEqual(
      [first.insertId, second.insertId].sort(),
    );
  });

  it("updateMedicalReport only changes the fields it receives", async () => {
    const patientId = await seedPatient();
    const doctor = caller("doctor");
    await doctor.medical.createMedicalReport({
      patientId,
      visitDate: "2026-03-15",
      diagnosis: "Dx",
      recommendations: "rest",
    });
    const conn = await getTestDb();
    const [report] = await conn.select().from(doctorReports);
    await doctor.medical.updateMedicalReport({
      reportId: report.id,
      diagnosis: "Dx2",
    });
    const [after] = await doctor.medical.getDoctorReportsByVisit({
      visitId: report.visitId,
    });
    expect(after.diagnosis).toBe("Dx2");
    expect(after.recommendations).toBe("rest");
  });

  it("createSurgery keeps pre-op values and post-op follow-up resolves the patient", async () => {
    const patientId = await seedPatient();
    const doctor = caller("doctor");
    await doctor.medical.createSurgery({
      patientId,
      surgeryType: "LASIK",
      surgeryDate: "2026-04-01",
      preOpUCVA_OD: "6/60",
    });
    const conn = await getTestDb();
    const [surgery] = await conn.select().from(surgeries);
    expect(surgery.notes).toContain("6/60");

    await doctor.medical.createPostOpFollowup({
      surgeryId: surgery.id,
      findings: "ok",
    });
    const [followup] = await conn.select().from(postOpFollowups);
    expect(followup.patientId).toBe(patientId);
  });

  it("reception cannot replace prescriptions or delete surgeries", async () => {
    await expect(
      caller("reception").medical.replacePrescriptionWithItems({
        patientId: 1,
        visitId: 1,
        items: [],
      }),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(
      caller("reception").medical.deleteSurgery({ surgeryId: 1 }),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("stores new prescription medications with their own generated identifiers", async () => {
    const patientId = await seedPatient();
    const doctor = caller("doctor");
    await doctor.medical.createPrescriptionWithItems({
      patientId,
      items: [{ medicationName: "MFIX new medication", dosage: "one drop" }],
    });
    const conn = await getTestDb();
    const [prescription] = await conn.select().from(prescriptions);
    const [item] = await conn.select().from(prescriptionItems);
    expect(item.prescriptionId).toBe(prescription.id);
    const [medication] = await conn
      .select()
      .from(medications)
      .where(eq(medications.id, item.medicationId));
    expect(medication.name).toBe("MFIX new medication");
  });

  it("rolls back a failed replacement and retains the original prescription", async () => {
    const patientId = await seedPatient();
    const doctor = caller("doctor");
    await doctor.medical.saveMedicalVisit({
      patientId,
      visitDate: "2026-03-15",
      diagnosis: "Dx",
    });
    const conn = await getTestDb();
    const [visit] = await conn.select().from(visits);
    await doctor.medical.createPrescriptionWithItems({
      patientId,
      visitId: visit.id,
      items: [{ medicationName: "MFIX original medication" }],
    });
    const original = await conn.select().from(prescriptions);
    const originalItems = await conn.select().from(prescriptionItems);
    await expect(
      doctor.medical.replacePrescriptionWithItems({
        patientId,
        visitId: visit.id,
        items: [
          {
            medicationName: "MFIX rejected medication",
            dosage: "x".repeat(101),
          },
        ],
      }),
    ).rejects.toThrow();
    expect(await conn.select().from(prescriptions)).toEqual(original);
    expect(await conn.select().from(prescriptionItems)).toEqual(originalItems);
    expect(
      await conn
        .select()
        .from(medications)
        .where(eq(medications.name, "MFIX rejected medication")),
    ).toHaveLength(0);
  });

  it("stores five followups across two sheets and edits their persisted rows without creating versions", async () => {
    const patientId = await seedPatient();
    const doctor = caller("doctor");
    await doctor.medical.saveFollowupSheet({
      patientId,
      sheetType: "consultant",
      followupItems: Array.from({ length: 5 }, (_, index) => ({
        tableIndex: index % 4,
        followupDate: `2026-03-${15 + index}`,
        notes: `visit ${index}`,
      })),
    });
    const conn = await getTestDb();
    const sheets = await conn.select().from(followupSheets);
    const stored = (
      await doctor.medical.getFollowupSheets({
        patientId,
        sheetType: "consultant",
      })
    ).flatMap(
      (sheet: {
        items: Array<{ id: number; tableIndex: number; notes: string }>;
      }) => sheet.items,
    );
    expect(sheets).toHaveLength(2);
    expect(stored.map((item) => item.notes).sort()).toEqual([
      "visit 0",
      "visit 1",
      "visit 2",
      "visit 3",
      "visit 4",
    ]);
    await doctor.medical.saveFollowupSheet({
      patientId,
      sheetType: "consultant",
      followupItems: stored.map((item) => ({
        itemId: item.id,
        tableIndex: item.tableIndex,
        followupDate: "2026-03-20",
        notes: `${item.notes} edited`,
      })),
    });
    expect(await conn.select().from(followupSheets)).toHaveLength(2);
    const edited = (
      await doctor.medical.getFollowupSheets({
        patientId,
        sheetType: "consultant",
      })
    ).flatMap(
      (sheet: { items: Array<{ id: number; notes: string }> }) => sheet.items,
    );
    expect(edited).toHaveLength(5);
    expect(edited.every((item) => item.notes?.endsWith(" edited"))).toBe(true);
  });

  it.each(["sphereOD", "iopOD"] as const)(
    "clears %s when the medical file sends null",
    async (field) => {
      const patientId = await seedPatient();
      const doctor = caller("doctor");
      await doctor.medical.saveMedicalVisit({
        patientId,
        visitDate: "2026-03-15",
        autoref: { od: { s: "-2.00" } },
        iop: { od: "18" },
      });
      const conn = await getTestDb();
      const [exam] = await conn.select().from(examinations);
      await doctor.medical.updateExamination({
        examinationId: exam.id,
        updates: { [field]: null },
      });
      const value =
        field === "iopOD"
          ? (await conn.select().from(airPuffMeasurements))[0].iopOD
          : (await conn.select().from(autorefractometryData))[0].sphereOD;
      expect(value).toBeNull();
    },
  );

  it("loads Pentacam measurements from the requested historical visit", async () => {
    const patientId = await seedPatient();
    const doctor = caller("doctor");
    await doctor.medical.saveMedicalVisit({
      patientId,
      visitDate: "2026-03-15",
      pentacam: { od: { k1: "42" } },
    });
    const conn = await getTestDb();
    const [oldVisit] = await conn.select().from(visits);
    await doctor.medical.saveMedicalVisit({
      patientId,
      visitDate: "2026-03-16",
      pentacam: { od: { k1: "44" } },
    });
    const sheet = await doctor.medical.getSheetEntry({
      patientId,
      visitId: oldVisit.id,
      sheetType: "lasik",
    });
    expect(JSON.parse(sheet).examData.pentacam.od.k1).toBe("42");
  });

  it("rejects reception on both prescription creation endpoints", async () => {
    await expect(
      caller("reception").medical.createPrescriptionWithItems({
        patientId: 1,
        items: [{ medicationName: "denied" }],
      }),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(
      caller("reception").medical.createPrescription({
        patientId: 1,
        visitId: 1,
        medicationName: "denied",
        dosage: "one",
      }),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("rolls back test-request replacement when an item cannot be stored", async () => {
    const patientId = await seedPatient();
    const doctor = caller("doctor");
    await doctor.medical.saveMedicalVisit({
      patientId,
      visitDate: "2026-03-15",
      diagnosis: "Dx",
    });
    const conn = await getTestDb();
    const [visit] = await conn.select().from(visits);
    const [catalog] = await conn
      .insert(medicalTests)
      .values({ name: "MFIX lab", type: "lab" });
    await doctor.medical.replaceTestRequest({
      patientId,
      visitId: visit.id,
      items: [{ testId: catalog.insertId, notes: "keep result" }],
    });
    const original = await conn.select().from(testRequests);
    const originalItems = await conn.select().from(testRequestItems);
    await expect(
      doctor.medical.replaceTestRequest({
        patientId,
        visitId: visit.id,
        items: [{ testId: catalog.insertId, notes: "x".repeat(70000) }],
      }),
    ).rejects.toThrow();
    expect(await conn.select().from(testRequests)).toEqual(original);
    expect(await conn.select().from(testRequestItems)).toEqual(originalItems);
  });

  it("rejects a followup belonging to another patient and rolls back new rows", async () => {
    const patientId = await seedPatient();
    const otherId = await seedPatient("MFIX-002");
    const doctor = caller("doctor");
    await doctor.medical.saveFollowupSheet({
      patientId,
      sheetType: "lasik",
      followupItems: [{ tableIndex: 0, followupDate: "2026-03-15" }],
    });
    const conn = await getTestDb();
    const [existing] = await conn.select().from(followupItems);
    await expect(
      doctor.medical.saveFollowupSheet({
        patientId: otherId,
        sheetType: "lasik",
        followupItems: [
          { tableIndex: 0, followupDate: "2026-03-16" },
          { itemId: existing.id, tableIndex: 1, followupDate: "2026-03-17" },
        ],
      }),
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
    expect(await conn.select().from(followupItems)).toEqual([existing]);
    expect(await conn.select().from(followupSheets)).toHaveLength(1);
  });

  it("allocates concurrent followups into distinct slots", async () => {
    const patientId = await seedPatient();
    const doctor = caller("doctor");
    await Promise.all(
      Array.from({ length: 5 }, (_, index) =>
        doctor.medical.saveFollowupSheet({
          patientId,
          sheetType: "consultant",
          appendMode: true,
          followupItems: [
            {
              tableIndex: 0,
              followupDate: "2026-03-15",
              notes: `concurrent ${index}`,
            },
          ],
        }),
      ),
    );
    const conn = await getTestDb();
    const items = await conn.select().from(followupItems);
    expect(items).toHaveLength(5);
    expect(
      new Set(items.map((item) => `${item.followupSheetId}:${item.tableIndex}`))
        .size,
    ).toBe(5);
    expect(await conn.select().from(followupSheets)).toHaveLength(2);
  });

  it("updates and clears examination tests and prescriptions after the first save", async () => {
    const patientId = await seedPatient();
    const doctor = caller("doctor");
    const conn = await getTestDb();
    const [medication] = await conn
      .insert(medications)
      .values({ name: "MFIX new medication", type: "other" });
    const [test] = await conn
      .insert(medicalTests)
      .values({ name: "MFIX lab", type: "lab" });
    const base = {
      patientId,
      visitDate: "2026-03-15",
      visitType: "examination",
    };
    await doctor.medical.saveExaminationForm({
      ...base,
      data: { sphereOD: "-2" },
    });
    await doctor.medical.saveExaminationForm({
      ...base,
      data: { tests: [test.insertId], treatment: [medication.insertId] },
    });
    expect(
      (await conn.select().from(prescriptionItems)).map(
        (item) => item.medicationId,
      ),
    ).toEqual([medication.insertId]);
    expect(
      (await conn.select().from(testRequestItems)).map((item) => item.testId),
    ).toEqual([test.insertId]);
    await doctor.medical.saveExaminationForm({
      ...base,
      data: { tests: [], treatment: [] },
    });
    expect(await conn.select().from(prescriptions)).toHaveLength(0);
    expect(await conn.select().from(testRequests)).toHaveLength(0);
  });

  it.each(["2026-10-25", "2026-10-25T08:00:00.000Z"])(
    "accepts prescription date %s without losing its meaning",
    async (date) => {
      const patientId = await seedPatient();
      await caller("doctor").medical.createPrescriptionWithItems({
        patientId,
        date,
        items: [{ medicationName: "MFIX new medication" }],
      });
      const [saved] = await (await getTestDb()).select().from(prescriptions);
      if (date.includes("T"))
        expect(saved.prescriptionDate.toISOString()).toBe(date);
      else {
        expect(saved.prescriptionDate.getDate()).toBe(25);
        expect(saved.prescriptionDate.getHours()).toBe(12);
      }
    },
  );

  it("rejects missing medication IDs without leaving an empty prescription", async () => {
    const patientId = await seedPatient();
    await expect(
      caller("doctor").medical.createPrescriptionWithItems({
        patientId,
        items: [
          { medicationId: 2147480000, medicationName: "Missing medication" },
        ],
      }),
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
    const conn = await getTestDb();
    expect(await conn.select().from(prescriptions)).toHaveLength(0);
    expect(await conn.select().from(prescriptionItems)).toHaveLength(0);
  });

  it("retains the old prescription when its replacement references a deleted medication", async () => {
    const patientId = await seedPatient();
    const doctor = caller("doctor");
    await doctor.medical.saveMedicalVisit({
      patientId,
      visitDate: "2026-03-15",
      diagnosis: "Dx",
    });
    const conn = await getTestDb();
    const [visit] = await conn.select().from(visits);
    await doctor.medical.createPrescriptionWithItems({
      patientId,
      visitId: visit.id,
      items: [{ medicationName: "MFIX original medication" }],
    });
    const original = await conn.select().from(prescriptions);
    const originalItems = await conn.select().from(prescriptionItems);
    await expect(
      doctor.medical.replacePrescriptionWithItems({
        patientId,
        visitId: visit.id,
        items: [
          { medicationId: 2147480000, medicationName: "Missing medication" },
        ],
      }),
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
    expect(await conn.select().from(prescriptions)).toEqual(original);
    expect(await conn.select().from(prescriptionItems)).toEqual(originalItems);
  });
});
