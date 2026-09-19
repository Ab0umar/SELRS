import { createHmac } from "node:crypto";
import type { Server } from "node:http";
import type { AddressInfo } from "node:net";
import express from "express";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../_core/env", () => ({
  ENV: {
    whatsappAppSecret: "test-webhook-secret",
    whatsappWebhookVerifyToken: "test-verify-token",
  },
}));
vi.mock("../db", () => ({ getDb: vi.fn() }));
vi.mock("../services/whatsappReply.service", () => ({
  sendWhatsAppReply: vi.fn(),
}));
vi.mock("../services/whatsappInboundAutoReply.service", () => ({
  buildWhatsAppInboundAutoReply: vi.fn(),
}));

import { ENV } from "../_core/env";
import { getDb } from "../db";
import { registerWhatsAppWebhook } from "../_core/whatsappWebhook";
import { sendWhatsAppReply } from "../services/whatsappReply.service";

describe("WhatsApp webhook authentication", () => {
  let server: Server;
  let url: string;
  const body = JSON.stringify({ entry: [] });
  const signature = (payload: string) =>
    `sha256=${createHmac("sha256", "test-webhook-secret").update(payload).digest("hex")}`;

  beforeEach(async () => {
    vi.resetAllMocks();
    ENV.whatsappAppSecret = "test-webhook-secret";
    vi.spyOn(console, "warn").mockImplementation(() => {});
    vi.spyOn(console, "error").mockImplementation(() => {});
    const app = express();
    registerWhatsAppWebhook(app);
    server = await new Promise<Server>((resolve) => {
      const listener = app.listen(0, "127.0.0.1", () => resolve(listener));
    });
    url = `http://127.0.0.1:${(server.address() as AddressInfo).port}/webhook/whatsapp`;
  });

  afterEach(async () => {
    await new Promise<void>((resolve, reject) => {
      server.close((error) => (error ? reject(error) : resolve()));
      server.closeAllConnections();
    });
    vi.restoreAllMocks();
  });

  it("accepts a valid signature over the exact JSON bytes", async () => {
    const response = await fetch(url, {
      method: "POST",
      body,
      headers: {
        "Content-Type": "application/json",
        "X-Hub-Signature-256": signature(body),
      },
    });
    expect(response.status).toBe(200);
  });

  it.each([
    undefined,
    "sha256=invalid",
    `sha256=${"0".repeat(64)}`,
    `sha256=${"é".repeat(64)}`,
  ])(
    "rejects missing, malformed, or incorrect signatures (%s)",
    async (header) => {
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };
      if (header !== undefined) headers["X-Hub-Signature-256"] = header;
      const response = await fetch(url, { method: "POST", body, headers });
      expect(response.status).toBe(401);
      expect(getDb).not.toHaveBeenCalled();
    },
  );

  it("rejects a modified payload even with a previously valid signature", async () => {
    const response = await fetch(url, {
      method: "POST",
      body: `${body} `,
      headers: {
        "Content-Type": "application/json",
        "X-Hub-Signature-256": signature(body),
      },
    });
    expect(response.status).toBe(401);
    expect(getDb).not.toHaveBeenCalled();
  });

  it("rejects requests whose raw body was not captured", async () => {
    const response = await fetch(url, {
      method: "POST",
      body,
      headers: {
        "Content-Type": "text/plain",
        "X-Hub-Signature-256": signature(body),
      },
    });
    expect(response.status).toBe(401);
    expect(getDb).not.toHaveBeenCalled();
  });

  it("disables delivery when the app secret is missing", async () => {
    ENV.whatsappAppSecret = "";
    const response = await fetch(url, {
      method: "POST",
      body,
      headers: {
        "Content-Type": "application/json",
        "X-Hub-Signature-256": signature(body),
      },
    });
    expect(response.status).toBe(503);
    expect(getDb).not.toHaveBeenCalled();
  });

  it("preserves verification-token handshake and rejects incorrect tokens", async () => {
    const query = "?hub.mode=subscribe&hub.challenge=123&hub.verify_token=";
    const accepted = await fetch(`${url}${query}test-verify-token`);
    expect(accepted.status).toBe(200);
    expect(accepted.headers.get("content-type")).toContain("text/plain");
    expect(await accepted.text()).toBe("123");
    const rejected = await fetch(`${url}${query}wrong-token`);
    expect(rejected.status).toBe(403);
  });

  function deliver(ids = ["wamid.test-1"]) {
    const payload = JSON.stringify({
      entry: [
        {
          changes: [
            {
              value: {
                messages: ids.map((id) => ({
                  id,
                  from: "201000000000",
                  type: "text",
                  text: { body: "Hello" },
                })),
              },
            },
          ],
        },
      ],
    });
    return fetch(url, {
      method: "POST",
      body: payload,
      headers: {
        "Content-Type": "application/json",
        "X-Hub-Signature-256": signature(payload),
      },
    });
  }

  function mockStorage() {
    const upsert = vi
      .fn()
      .mockResolvedValue([{ affectedRows: 1, insertId: 1 }]);
    const values = vi.fn(() => ({ onDuplicateKeyUpdate: upsert }));
    const tx = { insert: vi.fn(() => ({ values })) };
    const transaction = vi.fn(
      async (work: (connection: typeof tx) => Promise<unknown>) => work(tx),
    );
    vi.mocked(getDb).mockResolvedValue({ transaction });
    return { upsert, values, tx, transaction };
  }

  it("returns 503 without replying when the database is unavailable", async () => {
    vi.mocked(getDb).mockResolvedValue(null);
    expect((await deliver()).status).toBe(503);
    expect(sendWhatsAppReply).not.toHaveBeenCalled();
  });

  it("returns 503 if connection acquisition fails", async () => {
    vi.mocked(getDb).mockRejectedValue(new Error("connection failed"));
    expect((await deliver()).status).toBe(503);
    expect(sendWhatsAppReply).not.toHaveBeenCalled();
  });

  it("does not acknowledge or reply until the transaction commits", async () => {
    const { transaction } = mockStorage();
    let releaseCommit!: () => void;
    const commit = new Promise<void>((resolve) => {
      releaseCommit = resolve;
    });
    const work = transaction.getMockImplementation()!;
    transaction.mockImplementation(async (callback) => {
      const result = await work(callback);
      await commit;
      return result;
    });
    let acknowledged = false;
    const pending = deliver().then((response) => {
      acknowledged = true;
      return response;
    });
    try {
      await vi.waitFor(() => expect(transaction).toHaveBeenCalledOnce());
      expect(acknowledged).toBe(false);
      expect(sendWhatsAppReply).not.toHaveBeenCalled();
    } finally {
      releaseCommit();
    }
    expect((await pending).status).toBe(200);
    await vi.waitFor(() => expect(sendWhatsAppReply).toHaveBeenCalledOnce());
  });

  it("returns 503 on a later insert failure without sending replies for the batch", async () => {
    const { upsert, transaction } = mockStorage();
    upsert
      .mockResolvedValueOnce([{ affectedRows: 1, insertId: 1 }])
      .mockRejectedValueOnce(new Error("second insert failed"));
    expect((await deliver(["wamid.1", "wamid.2"])).status).toBe(503);
    expect(transaction).toHaveBeenCalledOnce();
    expect(sendWhatsAppReply).not.toHaveBeenCalled();
  });

  it("returns 503 when commit fails and does not send replies", async () => {
    const { transaction } = mockStorage();
    const work = transaction.getMockImplementation()!;
    transaction.mockImplementation(async (callback) => {
      await work(callback);
      throw new Error("commit failed");
    });
    expect((await deliver()).status).toBe(503);
    expect(sendWhatsAppReply).not.toHaveBeenCalled();
  });

  it.each([0, 1, 2])(
    "acknowledges duplicate deliveries without a second reply (affectedRows=%s)",
    async (affectedRows) => {
      const { upsert } = mockStorage();
      upsert.mockResolvedValue([{ affectedRows, insertId: 0 }]);
      expect((await deliver()).status).toBe(200);
      expect(sendWhatsAppReply).not.toHaveBeenCalled();
    },
  );

  it("keeps the acknowledgment successful when an automatic reply fails", async () => {
    mockStorage();
    vi.mocked(sendWhatsAppReply).mockRejectedValue(
      new Error("outbound unavailable"),
    );
    expect((await deliver()).status).toBe(200);
    await vi.waitFor(() => expect(sendWhatsAppReply).toHaveBeenCalledOnce());
  });

  it("rejects a missing message ID instead of storing an undeduplicatable row", async () => {
    expect((await deliver([""])).status).toBe(400);
    expect(getDb).not.toHaveBeenCalled();
  });
});
