/**
 * ZKTeco log/user puller — wraps scripts/zk-pull.ps1 via 32-bit PowerShell.
 * The zkemkeeper.ZKEM COM object is 32-bit only, so we must call SysWOW64 pwsh.
 */

import { spawnSync } from "child_process";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const PS32     = "C:\\Windows\\SysWOW64\\WindowsPowerShell\\v1.0\\powershell.exe";
const PS1_PATH = path.resolve(__dirname, "../../../scripts/zk-pull.ps1");

export interface ZKPunch {
  enrollNo:   string;
  inOutMode:  number;   // 0 = out, 1 = in
  verifyMode: number;
  timestamp:  Date;
}

export interface ZKDeviceUser {
  enrollNo:  string;
  name:      string;
  privilege: number;
  enabled:   boolean;
}

export interface ZKDeviceInfo {
  ok:       boolean;
  serial?:  string;
  product?: string;
  firmware?: string;
  error?:   string;
}

export class ZK4370LogPuller {
  static readonly DEFAULT_IP   = process.env.ZK4370_IP   ?? "196.202.50.91";
  static readonly DEFAULT_PORT = parseInt(process.env.ZK4370_PORT ?? "4370", 10);

  static async setDeviceTime(ip = this.DEFAULT_IP, port = this.DEFAULT_PORT, commKey = 0): Promise<void> {
    try {
      const out = run(`-Mode settime -IP ${ip} -Port ${port} -CommPwd ${commKey}`, 15_000);
      console.log(`[ZK4370Puller] settime: ${out.trim()}`);
    } catch (err) {
      console.warn(`[ZK4370Puller] settime failed: ${err instanceof Error ? err.message : err}`);
    }
  }

  static async pullLogs(ip = this.DEFAULT_IP, port = this.DEFAULT_PORT, commKey = 0): Promise<ZKPunch[]> {
    await this.setDeviceTime(ip, port, commKey);
    const tmp = tmpPath("zk_logs");
    try {
      const out = run(`-Mode pull -IP ${ip} -Port ${port} -CommPwd ${commKey} -OutFile "${tmp}"`, 60_000);
      console.log(`[ZK4370Puller] ${out.trim()}`);
      return parsePunchCsv(tmp);
    } finally {
      rm(tmp);
    }
  }

  static async pullUsers(ip = this.DEFAULT_IP, port = this.DEFAULT_PORT, commKey = 0): Promise<ZKDeviceUser[]> {
    const tmp = tmpPath("zk_users");
    try {
      const out = run(`-Mode users -IP ${ip} -Port ${port} -CommPwd ${commKey} -OutFile "${tmp}"`, 30_000);
      console.log(`[ZK4370Puller] ${out.trim()}`);
      return parseUserCsv(tmp);
    } finally {
      rm(tmp);
    }
  }

  static async pushEmployees(
    employees: Array<{ empCd: string; fullName: string; uid: number }>,
    ip = this.DEFAULT_IP,
    port = this.DEFAULT_PORT,
  ): Promise<{ pushed: number; failed: number }> {
    const empFile = tmpPath("zk_emp", "csv");
    try {
      const lines = [
        "empCd,fullName,uid",
        ...employees.map((e) => `${e.empCd},"${e.fullName.replace(/"/g, '""')}",${e.uid}`),
      ];
      fs.writeFileSync(empFile, lines.join("\n"), "utf-8");

      const out = run(`-Mode push -IP ${ip} -Port ${port} -EmployeesFile "${empFile}"`, 120_000);
      console.log(`[ZK4370Puller] ${out.trim()}`);

      const m = out.match(/(\d+) pushed, (\d+) failed/);
      return { pushed: m ? parseInt(m[1], 10) : 0, failed: m ? parseInt(m[2], 10) : 0 };
    } finally {
      rm(empFile);
    }
  }

  static async getDeviceInfo(ip = this.DEFAULT_IP, port = this.DEFAULT_PORT): Promise<ZKDeviceInfo> {
    try {
      const out = run(`-Mode info -IP ${ip} -Port ${port}`, 15_000);
      return {
        ok:       true,
        serial:   out.match(/Serial:\s*(.+)/)?.[1]?.trim(),
        product:  out.match(/Product:\s*(.+)/)?.[1]?.trim(),
        firmware: out.match(/Firmware:\s*(.+)/)?.[1]?.trim(),
      };
    } catch (err) {
      return { ok: false, error: err instanceof Error ? err.message : String(err) };
    }
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function run(args: string, timeoutMs: number): string {
  // Use spawnSync with explicit args array to avoid cmd.exe quoting issues
  // with quoted executable paths on Windows.
  const argv = ["-NoProfile", "-NonInteractive", "-ExecutionPolicy", "Bypass", "-File", PS1_PATH, ...parseArgs(args)];
  const proc = spawnSync(PS32, argv, { encoding: "utf-8", timeout: timeoutMs });
  if (proc.status !== 0) {
    throw new Error((proc.stderr || proc.stdout || "unknown error").trim());
  }
  return proc.stdout ?? "";
}

function parseArgs(args: string): string[] {
  // Split "-Mode pull -IP 1.2.3.4 -Port 4370 ..." honouring quoted values.
  const result: string[] = [];
  const re = /(-\w+)\s+("(?:[^"\\]|\\.)*"|[^\s"]+)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(args)) !== null) {
    result.push(m[1]);
    result.push(m[2].replace(/^"|"$/g, ""));
  }
  return result;
}

function tmpPath(prefix: string, ext = "csv"): string {
  return path.join(os.tmpdir(), `${prefix}_${Date.now()}.${ext}`);
}

function rm(p: string): void {
  try { if (fs.existsSync(p)) fs.unlinkSync(p); } catch { /* ignore */ }
}

function parsePunchCsv(filePath: string): ZKPunch[] {
  if (!fs.existsSync(filePath)) return [];
  const lines = fs.readFileSync(filePath, "utf-8").trim().split(/\r?\n/);
  const out: ZKPunch[] = [];
  for (let i = 1; i < lines.length; i++) {
    const p = lines[i].trim().split(",");
    if (p.length < 4) continue;
    const ts = new Date(p[3].trim());
    if (isNaN(ts.getTime()) || ts.getFullYear() < 2000) continue;
    out.push({
      enrollNo:   p[0].trim(),
      inOutMode:  parseInt(p[1], 10),
      verifyMode: parseInt(p[2], 10),
      timestamp:  ts,
    });
  }
  return out;
}

function parseUserCsv(filePath: string): ZKDeviceUser[] {
  if (!fs.existsSync(filePath)) return [];
  const lines = fs.readFileSync(filePath, "utf-8").trim().split(/\r?\n/);
  const out: ZKDeviceUser[] = [];
  for (let i = 1; i < lines.length; i++) {
    const raw = lines[i].trim();
    if (!raw) continue;
    // Simple parse: EnrollNo,"Name",Privilege,Enabled
    const m = raw.match(/^([^,]+),"([^"]*)",(\d+),(true|false)$/i);
    if (!m) continue;
    out.push({
      enrollNo:  m[1].trim(),
      name:      m[2],
      privilege: parseInt(m[3], 10),
      enabled:   m[4].toLowerCase() === "true",
    });
  }
  return out;
}
