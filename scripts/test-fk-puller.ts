#!/usr/bin/env node

/**
 * Test FK Attendance Log Puller
 * Uses FKOldLogPuller.exe to communicate with device
 */

import { FKAttendLogPuller, testFKPuller } from '../server/services/attendance/fkAttendLogPuller';

async function main() {
  console.log(`\n🔌 FK Attendance Device Connection Test`);
  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);

  await testFKPuller();

  console.log(`\n✓ Test complete\n`);
}

main();
