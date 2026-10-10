import { describe, expect, it, vi } from "vitest";
vi.mock("../db", () => ({ getDb: vi.fn() }));
vi.mock("../_core/env", () => ({ ENV: {
  whatsappMarketingTemplate: "selrs_whats",
  whatsappMarketingOptInTemplate: "selrs_whats",
} }));
import { getDb } from "../db";
import { MySqlDialect } from "drizzle-orm/mysql-core";
import type { SQL } from "drizzle-orm";
import { marketingPreferenceFromInbound, sendMarketingBatch } from "../services/whatsappMarketing.service";

describe("WhatsApp marketing preference replies", () => {
  it.each([
    [{ buttonId: "marketing_continue" }, "subscribed"],
    [{ buttonId: "marketing_stop" }, "unsubscribed"],
    [{ text: "استمرار" }, "subscribed"],
    [{ text: "عروض" }, "subscribed"],
    [{ text: "إلغاء" }, "unsubscribed"],
    [{ text: "استقبال العروض" }, "subscribed"],
    [{ buttonId: "استقبال العروض" }, "subscribed"],
    [{ text: "إيقاف الرسائل" }, "unsubscribed"],
    [{ buttonId: "إيقاف الرسائل" }, "unsubscribed"],
    [{ text: "ايقاف الرسائل" }, "unsubscribed"],
  ] as const)("records %s as %s", (input, expected) => {
    expect(marketingPreferenceFromInbound(input)).toBe(expected);
  });

  it("ignores an unrelated inbound message", () => {
    expect(marketingPreferenceFromInbound({ text: "متى موعدي؟" })).toBeNull();
  });
});

describe("WhatsApp marketing opt-out enforcement", () => {
  it.each(["opt_in", "promotion"] as const)("restricts %s to center patients and rechecks before sending", async (kind) => {
    const values = vi.fn().mockResolvedValue([{ insertId: 1 }]);
    const limit = vi.fn().mockResolvedValueOnce([{ id: 12, phone: "01000000000" }])
      .mockResolvedValueOnce([]);
    const where = vi.fn((_condition: SQL) => ({ limit }));
    const chain = {
      innerJoin: vi.fn(() => ({ where })), leftJoin: vi.fn(() => ({ where })), where,
    };
    vi.mocked(getDb).mockResolvedValue({
      insert: () => ({ values }), select: () => ({ from: () => chain }),
      update: () => ({ set: () => ({ where: vi.fn().mockResolvedValue([]) }) }),
    });
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    try {
      const outcome = await sendMarketingBatch({ kind, name: "test", createdBy: 1, limit: 1 });
      expect(outcome).toMatchObject({ accepted: 0, failed: 1 });
      expect(fetchSpy).not.toHaveBeenCalled();
      const dialect = new MySqlDialect();
      for (const [condition] of chain.where.mock.calls) {
        expect(dialect.sqlToQuery(condition).params).toContain("center");
      }
      expect(chain.where).toHaveBeenCalledTimes(2);
    } finally { fetchSpy.mockRestore(); }
  });
  it.each(["opt_in", "promotion"] as const)("blocks %s even for a test recipient who opted out", async (kind) => {
    const values = vi.fn().mockResolvedValue([{ insertId: 1 }]);
    const selectLimit = vi.fn().mockResolvedValue([{ status: "unsubscribed" }]);
    const updateWhere = vi.fn().mockResolvedValue([{ affectedRows: 1 }]);
    vi.mocked(getDb).mockResolvedValue({
      insert: () => ({ values }),
      select: () => ({ from: () => ({ where: () => ({ limit: selectLimit }) }) }),
      update: () => ({ set: () => ({ where: updateWhere }) }),
    });
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    try {
      const outcome = await sendMarketingBatch({ kind, name: "test", createdBy: 1,
        limit: 1, testPhone: "01000000000" });
      expect(fetchSpy).not.toHaveBeenCalled();
      expect(outcome).toMatchObject({ accepted: 0, failed: 1 });
      expect(values).toHaveBeenCalledWith(expect.objectContaining({
        status: "failed", errorMessage: "تم منع الإرسال لأن العميل أوقف رسائل العروض",
      }));
    } finally { fetchSpy.mockRestore(); }
  });
});
