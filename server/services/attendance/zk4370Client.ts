/**
 * ZKTeco TCP Client — port 4370 (STANDALONE SDK protocol)
 *
 * Packet framing (TCP):
 *   [50 50 82 7D][inner_size: 2 LE][00 00][CMD: 2 LE][CHK: 2 LE][SID: 2 LE][RID: 2 LE][DATA: N]
 *
 * Attendance records (40 bytes, newer firmware):
 *   [uid: 2][user_id: 9 ASCII][reserved: 16][state: 1][timestamp: 4 ZK-time LE][type: 1][reserved: 7]
 *
 * Attendance records (24 bytes, older firmware) — fallback:
 *   [uid: 2][user_id: 9 ASCII][timestamp: 4 ZK-time LE][type: 1][reserved: 8]
 *
 * ZK-time encoding: seconds since a custom epoch
 *   ((year-2000)*12*31 + month_0based*31 + day_0based) * 86400 + h*3600 + m*60 + s
 */

import net from "net";

const ZK_TCP_HEADER = Buffer.from([0x50, 0x50, 0x82, 0x7d]);

const CMD_CONNECT = 1000;
const CMD_EXIT = 1001;
const CMD_ENABLEDEVICE = 1002;
const CMD_DISABLEDEVICE = 1003;
const CMD_ATTLOG_RRQ = 13;
const CMD_USER_WRQ = 8;
const CMD_USERTEMP_RRQ = 9;
const CMD_ACK_OK = 2000;
const CMD_PREPARE_DATA = 1500;
const CMD_DATA = 1501;
const CMD_FREE_DATA = 1502;

export interface ZKAttendanceRecord {
  uid: number;
  userId: string;
  timestamp: Date;
  /** 0 = check-in, 1 = check-out, 2+ = other */
  type: number;
  state: number;
}

export interface ZKUserRecord {
  uid: number;
  userId: string;
  name: string;
  role: number;
}

interface ZKPacket {
  cmd: number;
  sessionId: number;
  replyId: number;
  data: Buffer;
}

// ---------------------------------------------------------------------------
// Pure helpers
// ---------------------------------------------------------------------------

function decodeZKTime(t: number): Date {
  const second = t % 60; t = Math.floor(t / 60);
  const minute = t % 60; t = Math.floor(t / 60);
  const hour   = t % 24; t = Math.floor(t / 24);
  const day    = t % 31 + 1; t = Math.floor(t / 31);
  const month  = t % 12 + 1; t = Math.floor(t / 12);
  const year   = t + 2000;
  return new Date(year, month - 1, day, hour, minute, second);
}

function calcChecksum(buf: Buffer): number {
  let sum = 0;
  for (let i = 0; i < buf.length; i++) sum = (sum + buf[i]) & 0xffff;
  return sum;
}

function makePacket(cmd: number, sessionId: number, replyId: number, data: Uint8Array = Buffer.alloc(0)): Buffer {
  const inner = Buffer.alloc(8 + data.length);
  inner.writeUInt16LE(cmd, 0);
  inner.writeUInt16LE(0, 2);
  inner.writeUInt16LE(sessionId, 4);
  inner.writeUInt16LE(replyId, 6);
  inner.set(data, 8);
  inner.writeUInt16LE(calcChecksum(inner), 2);

  const tcp = Buffer.alloc(8 + inner.length);
  ZK_TCP_HEADER.copy(tcp, 0);
  tcp.writeUInt16LE(inner.length, 4);
  tcp.writeUInt16LE(0, 6);
  inner.copy(tcp, 8);
  return tcp;
}

function tryParsePacket(buf: Buffer): ZKPacket | null {
  // Strip optional TCP framing header
  let off = 0;
  if (buf.length >= 4 && buf[0] === 0x50 && buf[1] === 0x50) off = 8;
  if (buf.length - off < 8) return null;
  return {
    cmd:       buf.readUInt16LE(off),
    sessionId: buf.readUInt16LE(off + 4),
    replyId:   buf.readUInt16LE(off + 6),
    data:      buf.slice(off + 8),
  };
}

