
import mysql from 'mysql2/promise';
import fs from 'fs/promises';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config();

async function run() {
  const connection = await mysql.createConnection(process.env.DATABASE_URL);
  console.log('Connected to MySQL.');

  try {
    const migrationPath = path.join(process.cwd(), 'drizzle', '0031_crazy_nighthawk.sql');
    const sql = await fs.readFile(migrationPath, 'utf8');
    
    // Split by statement-breakpoint or just run as is if the driver supports multi-statements
    // mysql2 supports multi-statements if configured, but let's split manually for safety
    const statements = sql.split('--> statement-breakpoint');
    
    for (let statement of statements) {
      statement = statement.trim();
      if (!statement) continue;
      
      console.log('Executing statement...');
      // Note: This is a bit simplistic, but for Drizzle generated migrations it usually works
      await connection.query(statement);
    }
    
    console.log('Migration applied successfully.');
  } catch (err) {
    console.error('Error applying migration:', err);
  } finally {
    await connection.end();
  }
}

run();
