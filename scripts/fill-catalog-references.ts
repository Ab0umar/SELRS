import "dotenv/config";
import mysql, { type RowDataPacket } from "mysql2/promise";
import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import {
  CATALOG_REFERENCE_SEED,
  type CatalogReferenceSeed,
} from "../shared/catalog-reference-seed";
import {
  formatTestReferenceRange,
  legacyReferenceFields,
  testReferenceRangesSchema,
} from "../shared/test-reference-ranges";

const referenceDate = "2026-10-08";

function validateSeed() {
  const names = new Set<string>();
  for (const entry of CATALOG_REFERENCE_SEED) {
    const key = `${entry.type}:${entry.name}`;
    if (names.has(key)) throw new Error(`Duplicate reference: ${key}`);
    names.add(key);
    testReferenceRangesSchema.parse(entry.ranges);
    if (
      (!entry.noNormalRange && !entry.ranges.length) ||
      (entry.noNormalRange && entry.ranges.length)
    )
      throw new Error(`Inconsistent reference state: ${key}`);
    if (!entry.sources.length && entry.type !== "other")
      throw new Error(`Missing sources: ${key}`);
  }
}

function seededFields(
  entry: CatalogReferenceSeed,
  originalDescription: string,
) {
  const legacy = legacyReferenceFields(entry.ranges);
  const summary = entry.ranges.map(formatTestReferenceRange).join("\n");
  const description = [
    `مرجع كتالوج استرشادي — ${referenceDate}. ليس اعتمادًا محليًا ولا مرجع WHO شاملًا ولا نتيجة أو تشخيصًا للمريض. لا يطبق تلقائيًا على الأطفال أو الحمل أو طريقة/جهاز مختلف؛ يعتمد الطبيب مدى المعمل والجهاز والفئة المناسبة.`,
    entry.note,
    summary
      ? `المديات/المراجع المسماة:\n${summary}`
      : "لا ينطبق عليه مدى طبيعي موحد وفق تعريف الخدمة الحالية.",
    entry.sources.length
      ? `المصادر: ${entry.sources.join(" | ")}`
      : "حالة عدم انطباق المدى تصنيف للخدمة وليست تصريحًا طبيًا.",
    originalDescription.trim()
      ? `ملاحظات سابقة محفوظة؛ لا يعتمد أي مدى غير موثق فيها بهذا التحديث:\n${originalDescription.trim()}`
      : "",
  ]
    .filter(Boolean)
    .join("\n\n");
  return {
    referenceRanges: entry.ranges,
    noNormalRange: entry.noNormalRange,
    normalRange: entry.noNormalRange
      ? ""
      : legacy.normalRange || "مراجع مسماة متعددة أو مشروطة؛ راجع الوصف",
    unit: legacy.unit,
    description,
  };
}

async function saveBackup(rows: RowDataPacket[]) {
  const directory = resolve("output/test-catalog-backups");
  await mkdir(directory, { recursive: true });
  const backup = resolve(
    directory,
    `references-${new Date().toISOString().replace(/[:.]/g, "-")}.json`,
  );
  await writeFile(
    backup,
    JSON.stringify({ catalog: rows, seedDate: referenceDate }, null, 2),
    { flag: "wx", encoding: "utf8" },
  );
  return backup;
}

async function main() {
  validateSeed();
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is missing");
  const connection = await mysql.createConnection(process.env.DATABASE_URL);
  try {
    await connection.beginTransaction();
    const [rows] = await connection.query<RowDataPacket[]>(
      "SELECT id,name,type,normalRange,unit,referenceRanges,noNormalRange,description FROM tests ORDER BY id FOR UPDATE",
    );
    const references = new Map(
      CATALOG_REFERENCE_SEED.map((entry) => [
        `${entry.type}:${entry.name}`,
        entry,
      ]),
    );
    const unsupported = rows.filter(
      (row) => !references.has(`${row.type}:${row.name}`),
    );
    if (unsupported.length)
      throw new Error(
        `Unreviewed catalog rows: ${unsupported.map((row) => row.id).join(",")}`,
      );
    const updates = rows
      .filter((row) => row.referenceRanges == null && !row.noNormalRange)
      .map((row) => ({
        id: row.id,
        name: row.name,
        type: row.type,
        fields: seededFields(
          references.get(`${row.type}:${row.name}`)!,
          String(row.description ?? ""),
        ),
      }));
    console.log(
      JSON.stringify(
        {
          mode: process.argv.includes("--apply") ? "apply" : "preview",
          scanned: rows.length,
          planned: updates.length,
          preservedConfigured: rows.length - updates.length,
          types: Object.fromEntries(
            ["lab", "imaging", "examination", "other"].map((type) => [
              type,
              updates.filter((row) => row.type === type).length,
            ]),
          ),
          namedReferences: updates.reduce(
            (count, row) => count + row.fields.referenceRanges.length,
            0,
          ),
          noNormalRange: updates
            .filter((row) => row.fields.noNormalRange)
            .map(({ id, name }) => ({ id, name })),
        },
        null,
        2,
      ),
    );
    if (!process.argv.includes("--apply")) {
      await connection.rollback();
      return;
    }
    const backup = await saveBackup(rows);
    for (const { id, fields } of updates) {
      const [changed] = await connection.execute<mysql.ResultSetHeader>(
        "UPDATE tests SET referenceRanges=?,noNormalRange=?,normalRange=?,unit=?,description=? WHERE id=?",
        [
          JSON.stringify(fields.referenceRanges),
          fields.noNormalRange,
          fields.normalRange,
          fields.unit,
          fields.description,
          id,
        ],
      );
      if (changed.affectedRows !== 1)
        throw new Error(`Reference update failed: ${id}`);
    }
    await connection.commit();
    console.log(JSON.stringify({ updated: updates.length, backup }));
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    await connection.end();
  }
}

main().catch((error) => {
  console.error(
    error instanceof Error
      ? error.message.replace(/mysql:\/\/[^\s]+/g, "<REDACTED>")
      : "Reference fill failed",
  );
  process.exitCode = 1;
});