function parseAttendance40(data: Buffer): ZKAttendanceRecord[] {
  const out: ZKAttendanceRecord[] = [];
  for (let i = 0; i + 40 <= data.length; i += 40) {
    const uid    = data.readUInt16LE(i);
    const userId = data.slice(i + 2, i + 11).toString("ascii").replace(/\0/g, "").trim();
    const state  = data[i + 26];
    const ts     = decodeZKTime(data.readUInt32LE(i + 27));
    const type   = data[i + 31];
    if (userId && !isNaN(ts.getTime())) out.push({ uid, userId, timestamp: ts, type, state });
  }
  return out;
}

function parseAttendance24(data: Buffer): ZKAttendanceRecord[] {
  const out: ZKAttendanceRecord[] = [];
  for (let i = 0; i + 24 <= data.length; i += 24) {
    const uid    = data.readUInt16LE(i);
    const userId = data.slice(i + 2, i + 11).toString("ascii").replace(/\0/g, "").trim();
    const ts     = decodeZKTime(data.readUInt32LE(i + 11));
    const type   = data[i + 15];
    if (userId && !isNaN(ts.getTime())) out.push({ uid, userId, timestamp: ts, type, state: 0 });
  }
  return out;
}

function parseUsers72(data: Buffer): ZKUserRecord[] {
  const out: ZKUserRecord[] = [];
  for (let i = 0; i + 72 <= data.length; i += 72) {
    const uid    = data.readUInt16LE(i);
    const role   = data[i + 2];
    const name   = data.slice(i + 11, i + 35).toString("ascii").replace(/\0/g, "").trim();
    const userId = data.slice(i + 48, i + 57).toString("ascii").replace(/\0/g, "").trim() || String(uid);
    if (uid) out.push({ uid, userId, name, role });
  }
  return out;
}

function buildUserPacket72(uid: number, userId: string, name: string, role = 0): Buffer {
  const buf = Buffer.alloc(72);
  buf.writeUInt16LE(uid, 0);
  buf[2] = role;
  // password: leave zeroed
  Buffer.from(name.substring(0, 24)).copy(buf, 11);
  buf[39] = 1; // group
  buf.writeUInt16LE(1, 40); // timezone
  buf.writeUInt16LE(1, 42);
  Buffer.from(userId.substring(0, 9)).copy(buf, 48);
  return buf;
}

// ---------------------------------------------------------------------------
// Client
// ---------------------------------------------------------------------------

export class ZK4370Client {
  private socket: net.Socket | null = null;
  private sessionId = 0;
  private replyId = 0;
  private tcpBuf = Buffer.alloc(0);
  private packetQueue: ZKPacket[] = [];
  private waiters: Array<(pkt: ZKPacket) => void> = [];

  constructor(
    private readonly ip: string,
    private readonly port: number,
    private readonly timeoutMs = 10_000,
  ) {}

  // ---------- public API ----------

  async connect(): Promise<void> {
    await this.openSocket();
    const resp = await this.send(CMD_CONNECT);
    if (resp.cmd !== CMD_ACK_OK) throw new Error(`Connect failed (cmd=${resp.cmd})`);
    this.sessionId = resp.sessionId;
  }

  async disconnect(): Promise<void> {
    try { await this.send(CMD_EXIT); } catch { /* best-effort */ }
    this.socket?.destroy();
    this.socket = null;
  }

  async getAttendanceLogs(): Promise<ZKAttendanceRecord[]> {
    await this.send(CMD_DISABLEDEVICE);
    const raw = await this.readLargeData(CMD_ATTLOG_RRQ);
    await this.send(CMD_ENABLEDEVICE);
    if (raw.length === 0) return [];

    // Try 40-byte records first; fall back to 24-byte
    const r40 = parseAttendance40(raw);
    if (r40.length > 0) return r40;
    return parseAttendance24(raw);
  }

