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
  `SELECT e.id AS examId, e.patientId,
          e.sphereOD, e.cylinderOD, e.axisOD,
          e.sphereOS, e.cylinderOS, e.axisOS,
          e.glassesData,
          p.fullName, p.patientCode
   FROM examinations e
   LEFT JOIN patients p ON p.id = e.patientId
   WHERE e.glassesData IS NOT NULL AND e.glassesData <> ''`
);

const norm = (v) => (v === null || v === undefined ? "" : String(v).trim());

let anyFieldMatch = [];
let noAutorefButGlasses = [];
let fullMatchStillPresent = [];

for (const r of rows) {
  let g;
  try {
    g = JSON.parse(r.glassesData);
  } catch {
    continue;
  }

  const fields = [
    ["od", "s", "sphereOD"],
    ["od", "c", "cylinderOD"],
    ["od", "axis", "axisOD"],
    ["os", "s", "sphereOS"],
    ["os", "c", "cylinderOS"],
    ["os", "axis", "axisOS"],
  ];

  const matches = [];
  for (const [eye, gField, rCol] of fields) {
    const gv = norm(g?.[eye]?.[gField]);
    const rv = norm(r[rCol]);
    if (gv && rv && gv === rv) matches.push(`${eye}.${gField}`);
  }

  const hasAnyAutoref =
    norm(r.sphereOD) || norm(r.cylinderOD) || norm(r.axisOD) ||
    norm(r.sphereOS) || norm(r.cylinderOS) || norm(r.axisOS);
  const hasAnyGlasses =
    norm(g?.od?.s) || norm(g?.od?.c) || norm(g?.od?.axis) ||
    norm(g?.os?.s) || norm(g?.os?.c) || norm(g?.os?.axis);

  if (matches.length > 0) {
    anyFieldMatch.push({
      examId: r.examId,
      patientCode: r.patientCode,
      fullName: r.fullName,
      matchedFields: matches.join(","),
    });
  }
  if (!hasAnyAutoref && hasAnyGlasses) {
    noAutorefButGlasses.push({
      examId: r.examId,
      patientCode: r.patientCode,
      fullName: r.fullName,
      glasses_od: g?.od,
      glasses_os: g?.os,
    });
  }

  const odFull = matches.includes("od.s") && matches.includes("od.c") && matches.includes("od.axis");
  const osFull = matches.includes("os.s") && matches.includes("os.c") && matches.includes("os.axis");
  if (odFull || osFull) {
    fullMatchStillPresent.push({ examId: r.examId, patientCode: r.patientCode, odFull, osFull });
  }
}

console.log(`Total examinations with glassesData: ${rows.length}`);
console.log(`Rows with ANY single field matching raw autoref: ${anyFieldMatch.length}`);
console.log(`Rows with full od or os match STILL present (post-fix check): ${fullMatchStillPresent.length}`);
console.log(`Rows with glasses present but NO autoref recorded at all: ${noAutorefButGlasses.length}`);

console.log("\n--- Any single-field matches (first 100) ---");
console.table(anyFieldMatch.slice(0, 100));

console.log("\n--- Still full-match after fix (should be empty) ---");
console.table(fullMatchStillPresent);

console.log("\n--- No autoref recorded but glasses present (first 30) ---");
console.table(
  noAutorefButGlasses.slice(0, 30).map((x) => ({
    examId: x.examId,
    patientCode: x.patientCode,
    fullName: x.fullName,
    od_s: x.glasses_od?.s,
    od_c: x.glasses_od?.c,
    od_axis: x.glasses_od?.axis,
    os_s: x.glasses_os?.s,
    os_c: x.glasses_os?.c,
    os_axis: x.glasses_os?.axis,
  })),
);

await conn.end();
