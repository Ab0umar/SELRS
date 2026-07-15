import fs from "fs";
import path from "path";
import mysql from "mysql2/promise";

const envText = fs.readFileSync(new URL("../../.env", import.meta.url), "utf8");
for (const rawLine of envText.split(/\r?\n/)) {
  const line = rawLine.trim();
  const m = line.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
  if (m) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
}

const url = process.env.DATABASE_URL;
if (!url) throw new Error("DATABASE_URL not set");
const conn = await mysql.createConnection(url);

const [rows] = await conn.execute(`
  SELECT e.id AS examinationId, e.patientId, e.glassesData
  FROM examinations e
  WHERE e.glassesData IS NOT NULL AND e.glassesData <> ''
    AND NOT EXISTS (SELECT 1 FROM glassesRecords g WHERE g.examinationId = e.id)
`);

const norm = (v) => {
  if (v === null || v === undefined) return null;
  const s = String(v).trim();
  return s ? s : null;
};

const inserted = [];
let skipped = 0;

for (const r of rows) {
  let g;
  try {
    g = JSON.parse(r.glassesData);
  } catch {
    skipped++;
    continue;
  }
  const record = {
    examinationId: r.examinationId,
    patientId: r.patientId,
    sOD: norm(g?.od?.s),
    cOD: norm(g?.od?.c),
    axisOD: norm(g?.od?.axis ?? g?.od?.a),
    pdOD: norm(g?.od?.pd),
    sOS: norm(g?.os?.s),
    cOS: norm(g?.os?.c),
    axisOS: norm(g?.os?.axis ?? g?.os?.a),
    pdOS: norm(g?.os?.pd),
  };
  const hasAny = Object.entries(record).some(
    ([k, v]) => !["examinationId", "patientId"].includes(k) && v,
  );
  if (!hasAny) {
    skipped++;
    continue;
  }
  await conn.execute(
    `INSERT INTO glassesRecords (examinationId, patientId, sOD, cOD, axisOD, pdOD, sOS, cOS, axisOS, pdOS)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      record.examinationId,
      record.patientId,
      record.sOD,
      record.cOD,
      record.axisOD,
      record.pdOD,
      record.sOS,
      record.cOS,
      record.axisOS,
      record.pdOS,
    ],
  );
  inserted.push(record);
}

const logPath = path.join(
  process.cwd(),
  "scripts",
  "mssql-audit",
  `glassesRecords-backfill-${Date.now()}.json`,
);
fs.writeFileSync(logPath, JSON.stringify(inserted, null, 2), "utf8");

console.log(`Candidates: ${rows.length}`);
console.log(`Inserted: ${inserted.length}`);
console.log(`Skipped (unparseable or empty): ${skipped}`);
console.log(`Log written to: ${logPath}`);

await conn.end();
