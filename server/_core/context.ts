import type { CreateExpressContextOptions } from "@trpc/server/adapters/express";
import type { User } from "../../drizzle/schema";
import { authService } from "./auth";
import jwt from "jsonwebtoken";
import { ENV } from "./env";

export type PatientSession = {
  patientId: number;
  phone: string;
};

export type TrpcContext = {
  req: CreateExpressContextOptions["req"];
  res: CreateExpressContextOptions["res"];
  user: User | null;
  patientSession: PatientSession | null;
};

export async function createContext(
  opts: CreateExpressContextOptions
): Promise<TrpcContext> {
  let user: User | null = null;

  try {
    user = await authService.authenticateRequest(opts.req);
  } catch {
    user = null;
  }

  let patientSession: PatientSession | null = null;
  try {
    const raw = opts.req.headers["x-patient-token"] as string | undefined;
    if (raw) {
      const secret = ENV.JWT_SECRET || "dev-only-change-me";
      const payload = jwt.verify(raw, secret) as any;
      if (payload?.type === "patient" && typeof payload?.patientId === "number") {
        patientSession = { patientId: payload.patientId, phone: String(payload.phone ?? "") };
      }
    }
  } catch {
    patientSession = null;
  }

  return {
    req: opts.req,
    res: opts.res,
    user,
    patientSession,
  };
}
