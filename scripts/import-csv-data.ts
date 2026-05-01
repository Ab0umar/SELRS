import "dotenv/config";
import { getDb } from "../server/db";
import { visits, examinations } from "../drizzle/schema";
import fs from "node:fs/promises";
import path from "node:path";

type VisitRow = Record<string, string>;
type ExamRow = Record<string, string>;

function parseDate(dateStr: string): Date {
  if (!dateStr || dateStr.trim() === "") {
    return new Date();
  }
  // Handle DD/MM/YYYY HH:MM format
  const match = dateStr.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})\s+(\d{1,2}):(\d{2})/);
  if (match) {
    const [, day, month, year, hours, minutes] = match;
    return new Date(
      parseInt(year, 10),
      parseInt(month, 10) - 1,
      parseInt(day, 10),
      parseInt(hours, 10),
      parseInt(minutes, 10),
      0
    );
  }
  return new Date();
}

function parseCsvLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    const nextChar = line[i + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        current += '"';
        i++; // Skip next quote
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ";" && !inQuotes) {
      result.push(current);
      current = "";
    } else {
      current += char;
    }
  }

  result.push(current);
  return result;
}

function parseCsvContent(content: string): { headers: string[]; rows: VisitRow[] } {
  const lines = content.split("\n").filter((line) => line.trim());
  if (lines.length === 0) {
    return { headers: [], rows: [] };
  }

  const headers = parseCsvLine(lines[0]);
  const rows: VisitRow[] = [];

  for (let i = 1; i < lines.length; i++) {
    const values = parseCsvLine(lines[i]);
    const row: VisitRow = {};

    for (let j = 0; j < headers.length; j++) {
      row[headers[j]] = values[j] || "";
    }

    rows.push(row);
  }

  return { headers, rows };
}

async function importVisits() {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  const visPath = path.resolve(process.cwd(), "scripts", "Vis.csv");
  const content = await fs.readFile(visPath, "utf-8");

  const { rows: records } = parseCsvContent(content);

  console.log(`[import-csv] Processing ${records.length} visit records...`);

  let imported = 0;
  let skipped = 0;

  for (const record of records) {
    try {
      const patientId = parseInt(record.patientId, 10);
      if (isNaN(patientId)) {
        console.log(`[import-csv] Skipping visit ${record.id}: invalid patientId`);
        skipped++;
        continue;
      }

      const visitDate = parseDate(record.visitType); // visitType is actually the date in this CSV
      const createdAt = parseDate(record.createdAt);
      const updatedAt = parseDate(record.updatedAt);

      await db.insert(visits).values({
        id: parseInt(record.id, 10),
        patientId,
        visitDate,
        visitType: "examination",
        branch: record.branch || "examinations",
        createdAt,
        updatedAt,
      });

      imported++;
    } catch (error: any) {
      const code = error?.code || error?.cause?.code;
      // Ignore duplicate key errors
      if (code === "ER_DUP_ENTRY") {
        skipped++;
        continue;
      }
      console.error(`[import-csv] Error importing visit ${record.id}:`, error.message);
      throw error;
    }
  }

  console.log(`[import-csv] Visits: imported ${imported}, skipped ${skipped}`);
  return imported;
}

async function importExaminations() {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  const examPath = path.resolve(process.cwd(), "scripts", "examN.csv");
  const content = await fs.readFile(examPath, "utf-8");

  const { rows: records } = parseCsvContent(content);

  console.log(`[import-csv] Processing ${records.length} examination records...`);

  let imported = 0;
  let skipped = 0;

  for (const record of records) {
    try {
      const patientId = parseInt(record.patientId, 10);
      const visitId = parseInt(record.visitId, 10);

      if (isNaN(patientId) || isNaN(visitId)) {
        console.log(`[import-csv] Skipping exam ${record.id}: invalid IDs`);
        skipped++;
        continue;
      }

      const payload: Record<string, any> = {
        id: parseInt(record.id, 10),
        patientId,
        visitId,
        createdAt: parseDate(record.createdAt),
        updatedAt: parseDate(record.updatedAt),
      };

      // Add optional vision fields
      if (record.ucvaOD) payload.ucvaOD = record.ucvaOD;
      if (record.ucvaOS) payload.ucvaOS = record.ucvaOS;
      if (record.bcvaOD) payload.bcvaOD = record.bcvaOD;
      if (record.bcvaOS) payload.bcvaOS = record.bcvaOS;
      if (record.sphereOD) payload.sphereOD = parseFloat(record.sphereOD) || null;
      if (record.sphereOS) payload.sphereOS = parseFloat(record.sphereOS) || null;
      if (record.cylinderOD) payload.cylinderOD = parseFloat(record.cylinderOD) || null;
      if (record.cylinderOS) payload.cylinderOS = parseFloat(record.cylinderOS) || null;
      if (record.axisOD) payload.axisOD = parseInt(record.axisOD, 10) || null;
      if (record.axisOS) payload.axisOS = parseInt(record.axisOS, 10) || null;
      if (record.iopOD) payload.iopOD = record.iopOD;
      if (record.iopOS) payload.iopOS = record.iopOS;

      // Add JSON fields
      if (record.glassesData) {
        try {
          payload.glassesData = record.glassesData;
        } catch {
          // Skip if not valid JSON
        }
      }

      if (record.radiologyLabsNotes) {
        try {
          payload.radiologyLabsNotes = record.radiologyLabsNotes;
        } catch {
          // Skip if not valid JSON
        }
      }

      await db.insert(examinations).values(payload);
      imported++;
    } catch (error: any) {
      const code = error?.code || error?.cause?.code;
      // Ignore duplicate key errors
      if (code === "ER_DUP_ENTRY") {
        skipped++;
        continue;
      }
      console.error(`[import-csv] Error importing exam ${record.id}:`, error.message);
      throw error;
    }
  }

  console.log(`[import-csv] Examinations: imported ${imported}, skipped ${skipped}`);
  return imported;
}

async function main() {
  try {
    console.log("[import-csv] Starting CSV import...");
    const visitsImported = await importVisits();
    const examsImported = await importExaminations();
    console.log(`[import-csv] Complete: ${visitsImported} visits, ${examsImported} examinations imported`);
  } catch (error) {
    console.error("[import-csv] Failed:", error);
    process.exit(1);
  }
}

main().finally(() => process.exit(0));
