#!/usr/bin/env node

/**
 * ZKTeco Device Debug Test
 * Shows raw TCP communication for troubleshooting
 */

import * as net from 'net';
import { createHash } from 'crypto';

async function testRawConnection(ip: string, port: number) {
  console.log(`\n🔍 Raw TCP Debug Test`);
  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  console.log(`Target: ${ip}:${port}\n`);

  return new Promise<void>((resolve, reject) => {
    const socket = net.createConnection({ host: ip, port, timeout: 5000 });
    let responseReceived = false;

    socket.on('connect', () => {
      console.log(`✓ TCP connected\n`);

      // Test 1: Send simple command byte sequence
      console.log(`[TEST 1] Sending basic status query...`);
      const statusCmd = Buffer.from([0xaa, 0xbb, 0x00, 0x00]);
      console.log(`  → Sending: ${statusCmd.toString('hex').toUpperCase()}`);
      socket.write(statusCmd);
    });

    socket.on('data', (data) => {
      responseReceived = true;
      console.log(`\n✓ Received response:`);
      console.log(`  Length: ${data.length} bytes`);
      console.log(`  Hex: ${data.toString('hex').toUpperCase()}`);
      console.log(`  ASCII: ${data.toString('ascii').replace(/[^\x20-\x7E]/g, '.')}\n`);

      // Try to parse as simple buffer
      if (data.length >= 2) {
        console.log(`  Parsed:`);
        console.log(`    [0-1] (CMD): 0x${data.readUInt16LE(0).toString(16).toUpperCase().padStart(4, '0')}`);
        if (data.length >= 4) {
          console.log(`    [2-3] (CRC): 0x${data.readUInt16LE(2).toString(16).toUpperCase().padStart(4, '0')}`);
        }
        if (data.length >= 8) {
          console.log(`    [4-7] (SessionID): 0x${data.readUInt32LE(4).toString(16).toUpperCase().padStart(8, '0')}`);
        }
      }

      // Now test ZKTeco protocol command
      console.log(`\n[TEST 2] Sending proper ZKTeco CMD_CONNECT (0x03E8)...`);
      const zktecoCmdBuf = createZKTecoCommand(0x03E8);
      console.log(`  → Sending: ${zktecoCmdBuf.toString('hex').toUpperCase()}`);
      socket.write(zktecoCmdBuf);
    });

    socket.on('error', (err) => {
      console.log(`✗ Error: ${err.message}`);
      reject(err);
    });

    socket.on('timeout', () => {
      console.log(`✗ Timeout after 5000ms`);
      if (!responseReceived) {
        console.log(`  (No data received - device may not be responding)\n`);
      }
      socket.destroy();
      reject(new Error('Timeout'));
    });

    socket.on('close', () => {
      console.log(`Connection closed`);
      resolve();
    });

    // Set timeout for initial connection
    setTimeout(() => {
      if (!responseReceived && socket.writable) {
        console.log(`\nNo response after 5 seconds, closing connection...`);
        socket.destroy();
        resolve();
      }
    }, 5000);
  });
}

function createZKTecoCommand(commandId: number, data?: Buffer): Buffer {
  const cmdBuf = Buffer.alloc(8 + (data?.length || 0));

  // Command ID (little-endian short)
  cmdBuf.writeUInt16LE(commandId, 0);

  // CRC placeholder
  cmdBuf.writeUInt16LE(0, 2);

  // Session ID (simple fixed for debug)
  cmdBuf.writeUInt32LE(0x00000001, 4);

  // Append data if provided
  if (data) {
    data.copy(cmdBuf, 8);
  }

  // Calculate CRC-16 CCITT
  const crc = calculateCRC16(cmdBuf.slice(0, 8));
  cmdBuf.writeUInt16LE(crc, 2);

  return cmdBuf;
}

function calculateCRC16(data: Buffer): number {
  let crc = 0;
  for (let i = 0; i < data.length; i++) {
    crc ^= data[i];
    for (let j = 0; j < 8; j++) {
      if (crc & 1) {
        crc = (crc >> 1) ^ 0xa001;
      } else {
        crc >>= 1;
      }
    }
  }
  return crc;
}

async function main() {
  const ip = process.argv[2] || '192.168.0.10';
  const port = parseInt(process.argv[3] || '5005', 10);

  try {
    await testRawConnection(ip, port);
  } catch (error) {
    if (error instanceof Error && error.message !== 'Timeout') {
      console.error(`\n✗ Failed: ${error.message}\n`);
      process.exit(1);
    }
  }
}

main();
