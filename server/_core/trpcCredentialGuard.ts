import type { NextFunction, Request, RequestHandler, Response } from "express";
import { rateLimit } from "express-rate-limit";

/** Public credential procedures: brute-force targets that must never be batched. */
export const CREDENTIAL_PROCEDURES = [
  "doctorPortal.login",
  "patientPortal.login",
] as const;

export type TrpcPathClass =
  | { kind: "other" }
  | { kind: "credential"; procedure: string }
  | { kind: "batched-credential" }
  | { kind: "invalid" };

/**
 * Classify the part of the URL after `/api/trpc`. tRPC percent-decodes the path
 * and splits batches on commas, so the same decoding has to happen here;
 * otherwise `doctorPortal%2Elogin` or `a%2CdoctorPortal.login` slips past a
 * prefix match on the raw path.
 */
export function classifyTrpcPath(rawPath: string): TrpcPathClass {
  let decoded: string;
  try {
    decoded = decodeURIComponent(rawPath);
  } catch {
    return { kind: "invalid" };
  }
  const names = decoded
    .replace(/^\/+/, "")
    .split(",")
    .map((name) => name.trim().toLowerCase());
  const hits = names.filter((name) =>
    (CREDENTIAL_PROCEDURES as readonly string[]).some(
      (procedure) => procedure.toLowerCase() === name,
    ),
  );
  if (hits.length === 0) return { kind: "other" };
  if (names.length > 1) return { kind: "batched-credential" };
  return { kind: "credential", procedure: hits[0] };
}

export function createTrpcCredentialGuard(
  limit = 20,
  windowMs = 15 * 60_000,
): RequestHandler {
  const limiters = new Map<string, RequestHandler>();
  const limiterFor = (procedure: string) => {
    let limiter = limiters.get(procedure);
    if (!limiter) {
      limiter = rateLimit({
        windowMs,
        limit,
        standardHeaders: "draft-7",
        legacyHeaders: false,
        message: { ok: false, error: "Too many requests. Please retry later." },
      });
      limiters.set(procedure, limiter);
    }
    return limiter;
  };

  return (req: Request, res: Response, next: NextFunction) => {
    const classified = classifyTrpcPath(req.path);
    if (classified.kind === "other") return next();
    if (classified.kind === "credential") {
      return limiterFor(classified.procedure)(req, res, next);
    }
    res.status(400).json({
      ok: false,
      error: "Credential endpoints cannot be batched",
    });
  };
}
