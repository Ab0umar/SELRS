import sql from "mssql";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));

const config = {
  server: process.env.MSSQL_HOST || "192.168.0.100",
  port: 1433,
  user: process.env.MSSQL_USER || "selrs",
  password: process.env.MSSQL_PASS || "SELRS258288",
  database: "op2026",
  options: {
    encrypt: false,
    trustServerCertificate: true,
    connectTimeout: 8000,
  },
};

const targetFile = process.argv[2] || "check-triggers-and-writes.sql";
const sqlText = readFileSync(join(__dirname, targetFile), "utf-8");
// Split on lines that are only a semicolon-terminated statement boundary,
// keeping it simple: split on ';\n' followed by blank/comment line (each
// query in the file already ends with ';' before a comment or EOF).
const statements = sqlText
  .split(/;\s*\n/g)
  .map((s) => s.replace(/^\s*--.*$/gm, "").trim())
  .filter((s) => s.length > 0);

const pool = await sql.connect(config);
console.log("Connected.\n");

let i = 0;
for (const stmt of statements) {
  i++;
  const cleaned = stmt.replace(/^--.*$/gm, "").trim();
  if (!cleaned) continue;
  try {
    const result = await pool.request().query(cleaned + ";");
    console.log(`=== Query ${i} ===`);
    if (result.recordset && result.recordset.length > 0) {
      console.table(result.recordset);
    } else {
      console.log("(no rows)");
    }
    console.log();
  } catch (err) {
    console.error(`=== Query ${i} FAILED ===`);
    console.error(err.message);
    console.log();
  }
}

await pool.close();
console.log("Done.");
