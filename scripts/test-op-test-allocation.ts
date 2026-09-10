import "dotenv/config";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

// Separate process: no saved environment settings or patient tables are changed.
process.env.MSSQL_DATABASE = "op_test";
if (process.env.MSSQL_CONNECTION_STRING) {
  process.env.MSSQL_CONNECTION_STRING = process.env.MSSQL_CONNECTION_STRING.replace(
    /(?:Database|Initial Catalog)\s*=\s*[^;]+/gi, "Database=op_test",
  );
}
const { createMssqlPool } = await import("../server/integrations/mssqlPatients");
const pool = await createMssqlPool();
const windows = process.env.MSSQL_AUTH_MODE?.toLowerCase() === "windows" ||
  /trusted_connection\s*=\s*yes|integrated security\s*=\s*sspi/i.test(process.env.MSSQL_CONNECTION_STRING ?? "");
const sql = await import(windows ? "mssql/msnodesqlv8.js" : "mssql");
const driver = sql.default ?? sql;
const table = `##selrs_code_test_${process.pid}_${Date.now()}`;
const source = await readFile(new URL("../server/integrations/mssqlPatients.ts", import.meta.url), "utf8");
const allocation = source.match(/allocationRequest\.query\(`([\s\S]*?)`\)/)?.[1];
assert(allocation, "Actual allocation SQL not found");
const query = allocation.replace("${targetTable}", table);
let keeper: InstanceType<typeof driver.Transaction> | undefined;
const active: Array<InstanceType<typeof driver.Transaction>> = [];
try {
  await pool.connect();
  keeper = new driver.Transaction(pool);
  await keeper.begin();
  // Pin the creating session so the global temporary table survives both callers.
  await keeper.request().query(`USE op_test; CREATE TABLE ${table} (PAT_CD varchar(50) PRIMARY KEY, NAM nvarchar(80));`);
  await keeper.commit();
  await keeper.begin();
  const first = new driver.Transaction(pool);
  const second = new driver.Transaction(pool);
  for (const tx of [first, second]) {
    await tx.begin(); active.push(tx);
    const context = await tx.request().query("USE op_test; SELECT DB_NAME() AS db;");
    assert.equal(context.recordset[0].db, "op_test");
  }
  const a = await first.request().input("LOCK_TIMEOUT", 15000).query(query);
  const codeA = String(Number(a.recordset[0].maxCode ?? 0) + 1).padStart(4, "0");
  await first.request().input("code", codeA).query(`INSERT INTO ${table} VALUES (@code, N'First test patient');`);
  let secondFinished = false;
  const waiting = second.request().input("LOCK_TIMEOUT", 15000).query(query).then((r: any) => {
    secondFinished = true; return r;
  });
  await new Promise((resolve) => setTimeout(resolve, 500));
  assert.equal(secondFinished, false, "Second caller must wait for first commit");
  await first.commit(); active.splice(active.indexOf(first), 1);
  const b = await waiting;
  const codeB = String(Number(b.recordset[0].maxCode ?? 0) + 1).padStart(4, "0");
  assert.equal(b.recordset[0].lockResult, 1, "SQL Server must report a waited lock");
  await second.request().input("code", codeB).query(`INSERT INTO ${table} VALUES (@code, N'Second test patient');`);
  await second.commit(); active.splice(active.indexOf(second), 1);
  const rows = await keeper.request().query(`SELECT PAT_CD, NAM FROM ${table} ORDER BY PAT_CD;`);
  assert.deepEqual(rows.recordset.map((r: any) => [r.PAT_CD, r.NAM]), [
    ["0001", "First test patient"], ["0002", "Second test patient"],
  ]);
  console.log(JSON.stringify({ database: "op_test", realSqlServer: true, secondWaited: true, rows: rows.recordset, scope: "actual allocation SQL with temporary storage, not full patient workflow" }));
} finally {
  for (const tx of active) await tx.rollback().catch(() => {});
  if (keeper) {
    await keeper.request().query(`DROP TABLE IF EXISTS ${table};`).catch(() => {});
    await keeper.rollback().catch(() => {});
  }
  await pool.close();
}
