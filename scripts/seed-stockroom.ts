
import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

async function run() {
  const connection = await mysql.createConnection(process.env.DATABASE_URL);
  console.log('Connected to MySQL.');

  try {
    // 1. Clear existing data (optional, but good for a fresh start)
    // await connection.query('DELETE FROM stock_transactions');
    // await connection.query('DELETE FROM stock_items');

    console.log('Seeding stock items...');
    
    const items = [
      ['ED001', 'محلول ملحي (Saline)', 'قطرات العين', 'PharmaCo', 150, 'متوفر'],
      ['ED002', 'هايبروميلوز 0.3%', 'قطرات العين', 'VisionCare', 15, 'كمية قليلة'],
      ['ED003', 'سيكلوسبورين 0.1%', 'قطرات العين', 'PharmaCo', 0, 'نفذ المخزون'],
      ['OP001', 'مشرط جراحي رقم 11', 'مستلزمات وأدوات جراحية', 'Global Med', 50, 'متوفر'],
      ['OFF01', 'ورق A4', 'لوازم مكتبية', 'Local Supplier', 100, 'متوفر']
    ];

    for (const item of items) {
      await connection.query(
        'INSERT IGNORE INTO stock_items (itemCode, name, category, supplier, quantity, status) VALUES (?, ?, ?, ?, ?, ?)',
        item
      );
    }

    console.log('Seeding completed successfully.');
  } catch (err) {
    console.error('Error seeding data:', err);
  } finally {
    await connection.end();
  }
}

run();
