import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

const dbUrl = process.env.DATABASE_URL;
if (!dbUrl) {
  console.error('DATABASE_URL is not set in .env');
  process.exit(1);
}

try {
  const url = new URL(dbUrl);
  const conn = await mysql.createConnection({
    host: url.hostname,
    port: url.port ? parseInt(url.port) : 3306,
    user: url.username,
    password: url.password,
    database: url.pathname.substring(1)
  });

  console.log('Connected to MySQL. Describing table attendance_daily...');
  const [rows] = await conn.execute('DESCRIBE `attendance_daily`');
  console.table(rows);

  await conn.end();
} catch (err) {
  console.error('Error:', err.message);
}
