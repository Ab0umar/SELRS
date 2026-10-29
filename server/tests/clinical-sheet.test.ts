import { describe, expect, it } from "vitest";
import { getTableName, type SQL } from "drizzle-orm";
import type { MySql2Database } from "drizzle-orm/mysql2";
import { saveClinicalSheet } from "../services/clinical-sheet";
import { savePatientFollowups } from "../services/followup-persistence";
import {
  savePrescription,
  saveTestRequest,
  replaceVisitTestRequests,
} from "../services/prescription-persistence";
import {
  autorefractometryData,
  doctorReports,
  examinations,
  patients,
  sheetEntries,
  visits,
  medications,
  prescriptions,
  prescriptionItems,
  testRequests,
  testRequestItems,
  visitDiagnoses,
  visitDecisions,
  airPuffMeasurements,
  fundusFindings,
  followupItems,
  examinationFindings,
  visitTreatmentPlans,
  diseases,
  visitDiagnosisCodes,
  tests,
} from "../../drizzle/schema";

type Row = Record<string, unknown>;
function database() {
  const tables = new Map<string, Row[]>();
  const rows = (table: Parameters<typeof getTableName>[0]) => {
    const name = getTableName(table);
    if (!tables.has(name)) tables.set(name, []);
    return tables.get(name)!;
  };
  const matches = (row: Row, condition: SQL): boolean => {
    const chunks = condition.queryChunks as Array<{
      name?: string;
      value?: unknown;
      queryChunks?: unknown[];
    }>;
    const column = chunks.find(
      (chunk) => chunk && typeof chunk.name === "string",
    );
    const parameter = chunks.find(
      (chunk) => chunk && "value" in chunk && !Array.isArray(chunk.value),
    );
    if (column && parameter) return row[column.name!] === parameter.value;
    const nested = chunks.filter(
      (chunk) => chunk?.queryChunks,
    ) as unknown as SQL[];
    const separators = chunks
      .filter((chunk) => Array.isArray(chunk?.value))
      .flatMap((chunk) => chunk.value as unknown[])
      .join(" ");
    return /\bor\b/i.test(separators)
      ? nested.some((child) => matches(row, child))
      : nested.every((child) => matches(row, child));
  };
  const connection = {
    transaction: async (callback: (tx: unknown) => unknown) => {
      const backup = structuredClone(tables);
      try {
        return await callback(connection);
      } catch (error) {
        tables.clear();
        for (const [key, value] of backup) tables.set(key, value);
        throw error;
      }
    },
    select: () => ({
      from: (table: Parameters<typeof getTableName>[0]) => {
        let selected = rows(table);
        const query = {
          where: (condition: SQL) => {
            selected = selected.filter((row) => matches(row, condition));
            return query;
          },
          orderBy: () => query,
          limit: (limit: number) => {
            selected = selected.slice(0, limit);
            return query;
          },
          for: () => query,
          then: (resolve: (value: Row[]) => unknown) =>
            Promise.resolve(selected).then(resolve),
        };
        return query;
      },
    }),
    insert: (table: Parameters<typeof getTableName>[0]) => ({
      values: async (value: Row | Row[]) => {
        const id = rows(table).length + 1;
        for (const item of Array.isArray(value) ? value : [value])
          rows(table).push({ id: rows(table).length + 1, ...item });
        return [{ insertId: id }];
      },
    }),
    update: (table: Parameters<typeof getTableName>[0]) => ({
      set: (value: Row) => ({
        where: async (condition: SQL) => {
          for (const row of rows(table).filter((row) =>
            matches(row, condition),
          ))
            Object.assign(row, value);
        },
      }),
    }),
    delete: (table: Parameters<typeof getTableName>[0]) => ({
      where: async (condition: SQL) => {
        const keep = rows(table).filter((row) => !matches(row, condition));
        tables.set(getTableName(table), keep);
      },
    }),
  };
  rows(patients).push({ id: 5 });
  rows(tests).push({id:8,name:"Synthetic test"});
  rows(visits).push({
    id: 10,
    patientId: 5,
    visitDate: new Date("2026-03-15T12:00:00"),
  });
  return { connection: connection as unknown as MySql2Database, rows };
}

