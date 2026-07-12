/**
 * Pure TCP ZKTeco protocol client — no COM object, no PowerShell, no win32.
 * Talks the raw ZK "CLIENT SDK" wire protocol directly over a Node TCP socket
 * (same protocol zkemkeeper.dll / node-zklib / pyzk speak to port 4370).
 *
 * NOT YET VALIDATED AGAINST REAL HARDWARE — byte layout follows the
 * publicly documented ZK protocol (pyzk/node-zklib), but comm-key encoding
 * for password-protected devices varies by firmware. Test against the
 * actual K40 before relying on this in production; zk4370LogPuller.ts
 * (PS1 + COM) is kept working as a fallback — see zkDevicePuller.ts.
 */

import * as net from "net";

const CMD_CONNECT = 1000;
const CMD_EXIT = 1001;
const CMD_ENABLEDEVICE = 1002;
const CMD_DISABLEDEVICE = 1003;
const CMD_ACK_OK = 2000;
const CMD_ACK_ERROR = 2001;
const CMD_ACK_DATA = 2002;
const CMD_ACK_UNAUTH = 2005;
const CMD_AUTH = 1102;
const CMD_PREPARE_DATA = 1500;
const CMD_DATA = 1501;
const CMD_ATTLOG_RRQ = 13;
const CMD_USER_WRQ = 8;
const CMD_VERSION = 1100;
const CMD_GET_TIME = 201;
const CMD_SET_TIME = 202;
const CMD_DEVICE = 11;

const TCP_MAGIC = 0x7d825050; // ZK TCP framing magic: bytes 50 50 82 7D (LE dword)

export interface ZKPunch {
  enrollNo: string;
  inOutMode: number;
  verifyMode: number;
  timestamp: Date;
}

export interface ZKDeviceUser {
  enrollNo: string;
  name: string;
  privilege: number;
  enabled: boolean;
}

export interface ZKDeviceInfo {
  ok: boolean;
  serial?: string;
  product?: string;
  firmware?: string;
  error?: string;
}

function createChecksum(buf: Buffer): number {
  let chk = 0;
  let i = buf.length;
  let j = 0;
  while (i > 1) {
    chk += buf.readUInt16LE(j);
    if (chk > 0xffff) chk -= 0xffff;
    j += 2;
    i -= 2;
  }
  if (i) chk += buf[j];
  while (chk > 0xffff) chk -= 0xffff;
  return (~chk) & 0xffff;
}

function createHeader(command: number, sessionId: number, replyId: number, data: Buffer): Buffer {
  const buf = Buffer.alloc(8 + data.length);
  buf.writeUInt16LE(command, 0);
  buf.writeUInt16LE(0, 2); // checksum placeholder
  buf.writeUInt16LE(sessionId, 4);
  buf.writeUInt16LE(replyId, 6);
  data.copy(buf, 8);
  const chk = createChecksum(buf);
  buf.writeUInt16LE(chk, 2);
  return buf;
}

/** ZK "commkey" challenge-response digest (pyzk/node-zklib algorithm). */
function makeCommKey(password: number, sessionId: number, ticks = 50): Buffer {
  let k = 0;
  const pw = password >>> 0;
  for (let i = 0; i < 32; i++) {
    k = pw & (1 << i) ? ((k << 1) | 1) >>> 0 : (k << 1) >>> 0;
  }
  k = (k + sessionId) >>> 0;

  const b1 = Buffer.alloc(4);
  b1.writeUInt32LE(k, 0);
  const xorWord = [0x5a, 0x4b, 0x53, 0x4f]; // 'Z','K','S','O'
  const b2 = Buffer.from(b1.map((byte, i) => byte ^ xorWord[i]));

  const b3 = Buffer.alloc(4);
  b3.writeUInt16LE(b2.readUInt16LE(2), 0);
  b3.writeUInt16LE(b2.readUInt16LE(0), 2);

  const B = ticks & 0xff;
  const out = Buffer.alloc(4);
  out[0] = b3[0] ^ B;
  out[1] = b3[1] ^ B;
  out[2] = B;
  out[3] = b3[3] ^ B;
  return out;
}

function wrapTcp(payload: Buffer): Buffer {
  const head = Buffer.alloc(8);
  head.writeUInt32LE(TCP_MAGIC, 0);
  head.writeUInt32LE(payload.length, 4);
  return Buffer.concat([head, payload]);
}

interface ParsedReply {
  command: number;
  checksum: number;
  sessionId: number;
  replyId: number;
  data: Buffer;
}

function parseBody(body: Buffer): ParsedReply {
  return {
    command: body.readUInt16LE(0),
    checksum: body.readUInt16LE(2),
    sessionId: body.readUInt16LE(4),
    replyId: body.readUInt16LE(6),
    data: body.subarray(8),
  };
}

