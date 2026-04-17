import { getTeamPermissions } from "../server/db";

async function listRolePermissions() {
  console.log("\n" + "═".repeat(60));
  console.log("ROLE-BASED PERMISSIONS");
  console.log("═".repeat(60) + "\n");

  try {
    const teamPermissions = await getTeamPermissions();

    const roles = ["admin", "manager", "doctor", "nurse", "technician", "reception", "accountant"];

    for (const role of roles) {
      const permissions = teamPermissions[role] || [];

      console.log(`\n${role.toUpperCase()}`);
      console.log("-".repeat(40));

      if (permissions.length === 0) {
        console.log("  (inherits all permissions)");
      } else {
        permissions.forEach(perm => {
          console.log(`  ✓ ${perm}`);
        });
      }
    }

    console.log("\n" + "═".repeat(60));
    console.log("\nNote:");
    console.log("- Empty list means role inherits ALL permissions");
    console.log("- Specific permissions limit access to those pages only");
    console.log("═".repeat(60) + "\n");

    process.exit(0);
  } catch (error) {
    console.error("Error loading permissions:", error);
    process.exit(1);
  }
}

listRolePermissions();
