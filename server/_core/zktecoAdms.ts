/**
 * ZKTeco ADMS Push Endpoint
 * Receives attendance punches pushed by ZKTeco devices (X628-T/ID etc.)
 * over HTTP using the ZKTeco ADMS (Automatic Data Management System) protocol.
 *
 * Protocol flow (pushver 2.x):
 *   1. Device GET /iclock/cdata?SN=...&options=all  → handshake, server sends options
 *   2. Device GET /iclock/getrequest                → server sends pending commands (user push etc.)
 *   3. Device POST /iclock/cdata?SN=...&table=ATTLOG → punch upload
 *   4. Device POST /iclock/devicecmd               → command acknowledgement
 */

import type { Express, Request, Response } from "express";
import express from "express";
import crypto from "crypto";
import { getDb } from "../db";
import { attendancePunches, attendanceEmployees } from "../../drizzle/schema";
import { sql, eq } from "drizzle-orm";

// ---------------------------------------------------------------------------
// Command queue — populated by pushEmployeesToAdms(), drained by /getrequest
// ---------------------------------------------------------------------------

interface AdmsCommand {
  id: number;
  line: string; // full "C:ID:DATA UPDATE USERINFO\t..." line
}

let cmdSeq = 1;
const cmdQueue: AdmsCommand[] = [];
const pendingAck = new Map<number, AdmsCommand>(); // awaiting devicecmd ACK

/** ADMS push is enabled unless explicitly disabled in K40 device settings. */
async function isAdmsEnabled(): Promise<boolean> {
  try {
    const { DeviceSettingsService } = await import("../services/attendance/deviceSettings.service");
    return DeviceSettingsService.getK40Settings().admsEnabled ?? true;
  } catch {
    return true; // fail open — don't drop punches if settings unavailable
  }
}
const queriedDevices = new Set<string>(); // SNs that already received DATA QUERY ATTLOG this session

/** Queue a one-off ATTLOG pull command — device uploads its logs on next poll. */
export function queueAdmsAttlogQuery(): number {
  const id = cmdSeq++;
  cmdQueue.push({ id, line: `C:${id}:DATA QUERY ATTLOG` });
  console.log(`[ADMS] Queued manual DATA QUERY ATTLOG cmd ${id} (queue total: ${cmdQueue.length})`);
  return id;
}

export function queueAdmsUserCommands(
  employees: Array<{ empCd: string; fullName: string }>,
): number {
  let count = 0;
  for (const e of employees) {
    const id = cmdSeq++;
    const name = (e.fullName || e.empCd).replace(/\t/g, " ").slice(0, 24);
    // K40 firmware uses PIN (not EmpNo) as the primary user ID field
    const line =
      `C:${id}:DATA UPDATE USERINFO\t` +
      `PIN=${e.empCd}\t` +
      `Name=${name}\t` +
      `Pri=0\t` +
      `Passwd=\t` +
      `Card=\t` +
      `Grp=1\t` +
      `TZ=0000000100000000\t` +
      `Verify=0\t` +
      `ViceCard=`;
    cmdQueue.push({ id, line });
    count++;
  }
  console.log(`[ADMS] Queued ${count} USERINFO commands (queue total: ${cmdQueue.length})`);
  return count;
}

// ZKTeco ADMS status codes → direction
// 0 = check-in, 1 = check-out, 4 = OT-in, 5 = OT-out
function statusToDirection(status: number): "in" | "out" | "unknown" {
  if (status === 0 || status === 4) return "in";
  if (status === 1 || status === 5) return "out";
  return "unknown";
}

function sha1(s: string): string {
  return crypto.createHash("sha1").update(s).digest("hex");
}

interface ParsedPunch {
  empCd: string;
  punchAt: Date;
  /** Raw device-reported timestamp, before offset correction — stable across offset changes. */
  rawPunchAt: Date;
  direction: "in" | "out" | "unknown";
  verifyMode: number;
}

