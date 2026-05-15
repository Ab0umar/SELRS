require("dotenv").config();
const mysql = require("mysql2/promise");
const url = process.env.DATABASE_URL.replace("192.168.1.100", "41.199.252.107");
(async () => {
  const conn = await mysql.createConnection(url);
  const [rows] = await conn.execute("SELECT accessId, txDate, income, expense, balance, total, notes FROM accLedger ORDER BY accessId DESC LIMIT 5");
  console.table(rows);
  const [last] = await conn.execute("SELECT total FROM accLedger ORDER BY accessId DESC LIMIT 1");
  console.log("Latest total (الاجمالي):", last[0]?.total);
  await conn.end();
})();
