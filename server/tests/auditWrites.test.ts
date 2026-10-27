import { eq, like } from "drizzle-orm";
import { z } from "zod";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { auditLogs } from "../../drizzle/schema";
import { router, makeSalaryWriteProcedure, makeAccProcedure } from "../_core/procedures";
import { auditEntityId, summarizeAuditInput } from "../_core/auditSummary";
import { makeCallerAs } from "./helpers/auth";
import { cleanupTables, getTestDb } from "./setup";

const testRouter = router({
  setAmount: makeSalaryWriteProcedure("/salary")
    .input(z.object({ id: z.number(), amount: z.number(), password: z.string().optional() }))
    .mutation(async ({ input }) => {
      if (input.amount < 0) throw new Error("negative");
      return { ok: true };
    }),
  readOnly: makeAccProcedure("/accounting").query(() => "x"),
});

async function auditRows() {
  const db = await getTestDb();
  return db.select().from(auditLogs).where(like(auditLogs.action, "WRITE:%"));
}

describe.sequential("write procedures leave an audit trail", () => {
  beforeEach(async () => {
    await cleanupTables(await getTestDb(), "auditLog");
  });
  afterEach(async () => {
    await cleanupTables(await getTestDb(), "auditLog");
  });

  it("records who, which procedure and a redacted copy of the input after a successful write", async () => {
    const caller = testRouter.createCaller(makeCallerAs("admin"));
    await caller.setAmount({ id: 42, amount: 1500, password: "hunter2" });
    const rows = await auditRows();
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      adminId: 123,
      action: "WRITE:salary:setAmount",
      entityType: "procedure",
      entityId: 42,
    });
    expect(String(rows[0].changes)).toContain("1500");
    expect(String(rows[0].changes)).not.toContain("hunter2");
    expect(String(rows[0].changes)).toContain("[redacted]");
  });

  it("does not record a write that failed", async () => {
    const caller = testRouter.createCaller(makeCallerAs("admin"));
    await expect(caller.setAmount({ id: 1, amount: -1 })).rejects.toThrow();
    expect(await auditRows()).toHaveLength(0);
  });

  it("does not record a write that was refused", async () => {
    const caller = testRouter.createCaller(makeCallerAs("worker"));
    await expect(caller.setAmount({ id: 1, amount: 5 })).rejects.toThrow();
    expect(await auditRows()).toHaveLength(0);
  });

  it("does not audit reads", async () => {
    const caller = testRouter.createCaller(makeCallerAs("admin"));
    await caller.readOnly();
    expect(await auditRows()).toHaveLength(0);
  });
});

describe("summarizeAuditInput", () => {
  it("redacts credentials and file contents at any depth", () => {
    const text = summarizeAuditInput({
      a: 1,
      nested: { apiToken: "t", fileDataBase64: "AAAA", ok: "yes" },
    });
    expect(text).toContain('"ok":"yes"');
    expect(text).not.toContain('"t"');
    expect(text).not.toContain("AAAA");
  });

  it("bounds long strings, long arrays and total size", () => {
    expect(summarizeAuditInput({ s: "x".repeat(5000) }).length).toBeLessThan(500);
    expect(summarizeAuditInput({ rows: Array.from({ length: 500 }, (_, i) => i) })).toContain("more");
    expect(summarizeAuditInput(Array.from({ length: 20 }, () => ({ k: "y".repeat(299) }))).length).toBeLessThanOrEqual(4001);
  });

  it("picks the first id-like field as the entity id", () => {
    expect(auditEntityId({ patientId: 9 })).toBe(9);
    expect(auditEntityId({ id: 3, patientId: 9 })).toBe(3);
    expect(auditEntityId({ name: "x" })).toBe(0);
    expect(auditEntityId(null)).toBe(0);
  });
});
