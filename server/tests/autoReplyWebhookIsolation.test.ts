import { beforeEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";

const mocks = vi.hoisted(() => ({
  enqueue: vi.fn(),
  ingest: vi.fn(),
}));
vi.mock("../services/whatsappConfirmations", () => ({
  ingestConfirmationReceipts: vi.fn(),
}));
vi.mock("../services/auto-reply/coexistence-sync", () => ({
  enqueueCoexistenceChanges: mocks.enqueue,
}));
vi.mock("../services/auto-reply/events", () => ({
  parseMetaEvents: () => [{ key: "k" }],
  parseDeliveryReceipts: () => [],
}));
vi.mock("../services/auto-reply/store", () => ({
  ingestEvents: mocks.ingest,
  recordDeliveryReceipts: vi.fn(),
}));
import { ingestAutoReplyPayload } from "../_core/autoReplyWebhook";

describe("auto-reply webhook ingestion", () => {
  beforeEach(() => vi.clearAllMocks());
  it("still stores customer messages when a sync chunk has an unexpected shape", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    mocks.enqueue.mockImplementation(async () => {
      z.object({ history: z.array(z.string()) }).parse({ history: "secret" });
    });
    await expect(ingestAutoReplyPayload({})).resolves.toEqual({
      parsedEvents: 1,
      deliveryReceipts: 0,
    });
    expect(mocks.ingest).toHaveBeenCalledOnce();
    // The log names the field and the issue, never the value.
    expect(warn).toHaveBeenCalledWith(
      "[auto-reply] COEXISTENCE_INVALID_SCHEMA",
      "history:invalid_type",
    );
    warn.mockRestore();
  });
  it("still fails the delivery when sync storage is unavailable", async () => {
    mocks.enqueue.mockRejectedValue(new Error("db down"));
    await expect(ingestAutoReplyPayload({})).rejects.toThrow("db down");
    expect(mocks.ingest).not.toHaveBeenCalled();
  });
});
