import fs from "fs";
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

const [[{ c: examsWithAutoref }]] = await conn.execute(`
  SELECT COUNT(*) AS c FROM examinations e
  WHERE (COALESCE(e.sphereOD,'')<>'' OR COALESCE(e.sphereOS,'')<>''
      OR COALESCE(e.cylinderOD,'')<>'' OR COALESCE(e.cylinderOS,'')<>'')
`);
const [[{ c: examsWithAutorefNoDedicated }]] = await conn.execute(`
  SELECT COUNT(*) AS c FROM examinations e
  WHERE (COALESCE(e.sphereOD,'')<>'' OR COALESCE(e.sphereOS,'')<>''
      OR COALESCE(e.cylinderOD,'')<>'' OR COALESCE(e.cylinderOS,'')<>'')
    AND NOT EXISTS (SELECT 1 FROM autorefractometryData a WHERE a.examinationId = e.id)
`);
const [[{ c: examsWithGlasses }]] = await conn.execute(`
  SELECT COUNT(*) AS c FROM examinations e
  WHERE e.glassesData IS NOT NULL AND e.glassesData <> ''
`);
const [[{ c: examsWithGlassesNoDedicated }]] = await conn.execute(`
  SELECT COUNT(*) AS c FROM examinations e
  WHERE e.glassesData IS NOT NULL AND e.glassesData <> ''
    AND NOT EXISTS (SELECT 1 FROM glassesRecords g WHERE g.examinationId = e.id)
`);

console.log(`Exams with autoref data on examinations row: ${examsWithAutoref}`);
console.log(`...of those, missing a matching autorefractometryData row: ${examsWithAutorefNoDedicated}`);
console.log(`Exams with glassesData on examinations row: ${examsWithGlasses}`);
console.log(`...of those, missing a matching glassesRecords row: ${examsWithGlassesNoDedicated}`);

await conn.end();
