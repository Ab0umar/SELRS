/**
 * Device Push Listener Service
 * Receives real-time punch notifications from ZKTeco device
 * Device connects and sends punch data continuously to port 7005
 */

import * as net from 'net';
import { EventEmitter } from 'events';

export interface PunchPushEvent {
  empNo: string;
  timestamp: Date;
  direction: 'in' | 'out';
  rawBytes: Buffer;
  receivedAt: Date;
}

export class DevicePushListener extends EventEmitter {
  private server: net.Server | null = null;
  private port: number;
  private isListening = false;
  private activeConnections = 0;
  private startTime = Date.now();

  constructor(port: number = 7005) {
    super();
    this.port = port;
  }

  /**
   * Start listening for device push notifications
   */
  async start(): Promise<boolean> {
    return new Promise((resolve) => {
      this.server = net.createServer((socket) => {
        this.activeConnections++;
        const clientId = `${socket.remoteAddress}:${socket.remotePort}`;
        console.log(`[DevicePush] Client connected: ${clientId}`);
        this.emit('client-connected', { ip: socket.remoteAddress, port: socket.remotePort });

        let buffer = Buffer.alloc(0);

        socket.on('data', (data: any) => {
          // Accumulate data
          buffer = Buffer.concat([buffer, data as Buffer]);

          // Try to parse punch records from buffer
          // Format appears to be variable-length packets with punch data
          this.processPunchData(buffer, clientId, (remaining) => {
            buffer = remaining;
          });

          // Send acknowledgement
          socket.write('OK\r\n');
        });

        socket.on('error', (err) => {
          console.error(`[DevicePush] Error from ${clientId}: ${err.message}`);
          this.emit('client-error', { ip: socket.remoteAddress, error: err.message });
        });

        socket.on('close', () => {
          this.activeConnections--;
          console.log(`[DevicePush] Client disconnected: ${clientId}`);
          this.emit('client-disconnected', { ip: socket.remoteAddress });
        });
      });

      this.server.listen(this.port, '0.0.0.0', () => {
        this.isListening = true;
        console.log(`[DevicePush] Listening for device push on port ${this.port}`);
        this.emit('listening', { port: this.port });
        resolve(true);
      });

      this.server.on('error', (err) => {
        console.error(`[DevicePush] Server error: ${err.message}`);
        resolve(false);
      });
    });
  }

  /**
   * Process punch data from device push
   * Device sends punch packets - need to parse format
   */
  private processPunchData(
    buffer: Buffer,
    clientId: string,
    onProcessed: (remaining: any) => void
  ): void {
    // Try to detect and parse punch records
    // Common patterns:
    // - Fixed-length records (24+ bytes)
    // - Length-prefixed records
    // - Delimiter-separated (newline, comma, etc.)

    let processed = 0;

    // Attempt 1: Parse as fixed-length records (24 bytes minimum)
    while (buffer.length - processed >= 24) {
      const record = buffer.slice(processed, processed + 24);
      const punch = this.parsePunchRecord(record);

      if (punch) {
        this.emit('punch', punch);
        processed += 24;
      } else {
        break; // Couldn't parse, wait for more data
      }
    }

    // Attempt 2: Look for newline delimiters (JSON or text format)
    if (processed === 0) {
      const nlIndex = buffer.indexOf(0x0a); // \n
      if (nlIndex >= 0) {
        const line = buffer.slice(0, nlIndex).toString('utf-8').trim();
        try {
          const data = JSON.parse(line);
          if (data.empNo && data.timestamp) {
            const punch: PunchPushEvent = {
              empNo: String(data.empNo),
              timestamp: new Date(data.timestamp),
              direction: data.direction || 'in',
              rawBytes: buffer.slice(0, nlIndex),
              receivedAt: new Date(),
            };
            this.emit('punch', punch);
            processed = nlIndex + 1;
          }
        } catch (e) {
          // Not JSON, try next format
        }
      }
    }

    // Attempt 3: Look for comma delimiters
    if (processed === 0) {
      const commaIndex = buffer.indexOf(0x2c); // ,
      if (commaIndex > 0) {
        const crIndex = buffer.indexOf(0x0d, commaIndex); // \r after comma
        if (crIndex > commaIndex) {
          // Possible CSV record
          const record = buffer.slice(0, crIndex).toString('utf-8').trim();
          const parts = record.split(',');
          if (parts.length >= 3) {
            try {
              const punch: PunchPushEvent = {
                empNo: parts[0].trim(),
                timestamp: new Date(parseInt(parts[1]) * 1000), // Unix timestamp
                direction: parseInt(parts[2]) === 1 ? 'in' : 'out',
                rawBytes: buffer.slice(0, crIndex),
                receivedAt: new Date(),
              };
              this.emit('punch', punch);
              processed = crIndex + 2; // \r\n
            } catch (e) {
              // Parse error
            }
          }
        }
      }
    }

    onProcessed(buffer.slice(processed));
  }

  /**
   * Try to parse a 24-byte fixed-length punch record
   * Format (guessed): [empNo:4][timestamp:4][direction:1][verify:1][reserved:14]
   */
  private parsePunchRecord(data: Buffer): PunchPushEvent | null {
    try {
      if (data.length < 24) return null;

      // Try little-endian parsing
      const empNo = data.readUInt32LE(0);
      const timestamp = data.readUInt32LE(4);
      const direction = data[8];

      // Validate
      if (empNo === 0 || timestamp === 0) return null;

      const empNoStr = String(empNo);
      const punchDate = new Date(timestamp * 1000);

      // Validate date is reasonable (not year 1970 or future)
      if (punchDate.getFullYear() < 2000 || punchDate.getFullYear() > 2030) {
        return null;
      }

      return {
        empNo: empNoStr,
        timestamp: punchDate,
        direction: direction === 1 ? 'in' : 'out',
        rawBytes: data,
        receivedAt: new Date(),
      };
    } catch (e) {
      return null;
    }
  }

  /**
   * Stop listening for push notifications
   */
  stop(): void {
    if (this.server) {
      this.server.close();
      this.server = null;
      this.isListening = false;
      console.log(`[DevicePush] Listener stopped`);
    }
  }

  /**
   * Get listener status
   */
  getStatus(): {
    listening: boolean;
    port: number;
    activeConnections: number;
    uptime: number;
  } {
    return {
      listening: this.isListening,
      port: this.port,
      activeConnections: this.activeConnections,
      uptime: Date.now() - this.startTime,
    };
  }
}

let pushListenerInstance: DevicePushListener | null = null;

/**
 * Get or create global push listener
 */
export function getDevicePushListener(port?: number): DevicePushListener {
  if (!pushListenerInstance) {
    pushListenerInstance = new DevicePushListener(port || 7005);
  }
  return pushListenerInstance;
}
