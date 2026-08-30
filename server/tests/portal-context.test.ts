import { describe, expect, it, vi } from "vitest";
import jwt from "jsonwebtoken";

process.env.JWT_SECRET ??= "portal-context-test-secret-0123456789012345";

const getDb = vi.fn();

vi.mock("../db", () => ({ getDb }));

const { ENV } = await import("../_core/env");
const { createContext } = await import("../_core/context");

function requestWithPatientToken(token: string) {
  return {
    req: {
      protocol: "https",
      headers: { "x-patient-token": token },
    } as any,
    res: {} as any,
  };
}

describe("patient portal session ownership", () => {
  it("rejects a signed token when its database session is missing", async () => {
    getDb.mockResolvedValue(undefined);
    const token = jwt.sign(
      { type: "patient", patientId: 10, phone: "01000000000" },
      ENV.JWT_SECRET,
    );

    const context = await createContext(requestWithPatientToken(token));

    expect(context.patientSession).toBeNull();
  });

  it("accepts only a non-expired session belonging to the token patient", async () => {
    const limit = vi.fn().mockResolvedValue([{ patientId: 10 }]);
    const where = vi.fn().mockReturnValue({ limit });
    const from = vi.fn().mockReturnValue({ where });
    const select = vi.fn().mockReturnValue({ from });
    getDb.mockResolvedValue({ select });
    const token = jwt.sign(
      { type: "patient", patientId: 10, phone: "01000000000" },
      ENV.JWT_SECRET,
    );

    const context = await createContext(requestWithPatientToken(token));

    expect(context.patientSession).toMatchObject({
      patientId: 10,
      phone: "01000000000",
      token,
    });
  });

  it("rejects a token when the stored session belongs to another patient", async () => {
    const limit = vi.fn().mockResolvedValue([{ patientId: 20 }]);
    const where = vi.fn().mockReturnValue({ limit });
    const from = vi.fn().mockReturnValue({ where });
    const select = vi.fn().mockReturnValue({ from });
    getDb.mockResolvedValue({ select });
    const token = jwt.sign(
      { type: "patient", patientId: 10, phone: "01000000000" },
      ENV.JWT_SECRET,
    );

    const context = await createContext(requestWithPatientToken(token));

    expect(context.patientSession).toBeNull();
  });
});