/**
 * TCP is a byte stream, not a message stream — a single reply can arrive split
 * across multiple 'data' events, or two replies can arrive coalesced in one.
 * Extracts exactly one complete framed message from the front of `buf` if enough
 * bytes have accumulated, returning the parsed reply plus any leftover bytes.
 * Returns null when more data is needed.
 */
function extractMessage(buf: Buffer): { reply: ParsedReply; rest: Buffer } | null {
  if (buf.length < 8) return null;
  if (buf.readUInt32LE(0) === TCP_MAGIC) {
    const len = buf.readUInt32LE(4);
    const total = 8 + len;
    if (buf.length < total) return null;
    const body = buf.subarray(8, total);
    if (body.length < 8) return null;
    return { reply: parseBody(body), rest: buf.subarray(total) };
  }
  // No TCP wrapper — treat whatever has arrived so far as one message.
  return { reply: parseBody(buf), rest: Buffer.alloc(0) };
}

interface PendingWait {
  resolve: (reply: ParsedReply) => void;
  reject: (err: Error) => void;
  timer: NodeJS.Timeout;
}

export class ZKTcpClient {
  private socket: net.Socket | null = null;
  private sessionId = 0;
  private replyId = 0;
  private connected = false;
  private rxBuffer: Buffer = Buffer.alloc(0);
  private pending: PendingWait | null = null;

  constructor(
    private readonly ip: string,
    private readonly port: number,
    private readonly timeoutMs = 8000,
  ) {}

  /** Waits for the next complete framed message, buffering across TCP fragmentation. */
  private waitForMessage(): Promise<ParsedReply> {
    return new Promise((resolve, reject) => {
      if (!this.socket) return reject(new Error("not connected"));
      const timer = setTimeout(() => {
        this.pending = null;
        reject(new Error("ZK TCP timeout waiting for reply"));
      }, this.timeoutMs);
      this.pending = { resolve, reject, timer };
      this.tryDrainPending();
    });
  }

  private tryDrainPending(): void {
    if (!this.pending) return;
    const extracted = extractMessage(this.rxBuffer);
    if (!extracted) return;
    this.rxBuffer = extracted.rest;
    const p = this.pending;
    this.pending = null;
    clearTimeout(p.timer);
    p.resolve(extracted.reply);
  }

  private send(command: number, data: Buffer = Buffer.alloc(0)): Promise<ParsedReply> {
    if (!this.socket) return Promise.reject(new Error("not connected"));
    this.replyId = (this.replyId + 1) & 0xffff;
    const packet = wrapTcp(createHeader(command, this.sessionId, this.replyId, data));
    const promise = this.waitForMessage();
    this.socket.write(packet);
    return promise;
  }

  async connect(commKey = 0): Promise<void> {
    await new Promise<void>((resolve, reject) => {
      this.socket = net.createConnection({ host: this.ip, port: this.port, timeout: this.timeoutMs });
      this.socket.once("connect", () => resolve());
      this.socket.once("error", reject);
      this.socket.once("timeout", () => reject(new Error(`ZK TCP connect timeout to ${this.ip}:${this.port}`)));
    });

    this.rxBuffer = Buffer.alloc(0);
    this.socket!.on("data", (chunk: Buffer) => {
      this.rxBuffer = Buffer.concat([this.rxBuffer, chunk]);
      this.tryDrainPending();
    });
    this.socket!.on("error", (err: Error) => {
      if (this.pending) {
        const p = this.pending;
        this.pending = null;
        clearTimeout(p.timer);
        p.reject(err);
      }
    });

    const reply = await this.send(CMD_CONNECT);
    if (reply.command === CMD_ACK_UNAUTH) {
      this.sessionId = reply.sessionId;
      const key = makeCommKey(commKey, this.sessionId);
      const authReply = await this.send(CMD_AUTH, key);
      if (authReply.command !== CMD_ACK_OK) {
        this.disconnect();
        throw new Error(`ZK device commKey auth rejected (command=${authReply.command})`);
      }
      this.connected = true;
      return;
    }
    if (reply.command !== CMD_ACK_OK) {
      this.disconnect();
      throw new Error(`ZK device rejected connect (command=${reply.command})`);
    }
    this.sessionId = reply.sessionId;
    this.connected = true;
  }

  disconnect(): void {
    try {
      this.socket?.end();
      this.socket?.destroy();
    } catch {
      // ignore
    }
    this.socket = null;
    this.connected = false;
    this.rxBuffer = Buffer.alloc(0);
    if (this.pending) {
      const p = this.pending;
      this.pending = null;
      clearTimeout(p.timer);
      p.reject(new Error("ZK TCP socket disconnected"));
    }
  }

