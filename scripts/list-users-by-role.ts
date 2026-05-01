import { getAllUsers } from "../server/db";

async function listUsersByRole() {
  console.log("Loading users...\n");

  try {
    const allUsers = await getAllUsers();

    if (!allUsers || allUsers.length === 0) {
      console.log("No users found in the system.");
      process.exit(0);
    }

    // Group by role
    const roleGroups: { [key: string]: typeof allUsers } = {};
    allUsers.forEach(user => {
      if (!roleGroups[user.role]) {
        roleGroups[user.role] = [];
      }
      roleGroups[user.role].push(user);
    });

    // Display by role
    const roleOrder = ['admin', 'manager', 'doctor', 'nurse', 'technician', 'reception', 'accountant'];

    for (const role of roleOrder) {
      if (!roleGroups[role]) continue;

      console.log(`\n═══════════════════════════════════════════`);
      console.log(`${role.toUpperCase()}`);
      console.log(`═══════════════════════════════════════════`);

      roleGroups[role].forEach(user => {
        const status = user.isActive ? '✓ Active' : '✗ Inactive';
        const userName = user.name ? `${user.name}` : 'N/A';
        console.log(`  ${user.username.padEnd(20)} | ${userName.padEnd(25)} | ${status}`);
      });

      console.log(`  (${roleGroups[role].length} user${roleGroups[role].length !== 1 ? 's' : ''})`);
    }

    console.log(`\n═══════════════════════════════════════════`);
    console.log(`Total Users: ${allUsers.length}`);

    process.exit(0);
  } catch (error) {
    console.error("Error loading users:", error);
    process.exit(1);
  }
}

listUsersByRole();
