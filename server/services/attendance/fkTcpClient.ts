/**
 * Native client for the FK/HS-Electronics terminal protocol on port 5005
 * (EF10K). Replaces FKOldLogPuller.exe + FK623Attend.dll. Wire format was
 * recovered by logging FKOldLogPuller.exe through a TCP proxy and checked
 * against its CSV output (27,710 of 27,710 records identical).
 *
 * Request  (16 bytes):  55 AA | ver 01 | cmd | param u32 | arg u32 | len u16 | seq u16
 * Response (10 bytes):  AA 55 | 01 | status | value u32 | seq u16   (+ body for log pages)
 * Log page body:        55 AA | <len> data bytes | 4 trailer bytes
 *
 * Session: probe (cmd 80, param = device password, 20-byte frame, own socket,
 * status 1 = accepted) -> connect (80) -> disable (81/0) -> record count (B4/8)
 * -> pages (A4) -> enable (81/1). The device streams pages in order; the
 * page-index arg is not a seek, so a pull always reads the whole log.
 *
 * Record (12 bytes): enroll u32 | type u8 | inout u8 | verify u8 | second u8 |
 *   u32 LE packed: minute[26..31] hour[21..25] day[16..20] month[12..15] (year-1900)[2..11]
 */

import * as net from "net";

const CMD_CONNECT = 0x80;
const CMD_DEVICE_ENABLE = 0x81;
const CMD_LOG_COUNT = 0xb4;
const CMD_LOG_PAGE = 0xa4;
const CMD_USER_READ = 0x97;
const IDLE_ARG = 0xffff0000;
const PAGE_SIZE = 1024;
const RECORD_SIZE = 12;
const USER_RECORD_SIZE = 8;
const PAGE_TRAILER = 4;
const MAX_RECORDS = 5_000_000;

export interface FKNativePunch {
  enrollNo: number;
  verifyMode: number;
  inOutMode: number;
  timestamp: Date;
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
}

export function decodeFkRecords(buf: Buffer): FKNativePunch[] {
  const out: FKNativePunch[] = [];
  for (let off = 0; off + RECORD_SIZE <= buf.length; off += RECORD_SIZE) {
    const enrollNo = buf.readUInt32LE(off);
    const inOutMode = buf[off + 5];
    const verifyMode = buf[off + 6];
    const second = buf[off + 7];
    const packed = buf.readUInt32LE(off + 8);
    const minute = (packed >>> 26) & 63;
    const hour = (packed >>> 21) & 31;
    const day = (packed >>> 16) & 31;
    const month = (packed >>> 12) & 15;
    const year = 1900 + ((packed & 0xfff) >>> 2);
    const timestamp = new Date(year, month - 1, day, hour, minute, second);
    if (
      year < 2000 ||
      timestamp.getFullYear() !== year ||
      timestamp.getMonth() !== month - 1 ||
      timestamp.getDate() !== day
    ) {
      continue;
    }
    out.push({ enrollNo, verifyMode, inOutMode, timestamp, year, month, day, hour, minute, second });
  }
  return out;
}

function request(cmd: number, param: number, arg: number, len: number, seq: number): Buffer {
  const b = Buffer.alloc(16);
  b[0] = 0x55;
  b[1] = 0xaa;
  b[2] = 1;
  b[3] = cmd;
  b.writeUInt32LE(param >>> 0, 4);
  b.writeUInt32LE(arg >>> 0, 8);
  b.writeUInt16LE(len, 12);
  b.writeUInt16LE(seq & 0xffff, 14);
  return b;
}

class Conn {
  private buf = Buffer.alloc(0);
  private wake: (() => void) | null = null;
  private failure: Error | null = null;
  readonly socket: net.Socket;

  private constructor(socket: net.Socket) {
    this.socket = socket;
    socket.on("data", (d) => {
      this.buf = Buffer.concat([this.buf, d] as Uint8Array[]);
      this.wake?.();
    });
    socket.on("error", (e) => {
      this.failure = e;
      this.wake?.();
    });
    socket.on("close", () => {
      this.failure ??= new Error("FK device closed the connection");
      this.wake?.();
    });
  }

  static open(host: string, port: number, timeoutMs: number): Promise<Conn> {
    return new Promise((resolve, reject) => {
      const socket = net.createConnection({ host, port });
      const timer = setTimeout(() => {
        socket.destroy();
        reject(new Error(`FK connect timeout ${host}:${port}`));
      }, timeoutMs);
      socket.once("connect", () => {
        clearTimeout(timer);
        resolve(new Conn(socket));
      });
      socket.once("error", (e) => {
        clearTimeout(timer);
        reject(e);
      });
    });
  }

  read(n: number, timeoutMs: number): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.wake = null;
        reject(new Error(`FK receive timeout (${this.buf.length}/${n} bytes)`));
      }, timeoutMs);
      const check = () => {
        if (this.buf.length >= n) {
          clearTimeout(timer);
          this.wake = null;
          const out = this.buf.subarray(0, n);
          this.buf = this.buf.subarray(n);
          resolve(out);
        } else if (this.failure) {
          clearTimeout(timer);
          this.wake = null;
          reject(this.failure);
        }
      };
      this.wake = check;
      check();
    });
  }

  close(): void {
    this.socket.destroy();
  }
}