  async exit(): Promise<void> {
    if (!this.connected) return;
    try {
      await this.send(CMD_EXIT);
    } finally {
      this.disconnect();
    }
  }

  async enableDevice(): Promise<void> {
    await this.send(CMD_ENABLEDEVICE);
  }

  async disableDevice(): Promise<void> {
    await this.send(CMD_DISABLEDEVICE);
  }

  async setDeviceTime(date = new Date()): Promise<void> {
    const encoded =
      ((date.getFullYear() - 2000) * 12 * 31 + (date.getMonth()) * 31 + (date.getDate() - 1)) * (24 * 60 * 60) +
      (date.getHours() * 60 + date.getMinutes()) * 60 + date.getSeconds();
    const data = Buffer.alloc(4);
    data.writeUInt32LE(encoded >>> 0, 0);
    await this.send(CMD_SET_TIME, data);
  }

  async getVersion(): Promise<string> {
    const reply = await this.send(CMD_VERSION);
    return reply.data.toString("ascii").replace(/\0.*$/, "");
  }

  async getDeviceInfo(): Promise<ZKDeviceInfo> {
    try {
      const version = await this.getVersion();
      return { ok: true, firmware: version };
    } catch (err) {
      return { ok: false, error: err instanceof Error ? err.message : String(err) };
    }
  }

  /** Pulls all buffered records for a "read-with-buffer" style command (attlog/user). */
  private async readBufferedTable(cmd: number): Promise<Buffer> {
    const first = await this.send(cmd);
    if (first.command === CMD_ACK_OK && first.data.length === 0) return Buffer.alloc(0);

    if (first.command === CMD_PREPARE_DATA) {
      const size = first.data.readUInt32LE(0);
      const chunks: Buffer[] = [];
      let received = 0;
      while (received < size) {
        const reply = await this.waitForData();
        chunks.push(reply.data);
        received += reply.data.length;
      }
      // Trailing ACK_OK after full transfer
      await this.waitForAck();
      return Buffer.concat(chunks).subarray(0, size);
    }

    return first.data;
  }

  private waitForData(): Promise<ParsedReply> {
    return this.waitForMessage();
  }

  private waitForAck(): Promise<void> {
    return this.waitForData().then(() => undefined).catch(() => undefined);
  }

  async pullLogs(): Promise<ZKPunch[]> {
    const raw = await this.readBufferedTable(CMD_ATTLOG_RRQ);
    return parseAttlogBuffer(raw);
  }

  async pullUsers(): Promise<ZKDeviceUser[]> {
    const raw = await this.readBufferedTable(CMD_USER_WRQ);
    return parseUserBuffer(raw);
  }
}

function parseAttlogBuffer(buf: Buffer): ZKPunch[] {
  const RECORD_SIZE = 40; // standard fixed-size attlog record on most ZK firmwares
  const out: ZKPunch[] = [];
  for (let off = 0; off + RECORD_SIZE <= buf.length; off += RECORD_SIZE) {
    try {
      const enrollNo = buf.subarray(off, off + 24).toString("ascii").replace(/\0.*$/, "").trim();
      const verifyMode = buf.readUInt8(off + 24);
      const timestampRaw = buf.readUInt32LE(off + 27);
      const inOutMode = buf.readUInt8(off + 31);
      if (!enrollNo) continue;
      out.push({ enrollNo, verifyMode, inOutMode, timestamp: decodeZkTimestamp(timestampRaw) });
    } catch {
      continue;
    }
  }
  return out;
}

function decodeZkTimestamp(encoded: number): Date {
  const second = encoded % 60; encoded = Math.floor(encoded / 60);
  const minute = encoded % 60; encoded = Math.floor(encoded / 60);
  const hour = encoded % 24; encoded = Math.floor(encoded / 24);
  const day = (encoded % 31) + 1; encoded = Math.floor(encoded / 31);
  const month = encoded % 12; encoded = Math.floor(encoded / 12);
  const year = encoded + 2000;
  return new Date(year, month, day, hour, minute, second);
}

function parseUserBuffer(buf: Buffer): ZKDeviceUser[] {
  const RECORD_SIZE = 72; // standard fixed-size user record on most ZK firmwares
  const out: ZKDeviceUser[] = [];
  for (let off = 0; off + RECORD_SIZE <= buf.length; off += RECORD_SIZE) {
    try {
      const privilege = buf.readUInt8(off + 2);
      const name = buf.subarray(off + 3, off + 11 + 24).toString("ascii").replace(/\0.*$/, "").trim();
      const enrollNo = buf.subarray(off + 48, off + 48 + 9).toString("ascii").replace(/\0.*$/, "").trim();
      if (!enrollNo) continue;
      out.push({ enrollNo, name, privilege, enabled: true });
    } catch {
      continue;
    }
  }
  return out;
}
