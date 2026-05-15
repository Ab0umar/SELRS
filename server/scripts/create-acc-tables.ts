import { config } from "dotenv";
config();
config({ path: ".env.local" });
import { sql } from "drizzle-orm";
import { getDb } from "../db";

const tables = [
  `CREATE TABLE IF NOT EXISTS accEmployees (
    id INT AUTO_INCREMENT PRIMARY KEY,
    accessId INT NOT NULL,
    name VARCHAR(200) NOT NULL,
    syncedAt TIMESTAMP NOT NULL DEFAULT NOW() ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY u_accessId (accessId)
  ) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`,

  `CREATE TABLE IF NOT EXISTS accCategories (
    id INT AUTO_INCREMENT PRIMARY KEY,
    accessId INT NOT NULL,
    name VARCHAR(200),
    entity VARCHAR(200),
    isPaid TINYINT(1) DEFAULT 0,
    syncedAt TIMESTAMP NOT NULL DEFAULT NOW() ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY u_accessId (accessId)
  ) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`,

  `CREATE TABLE IF NOT EXISTS accSaadany (
    id INT AUTO_INCREMENT PRIMARY KEY,
    accessId INT NOT NULL,
    txDate DATE NOT NULL,
    withdrawals DECIMAL(15,2),
    repayment DECIMAL(15,2),
    notes VARCHAR(500),
    total DECIMAL(15,2),
    syncedAt TIMESTAMP NOT NULL DEFAULT NOW() ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY u_accessId (accessId)
  ) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`,

  `CREATE OR REPLACE VIEW accLedger2024 AS SELECT * FROM accLedger WHERE YEAR(txDate) = 2024`,
  `CREATE OR REPLACE VIEW accLedger2025 AS SELECT * FROM accLedger WHERE YEAR(txDate) = 2025`,
  `CREATE OR REPLACE VIEW accLedger2026 AS SELECT * FROM accLedger WHERE YEAR(txDate) = 2026`,
];

const db = await getDb();
if (!db) { console.error("DB unavailable"); process.exit(1); }

for (const ddl of tables) {
  await db.execute(sql.raw(ddl));
  const name = (ddl.match(/TABLE IF NOT EXISTS (\w+)/) ?? ddl.match(/VIEW (\w+)/))?.[1] ?? "?";
  console.log(`  created: ${name}`);
}
console.log("Done.");
process.exit(0);
