import "dotenv/config";
import * as db from "../server/db";

async function main() {
  const users = await db.getAllUsers();
  const rows = await Promise.all(
    users.map(async (user) => {
      const permissions = await db.getUserPermissions(user.id);
      return {
        id: user.id,
        username: user.username,
        role: user.role,
        isActive: user.isActive !== false,
        customPermissionCount: permissions.length,
      };
    }),
  );

  console.log(JSON.stringify({ total: rows.length, users: rows }, null, 2));
}

main().catch((error) => {
  console.error("[audit-users] Failed:", error);
  process.exitCode = 1;
});
