import { describe, expect, it } from "vitest";
import { MySqlDialect } from "drizzle-orm/mysql-core";
import { classifyTrpcPath } from "../_core/trpcCredentialGuard";
import {
  buildConsumeRateLimitSql,
  normalizeRateLimitKey,
} from "../_core/rateLimitSql";

describe("classifyTrpcPath", () => {
  it("leaves ordinary procedures alone, batched or not", () => {
    expect(classifyTrpcPath("/auth.me")).toEqual({ kind: "other" });
    expect(classifyTrpcPath("/auth.me,medical.getDoctors")).toEqual({
      kind: "other",
    });
  });

  it("recognises a single credential procedure", () => {
    expect(classifyTrpcPath("/patientPortal.login")).toEqual({
      kind: "credential",
      procedure: "patientportal.login",
    });
    expect(classifyTrpcPath("/doctorPortal.login")).toMatchObject({
      kind: "credential",
    });
  });

  it("refuses batches that contain a credential procedure", () => {
    expect(
      classifyTrpcPath("/patientPortal.login,patientPortal.login,patientPortal.login"),
    ).toEqual({ kind: "batched-credential" });
    expect(classifyTrpcPath("/auth.me,doctorPortal.login")).toEqual({
      kind: "batched-credential",
    });
  });

  it("sees through the percent-encoding tRPC itself decodes", () => {
    expect(classifyTrpcPath("/patientPortal%2Elogin")).toMatchObject({
      kind: "credential",
    });
    expect(classifyTrpcPath("/patientPortal.login%2CpatientPortal.login")).toEqual({
      kind: "batched-credential",
    });
  });

  it("is case-insensitive and rejects undecodable paths", () => {
    expect(classifyTrpcPath("/PATIENTPORTAL.LOGIN")).toMatchObject({
      kind: "credential",
    });
    expect(classifyTrpcPath("/%E0%A4%A")).toEqual({ kind: "invalid" });
  });
});

describe("buildConsumeRateLimitSql", () => {
  const dialect = new MySqlDialect();
  const now = new Date("2026-10-26T10:00:00Z");

  it("increments inside the database and binds every value", () => {
    const { sql: text, params } = dialect.sqlToQuery(
      buildConsumeRateLimitSql("patient-portal:1.2.3.4:0100", now, 900_000),
    );
    expect(text).toContain("ON DUPLICATE KEY UPDATE");
    expect(text).toContain("attempts = IF(reset_at > ?, attempts + 1, 1)");
    expect(text).not.toContain("1.2.3.4");
    expect(params[0]).toBe("patient-portal:1.2.3.4:0100");
    expect(params).toContainEqual(new Date(now.getTime() + 900_000));
  });

  it("clamps user-controlled key parts to the column width", () => {
    expect(normalizeRateLimitKey("x".repeat(400))).toHaveLength(255);
  });
});

describe("createTrpcCredentialGuard (real Express)", () => {
  it("blocks batched logins and throttles a single login", async () => {
    const { default: express } = await import("express");
    const { createTrpcCredentialGuard } = await import(
      "../_core/trpcCredentialGuard"
    );
    const app = express();
    app.use("/api/trpc", createTrpcCredentialGuard(2, 60_000));
    app.use("/api/trpc", (_req, res) => res.json({ reached: true }));
    const server = app.listen(0);
    try {
      const { port } = server.address() as { port: number };
      const call = (path: string) => fetch(`http://127.0.0.1:${port}/api/trpc/${path}`);

      expect((await call("auth.me")).status).toBe(200);
      expect(
        (await call("patientPortal.login,patientPortal.login,patientPortal.login")).status,
      ).toBe(400);
      expect(
        (await call("patientPortal.login%2CpatientPortal.login")).status,
      ).toBe(400);
      expect((await call("patientPortal.login")).status).toBe(200);
      expect((await call("patientPortal%2Elogin")).status).toBe(200);
      expect((await call("patientPortal.login")).status).toBe(429);
      // a different credential endpoint has its own budget
      expect((await call("doctorPortal.login")).status).toBe(200);
    } finally {
      server.close();
    }
  });
});
