import type { CreateExpressContextOptions } from "@trpc/server/adapters/express";
import type { User } from "../../drizzle/schema";
import { authService } from "./auth";
import jwt from "jsonwebtoken";
import { ENV } from "./env";

export type PatientSession = {
  patientId: number;
  phone: string;
  token: string;
};

export type DoctorSession = {
  doctorId: number;
  username: string;
};

export type TrpcContext = {
  req: CreateExpressContextOptions["req"];
  res: CreateExpressContextOptions["res"];
  user: User | null;
  patientSession: PatientSession | null;
  doctorSession: DoctorSession | null;
};

export async function createContext(
  opts: CreateExpressContextOptions,
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
      const payload = jwt.verify(raw, ENV.JWT_SECRET) as any;
      if (
        payload?.type === "patient" &&
        typeof payload?.patientId === "number"
      ) {
        patientSession = {
          patientId: payload.patientId,
          phone: String(payload.phone ?? ""),
          token: raw,
        };
      }
    }
  } catch {
    patientSession = null;
  }

  let doctorSession: DoctorSession | null = null;
  try {
    const raw = opts.req.headers["x-doctor-token"] as string | undefined;
    if (raw) {
      const payload = jwt.verify(raw, ENV.JWT_SECRET) as any;
      if (
        payload?.type === "externalDoctor" &&
        typeof payload?.doctorId === "number"
      ) {
        doctorSession = {
          doctorId: payload.doctorId,
          username: String(payload.username ?? ""),
        };
      }
    }
  } catch {
    doctorSession = null;
  }

  return {
    req: opts.req,
    res: opts.res,
    user,
    patientSession,
    doctorSession,
  };
}
