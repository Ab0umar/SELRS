#!/usr/bin/env node

/**
 * ZKTeco Device Stream Test
 * Listen for real-time punch streaming from device
 */

import * as net from 'net';

async function testStreamingMode(ip: string, port: number) {
  console.log(`\n📡 Testing Real-Time Punch Streaming Mode`);
  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  console.log(`Target: ${ip}:${port}`);
  console.log(`Listening for 15 seconds for punch events...\n`);

  return new Promise<void>((resolve) => {
    const socket = net.createConnection({ host: ip, port, timeout: 5000 });
    let dataReceived = false;
    let punchCount = 0;

    const timeoutHandle = setTimeout(() => {
      if (!dataReceived) {
        console.log(`\n⏱️  No data received in 15 seconds`);
        console.log(`   Device may not be in streaming mode or may need initialization\n`);
      }
      socket.destroy();
      resolve();
    }, 15000);

    socket.on('connect', () => {
      console.log(`✓ Connected to device\n`);

      // Try requesting status to see if device responds
      console.log(`[OPTION 1] Requesting device status...`);
      const statusCmd = Buffer.from([0xAA, 0xBB, 0x00, 0x00, 0x00, 0x00]);
      console.log(`  → Sending: ${statusCmd.toString('hex').toUpperCase()}\n`);
      socket.write(statusCmd);
    });

    socket.on('data', (data: Buffer) => {
      dataReceived = true;
      console.log(`\n✓ Received data (${data.length} bytes):`);
      console.log(`  Hex: ${data.toString('hex').toUpperCase()}`);
      console.log(`  ASCII: ${data.toString('ascii').replace(/[^\x20-\x7E]/g, '.')}`);

      // Try to parse as punch data
      // Format: empNo(4-8 bytes) + timestamp(4 bytes) + direction(1 byte) + ...
      if (data.length >= 10) {
        console.log(`\n  Possible punch record:`);
        if (data.length >= 4) {
          const empNo = data.readUInt32LE(0);
          console.log(`    EmpNo: ${empNo}`);
        }
        if (data.length >= 8) {
          const timestamp = data.readUInt32LE(4);
          console.log(`    Timestamp (Unix): ${timestamp} (${new Date(timestamp * 1000).toISOString()})`);
        }
        if (data.length >= 9) {
          const direction = data[8];
          console.log(`    Direction: ${direction === 1 ? 'IN' : direction === 0 ? 'OUT' : 'UNKNOWN'}`);
        }
      }

      punchCount++;
      if (punchCount > 10) {
        console.log(`\n... received ${punchCount} data packets`);
        socket.destroy();
        clearTimeout(timeoutHandle);
        resolve();
      }
    });

    socket.on('error', (err) => {
      console.log(`✗ Connection error: ${err.message}\n`);
      clearTimeout(timeoutHandle);
      resolve();
    });

    socket.on('timeout', () => {
      console.log(`✗ Connection timeout\n`);
      socket.destroy();
      clearTimeout(timeoutHandle);
      resolve();
    });

    socket.on('close', () => {
      clearTimeout(timeoutHandle);
      console.log(`\nConnection closed`);
      if (punchCount === 0 && dataReceived === false) {
        console.log(`\n[ANALYSIS]`);
        console.log(`- Device accepts TCP connection on port 5005 ✓`);
        console.log(`- Device does NOT respond to command/response protocol ✗`);
        console.log(`- Device does NOT stream punch events in real-time ✗`);
        console.log(`\n[POSSIBLE SOLUTIONS]`);
        console.log(`1. Taratus.exe may have special lock/protocol only it knows`);
        console.log(`2. Device may require Access DB sync approach (Phase 1 fallback)`);
        console.log(`3. Device may need different initialization/handshake sequence`);
        console.log(`4. Check device documentation for actual protocol details\n`);
      }
      resolve();
    });
  });
}

const ip = process.argv[2] || '192.168.0.10';
const port = parseInt(process.argv[3] || '5005', 10);

testStreamingMode(ip, port);
