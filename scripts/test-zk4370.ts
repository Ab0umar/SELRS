/**
 * Test ZK4370 device connection
 * Usage: npx tsx scripts/test-zk4370.ts [ip] [port]
 */

import { ZK4370Client } from "../server/services/attendance/zk4370Client";

const ip   = process.argv[2] ?? "192.168.1.170";
const port = parseInt(process.argv[3] ?? "4370", 10);

async function main() {
  console.log(`\nTesting ZK device at ${ip}:${port}\n`);

  const client = new ZK4370Client(ip, port, 8000);

  try {
    console.log("[1/3] Connecting...");
    await client.connect();
    console.log("     ✓ Connected\n");

    console.log("[2/3] Fetching users...");
    const users = await client.getUsers();
    console.log(`     ✓ ${users.length} users found`);
    users.slice(0, 5).forEach((u) =>
      console.log(`       uid=${u.uid}  userId=${u.userId}  name=${u.name}  role=${u.role}`)
    );
    if (users.length > 5) console.log(`       ... and ${users.length - 5} more`);
    console.log();

    console.log("[3/3] Fetching attendance logs...");
    const logs = await client.getAttendanceLogs();
    console.log(`     ✓ ${logs.length} records found`);
    logs.slice(0, 5).forEach((r) =>
      console.log(`       userId=${r.userId}  ${r.timestamp.toISOString()}  type=${r.type === 0 ? "IN" : r.type === 1 ? "OUT" : r.type}`)
    );
    if (logs.length > 5) console.log(`       ... and ${logs.length - 5} more`);
    console.log();

    await client.disconnect();
    console.log("✓ Done\n");

  } catch (err) {
    try { await client.disconnect(); } catch { /* ignore */ }
    console.error(`\n✗ ${err instanceof Error ? err.message : err}\n`);
    process.exit(1);
  }
}

main();
