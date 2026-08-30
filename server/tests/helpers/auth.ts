import type { TrpcContext } from "../../_core/context";

export function makeCallerAs(role: string): TrpcContext {
  return {
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      clearCookie() {},
    } as unknown as TrpcContext["res"],
    user: {
      id: 123,
      username: "test-user",
      password: "hashed-password",
      name: "Test User",
      email: "test@example.com",
      role: role as NonNullable<TrpcContext["user"]>["role"],
      branch: "examinations",
      shift: 1,
    isActive: true,
    authVersion: 1,
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: null,
    },
    patientSession: null,
    doctorSession: null,
  };
}