// ---------------------------------------------------------------------------
// Device clock handling
//
// The device's internal timezone is a hidden firmware setting we don't control.
// It NTP-syncs whenever ADMS is connected, then applies that internal TZ, so its
// clock runs some number of hours ahead of correct local time — the exact delta
// has changed over time (measured 6h, later 3h) as the firmware's internal TZ
// setting has changed, so we never hardcode it.
//
// We defend on TWO independent layers so attendance data is always correct,
// regardless of whether the device clock is right at any moment:
//   1) parseAttlogBody subtracts the device-ahead offset from every punch on
//      ingestion (auto-detected from fresh real-time punches, override via
//      ZK_ADMS_PUNCH_OFFSET_HOURS). This is the authoritative data fix. The
//      detected value is persisted (K40 device settings row) so it survives
//      restarts instead of resetting to an unverified guess.
//   2) the ADMS handshake sends TimeZone=<serverOffsetHours> so that IF the
//      device honors it on NTP sync, its clock lands on correct local time
//      instead of its own hidden internal TZ.
//
// serverOffsetHours() is read live from the OS each time, so both layers are
// DST-safe.
// ---------------------------------------------------------------------------
function serverOffsetHours(): number {
  return -new Date().getTimezoneOffset() / 60;
}

// In-memory cache of the auto-detected offset; hydrated from persisted device
// settings on first use so it survives server restarts.
let detectedOffsetHours: number | null = null;
let detectedOffsetHydrated = false;

async function hydrateDetectedOffset(): Promise<void> {
  if (detectedOffsetHydrated) return;
  detectedOffsetHydrated = true;
  try {
    const { DeviceSettingsService } = await import("../services/attendance/deviceSettings.service");
    const persisted = DeviceSettingsService.getK40Settings().admsDetectedOffsetHours;
    if (typeof persisted === "number" && Number.isFinite(persisted)) {
      detectedOffsetHours = persisted;
      console.log(`[ADMS] Hydrated persisted clock offset = ${persisted}h`);
    }
  } catch {
    // settings unavailable — stay with default
  }
}

function parseFiniteFloat(raw: string | undefined, fallback: number): number {
  if (raw === undefined || raw === "") return fallback;
  const n = parseFloat(raw);
  return Number.isFinite(n) ? n : fallback;
}

/** Hours the device clock runs AHEAD of correct local time (subtract on store). */
function effectiveOffsetHours(): number {
  const manual = parseFiniteFloat(process.env.ZK_ADMS_PUNCH_OFFSET_HOURS, NaN);
  if (Number.isFinite(manual)) return manual;
  if (detectedOffsetHours !== null) return detectedOffsetHours;
  return 0; // unknown until a fresh punch lets us auto-detect — safer than guessing
}

/** From a fresh real-time push, snap (deviceTime − now) to nearest hour. */
function maybeDetectOffset(punches: ParsedPunch[]): void {
  if (process.env.ZK_ADMS_PUNCH_OFFSET_HOURS) return; // manual override wins
  if (punches.length === 0 || punches.length > 3) return; // bulk dumps are historical
  const newest = punches.reduce((mx, p) => (p.punchAt > mx ? p.punchAt : mx), punches[0].punchAt);
  const diffH = (newest.getTime() - Date.now()) / 3_600_000;
  const rounded = Math.round(diffH);
  // Device only ever runs AHEAD (never behind), and only by a sane amount.
  // Rejects stale/delayed uploads of old punches, which would produce a
  // negative or wildly large diff and poison the offset for all later punches.
  if (rounded < 0 || rounded > 12) return;
  if (Math.abs(diffH - rounded) < 0.25) {
    if (detectedOffsetHours !== rounded) {
      detectedOffsetHours = rounded;
      console.log(`[ADMS] Detected device clock offset = ${rounded}h ahead — subtracting from punch times`);
      import("../services/attendance/deviceSettings.service")
        .then(({ DeviceSettingsService }) => DeviceSettingsService.setK40AdmsDetectedOffset(rounded))
        .catch(() => {});
    }
  }
}

