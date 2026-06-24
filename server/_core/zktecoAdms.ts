/**
 * ZKTeco ADMS Push Endpoint
 * Receives attendance punches pushed by ZKTeco devices (X628-T/ID etc.)
 * over HTTP using the ZKTeco ADMS (Automatic Data Management System) protocol.
 *
 * Device setup: Comm → Cloud Server → Server Address = this server's hostname
 *
 * Protocol flow:
 *   1. Device sends GET /iclock/cdata?SN=...&options=all  (handshake)
 *      Server replies: "GET OPTION FROM: <SN>\nATTLOG\nOPERLOG\n..."
 *   2. Device sends POST /iclock/cdata?SN=...&table=ATTLOG  (punch upload)
 *      Body lines: "UserID\tTimestamp\tStatus\tVerify\tWorkCode\tReserved\n"
 *      Server replies: "OK: <count>"
 */

import type { Express, Request, Response } from "express";
import express from "express";
import crypto from "crypto";
import { getDb } from "../db";
import { attendancePunches, attendanceEmployees } from "../../drizzle/schema";
import { sql } from "drizzle-orm";

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

function parseAttlogBody(body: string, deviceId: string): ParsedPunch[] {
  const punches: ParsedPunch[] = [];
  for (const raw of body.split("\n")) {
    const line = raw.trim();
    if (!line) continue;
    // Format: UserID\tTimestamp\tStatus\tVerify\tWorkCode\tReserved
    const parts = line.split("\t");
    if (parts.length < 3) continue;
    const [userId, ts, statusStr, verifyStr] = parts;
    const punchAt = new Date(ts.trim());
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
  return punches;
}

export function registerZKTecoAdms(app: Express): void {
  // Accept plain text body for ZKTeco ADMS push
  app.use("/iclock", express.text({ type: "*/*", limit: "2mb" }));

  // GET /iclock/cdata — device handshake / options request
  app.get("/iclock/cdata", (req: Request, res: Response) => {
    const sn = String(req.query.SN ?? req.query.sn ?? "unknown");
    const options = String(req.query.options ?? req.query.Options ?? "");
    console.log(`[ADMS] Handshake from SN=${sn} options=${options} ip=${req.ip}`);
    res.set("Content-Type", "text/plain");
    // Full options response required by K40/ADMS firmware
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
    console.log(`[ADMS] POST SN=${sn} table=${table} bodyLen=${body.length} ip=${req.ip}`);

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

  // GET /iclock/getrequest — device polls for commands (respond empty = no commands)
  app.get("/iclock/getrequest", (req: Request, res: Response) => {
    res.set("Content-Type", "text/plain");
    res.send("");
  });

  // POST /iclock/devicecmd — device acknowledges executed commands
  app.post("/iclock/devicecmd", (_req: Request, res: Response) => {
    res.set("Content-Type", "text/plain");
    res.send("OK");
  });

  console.log("[ADMS] ZKTeco ADMS push endpoint registered at /iclock/cdata");
}
