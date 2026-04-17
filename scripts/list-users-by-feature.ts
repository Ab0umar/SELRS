import { getUserPermissionState, getEffectiveUserPermissions } from "../server/db";
import { getAllUsers } from "../server/db";

async function listUsersByFeature() {
  console.log("\n" + "═".repeat(70));
  console.log("USERS BY SPECIFIC FEATURE ACCESS");
  console.log("═".repeat(70));

  try {
    const allUsers = await getAllUsers();

    // Features to check
    const features = [
      { key: "/patient-data/edit", label: "📝 Edit Patient Details" },
      { key: "/examination", label: "🔍 Examination Form" },
      { key: "/refraction/:id", label: "👁️ Refraction/Vision" },
      { key: "/prescription", label: "💊 Prescriptions" },
      { key: "/request-tests", label: "🧪 Request Tests" },
      { key: "/medical-reports", label: "📋 Medical Reports" },
      { key: "/surgeries", label: "🔪 Surgeries" },
      { key: "/quick-entry", label: "⚡ Quick Entry" },
      { key: "/followups", label: "📍 Followups" },
      { key: "/new-cases", label: "✨ New Cases" },
    ];

    for (const feature of features) {
      console.log(`\n${feature.label}`);
      console.log("-".repeat(70));

      const usersWithAccess: any[] = [];

      for (const user of allUsers) {
        const effectivePerms = await getEffectiveUserPermissions(user.id, user.role);

        // Check if user has this permission
        const hasAccess = effectivePerms.includes(feature.key);

        if (hasAccess) {
          usersWithAccess.push({
            username: user.username,
            name: user.name,
            role: user.role,
            isActive: user.isActive
          });
        }
      }

      if (usersWithAccess.length === 0) {
        console.log("  ⚠️  No users have access to this feature");
      } else {
        usersWithAccess.sort((a, b) => a.role.localeCompare(b.role));

        let currentRole = "";
        for (const user of usersWithAccess) {
          if (currentRole !== user.role) {
            currentRole = user.role;
            console.log(`\n  ${currentRole.toUpperCase()}:`);
          }
          const status = user.isActive ? "✓" : "✗";
          console.log(`    ${status} ${user.username.padEnd(15)} (${user.name || "N/A"})`);
        }

        console.log(`\n  Total: ${usersWithAccess.length} user${usersWithAccess.length !== 1 ? "s" : ""}`);
      }
    }

    console.log("\n" + "═".repeat(70) + "\n");

    process.exit(0);
  } catch (error) {
    console.error("Error loading permissions:", error);
    process.exit(1);
  }
}

listUsersByFeature();
