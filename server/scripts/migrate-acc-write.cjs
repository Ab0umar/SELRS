require("dotenv").config();
const mysql = require("mysql2/promise");
const url = process.env.DATABASE_URL.replace("192.168.1.100", "41.199.252.107");

const tables = ["accLedger", "accAdvances", "accLoans", "accHome", "accInstagram"];

async function columnExists(conn, table, col) {
  const [rows] = await conn.execute(
    `SELECT COUNT(*) AS n FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?`,
    [table, col]
  );
  return rows[0].n > 0;
}

(async () => {
  const conn = await mysql.createConnection(url);
  for (const t of tables) {
    if (!await columnExists(conn, t, "source")) {
      await conn.execute(`ALTER TABLE ${t} ADD COLUMN source VARCHAR(20) NOT NULL DEFAULT 'access'`);
      console.log(`${t}: added source`);
    } else { console.log(`${t}: source already exists`); }

    if (!await columnExists(conn, t, "createdBy")) {
      await conn.execute(`ALTER TABLE ${t} ADD COLUMN createdBy INT NULL`);
      console.log(`${t}: added createdBy`);
    } else { console.log(`${t}: createdBy already exists`); }
  }
  await conn.end();
  console.log("Done.");
})().catch((e) => { console.error(e.message); process.exit(1); });
