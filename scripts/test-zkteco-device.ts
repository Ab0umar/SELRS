#!/usr/bin/env node

/**
 * ZKTeco Device Connection Test
 *
 * Usage: npx tsx scripts/test-zkteco-device.ts <ip> [port]
 * Example: npx tsx scripts/test-zkteco-device.ts 192.168.0.10 5005
 */

import { ZKTecoDevice } from '../server/services/attendance/zktecoDevice';

async function main() {
  const ip = process.argv[2] || '192.168.0.10';
  const port = parseInt(process.argv[3] || '5005', 10);

  console.log(`\n🔍 Testing ZKTeco Device Connection`);
  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  console.log(`Target: ${ip}:${port}\n`);

  const device = new ZKTecoDevice({
    ip,
    port,
    timeout: 10000,
  });

  try {
    // Test 1: TCP Connection
    console.log(`[1/4] Attempting TCP connection...`);
    const connected = await device.connect();
    if (!connected) {
      console.log(`❌ Failed to connect to device`);
      process.exit(1);
    }
    console.log(`✓ TCP connection established\n`);

    // Test 2: Verify Connection
    console.log(`[2/4] Verifying device responds...`);
    const isValid = await device.verifyConnection();
    if (!isValid) {
      console.log(`❌ Device did not respond to verify command`);
      device.disconnect();
      process.exit(1);
    }
    console.log(`✓ Device verified and responding\n`);

    // Test 3: Get Device Info
    console.log(`[3/4] Fetching device information...`);
    const info = await device.getDeviceInfo();
    console.log(`✓ Device Info:`);
    console.log(`  - Model: ${info.model}`);
    console.log(`  - Serial: ${info.serialNumber}`);
    console.log(`  - Firmware: ${info.firmware}`);
    console.log(`  - Users: ${info.userCount}`);
    console.log(`  - Fingerprints: ${info.fpCount}`);
    console.log(`  - Records: ${info.recordCount}\n`);

    // Test 4: Get Punch Records
    console.log(`[4/4] Retrieving punch records...`);
    const lastDay = new Date();
    lastDay.setDate(lastDay.getDate() - 1);
    const punches = await device.getPunchRecords(lastDay);
    console.log(`✓ Retrieved ${punches.length} punch records from last 24 hours\n`);

    if (punches.length > 0) {
      console.log(`Sample records:`);
      punches.slice(0, 3).forEach((p, i) => {
        console.log(`  ${i + 1}. Emp: ${p.empNo}, Time: ${p.punchDateTime.toISOString()}, Dir: ${p.direction}`);
      });
      if (punches.length > 3) {
        console.log(`  ... and ${punches.length - 3} more`);
      }
      console.log();
    }

    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    console.log(`✓ All tests passed! Device is working.`);
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);

    device.disconnect();
    process.exit(0);

  } catch (error) {
    console.log(`\n❌ Error: ${error instanceof Error ? error.message : String(error)}\n`);
    device.disconnect();
    process.exit(1);
  }
}

main();
