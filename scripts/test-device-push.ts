#!/usr/bin/env node

/**
 * Device Push Listener Test
 * Listens on port 7005 for real-time punch notifications from device
 */

import { getDevicePushListener } from '../server/services/attendance/devicePushListener';

async function main() {
  console.log(`\n🔔 ZKTeco Device Push Listener Test`);
  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);

  const listener = getDevicePushListener(7005);

  // Track statistics
  let punchCount = 0;
  let lastPunch = new Date();
  const punchLog: any[] = [];

  // Listen for punch events
  listener.on('punch', (punch) => {
    punchCount++;
    lastPunch = new Date();

    console.log(`[${punch.receivedAt.toLocaleTimeString()}] Punch received:`);
    console.log(`  → Emp: ${punch.empNo}`);
    console.log(`  → Time: ${punch.timestamp.toISOString()}`);
    console.log(`  → Direction: ${punch.direction.toUpperCase()}`);
    console.log(`  → Raw: ${punch.rawBytes.toString('hex').substring(0, 40)}...\n`);

    punchLog.push({
      time: punch.receivedAt,
      empNo: punch.empNo,
      direction: punch.direction,
      rawHex: punch.rawBytes.toString('hex'),
    });
  });

  listener.on('client-connected', (info) => {
    console.log(`✓ Device connected from ${info.ip}:${info.port}`);
  });

  listener.on('client-disconnected', (info) => {
    console.log(`✗ Device disconnected: ${info.ip}`);
  });

  listener.on('listening', (info) => {
    console.log(`✓ Listening on port ${info.port}`);
    console.log(`⏳ Waiting for device push notifications...`);
    console.log(`💡 Make a punch on the device to test\n`);
  });

  // Start listener
  const started = await listener.start();
  if (!started) {
    console.log(`✗ Failed to start listener (port may be in use)\n`);
    process.exit(1);
  }

  // Monitor for 2 minutes
  const monitorInterval = setInterval(() => {
    const status = listener.getStatus();
    console.log(`[${new Date().toLocaleTimeString()}] Status: ${punchCount} punches, ${status.activeConnections} connected clients`);

    // Auto-exit if listening but no activity for 60 seconds
    if (punchCount > 0 && Date.now() - lastPunch.getTime() > 60000) {
      console.log(`\n⏱️  No new punches for 60 seconds, exiting test...`);
      clearInterval(monitorInterval);
      listener.stop();
      reportResults();
      process.exit(0);
    }
  }, 10000);

  // Exit after 2 minutes max
  setTimeout(() => {
    clearInterval(monitorInterval);
    listener.stop();
    reportResults();
    process.exit(0);
  }, 120000);

  function reportResults() {
    console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    console.log(`Test Complete`);
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);

    if (punchCount === 0) {
      console.log(`❌ No punches received`);
      console.log(`\n[DIAGNOSIS]`);
      console.log(`- Port 7005 listener started successfully ✓`);
      console.log(`- Waiting for device push... (still no data)`);
      console.log(`\n[NEXT STEPS]`);
      console.log(`1. Verify device is configured to push to this IP:7005`);
      console.log(`2. Make a punch on the device and check if data arrives`);
      console.log(`3. If still no data, run PowerShell listener for comparison:`);
      console.log(`   powershell -File "D:\\Taurus V3.0\\listen_device_push.ps1" -Port 7005\n`);
    } else {
      console.log(`✓ Test successful!`);
      console.log(`\nReceived ${punchCount} punch records:`);
      punchLog.slice(0, 5).forEach((p, i) => {
        console.log(`  ${i + 1}. Emp: ${p.empNo}, Dir: ${p.direction}, Time: ${p.time.toLocaleTimeString()}`);
      });
      if (punchLog.length > 5) {
        console.log(`  ... and ${punchLog.length - 5} more`);
      }
      console.log(`\nDevice push protocol is working! Ready for integration.\n`);
    }
  }
}

main();
