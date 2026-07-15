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
const backup = [];
let updated = 0;

for (const r of rows) {
  const odMatch =
    norm(r.sOD) && norm(r.sOD) === norm(r.sphereOD) &&
    norm(r.cOD) && norm(r.cOD) === norm(r.cylinderOD) &&
    norm(r.axisOD) && norm(r.axisOD) === norm(r.e_axisOD);
  const osMatch =
    norm(r.sOS) && norm(r.sOS) === norm(r.sphereOS) &&
    norm(r.cOS) && norm(r.cOS) === norm(r.cylinderOS) &&
    norm(r.axisOS) && norm(r.axisOS) === norm(r.e_axisOS);

  if (!odMatch && !osMatch) continue;

  backup.push({
    glassesId: r.glassesId,
    examinationId: r.examinationId,
    patientCode: r.patientCode,
    fullName: r.fullName,
    before: {
      sOD: r.sOD, cOD: r.cOD, axisOD: r.axisOD,
      sOS: r.sOS, cOS: r.cOS, axisOS: r.axisOS,
    },
  });

  const updates = {};
  if (odMatch) {
    updates.sOD = "";
    updates.cOD = "";
    updates.axisOD = "";
  }
  if (osMatch) {
    updates.sOS = "";
    updates.cOS = "";
    updates.axisOS = "";
  }

  const setClauses = Object.keys(updates)
    .map((k) => `${k} = ?`)
    .join(", ");
  const values = [...Object.values(updates), r.glassesId];

  await conn.execute(
    `UPDATE glassesRecords SET ${setClauses} WHERE id = ?`,
    values,
  );
  updated++;
}

const backupPath = path.join(
  process.cwd(),
  "scripts",
  "mssql-audit",
  `glassesRecords-backup-${Date.now()}.json`,
);
fs.writeFileSync(backupPath, JSON.stringify(backup, null, 2), "utf8");

console.log(`Updated ${updated} glassesRecords rows.`);
console.log(`Backup written to: ${backupPath}`);

await conn.end();
