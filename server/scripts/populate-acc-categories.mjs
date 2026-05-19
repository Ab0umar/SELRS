import mysql from "mysql2/promise";

const pool = mysql.createPool({
  host: process.env.DB_HOST || "localhost",
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "",
  database: process.env.DB_NAME || "selrs",
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

const categories = [
  { name: "د. السعدني", entity: "غرابه" },
  { name: "سلف", entity: "سلف" },
  { name: "البيت", entity: "البيت" },
  { name: "انستا", entity: "insta" },
];

async function main() {
  const conn = await pool.getConnection();
  try {
    for (const cat of categories) {
      await conn.execute(
        `INSERT INTO accCategories (name, entity, isPaid)
         VALUES (?, ?, 0)
         ON DUPLICATE KEY UPDATE entity=VALUES(entity)`,
        [cat.name, cat.entity]
      );
      console.log(`✓ Inserted: ${cat.name} → ${cat.entity}`);
    }
    console.log("\n✓ All categories populated successfully!");
  } catch (err) {
    console.error("Error:", err.message);
    process.exit(1);
  } finally {
    await conn.release();
    await pool.end();
  }
}

main();
