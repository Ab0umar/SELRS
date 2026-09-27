import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  consumeLoginRateLimit: vi.fn(),
  clearLoginRateLimit: vi.fn(),
  getDb: vi.fn(),
}));

vi.mock("../db", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../db")>()),
  consumeLoginRateLimit: mocks.consumeLoginRateLimit,
  clearLoginRateLimit: mocks.clearLoginRateLimit,
  getDb: mocks.getDb,
}));

const { appRouter } = await import("../routers");

function createCaller() {
  return appRouter.createCaller({
    req: {
      ip: "192.0.2.10",
      protocol: "https",
      headers: {},
      socket: { remoteAddress: "192.0.2.10" },
    } as any,
    res: { clearCookie() {} } as any,
    user: null,
    patientSession: null,
    doctorSession: null,
  });
}

describe("public portal login rate limiting", () => {
  beforeEach(() => vi.clearAllMocks());

  it.each([
    {
      portal: "doctor",
      login: (caller: ReturnType<typeof createCaller>) =>
        caller.doctorPortal.login({ username: "Doctor.One", password: "wrong" }),
    },
    {
      portal: "patient",
      login: (caller: ReturnType<typeof createCaller>) =>
        caller.patientPortal.login({ phone: "+201012345678", patientCode: "P-1" }),
    },
  ])(
    "rejects the sixth $portal login attempt before credential lookup",
    async ({ login }) => {
      mocks.consumeLoginRateLimit.mockResolvedValueOnce(6);
      const caller = createCaller();

      await expect(login(caller)).rejects.toMatchObject({
        code: "TOO_MANY_REQUESTS",
      });
    },
  );

  it.each([
    {
      portal: "doctor",
      login: (caller: ReturnType<typeof createCaller>) =>
        caller.doctorPortal.login({ username: "doctor.one", password: "wrong" }),
    },
    {
      portal: "patient",
      login: (caller: ReturnType<typeof createCaller>) =>
        caller.patientPortal.login({ phone: "01012345678", patientCode: "P-1" }),
    },
  ])(
    "allows the fifth $portal attempt to reach credential lookup",
    async ({ login }) => {
      mocks.consumeLoginRateLimit.mockResolvedValueOnce(5);
      mocks.getDb.mockResolvedValueOnce(null);
      const caller = createCaller();

      await expect(login(caller)).rejects.toMatchObject({
        code: "INTERNAL_SERVER_ERROR",
      });
    },
  );
});
