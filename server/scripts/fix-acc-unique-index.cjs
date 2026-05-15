require("dotenv").config();
const mysql = require("mysql2/promise");

const url = process.env.DATABASE_URL.replace("192.168.1.100", "41.199.252.107");

const tables = ["accLedger", "accAdvances", "accLoans", "accHome", "accInstagram"];

(async () => {
  const conn = await mysql.createConnection(url);

  for (const t of tables) {
    console.log(`\n── ${t} ──`);

    // 1. Delete duplicates — keep the row with the highest id per accessId
    const [dup] = await conn.execute(
      `DELETE d FROM ${t} d INNER JOIN ${t} keep ON d.accessId = keep.accessId AND d.id < keep.id`
    );
    console.log(`  Duplicates removed: ${dup.affectedRows}`);

    // 2. Drop regular index if exists
    try {
      await conn.execute(`DROP INDEX idx1 ON ${t}`);
      console.log(`  Dropped idx1`);
    } catch { /* may not exist */ }

    // 3. Add unique index
    try {
      await conn.execute(`ALTER TABLE ${t} ADD UNIQUE INDEX uq_accessId (accessId)`);
      console.log(`  Added UNIQUE INDEX on accessId`);
    } catch (e) {
      console.log(`  UNIQUE INDEX already exists or error: ${e.message}`);
    }
  }

  await conn.end();
  console.log("\nDone.");
})().catch((e) => { console.error(e.message); process.exit(1); });