export interface FKTcpOptions {
  ip: string;
  port: number;
  password?: number;
  timeoutMs?: number;
}

export class FKTcpClient {
  private readonly timeoutMs: number;

  constructor(private readonly opts: FKTcpOptions) {
    this.timeoutMs = opts.timeoutMs ?? 8000;
  }

  /** Password probe on its own socket; resolves when the device accepts the key. */
  async probe(): Promise<void> {
    const c = await Conn.open(this.opts.ip, this.opts.port, this.timeoutMs);
    try {
      const frame = Buffer.alloc(20);
      frame[0] = 0x55;
      frame[1] = 0xaa;
      frame[2] = 1;
      frame[3] = CMD_CONNECT;
      frame.writeUInt32LE((this.opts.password ?? 0) >>> 0, 4);
      frame.writeUInt16LE(1, 14);
      c.socket.write(frame);
      const reply = await c.read(10, this.timeoutMs);
      if (reply[3] !== 1) throw new Error("FK device rejected the connection key");
    } finally {
      c.close();
    }
  }

  async pullLogs(): Promise<FKNativePunch[]> {
    await this.probe();
    const c = await Conn.open(this.opts.ip, this.opts.port, this.timeoutMs);
    let seq = 1;
    let disabled = false;
    const call = async (cmd: number, param: number, arg: number, len = 0): Promise<Buffer> => {
      c.socket.write(request(cmd, param, arg, len, seq++));
      const reply = await c.read(10, this.timeoutMs);
      if (reply[0] !== 0xaa || reply[1] !== 0x55 || reply[3] !== 1) {
        throw new Error(`FK command 0x${cmd.toString(16)} failed (status ${reply[3]})`);
      }
      return reply;
    };
    try {
      await call(CMD_CONNECT, 0, IDLE_ARG);
      await call(CMD_DEVICE_ENABLE, 0, IDLE_ARG);
      disabled = true;
      const count = (await call(CMD_LOG_COUNT, 8, IDLE_ARG)).readUInt32LE(4);
      if (count > MAX_RECORDS) throw new Error(`FK reported implausible record count ${count}`);
      const total = count * RECORD_SIZE;
      const chunks: Buffer[] = [];
      for (let n = 0, done = 0; done < total; n++) {
        const len = Math.min(PAGE_SIZE, total - done);
        await call(CMD_LOG_PAGE, 0, n === 0 ? count : n << 16, len);
        const body = await c.read(2 + len + PAGE_TRAILER, this.timeoutMs);
        chunks.push(body.subarray(2, 2 + len));
        done += len;
      }
      return decodeFkRecords(Buffer.concat(chunks));
    } finally {
      if (disabled) {
        try {
          await call(CMD_DEVICE_ENABLE, 1, IDLE_ARG);
        } catch {
          /* best effort: device re-enables itself when the session closes */
        }
      }
      c.close();
    }
  }

  /**
   * Enrolled user ids. The device holds ids only (8-byte records: id u32 + 4
   * flag bytes); display names are not stored on the wire.
   */
  async pullUserIds(): Promise<number[]> {
    await this.probe();
    const c = await Conn.open(this.opts.ip, this.opts.port, this.timeoutMs);
    let seq = 1;
    const call = async (cmd: number, param: number, arg: number, len = 0): Promise<Buffer> => {
      c.socket.write(request(cmd, param, arg, len, seq++));
      const reply = await c.read(10, this.timeoutMs);
      if (reply[0] !== 0xaa || reply[1] !== 0x55 || reply[3] !== 1) {
        throw new Error(`FK command 0x${cmd.toString(16)} failed (status ${reply[3]})`);
      }
      return reply;
    };
    try {
      await call(CMD_CONNECT, 0, IDLE_ARG);
      const first = (await call(CMD_LOG_COUNT, 2, IDLE_ARG)).readUInt32LE(4);
      const second = (await call(CMD_LOG_COUNT, 1, first)).readUInt32LE(4);
      const total = first + second;
      if (total > MAX_RECORDS) throw new Error(`FK reported implausible user count ${total}`);
      if (total === 0) return [];
      const len = total * USER_RECORD_SIZE;
      await call(CMD_USER_READ, len, 2, len);
      const body = await c.read(2 + len + PAGE_TRAILER, this.timeoutMs);
      const ids: number[] = [];
      for (let off = 2; off + USER_RECORD_SIZE <= 2 + len; off += USER_RECORD_SIZE) {
        ids.push(body.readUInt32LE(off));
      }
      return ids;
    } finally {
      c.close();
    }
  }

  async testConnection(): Promise<boolean> {
    try {
      await this.probe();
      return true;
    } catch {
      return false;
    }
  }
}
