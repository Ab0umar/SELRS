#!/usr/bin/env node

/**
 * Test FK Device Sync Pipeline
 * Full end-to-end: Pull from device → MySQL → Daily materialization
 */

import { FKDeviceSyncService } from '../server/services/attendance/fkDeviceSyncService';

async function main() {
  console.log(`\n🔄 FK Device Sync Pipeline Test`);
  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);

  try {
    console.log(`Syncing from FK device...`);
    const result = await FKDeviceSyncService.syncNow(1);

    console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    console.log(`Sync Complete`);
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);

    console.log(`Status: ${result.success ? '✓ SUCCESS' : '✗ FAILED'}`);
    console.log(`Duration: ${result.duration}ms`);
    console.log(`Records Seen: ${result.recordsSeen}`);
    console.log(`Records Inserted: ${result.recordsInserted}`);
    console.log(`Records Skipped: ${result.recordsSkipped}`);

    if (result.error) {
      console.log(`Error: ${result.error}`);
    }

    console.log(`Started: ${result.startedAt.toISOString()}`);
    console.log(`Completed: ${result.completedAt.toISOString()}\n`);

    if (result.success) {
      if (result.recordsInserted > 0) {
        console.log(`✓ Data imported to MySQL`);
        console.log(`✓ Daily records recomputed`);
        console.log(`✓ Sync status recorded\n`);
      } else {
        console.log(`ℹ No new records to import (duplicates skipped)\n`);
      }
    }

    process.exit(result.success ? 0 : 1);
  } catch (error) {
    console.error(`\n✗ Test failed: ${error instanceof Error ? error.message : error}\n`);
    process.exit(1);
  }
}

main();
