require("dotenv").config();
const mysql = require("mysql2/promise");

const url = process.env.DATABASE_URL.replace("192.168.1.100", "41.199.252.107");

const tables = [
  "CREATE TABLE IF NOT EXISTS accLedger (id INT AUTO_INCREMENT PRIMARY KEY, accessId INT NOT NULL, total DECIMAL(15,2), balance DECIMAL(15,2), income DECIMAL(15,2), expense DECIMAL(15,2), txDate DATE NOT NULL, notes VARCHAR(500), syncedAt TIMESTAMP DEFAULT NOW() ON UPDATE NOW(), INDEX idx1 (accessId))",
  "CREATE TABLE IF NOT EXISTS accAdvances (id INT AUTO_INCREMENT PRIMARY KEY, accessId INT NOT NULL, txDate DATE NOT NULL, advance DECIMAL(15,2), repayment DECIMAL(15,2), notes VARCHAR(500), employee VARCHAR(200), total DECIMAL(15,2), syncedAt TIMESTAMP DEFAULT NOW() ON UPDATE NOW(), INDEX idx1 (accessId))",
  "CREATE TABLE IF NOT EXISTS accLoans (id INT AUTO_INCREMENT PRIMARY KEY, accessId INT NOT NULL, name VARCHAR(200), amount DECIMAL(15,2), repayment DECIMAL(15,2), remaining DECIMAL(15,2), txDate DATE NOT NULL, notes TEXT, syncedAt TIMESTAMP DEFAULT NOW() ON UPDATE NOW(), INDEX idx1 (accessId))",
  "CREATE TABLE IF NOT EXISTS accHome (id INT AUTO_INCREMENT PRIMARY KEY, accessId INT NOT NULL, txDate DATE NOT NULL, total DECIMAL(15,2), balance DECIMAL(15,2), inAmount DECIMAL(15,2), outAmount DECIMAL(15,2), notes VARCHAR(500), syncedAt TIMESTAMP DEFAULT NOW() ON UPDATE NOW(), INDEX idx1 (accessId))",
  "CREATE TABLE IF NOT EXISTS accInstagram (id INT AUTO_INCREMENT PRIMARY KEY, accessId INT NOT NULL, txDate DATE NOT NULL, total DECIMAL(15,2), balance DECIMAL(15,2), inAmount DECIMAL(15,2), outAmount DECIMAL(15,2), notes VARCHAR(500), syncedAt TIMESTAMP DEFAULT NOW() ON UPDATE NOW(), INDEX idx1 (accessId))",
];

(async () => {
  const conn = await mysql.createConnection(url);
  for (const t of tables) {
    await conn.execute(t);
    const name = t.match(/TABLE IF NOT EXISTS (\w+)/)[1];
    console.log("Created:", name);
  }
  await conn.end();
  console.log("Done");
})().catch((e) => { console.error(e.message); process.exit(1); });
