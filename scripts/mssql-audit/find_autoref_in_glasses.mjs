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

const [rows] = await conn.execute(
  `SELECT e.id AS examId, e.patientId, e.visitId,
          e.sphereOD, e.cylinderOD, e.axisOD,
          e.sphereOS, e.cylinderOS, e.axisOS,
          e.glassesData,
          p.fullName, p.patientCode
   FROM examinations e
   LEFT JOIN patients p ON p.id = e.patientId
   WHERE e.glassesData IS NOT NULL AND e.glassesData <> ''`
);

const suspects = [];
for (const r of rows) {
  let g;
  try {
    g = JSON.parse(r.glassesData);
  } catch {
    continue;
  }
  const norm = (v) => (v === null || v === undefined ? "" : String(v).trim());
  const odMatch =
    norm(g?.od?.s) && norm(g.od.s) === norm(r.sphereOD) &&
    norm(g?.od?.c) && norm(g.od.c) === norm(r.cylinderOD) &&
    norm(g?.od?.axis) && norm(g.od.axis) === norm(r.axisOD);
  const osMatch =
    norm(g?.os?.s) && norm(g.os.s) === norm(r.sphereOS) &&
    norm(g?.os?.c) && norm(g.os.c) === norm(r.cylinderOS) &&
    norm(g?.os?.axis) && norm(g.os.axis) === norm(r.axisOS);
  if (odMatch || osMatch) {
    suspects.push({
      examId: r.examId,
      patientId: r.patientId,
      patientCode: r.patientCode,
      fullName: r.fullName,
      odMatch,
      osMatch,
    });
  }
}

console.log(`Total examinations with glassesData: ${rows.length}`);
console.log(`Suspected autoref-fallback matches: ${suspects.length}`);
console.table(suspects);

await conn.end();
