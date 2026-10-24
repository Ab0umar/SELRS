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
import { broadcastPunch } from "./ws";
import { DailyMaterializer } from "../services/attendance/dailyMaterializer";
import { decideAdmsOffset } from "../services/attendance/admsOffsetPolicy";

// ---------------------------------------------------------------------------
// Command queue — populated by pushEmployeesToAdms(), drained by /getrequest
// ---------------------------------------------------------------------------

interface AdmsCommand {
  id: number;
  line: string; // full "C:ID:DATA UPDATE USERINFO\t..." line
}

let cmdSeq = 1;
// One queue per device serial: a command must only run on the device it is
// meant for. Untargeted commands are copied to every allowlisted device.
const cmdQueues = new Map<string, AdmsCommand[]>();

function allowlistedSerials(): string[] {
  return (process.env.ZK_ADMS_DEVICE_ALLOWLIST ?? "")
    .split(",")
    .map((entry) => {
      const separator = entry.lastIndexOf("@");
      return separator > 0 ? entry.slice(0, separator).trim() : "";
    })
    .filter(Boolean);
}

function queueFor(sn: string): AdmsCommand[] {
  let queue = cmdQueues.get(sn);
  if (!queue) {
    queue = [];
    cmdQueues.set(sn, queue);
  }
  return queue;
}

/** Queue a command (built from a fresh id) for one device, or for all. */
function enqueue(build: (id: number) => string, sn?: string): number {
  const targets = sn ? [sn] : allowlistedSerials();
  for (const target of targets) {
    const id = cmdSeq++;
    queueFor(target).push({ id, line: build(id) });
  }
  return targets.length;
}

function queuedTotal(): number {
  let total = 0;
  for (const queue of cmdQueues.values()) total += queue.length;
  return total;
}
const pendingAck = new Map<number, AdmsCommand>(); // awaiting devicecmd ACK

/** ADMS ingestion is enabled only when K40 is explicitly configured for ADMS. */
async function isAdmsEnabled(): Promise<boolean> {
  try {
    const { DeviceSettingsService } =
      await import("../services/attendance/deviceSettings.service");
    const settings = DeviceSettingsService.getK40Settings();
    return settings.enabled && settings.zk40Protocol === "adms" && settings.admsEnabled === true;
  } catch {
    return false;
  }
}
const queriedDevices = new Set<string>(); // SNs that already received DATA QUERY ATTLOG this session

/** Queue a one-off ATTLOG pull command — device uploads its logs on next poll. */
export function queueAdmsAttlogQuery(): number {
  const devices = enqueue((id) => `C:${id}:DATA QUERY ATTLOG`);
  console.log(
    `[ADMS] Queued manual DATA QUERY ATTLOG for ${devices} device(s) (queue total: ${queuedTotal()})`,
  );
  return devices;
}

