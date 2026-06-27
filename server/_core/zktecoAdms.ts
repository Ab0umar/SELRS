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
const queriedDevices = new Set<string>(); // SNs that already received DATA QUERY ATTLOG this session

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
  direction: "in" | "out" | "unknown";
  verifyMode: number;
}

// ---------------------------------------------------------------------------
// Device clock correction
// The device clock can run a fixed whole number of hours ahead of server-local
// time (its internal timezone is wrong and cannot be changed reliably). Rather
// than fight the device clock, we correct the punch timestamps on ingestion.
// Offset is auto-detected from fresh real-time punches and can be overridden
// with ZK_ADMS_PUNCH_OFFSET_HOURS. "Offset" = how many hours the device is AHEAD
// of correct local time; we subtract it from every stored punch.
// ---------------------------------------------------------------------------
let detectedOffsetHours: number | null = null;

function effectiveOffsetHours(): number {
  const manual = process.env.ZK_ADMS_PUNCH_OFFSET_HOURS;
  if (manual !== undefined && manual !== "") return parseFloat(manual);
  if (detectedOffsetHours !== null) return detectedOffsetHours;
  // Default expectation: device internal tz (UTC+7) minus server-local offset.
  // e.g. Cairo summer UTC+3 → 7 - 3 = 4h ahead. DST-safe via live OS offset.
  const deviceInternalOffset = parseFloat(process.env.ZK_ADMS_DEVICE_TZ_OFFSET ?? "7");
  const serverOffset = -new Date().getTimezoneOffset() / 60;
  return deviceInternalOffset - serverOffset;
}

/** From a fresh real-time push, snap (deviceTime − now) to nearest hour. */
function maybeDetectOffset(punches: ParsedPunch[]): void {
  if (process.env.ZK_ADMS_PUNCH_OFFSET_HOURS) return; // manual override wins
  if (punches.length === 0 || punches.length > 3) return; // bulk dumps are historical
  const newest = punches.reduce((mx, p) => (p.punchAt > mx ? p.punchAt : mx), punches[0].punchAt);
  const diffH = (newest.getTime() - Date.now()) / 3_600_000;
  const rounded = Math.round(diffH);
  // Only trust it if the remainder is near-zero (a clean whole-hour offset) and sane
  if (Math.abs(diffH - rounded) < 0.25 && Math.abs(rounded) <= 14) {
    if (detectedOffsetHours !== rounded) {
      detectedOffsetHours = rounded;
      console.log(`[ADMS] Detected device clock offset = ${rounded}h ahead — subtracting from punch times`);
    }
  }
}

function parseAttlogBody(body: string, deviceId: string): ParsedPunch[] {
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
    const punchAt = new Date(+tsParts[0], +tsParts[1] - 1, +tsParts[2], +tsParts[3], +tsParts[4], +tsParts[5]);
    if (isNaN(punchAt.getTime())) continue;
    const empCd = (userId ?? "").trim();
    if (!empCd) continue;
    punches.push({
      empCd,
      punchAt,
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
  // Override HTTP Date header — the device syncs its clock from this header.
  // The device has a fixed internal timezone (observed UTC+7) and applies it to
  // whatever UTC value the Date header carries, landing on UTC+7 instead of local.
  // We pre-shift the header by (serverLocalOffset - deviceInternalOffset) so that
  // device clock = header + deviceOffset = serverLocalTime. Computed per-request
  // from the live OS offset, so it auto-adjusts for DST (Egypt summer = UTC+3).
  // removeHeader() alone fails — Express re-adds Date on send(); setHeader sticks.
  const deviceInternalOffsetHours = parseFloat(process.env.ZK_ADMS_DEVICE_TZ_OFFSET ?? "7");
  app.use("/iclock", (_req, res, next) => {
    const now = new Date();
    const serverOffsetHours = -now.getTimezoneOffset() / 60; // e.g. Cairo summer = +3
    const shiftHours = serverOffsetHours - deviceInternalOffsetHours; // e.g. 3 - 7 = -4
    const shifted = new Date(now.getTime() + shiftHours * 3_600_000);
    res.setHeader("Date", shifted.toUTCString());
    next();
  });



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
    const punches = parseAttlogBody(body, sn);

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
        sourceRowId: `${sn}_${p.empCd}_${p.punchAt.getTime()}`,
        sourceHash: sha1(
          `${sn}|${p.empCd}|${p.punchAt.toISOString()}|${p.direction}`,
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
