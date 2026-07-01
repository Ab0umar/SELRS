require("dotenv").config();
const mysql = require("mysql2/promise");
<<<<<<< HEAD
const url = process.env.DATABASE_URL.replace("192.168.1.100", "192.168.1.10");
=======
const url = process.env.DATABASE_URL.replace("41.199.252.107", "41.199.252.107");
>>>>>>> 64805bc2cc3c4a2a79ef722ea88924d18cda4943
(async () => {
  const conn = await mysql.createConnection(url);
  const [rows] = await conn.execute(
    "SELECT accessId, txDate, income, expense, balance, total, notes FROM accLedger ORDER BY accessId DESC LIMIT 5",
  );
  console.table(rows);
  const [last] = await conn.execute(
    "SELECT total FROM accLedger ORDER BY accessId DESC LIMIT 1",
  );
  console.log("Latest total (الاجمالي):", last[0]?.total);
  await conn.end();
})();