export function queueAdmsUserCommands(
  employees: Array<{ empCd: string; fullName: string }>,
): number {
  let count = 0;
  for (const e of employees) {
    const name = (e.fullName || e.empCd).replace(/\t/g, " ").slice(0, 24);
    // K40 firmware uses PIN (not EmpNo) as the primary user ID field
    const build = (id: number) =>
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
    enqueue(build);
    count++;
  }
  console.log(
    `[ADMS] Queued ${count} USERINFO commands (queue total: ${queuedTotal()})`,
  );
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
const detectedOffsetByDevice = new Map<string, number>();
const hydratedDevices = new Set<string>();

async function hydrateDetectedOffset(deviceId: string): Promise<void> {
  if (hydratedDevices.has(deviceId)) return;
  hydratedDevices.add(deviceId);
  try {
    const { DeviceSettingsService } =
      await import("../services/attendance/deviceSettings.service");
    const persisted = DeviceSettingsService.getAdmsDetectedOffset(deviceId);
    if (typeof persisted === "number" && Number.isFinite(persisted)) {
      detectedOffsetByDevice.set(deviceId, persisted);
      console.log(
        `[ADMS] Hydrated persisted clock offset for ${deviceId} = ${persisted}h`,
      );
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

/**
 * Value sent as TimeZone in the handshake. ADMS firmware reads it in MINUTES
 * from UTC (Cairo summer = 180), not hours — sending "3" meant UTC+00:03.
 * ZK_ADMS_HANDSHAKE_TZ overrides it, also in minutes.
 */
function handshakeTimeZone(): number {
  return parseFiniteFloat(process.env.ZK_ADMS_HANDSHAKE_TZ, Math.round(serverOffsetHours() * 60));
}

/** Hours the device clock runs AHEAD of correct local time (subtract on store). */
function effectiveOffsetHours(deviceId: string): number {
  const manual = parseFiniteFloat(process.env.ZK_ADMS_PUNCH_OFFSET_HOURS, NaN);
  if (Number.isFinite(manual)) return manual;
  const detected = detectedOffsetByDevice.get(deviceId);
  if (detected !== undefined) return detected;
  return 0; // unknown until a fresh punch lets us auto-detect — safer than guessing
}

const pendingOffsetByDevice = new Map<string, number>();

/** From a fresh real-time push, snap (deviceTime − now) to nearest hour. */
function maybeDetectOffset(punches: ParsedPunch[], deviceId: string): void {
  if (process.env.ZK_ADMS_PUNCH_OFFSET_HOURS) return;
  if (punches.length === 0 || punches.length > 3) return; // bulk dumps are historical
  const newest = punches.reduce(
    (mx, p) => (p.punchAt > mx ? p.punchAt : mx),
    punches[0].punchAt,
  );
  const diffH = (newest.getTime() - Date.now()) / 3_600_000;
  const rounded = Math.round(diffH);
  // Device only ever runs AHEAD (never behind), and only by a sane amount.
  // Rejects stale/delayed uploads of old punches, which would produce a
  // negative or wildly large diff and poison the offset for all later punches.
  if (rounded < 0 || rounded > 12) return;
  if (Math.abs(diffH - rounded) >= 0.25) return;
  const decision = decideAdmsOffset(
    detectedOffsetByDevice.get(deviceId),
    rounded,
    pendingOffsetByDevice.get(deviceId),
    process.env.ZK_ADMS_PUNCH_OFFSET_HOURS,
  );
  if (decision.pending === undefined) pendingOffsetByDevice.delete(deviceId);
  else pendingOffsetByDevice.set(deviceId, decision.pending);
  if (!decision.changed || decision.offset === undefined) return;
  detectedOffsetByDevice.set(deviceId, decision.offset);
  console.log(
    `[ADMS] Device clock offset for ${deviceId} = ${decision.offset}h ahead — subtracting from punch times`,
  );
  import("../services/attendance/deviceSettings.service")
    .then(({ DeviceSettingsService }) =>
      DeviceSettingsService.setAdmsDetectedOffset(deviceId, decision.offset!),
    )
    .catch(() => {});
}

async function parseAttlogBody(
  body: string,
  deviceId: string,
): Promise<ParsedPunch[]> {
  await hydrateDetectedOffset(deviceId);
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
    const rawPunchAt = new Date(
      +tsParts[0],
      +tsParts[1] - 1,
      +tsParts[2],
      +tsParts[3],
      +tsParts[4],
      +tsParts[5],
    );
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
  maybeDetectOffset(punches, deviceId);
  const offMs = effectiveOffsetHours(deviceId) * 3_600_000;
  if (offMs !== 0) {
    for (const p of punches) p.punchAt = new Date(p.punchAt.getTime() - offMs);
  }
  return punches;
}

export function registerZKTecoAdms(app: Express): void {
  // ADMS has no protocol-level authentication. Require an explicit
  // serial@source-IP pair for every device, and fail closed when none is
  // configured. Do not trust X-Forwarded-For here: the socket peer is the
  // identity boundary (if proxied, allowlist the proxy and restrict it there).
  app.use("/iclock", (req: Request, res: Response, next) => {
    const sn = String(req.query.SN ?? req.query.sn ?? "").trim();
    const remoteAddress = (req.socket.remoteAddress ?? "").replace(
      /^::ffff:/i,
      "",
    );
    const allowlist = (process.env.ZK_ADMS_DEVICE_ALLOWLIST ?? "")
      .split(",")
      .map((entry) => entry.trim())
      .filter(Boolean);
    const allowed = allowlist.some((entry) => {
      const separator = entry.lastIndexOf("@");
      if (separator <= 0 || separator === entry.length - 1) return false;
      const allowedSerial = entry.slice(0, separator).trim();
      const allowedAddress = entry
        .slice(separator + 1)
        .trim()
        .replace(/^::ffff:/i, "");
      return allowedSerial === sn && allowedAddress === remoteAddress;
    });

    if (!allowed) {
      res.status(403).type("text/plain").send("DENY");
      return;
    }
    next();
  });

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
    console.log(
      `[ADMS] Handshake from SN=${sn} options=${options} ip=${req.ip}`,
    );

    // Queue DATA QUERY ATTLOG once per session so device pushes its logs (pushver 2.x command-driven)
    if (!queriedDevices.has(sn)) {
      queriedDevices.add(sn);
      enqueue((id) => `C:${id}:DATA QUERY ATTLOG`, sn);
      console.log(`[ADMS] Queued DATA QUERY ATTLOG for SN=${sn}`);
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
        `TimeZone=${handshakeTimeZone()}\r\n` +
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
      console.log(
        `[ADMS] SN=${sn} no punches parsed — raw: ${body.slice(0, 300)}`,
      );
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
        // Use the normalized employee/timestamp identity shared with TCP pulls
        // so one physical K40 scan cannot be stored twice across ADMS and TCP.
        sourceRowId: `${p.empCd}_${p.punchAt.getTime()}`,
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

      // Live-broadcast to LiveBoard subscribers, same as the FK/TCP punch path
      // (punchReception.service.ts) — without this, ZK/ADMS punches only ever
      // show up after a page refresh, never on the live feed.
      for (const p of punches) {
        broadcastPunch(p.empCd, p.direction, p.punchAt, sn);
      }

      // Recompute daily records immediately so dashboard cards update, same
      // as the FK/TCP punch path.
      const punchDays = new Set(
        punches.map((p) => {
          const d = new Date(p.punchAt);
          d.setHours(0, 0, 0, 0);
          return d.getTime();
        }),
      );
      for (const dayMs of punchDays) {
        const dayStart = new Date(dayMs);
        void DailyMaterializer.recomputeRange(
          dayStart,
          dayStart,
          undefined,
          undefined,
          { recomputeMonthly: true },
        ).catch((err) => {
          console.error(
            "[ADMS] Failed to recompute attendance for",
            dayStart,
            err,
          );
        });
      }

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
    const queue = queueFor(sn);
    if (queue.length > 0) {
      const cmd = queue.shift()!;
      pendingAck.set(cmd.id, cmd);
      console.log(
        `[ADMS] → SN=${sn} cmd ${cmd.id}: ${cmd.line.slice(0, 80)} (${queue.length} remaining)`,
      );
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