  async getUsers(): Promise<ZKUserRecord[]> {
    const raw = await this.readLargeData(CMD_USERTEMP_RRQ);
    if (raw.length === 0) return [];
    return parseUsers72(raw);
  }

  /** Push one employee to the device. uid must be a small integer (1-65535). */
  async setUser(uid: number, userId: string, name: string, role = 0): Promise<void> {
    const data = buildUserPacket72(uid, userId, name, role);
    const resp = await this.send(CMD_USER_WRQ, data);
    if (resp.cmd !== CMD_ACK_OK) throw new Error(`SetUser failed uid=${uid} userId=${userId}`);
  }

  // ---------- private helpers ----------

  private async readLargeData(cmd: number): Promise<Buffer> {
    const first = await this.send(cmd);

    if (first.cmd === CMD_PREPARE_DATA) {
      const totalSize = first.data.readUInt32LE(0);
      let collected = Buffer.alloc(0);

      while (collected.length < totalSize) {
        const pkt = await this.recv();
        if (pkt.cmd === CMD_DATA) {
          collected = Buffer.concat([collected, pkt.data] as Buffer[]);
        } else if (pkt.cmd === CMD_ACK_OK) {
          break;
        }
      }

      try { await this.send(CMD_FREE_DATA); } catch { /* ignore */ }
      return collected;
    }

    if (first.cmd === CMD_ACK_OK) return first.data;
    return Buffer.alloc(0);
  }

  private async send(cmd: number, data: Uint8Array = Buffer.alloc(0)): Promise<ZKPacket> {
    this.replyId = (this.replyId + 1) & 0xffff;
    const packet = makePacket(cmd, this.sessionId, this.replyId, data);

    await new Promise<void>((res, rej) =>
      this.socket!.write(packet, (err) => (err ? rej(err) : res())),
    );

    return this.recv();
  }

  private recv(): Promise<ZKPacket> {
    if (this.packetQueue.length > 0) return Promise.resolve(this.packetQueue.shift()!);
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        const idx = this.waiters.indexOf(handler);
        if (idx >= 0) this.waiters.splice(idx, 1);
        reject(new Error("ZK4370 receive timeout"));
      }, this.timeoutMs);
      const handler = (pkt: ZKPacket) => { clearTimeout(timer); resolve(pkt); };
      this.waiters.push(handler);
    });
  }

  private dispatchPacket(pkt: ZKPacket): void {
    if (this.waiters.length > 0) {
      this.waiters.shift()!(pkt);
    } else {
      this.packetQueue.push(pkt);
    }
  }

  private consumeBuffer(): void {
    while (true) {
      if (this.tcpBuf.length < 8) break;

      const hasTcpHeader = this.tcpBuf[0] === 0x50 && this.tcpBuf[1] === 0x50;

      if (hasTcpHeader) {
        const innerSize = this.tcpBuf.readUInt16LE(4);
        const total = 8 + innerSize;
        if (this.tcpBuf.length < total) break;
        const frame = this.tcpBuf.slice(0, total);
        this.tcpBuf = this.tcpBuf.slice(total);
        const pkt = tryParsePacket(frame);
        if (pkt) this.dispatchPacket(pkt);
      } else {
        // Raw inner packet (no TCP header) — consume all available bytes as one packet
        const pkt = tryParsePacket(this.tcpBuf);
        this.tcpBuf = Buffer.alloc(0);
        if (pkt) this.dispatchPacket(pkt);
        break;
      }
    }
  }

  private openSocket(): Promise<void> {
    return new Promise((resolve, reject) => {
      const sock = net.createConnection({ host: this.ip, port: this.port, timeout: this.timeoutMs });
      sock.on("connect", () => { this.socket = sock; resolve(); });
      sock.on("data", (chunk: Buffer) => {
        this.tcpBuf = Buffer.concat([this.tcpBuf, chunk] as Buffer[]);
        this.consumeBuffer();
      });
      sock.on("error", reject);
      sock.on("timeout", () => reject(new Error("ZK4370 socket timeout")));
    });
  }
}
