import 'dotenv/config';
import { getDb } from '../server/db';
import { visits, examinations } from '../drizzle/schema';
import { eq, desc } from 'drizzle-orm';
import fs from 'node:fs/promises';
import path from 'node:path';

type ExamRow = Record<string, string>;

function parseDate(dateStr: string): Date {
  if (!dateStr || dateStr.trim() === '') {
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
  // Try YYYY-MM-DD HH:MM:SS format
  const match2 = dateStr.match(/(\d{4})-(\d{2})-(\d{2})\s+(\d{2}):(\d{2}):(\d{2})/);
  if (match2) {
    const [, year, month, day, hours, minutes, seconds] = match2;
    return new Date(
      parseInt(year, 10),
      parseInt(month, 10) - 1,
      parseInt(day, 10),
      parseInt(hours, 10),
      parseInt(minutes, 10),
      parseInt(seconds, 10)
    );
  }
  return new Date();
}

function parseCsvLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    const nextChar = line[i + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ';' && !inQuotes) {
      result.push(current);
      current = '';
    } else {
      current += char;
    }
  }

  result.push(current);
  return result;
}

async function parseCsvContent(filePath: string): Promise<{ headers: string[]; rows: ExamRow[] }> {
  const content = await fs.readFile(filePath, 'utf-8');
  const lines = content.split('\n').filter((line) => line.trim());

  if (lines.length === 0) {
    return { headers: [], rows: [] };
  }

  const headers = parseCsvLine(lines[0]);
  const rows: ExamRow[] = [];

  for (let i = 1; i < lines.length; i++) {
    const values = parseCsvLine(lines[i]);
    const row: ExamRow = {};

    for (let j = 0; j < headers.length; j++) {
      row[headers[j]] = values[j] || '';
    }

    rows.push(row);
  }

  return { headers, rows };
}

async function main() {
  const db = await getDb();
  if (!db) {
    throw new Error('Database not available');
  }

  // Load ID mapping from file
  const mappingContent = await fs.readFile('C:/Users/SELRS/Desktop/id_mapping.csv', 'utf-8');
  const mappingLines = mappingContent.split('\n').filter(l => l.trim() && !l.startsWith('old_id'));

  const oldToNewId = new Map<number, number>();
  for (const line of mappingLines) {
    const [oldIdStr, newIdStr] = line.split(',');
    if (oldIdStr && newIdStr) {
      oldToNewId.set(parseInt(oldIdStr), parseInt(newIdStr));
    }
  }

  console.log(`[remap] Loaded ${oldToNewId.size} ID mappings`);

  // Import exam_deduped.csv
  console.log('[remap] Processing exam_deduped.csv...');
  const { rows: examRows } = await parseCsvContent(path.join(process.cwd(), 'scripts', 'exam_deduped.csv'));

  let imported = 0;
  let skipped = 0;
  let visitCount = 0;

  for (const record of examRows) {
    try {
      const oldPatientId = parseInt(record.patientId, 10);
      const newPatientId = oldToNewId.get(oldPatientId);

      if (!newPatientId) {
        skipped++;
        continue;
      }

      // Parse dates
      const createdAt = parseDate(record.createdAt);
      const updatedAt = parseDate(record.updatedAt);

      // Create visit if it doesn't exist
      const [existingVisit] = await db
        .select({ id: visits.id })
        .from(visits)
        .where(
          eq(visits.patientId, newPatientId)
        )
        .limit(1);

      let visitId = existingVisit?.id;
      if (!visitId) {
        const visitResult = await db.insert(visits).values({
          patientId: newPatientId,
          visitDate: createdAt,
          visitType: 'examination',
          branch: 'examinations',
          createdAt,
          updatedAt,
        });

        // Get the created visit ID
        const createdVisits = await db
          .select({ id: visits.id })
          .from(visits)
          .where(eq(visits.patientId, newPatientId))
          .orderBy(desc(visits.id))
          .limit(1);

        if (createdVisits.length === 0) {
          skipped++;
          continue;
        }
        visitId = createdVisits[0].id;
        visitCount++;
      }

      const payload: Record<string, any> = {
        patientId: newPatientId,
        visitId,
        createdAt,
        updatedAt,
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

      if (record.glassesData) {
        try {
          payload.glassesData = record.glassesData;
        } catch {}
      }

      if (record.radiologyLabsNotes) {
        try {
          payload.radiologyLabsNotes = record.radiologyLabsNotes;
        } catch {}
      }

      await db.insert(examinations).values(payload);
      imported++;
    } catch (error: any) {
      const code = error?.code || error?.cause?.code;
      if (code === 'ER_DUP_ENTRY') {
        skipped++;
        continue;
      }
      console.error(`[remap] Error importing exam ${record.id}:`, error.message);
      throw error;
    }
  }

  console.log(`[remap] exam_deduped.csv: imported ${imported}, skipped ${skipped}, visits created ${visitCount}`);
  console.log('[remap] Complete!');
}

main()
  .catch((error) => {
    console.error('[remap] Failed:', error);
    process.exit(1);
  })
  .finally(() => process.exit(0));