describe("clinical sheet persistence boundary", () => {
  it("rejects an ambiguous diagnosis abbreviation without changing the visit", async () => {
    const { connection, rows } = database();
    rows(diseases).push(
      { id: 4, name: "First diagnosis", abbrev: "SAME" },
      { id: 5, name: "Second diagnosis", abbrev: "SAME" },
    );
    await expect(
      saveClinicalSheet(
        connection,
        {
          patientId: 5,
          visitId: 10,
          sheetType: "consultant",
          content: JSON.stringify({ diseases: ["SAME"] }),
        },
        7,
      ),
    ).rejects.toThrow("ambiguous");
    expect(rows(visitDiagnosisCodes)).toEqual([]);
    expect(rows(visitDiagnoses)).toEqual([]);
  });
  it("resolves an exact diagnosis abbreviation and preserves its explicit clear", async () => {
    const { connection, rows } = database();
    rows(diseases).push({ id: 4, name: "Cataract", abbrev: "CAT" });
    await saveClinicalSheet(
      connection,
      {
        patientId: 5,
        visitId: 10,
        sheetType: "consultant",
        content: JSON.stringify({ diseases: ["CAT"] }),
      },
      7,
    );
    expect(rows(visitDiagnosisCodes)).toMatchObject([
      { patientId: 5, visitId: 10, diseaseId: 4 },
    ]);
    await saveClinicalSheet(
      connection,
      {
        patientId: 5,
        visitId: 10,
        sheetType: "consultant",
        content: JSON.stringify({ diseases: [] }),
      },
      7,
    );
    expect(rows(visitDiagnosisCodes)).toEqual([]);
    expect(rows(visitDiagnoses)).toHaveLength(1);
  });
  it("stores followup measurements in the examination tables and reuses the saved item", async () => {
    const { connection, rows } = database();
    const first = await savePatientFollowups(connection, {
      patientId: 5,
      doctorId: 7,
      sheetType: "consultant",
      followupItems: [
        {
          visitId: 10,
          tableIndex: 0,
          followupDate: new Date("2026-03-15T12:00:00"),
          vaOD: "6/12",
          iopOD: "18",
          treatment: "Review medication",
          notes: "Followup note",
          refracOD: JSON.stringify({ s: "1", c: "-1", axis: "90" }),
          clinicalContent: { fundus: { od: { discStatus: "Disc finding" } } },
        },
      ],
    });
    expect(rows(followupItems)).toHaveLength(1);
    expect(rows(followupItems)[0]).toMatchObject({
      visitId: 10,
      tableIndex: 0,
    });
    expect(rows(followupItems)[0].vaOD).toBeUndefined();
    expect(rows(followupItems)[0].refracOD).toBeUndefined();
    expect(rows(autorefractometryData)[0]).toMatchObject({
      sphereOD: "1",
      ucvaOD: "6/12",
    });
    expect(rows(airPuffMeasurements)[0].iopOD).toBe("18");
    expect(rows(fundusFindings)[0].discStatus).toBe("Disc finding");
    expect(rows(examinationFindings)[0].clinicNotes).toBe("Followup note");
    expect(rows(visitTreatmentPlans)[0].treatment).toBe("Review medication");
    await savePatientFollowups(connection, {
      patientId: 5,
      doctorId: 7,
      sheetType: "consultant",
      followupItems: [
        {
          itemId: first.items[0].itemId,
          tableIndex: 3,
          followupDate: new Date("2026-03-15T12:00:00"),
          vaOD: "6/6",
        },
      ],
    });
    expect(rows(followupItems)).toHaveLength(1);
    expect(rows(followupItems)[0].tableIndex).toBe(0);
    expect(rows(autorefractometryData)[0].ucvaOD).toBe("6/6");
  });
  it("writes diagnosis, decision and measurements to their shared tables and removes snapshot copies", async () => {
    const { connection, rows } = database();
    await saveClinicalSheet(
      connection,
      {
        patientId: 5,
        visitId: 10,
        sheetType: "consultant",
        content: JSON.stringify({
          diagnosisText: "Cataract",
          finalDecisionText: "Review",
          examData: {
            autorefraction: { od: { s: "1", ucva: "6/12", iop: "18" } },
          },
        }),
      },
      7,
    );
    expect(rows(doctorReports)[0]).toMatchObject({
      patientId: 5,
      visitId: 10,
    });
    expect(rows(doctorReports)[0].diagnosis).toBeUndefined();
    expect(rows(visitDiagnoses)[0]).toMatchObject({
      visitId: 10,
      diagnosis: "Cataract",
    });
    expect(rows(visitDecisions)[0]).toMatchObject({
      visitId: 10,
      decision: "Review",
    });
    expect(rows(autorefractometryData)[0]).toMatchObject({
      examinationId: rows(examinations)[0].id,
      ucvaOD: "6/12",
    });
    expect(rows(airPuffMeasurements)[0]).toMatchObject({
      examinationId: rows(examinations)[0].id,
      iopOD: "18",
    });
    const saved = JSON.parse(String(rows(sheetEntries)[0].content));
    expect(saved.diagnosisText).toBeUndefined();
    expect(saved.examData).toBeUndefined();
    await saveClinicalSheet(
      connection,
      {
        patientId: 5,
        visitId: 10,
        sheetType: "consultant",
        content: JSON.stringify({
          diagnosisText: "",
          examData: { autorefraction: { od: { iop: "" } } },
        }),
      },
      7,
    );
    expect(rows(doctorReports)).toHaveLength(1);
    expect(rows(visitDiagnoses)[0].diagnosis).toBe("");
    expect(rows(airPuffMeasurements)[0].iopOD).toBe("");
    expect(rows(autorefractometryData)[0].ucvaOD).toBe("6/12");
  });
  it("rejects another patient's visit without changing any records", async () => {
    const { connection, rows } = database();
    await expect(
      saveClinicalSheet(
        connection,
        { patientId: 5, visitId: 99, sheetType: "consultant", content: "{}" },
        7,
      ),
    ).rejects.toThrow("does not belong");
    expect(rows(examinations)).toHaveLength(0);
    expect(rows(sheetEntries)).toHaveLength(0);
  });
  it("saves the specialist's edited decision over a stale compatibility alias", async () => {
    const { connection, rows } = database();
    await saveClinicalSheet(
      connection,
      {
        patientId: 5,
        visitId: 10,
        sheetType: "specialist",
        content: JSON.stringify({
          finalDecision: "Updated specialist decision",
          finalDecisionText: "Previous decision",
        }),
      },
      7,
    );
    expect(rows(visitDecisions)[0].decision).toBe(
      "Updated specialist decision",
    );
  });
  it("updates a sheet's fundus note without discarding structured examination findings", async () => {
    const { connection, rows } = database();
    rows(examinations).push({
      id: 20,
      patientId: 5,
      visitId: 10,
      posteriorSegmentOD: JSON.stringify({
        discStatus: "Synthetic disc finding",
        otherFindings: "Previous note",
      }),
    });
    rows(fundusFindings).push({
      id: 1,
      patientId: 5,
      visitId: 10,
      examinationId: 20,
      eye: "OD",
      discStatus: "Synthetic disc finding",
      otherFindings: "Previous note",
    });
    await saveClinicalSheet(
      connection,
      {
        patientId: 5,
        visitId: 10,
        sheetType: "consultant",
        content: JSON.stringify({ fundus: { od: "Updated fundus note" } }),
      },
      7,
    );
    expect(rows(fundusFindings)[0]).toMatchObject({
      discStatus: "Synthetic disc finding",
      otherFindings: "Updated fundus note",
    });
    expect(
      JSON.parse(String(rows(examinations)[0].posteriorSegmentOD))
        .otherFindings,
    ).toBe("Previous note");
    expect(
      JSON.parse(String(rows(sheetEntries)[0].content)).fundus,
    ).toBeUndefined();
  });
  it("attaches a standalone prescription to the date's visit and preserves its instructions", async () => {
    const { connection, rows } = database();
    rows(medications).push({ id: 4, name: "Synthetic eye drops" });
    await savePrescription(connection, {
      patientId: 5,
      date: "2026-03-15",
      items: [
        {
          medicationId: 4,
          medicationName: "Synthetic eye drops",
          dosage: "1 drop",
          instructions: "Synthetic instructions",
        },
      ],
    });
    expect(rows(prescriptions)[0].visitId).toBe(10);
    expect(rows(prescriptionItems)[0]).toMatchObject({
      medicationId: 4,
      dosage: "1 drop",
      instructions: "Synthetic instructions",
    });
  });
  it("rejects ambiguous same-day prescriptions without writing a header", async () => {
    const { connection, rows } = database();
    rows(visits).push({
      id: 11,
      patientId: 5,
      visitDate: new Date("2026-03-15T12:00:00"),
    });
    await expect(
      savePrescription(connection, {
        patientId: 5,
        date: "2026-03-15",
        items: [{ medicationName: "Synthetic" }],
      }),
    ).rejects.toThrow("Multiple visits");
    expect(rows(prescriptions)).toHaveLength(0);
  });
  it("retains general and per-test notes when creating a standalone request", async () => {
    const { connection, rows } = database();
    await saveTestRequest(connection, {
      patientId: 5,
      date: "2026-03-15",
      notes: "General request instructions",
      items: [{ testId: 8, notes: "Per-test instructions" }],
    });
    expect(rows(testRequests)[0]).toMatchObject({
      visitId: 10,
      notes: "General request instructions",
    });
    expect(rows(testRequestItems)[0]).toMatchObject({
      testId: 8,
      result: "Per-test instructions",
    });
  });
  it("retains general notes when replacing a visit's request", async () => {
    const { connection, rows } = database();
    await replaceVisitTestRequests(connection, {
      patientId: 5,
      visitId: 10,
      notes: "Replacement instructions",
      items: [{ testId: 8 }],
    });
    expect(rows(testRequests)[0].notes).toBe("Replacement instructions");
  });
});
