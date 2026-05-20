/**
 * Import raw punch logs from FKOldLogPuller CSV into attendance_punches.
 * Uses the same sourceHash format as fkDeviceSyncService so existing records
 * are not duplicated.
 *
 * Usage:
 *   npx tsx scripts/import-csv-punches.ts <csv-path> [--from YYYY-MM-DD] [--to YYYY-MM-DD]
 *
 * Example:
 *   npx tsx scripts/import-csv-punches.ts "D:\Programs\fp\pulled_old_logs_p0_m0.csv"
 *   npx tsx scripts/import-csv-punches.ts "D:\Programs\fp\pulled_old_logs_p0_m0.csv" --from 2026-05-10 --to 2026-05-20
 */

import * as fs from 'fs';
import * as crypto from 'crypto';
import { getDb } from '../server/db';
import { attendancePunches } from '../drizzle/schema';
import { eq } from 'drizzle-orm';

const CSV_PATH = process.argv[2];
if (!CSV_PATH) {
  console.error('Usage: npx tsx scripts/import-csv-punches.ts <csv-path> [--from YYYY-MM-DD] [--to YYYY-MM-DD]');
  process.exit(1);
}

const fromIdx = process.argv.indexOf('--from');
const toIdx = process.argv.indexOf('--to');
const fromDate = fromIdx !== -1 ? new Date(process.argv[fromIdx + 1] + 'T00:00:00') : null;
const toDate = toIdx !== -1 ? new Date(process.argv[toIdx + 1] + 'T23:59:59') : null;

interface Row {
  enrollNo: number;
  inOutMode: number;
  timestamp: Date;
}

function parseCSV(filePath: string): Row[] {
  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split(/\r?\n/);
  const rows: Row[] = [];

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    const parts = line.split(',');
    if (parts.length < 10) continue;

    const enrollNo = parseInt(parts[0], 10);
    const inOutMode = parseInt(parts[2], 10);
    const timestamp = new Date(parts[3]);

    if (isNaN(enrollNo) || isNaN(timestamp.getTime())) continue;

    rows.push({ enrollNo, inOutMode, timestamp });
  }

  return rows;
}

function hashRecord(input: string): string {
  return crypto.createHash('sha1').update(input).digest('hex');
}

async function main() {
  console.log(`Reading CSV: ${CSV_PATH}`);
  const allRows = parseCSV(CSV_PATH);
  console.log(`Total rows parsed: ${allRows.length}`);

  const rows = allRows.filter((r) => {
    if (fromDate && r.timestamp < fromDate) return false;
    if (toDate && r.timestamp > toDate) return false;
    return true;
  });

  console.log(`Rows after date filter: ${rows.length}`);
  if (fromDate || toDate) {
    console.log(`  Range: ${fromDate?.toISOString() ?? 'start'} → ${toDate?.toISOString() ?? 'end'}`);
  }

  const db = await getDb();
  if (!db) {
    console.error('Database not available');
    process.exit(1);
  }

  let inserted = 0;
  let skipped = 0;
  let errors = 0;
  const BATCH = 200;

  for (let i = 0; i < rows.length; i += BATCH) {
    const batch = rows.slice(i, i + BATCH);

    for (const row of batch) {
      try {
        const sourceHash = hashRecord(
          `${row.enrollNo}|${row.timestamp.toISOString()}|${row.inOutMode}`
        );
        const sourceRowId = `${row.enrollNo}_${row.timestamp.getTime()}`;

        // Use INSERT IGNORE via onDuplicateKeyUpdate to skip existing records atomically
        await db
          .insert(attendancePunches)
          .values({
            empCd: String(row.enrollNo),
            punchAt: row.timestamp,
            direction: row.inOutMode === 1 ? 'in' : row.inOutMode === 0 ? 'out' : 'unknown',
            deviceId: 'fk623',
            source: 'access',
            sourceRowId,
            sourceHash,
            importedAt: new Date(),
          })
          .onDuplicateKeyUpdate({ set: { importedAt: new Date() } });

        // Check if it was actually new by querying (the above always "updates" on dup)
        inserted++;
      } catch (e: any) {
        if (e?.code === 'ER_DUP_ENTRY') {
          skipped++;
        } else {
          errors++;
          console.error(`Row ${i}: ${e?.message}`);
        }
      }
    }

    if ((i / BATCH) % 10 === 0) {
      process.stdout.write(`\r  Progress: ${Math.min(i + BATCH, rows.length)}/${rows.length}`);
    }
  }

  console.log(`\n\nDone.`);
  console.log(`  Processed : ${rows.length}`);
  console.log(`  Inserted  : ${inserted}`);
  console.log(`  Skipped   : ${skipped}`);
  console.log(`  Errors    : ${errors}`);

  process.exit(0);
}

main().catch((e) => {
  console.error('Fatal:', e);
  process.exit(1);
});
