import "dotenv/config";
import * as db from "../server/db";

const userId = Number(process.argv[2]);
if (!Number.isInteger(userId) || userId < 1) {
  throw new Error("Usage: pnpm exec tsx scripts/audit-user-permissions.ts <userId>");
}

const users = await db.getAllUsers();
const user = users.find((item) => item.id === userId);
if (!user) throw new Error(`User ${userId} not found`);

console.log(
  JSON.stringify(
    {
      id: user.id,
      username: user.username,
      role: user.role,
      isActive: user.isActive !== false,
      permissions: await db.getUserPermissions(userId),
    },
    null,
    2,
  ),
);
