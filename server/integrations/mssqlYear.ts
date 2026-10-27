import { AsyncLocalStorage } from "node:async_hooks";
import { TRPCError } from "@trpc/server";

/**
 * The accounting system keeps one SQL Server database per year (op2026, op2027, ...).
 * Which one a request talks to is the year chosen at login; everything that runs
 * outside a request (schedulers, startup) uses the current year automatically.
 */

export const MIN_MSSQL_YEAR = 2013;
export const MAX_MSSQL_YEAR = 2100;

type RequestYearContext = {
  /** Year picked at login; null means "automatic" (follows today's year). */
  sessionYear: number | null;
  /** Filled in once the request's user is known (role is read from the DB, not the token). */
  user?: { role?: string | null } | null;
};

const store = new AsyncLocalStorage<RequestYearContext>();

export function isValidMssqlYear(value: unknown): value is number {
  return (
    typeof value === "number" &&
    Number.isInteger(value) &&
    value >= MIN_MSSQL_YEAR &&
    value <= MAX_MSSQL_YEAR
  );
}

/** Calendar year in Cairo, so the switch happens at local midnight on 1 January. */
export function cairoYear(now: Date = new Date()): number {
  const year = Number(
    new Intl.DateTimeFormat("en-CA", {
      timeZone: "Africa/Cairo",
      year: "numeric",
    }).format(now),
  );
  return year;
}

/** Year used when nobody picked one. `MSSQL_DB_YEAR` can pin it (for example to roll back). */
export function currentMssqlYear(now: Date = new Date()): number {
  const pinned = Number(process.env.MSSQL_DB_YEAR);
  return isValidMssqlYear(pinned) ? pinned : cairoYear(now);
}

export function runWithMssqlYear<T>(
  sessionYear: number | null,
  fn: () => T,
): T {
  return store.run({ sessionYear: isValidMssqlYear(sessionYear) ? sessionYear : null }, fn);
}

/** Attach the authenticated user to the current request (called from the tRPC context). */
export function setMssqlRequestUser(user: { role?: string | null } | null) {
  const ctx = store.getStore();
  if (ctx) ctx.user = user;
}

/** True when the session follows the calendar (no explicit year picked at login). */
export function isMssqlYearAuto(): boolean {
  return (store.getStore()?.sessionYear ?? null) === null;
}

export function getMssqlYear(now: Date = new Date()): number {
  return store.getStore()?.sessionYear ?? currentMssqlYear(now);
}

export function mssqlDbName(year: number = getMssqlYear()): string {
  if (!isValidMssqlYear(year)) throw new Error("Invalid MSSQL year");
  return `op${year}`;
}

/** `op2027.dbo.TABLE`; table names are code constants, never user input. */
export function mssqlTable(table: string, year: number = getMssqlYear()): string {
  if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(table)) {
    throw new Error("Invalid MSSQL table name");
  }
  return `${mssqlDbName(year)}.dbo.${table}`;
}

/** Fully qualified header table, kept for the allow-list checks. */
export const MSSQL_HEADER_TABLE_RE = /^op\d{4}\.dbo\.PAJRNRCVH$/i;

/**
 * Writes outside request context (jobs) are allowed. In a request, writing to a
 * year other than the current one is for admins only.
 */
export function assertMssqlWritable(now: Date = new Date()): void {
  const ctx = store.getStore();
  if (!ctx) return;
  if (getMssqlYear(now) === currentMssqlYear(now)) return;
  if (String(ctx.user?.role ?? "").toLowerCase() === "admin") return;
  throw new TRPCError({
    code: "FORBIDDEN",
    message: `الكتابة على قاعدة سنة ${getMssqlYear(now)} للأدمن فقط`,
  });
}

/** Pins a block (MySQL imports, which always belong to the current year's database) to the current year. */
export function withCurrentMssqlYear<T>(fn: () => T): T {
  return store.run({ sessionYear: null, user: store.getStore()?.user }, fn);
}

/** Pins the rest of the current request to the current year (MySQL catalog imports). */
export function pinCurrentMssqlYear(): void {
  const ctx = store.getStore();
  if (ctx) store.enterWith({ sessionYear: null, user: ctx.user });
}
