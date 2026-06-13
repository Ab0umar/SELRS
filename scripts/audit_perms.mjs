import mysql from "mysql2/promise";
import { config } from "dotenv";
config();

const conn = await mysql.createConnection(process.env.DATABASE_URL);
const [rows] = await conn.execute(
  "SELECT pageId, COUNT(*) as cnt FROM user_permissions WHERE pageId IN ('/txhub', '/today', '/admin-hub', '/tests-management') GROUP BY pageId"
);
console.log(JSON.stringify(rows, null, 2));
await conn.end();
