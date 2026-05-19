
import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

async function run() {
  const connection = await mysql.createConnection(process.env.DATABASE_URL);
  console.log('Connected to MySQL.');

  const statements = [
    `CREATE TABLE IF NOT EXISTS \`stock_items\` (
            \`id\` int AUTO_INCREMENT NOT NULL,
            \`itemCode\` varchar(100),
            \`name\` varchar(255) NOT NULL,
            \`category\` varchar(100),
            \`supplier\` varchar(255),
            \`quantity\` int NOT NULL DEFAULT 0,
            \`status\` enum('متوفر','كمية قليلة','نفذ المخزون') NOT NULL DEFAULT 'متوفر',
            \`expiryDate\` date,
            \`createdAt\` timestamp NOT NULL DEFAULT (now()),
            \`updatedAt\` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
            CONSTRAINT \`stock_items_id\` PRIMARY KEY(\`id\`),
            CONSTRAINT \`stock_items_itemCode_unique\` UNIQUE(\`itemCode\`)
    );`,
    `CREATE TABLE IF NOT EXISTS \`stock_transactions\` (
            \`id\` int AUTO_INCREMENT NOT NULL,
            \`itemId\` int NOT NULL,
            \`type\` enum('add','dispense') NOT NULL,
            \`quantity\` int NOT NULL,
            \`unitPrice\` decimal(10,2),
            \`totalValue\` decimal(10,2),
            \`employeeName\` varchar(255),
            \`performedBy\` varchar(255),
            \`createdAt\` timestamp NOT NULL DEFAULT (now()),
            CONSTRAINT \`stock_transactions_id\` PRIMARY KEY(\`id\`)
    );`
  ];

  try {
    for (let statement of statements) {
      console.log('Executing statement...');
      await connection.query(statement);
    }
    console.log('Stockroom tables ensured successfully.');
  } catch (err) {
    console.error('Error ensuring stockroom tables:', err);
  } finally {
    await connection.end();
  }
}

run();
