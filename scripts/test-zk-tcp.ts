/**
 * Standalone test for the pure-TCP ZK client — no COM, no PS1.
 * Usage: npx tsx scripts/test-zk-tcp.ts <ip> [port] [commKey]
 */
import { ZKTcpClient } from "../server/services/attendance/zkTcpClient";

async function main() {
  const ip = process.argv[2];
  const port = parseInt(process.argv[3] ?? "4370", 10);
  const commKey = parseInt(process.argv[4] ?? "0", 10);

  if (!ip) {
    console.error("Usage: npx tsx scripts/test-zk-tcp.ts <ip> [port] [commKey]");
    process.exit(1);
  }

  const client = new ZKTcpClient(ip, port);

  console.log(`Connecting to ${ip}:${port} (commKey=${commKey})...`);
  await client.connect(commKey);
  console.log("✓ Connected");

  try {
    const info = await client.getDeviceInfo();
    console.log("Device info:", info);

    console.log("Pulling users...");
    const users = await client.pullUsers();
    console.log(`✓ ${users.length} users`);
    console.log(users.slice(0, 5));

    console.log("Pulling logs...");
    const logs = await client.pullLogs();
    console.log(`✓ ${logs.length} punches`);
    console.log(logs.slice(0, 5));
  } finally {
    await client.exit();
    console.log("Disconnected");
  }
}

main().catch((err) => {
  console.error("FAILED:", err instanceof Error ? err.message : err);
  process.exit(1);
});
