import { getUserPermissionState, getUserPermissions } from "../server/db";
import { getAllUsers } from "../server/db";

async function listIndividualUserPermissions() {
  console.log("\n" + "═".repeat(70));
  console.log("INDIVIDUAL USER PERMISSIONS (CUSTOM OVERRIDES)");
  console.log("═".repeat(70) + "\n");

  try {
    const allUsers = await getAllUsers();
    let usersWithCustomPerms = 0;

    for (const user of allUsers) {
      const permState = await getUserPermissionState(user.id);

      // Only show users with custom permissions
      if (!permState.hasOverride) continue;

      usersWithCustomPerms++;

      console.log(`\n${user.username} (${user.name || 'N/A'}) [ID: ${user.id}]`);
      console.log(`Role: ${user.role} | Status: ${user.isActive ? '✓ Active' : '✗ Inactive'}`);
      console.log("-".repeat(70));

      if (permState.hasExplicitEmptyOverride) {
        console.log("  ⚠ EXPLICIT EMPTY OVERRIDE - No permissions granted");
      } else if (permState.pageIds.length === 0) {
        console.log("  (No custom permissions - inherits role defaults)");
      } else {
        console.log(`  ${permState.pageIds.length} custom permission(s):`);
        permState.pageIds.forEach(pageId => {
          console.log(`    ✓ ${pageId}`);
        });
      }
    }

    console.log("\n" + "═".repeat(70));
    console.log(`\nTotal users with custom permissions: ${usersWithCustomPerms} / ${allUsers.length}`);

    if (usersWithCustomPerms === 0) {
      console.log("\nℹ️  No individual users have custom permission overrides.");
      console.log("   All users are using their role-based default permissions.");
    }

    console.log("═".repeat(70) + "\n");

    process.exit(0);
  } catch (error) {
    console.error("Error loading permissions:", error);
    process.exit(1);
  }
}

listIndividualUserPermissions();
