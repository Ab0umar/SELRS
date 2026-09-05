import { execFile } from "node:child_process";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

export const DIAGNOSTIC_CHECKS = {
  typescript: { label: "فحص TypeScript", command: "pnpm check", safe: true },
  backend: { label: "اختبارات backend", command: "pnpm test:backend", safe: true },
  playwright: { label: "اختبارات Playwright", command: "pnpm test:ui", safe: true },
  sensitiveFiles: { label: "فحص الملفات الحساسة", command: "pnpm security:files", safe: true },
  migrationFiles: { label: "فحص ملفات migrations", command: "pnpm db:migration-files-check", safe: true },
  databaseSync: { label: "فحص تطابق قاعدة البيانات", command: "pnpm db:sync-check", safe: true },
  trpcInventory: { label: "جرد إجراءات tRPC", command: "pnpm security:trpc-inventory", safe: true },
  s3Versions: { label: "فحص إصدارات S3", command: "pnpm s3:audit-versions", safe: true },
  smoke: { label: "اختبار النظام الأساسي", command: "pnpm smoke", safe: true },
  users: { label: "فحص صلاحيات المستخدمين", command: "pnpm security:audit-users", safe: true },
  backup: { label: "نسخة احتياطية", command: "pnpm db:backup", safe: false },
  restore: { label: "استعادة نسخة احتياطية", command: "pnpm db:restore", safe: false },
} as const;

export type DiagnosticCheckId = keyof typeof DIAGNOSTIC_CHECKS;

function redact(value: string) {
  return value
    .replace(/(DATABASE_URL|JWT_SECRET|COOKIE_SECRET|AWS_SECRET_ACCESS_KEY|AWS_ACCESS_KEY_ID|E2E_PASS|PASSWORD)\s*[=:]\s*[^\s]+/gi, "$1=[redacted]")
    .replace(/(mysql:\/\/[^\s]+|postgres(?:ql)?:\/\/[^\s]+)/gi, "[redacted-database-url]");
}

function resolveWindowsPackageManager() {
  const userProfile = process.env.USERPROFILE;
  const pnpmHome = process.env.PNPM_HOME;
  const candidates = [
    pnpmHome && join(pnpmHome, "pnpm.CMD"),
    userProfile && join(userProfile, "AppData", "Local", "pnpm", "bin", "pnpm.CMD"),
    process.env.ProgramFiles && join(process.env.ProgramFiles, "nodejs", "corepack.cmd"),
  ].filter((candidate): candidate is string => Boolean(candidate));

  return candidates.find((candidate) => existsSync(candidate)) ?? "pnpm";
}

export async function runDiagnostic(checkId: DiagnosticCheckId) {
  const check = DIAGNOSTIC_CHECKS[checkId];
  if (!check.safe) {
    return { checkId, label: check.label, command: check.command, status: "blocked" as const, output: "هذا الإجراء يحتاج تأكيداً منفصلاً ولا يعمل من التشغيل الجماعي." };
  }

  const script = check.command.slice("pnpm ".length);
  const packageManager = process.platform === "win32" ? resolveWindowsPackageManager() : "pnpm";
  const command = packageManager;
  const args = [script];
  const startedAt = Date.now();
  try {
    const result = await execFileAsync(command, args, {
      cwd: process.cwd(),
      env: process.env,
      timeout: 120_000,
      maxBuffer: 512 * 1024,
      shell: process.platform === "win32",
      windowsHide: process.platform === "win32",
    });
    return { checkId, label: check.label, command: check.command, status: "passed" as const, durationMs: Date.now() - startedAt, output: redact(`${result.stdout}${result.stderr ? `\n${result.stderr}` : ""}`).trim() };
  } catch (error: any) {
    const stdout = typeof error?.stdout === "string" ? error.stdout : "";
    const stderr = typeof error?.stderr === "string" ? error.stderr : error?.message ?? "فشل تشغيل الاختبار";
    return { checkId, label: check.label, command: check.command, status: "failed" as const, durationMs: Date.now() - startedAt, output: redact(`${stdout}\n${stderr}`).trim() };
  }
}