async function parseAttlogBody(body: string, deviceId: string): Promise<ParsedPunch[]> {
  await hydrateDetectedOffset();
  const punches: ParsedPunch[] = [];
  for (const raw of body.split("\n")) {
    const line = raw.trim();
    if (!line) continue;
    // Format: UserID\tTimestamp\tStatus\tVerify\tWorkCode\tReserved
    const parts = line.split("\t");
    if (parts.length < 3) continue;
    const [userId, ts, statusStr, verifyStr] = parts;
    // Parse as local time — device sends local time with no timezone suffix.
    // Use component constructor (new Date(y,m,d,h,min,s)) which is always local.
    const tsParts = ts.trim().split(/[\s:-]/);
    const rawPunchAt = new Date(+tsParts[0], +tsParts[1] - 1, +tsParts[2], +tsParts[3], +tsParts[4], +tsParts[5]);
    if (isNaN(rawPunchAt.getTime())) continue;
    const empCd = (userId ?? "").trim();
    if (!empCd) continue;
    punches.push({
      empCd,
      punchAt: rawPunchAt,
      rawPunchAt,
      direction: statusToDirection(parseInt(statusStr ?? "0", 10)),
      verifyMode: parseInt(verifyStr ?? "0", 10),
    });
  }
  // Auto-detect offset from fresh pushes, then correct all timestamps
  maybeDetectOffset(punches);
  const offMs = effectiveOffsetHours() * 3_600_000;
  if (offMs !== 0) {
    for (const p of punches) p.punchAt = new Date(p.punchAt.getTime() - offMs);
  }
  return punches;
}

