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
  `SELECT g.id AS glassesId, g.examinationId, g.patientId,
          g.sOD, g.cOD, g.axisOD, g.sOS, g.cOS, g.axisOS,
          e.sphereOD, e.cylinderOD, e.axisOD AS e_axisOD,
          e.sphereOS, e.cylinderOS, e.axisOS AS e_axisOS,
          p.fullName, p.patientCode
   FROM glassesRecords g
   LEFT JOIN examinations e ON e.id = g.examinationId
   LEFT JOIN patients p ON p.id = g.patientId`
);

const norm = (v) => (v === null || v === undefined ? "" : String(v).trim());
const fullMatches = [];

for (const r of rows) {
  const odMatch =
    norm(r.sOD) && norm(r.sOD) === norm(r.sphereOD) &&
    norm(r.cOD) && norm(r.cOD) === norm(r.cylinderOD) &&
    norm(r.axisOD) && norm(r.axisOD) === norm(r.e_axisOD);
  const osMatch =
    norm(r.sOS) && norm(r.sOS) === norm(r.sphereOS) &&
    norm(r.cOS) && norm(r.cOS) === norm(r.cylinderOS) &&
    norm(r.axisOS) && norm(r.axisOS) === norm(r.e_axisOS);
  if (odMatch || osMatch) {
    fullMatches.push({
      glassesId: r.glassesId,
      examinationId: r.examinationId,
      patientCode: r.patientCode,
      fullName: r.fullName,
      odMatch,
      osMatch,
    });
  }
}

console.log(`Total glassesRecords rows: ${rows.length}`);
console.log(`Full autoref-fallback matches (od or os): ${fullMatches.length}`);
console.table(fullMatches);

await conn.end();
