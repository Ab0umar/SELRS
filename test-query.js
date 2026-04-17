require('dotenv/config');
const mysql = require('mysql2/promise');

async function test() {
  const conn = await mysql.createConnection(process.env.DATABASE_URL);
  try {
    // Check patients with doctorId that don't exist in users
    const [results] = await conn.query(`
      SELECT p.id, p.doctorId, u.id as userId, u.fullName
      FROM patients p
      LEFT JOIN users u ON p.doctorId = u.id
      WHERE DATE(p.createdAt) = '2026-04-04'
      LIMIT 5
    `);
    console.log('Sample patients:');
    console.log(results);
  } finally {
    await conn.end();
  }
}

test().catch(console.error);
