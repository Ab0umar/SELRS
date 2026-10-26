import type { NextFunction, Request, Response } from "express";
import { parse as parseCookieHeader } from "cookie";
import jwt from "jsonwebtoken";
import { ENV } from "./env";
import { AUTH_COOKIE_NAME, LEGACY_AUTH_COOKIE_NAME } from "./auth";
import { isValidMssqlYear, runWithMssqlYear } from "../integrations/mssqlYear";

function sessionYearFromRequest(req: Request): number | null {
  const cookies = parseCookieHeader(req.headers.cookie || "");
  const header = req.headers.authorization;
  const bearer =
    typeof header === "string" && header.toLowerCase().startsWith("bearer ")
      ? header.slice(7).trim()
      : undefined;
  for (const token of [cookies[AUTH_COOKIE_NAME], cookies[LEGACY_AUTH_COOKIE_NAME], bearer]) {
    if (!token) continue;
    try {
      const payload = jwt.verify(token, ENV.JWT_SECRET, {
        algorithms: ["HS256"],
      }) as { mssqlYear?: unknown };
      return isValidMssqlYear(payload.mssqlYear) ? payload.mssqlYear : null;
    } catch {
      // try the next candidate
    }
  }
  return null;
}

/**
 * Runs the rest of the request with the MSSQL year chosen at login (signed into
 * the session token). Unauthenticated or invalid tokens simply get the current year.
 */
export function mssqlYearContext(req: Request, _res: Response, next: NextFunction) {
  runWithMssqlYear(sessionYearFromRequest(req), next);
}