export function registerZKTecoAdms(app: Express): void {
  // Accept plain text body for ZKTeco ADMS push
  app.use("/iclock", express.text({ type: "*/*", limit: "2mb" }));
  // NOTE: We deliberately do NOT manipulate the HTTP Date header. Testing showed
  // the device ignores it — when online via ADMS it NTP-syncs itself and applies
  // its hidden internal timezone, landing the clock hours ahead of Cairo (measured
  // 6h, later 3h — the delta has changed as firmware TZ settings drifted). We do
  // send TimeZone=<hours> in the handshake options in case the firmware honors it
  // on NTP sync (untested — some ZKTeco push firmwares support it, others ignore
  // it). Either way, attendance data is kept correct by the ingestion offset
  // correction in parseAttlogBody(); the device's displayed clock is cosmetic.

  // GET /iclock/cdata — device handshake / options request
  app.get("/iclock/cdata", (req: Request, res: Response) => {
    const sn = String(req.query.SN ?? req.query.sn ?? "unknown");
    const options = String(req.query.options ?? req.query.Options ?? "");
    console.log(`[ADMS] Handshake from SN=${sn} options=${options} ip=${req.ip}`);

    // Queue DATA QUERY ATTLOG once per session so device pushes its logs (pushver 2.x command-driven)
    if (!queriedDevices.has(sn)) {
      queriedDevices.add(sn);
      const id = cmdSeq++;
      cmdQueue.push({ id, line: `C:${id}:DATA QUERY ATTLOG` });
      console.log(`[ADMS] Queued DATA QUERY ATTLOG cmd ${id} for SN=${sn}`);
    }

    res.set("Content-Type", "text/plain");
    res.send(
      `GET OPTION FROM: ${sn}\r\n` +
      `ATTLOGStamp=0\r\n` +
      `OPERLOGStamp=0\r\n` +
      `ATTPHOTOStamp=0\r\n` +
      `ErrorDelay=30\r\n` +
      `Delay=10\r\n` +
      `TransTimes=00:00;23:59\r\n` +
      `TransInterval=1\r\n` +
      `TransFlag=TransData AttLog OpLog\r\n` +
      `TimeZone=${serverOffsetHours()}\r\n` +
      `Realtime=1\r\n` +
      `Encrypt=None\r\n`,
    );
  });

  // POST /iclock/cdata — device pushes attendance records
  app.post("/iclock/cdata", async (req: Request, res: Response) => {
    const sn = String(req.query.SN ?? req.query.sn ?? "unknown");
    const table = String(req.query.table ?? "").toUpperCase();
    const body = typeof req.body === "string" ? req.body : "";

    // Only handle ATTLOG; acknowledge other tables silently
    if (table !== "ATTLOG") {
      res.set("Content-Type", "text/plain");
      res.send("OK: 0");
      return;
    }
    // Respect the ADMS enable/disable toggle — ack but drop punches when disabled.
    if (!(await isAdmsEnabled())) {
      res.set("Content-Type", "text/plain");
      res.send("OK: 0");
      return;
    }
    const punches = await parseAttlogBody(body, sn);

    if (punches.length === 0) {
      console.log(`[ADMS] SN=${sn} no punches parsed — raw: ${body.slice(0, 300)}`);
      res.set("Content-Type", "text/plain");
      res.send("OK: 0");
      return;
    }

    try {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const now = new Date();
      const rows = punches.map((p) => ({
        empCd: p.empCd,
        punchAt: p.punchAt,
        direction: p.direction,
        deviceId: sn,
        source: "tcp" as const,
        // Keyed off the raw (uncorrected) device timestamp so dedup stays stable
        // across auto-detected offset changes — the corrected punchAt shifts
        // when the device's clock drift changes, which would otherwise make the
        // same physical punch look like a new row.
        sourceRowId: `${sn}_${p.empCd}_${p.rawPunchAt.getTime()}`,
        sourceHash: sha1(
          `${sn}|${p.empCd}|${p.rawPunchAt.toISOString()}|${p.direction}`,
        ),
        importedAt: now,
      }));

      // INSERT IGNORE via onDuplicateKeyUpdate (unique index uq_punch prevents doubles)
      await db
        .insert(attendancePunches)
        .values(rows)
        .onDuplicateKeyUpdate({ set: { importedAt: sql`importedAt` } });

      // Auto-register unknown employee codes so the materializer can process them
      const uniqueEmpCds = [...new Set(punches.map((p) => p.empCd))];
      await db
        .insert(attendanceEmployees)
        .values(
          uniqueEmpCds.map((empCd) => ({
            empCd,
            fullName: empCd,
            active: true,
            createdAt: now,
            updatedAt: now,
          })),
        )
        .onDuplicateKeyUpdate({ set: { updatedAt: now } });

      console.log(
        `[ADMS] SN=${sn} pushed ${punches.length} punches → inserted to MySQL`,
      );

      res.set("Content-Type", "text/plain");
      res.send(`OK: ${punches.length}`);
    } catch (err) {
      console.error("[ADMS] Failed to save punches:", err);
      res.status(500).set("Content-Type", "text/plain").send("ERROR");
    }
  });

  // GET /iclock/getrequest — drain one queued command per poll; empty = idle
  app.get("/iclock/getrequest", (req: Request, res: Response) => {
    const sn = String(req.query.SN ?? req.query.sn ?? "unknown");
    res.set("Content-Type", "text/plain");
    if (cmdQueue.length > 0) {
      const cmd = cmdQueue.shift()!;
      pendingAck.set(cmd.id, cmd);
      console.log(`[ADMS] → SN=${sn} cmd ${cmd.id}: ${cmd.line.slice(0, 80)} (${cmdQueue.length} remaining)`);
      res.send(cmd.line + "\r\n");
    } else {
      res.send("");
    }
  });

  // POST /iclock/devicecmd — device confirms command execution
  app.post("/iclock/devicecmd", (req: Request, res: Response) => {
    const body = typeof req.body === "string" ? req.body : "";
    const sn = String(req.query.SN ?? req.query.sn ?? "unknown");
    const idMatch = body.match(/ID=(\d+)/);
    if (idMatch) pendingAck.delete(parseInt(idMatch[1], 10));
    console.log(`[ADMS] devicecmd SN=${sn}: ${body.trim()}`);
    res.set("Content-Type", "text/plain");
    res.send("OK");
  });

  console.log("[ADMS] ZKTeco ADMS push endpoint registered at /iclock/cdata");
}
