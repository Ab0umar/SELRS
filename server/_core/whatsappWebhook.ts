/**
 * WhatsApp Cloud API webhook — receives inbound message/status updates.
 *
 * Setup in Meta for Developers (WhatsApp > Configuration):
 *   Callback URL: https://<domain>/webhook/whatsapp
 *   Verify token: must match WHATSAPP_WEBHOOK_VERIFY_TOKEN
 *
 * Protocol:
 *   1. GET  /webhook/whatsapp — handshake. Echoes hub.challenge back if
 *      hub.verify_token matches our configured token.
 *   2. POST /webhook/whatsapp — Meta pushes message/status JSON here on every
 *      update. We verify the X-Hub-Signature-256 HMAC (when WHATSAPP_APP_SECRET
 *      is set), store inbound messages, and always ack 200 quickly — Meta
 *      disables the webhook after repeated non-2xx/slow responses, so we
 *      never let downstream failures block the response.
 */

import type { Express, Request, Response } from "express";
import express from "express";
import crypto from "crypto";
import { ENV } from "./env";
import { getDb } from "../db";
import { whatsappInboundMessages } from "../../drizzle/schema";

interface WhatsAppMessage {
  id: string;
  from: string;
  timestamp: string;
  type: string;
  text?: { body: string };
  [key: string]: unknown;
}

function verifySignature(rawBody: Buffer, signatureHeader: unknown): boolean {
  if (!ENV.whatsappAppSecret) return true; // no secret configured — skip check
  const signature = typeof signatureHeader === "string" ? signatureHeader : "";
  const expected =
    "sha256=" +
    crypto
      .createHmac("sha256", ENV.whatsappAppSecret)
      .update(rawBody)
      .digest("hex");
  if (signature.length !== expected.length) return false;
  return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
}

function extractMessages(body: any): WhatsAppMessage[] {
  const messages: WhatsAppMessage[] = [];
  const entries = Array.isArray(body?.entry) ? body.entry : [];
  for (const entry of entries) {
    const changes = Array.isArray(entry?.changes) ? entry.changes : [];
    for (const change of changes) {
      const msgs = change?.value?.messages;
      if (Array.isArray(msgs)) messages.push(...msgs);
    }
  }
  return messages;
}

export function registerWhatsAppWebhook(app: Express) {
  app.use(
    "/webhook/whatsapp",
    express.json({
      limit: "5mb",
      verify: (req, _res, buf) => {
        (req as any).rawBody = buf;
      },
    }),
  );

  app.get("/webhook/whatsapp", (req: Request, res: Response) => {
    const mode = req.query["hub.mode"];
    const token = req.query["hub.verify_token"];
    const challenge = req.query["hub.challenge"];

    if (
      mode === "subscribe" &&
      ENV.whatsappWebhookVerifyToken &&
      token === ENV.whatsappWebhookVerifyToken
    ) {
      res.status(200).send(String(challenge ?? ""));
      return;
    }
    console.warn("[whatsapp-webhook] Verification failed", { mode, token });
    res.sendStatus(403);
  });

  app.post("/webhook/whatsapp", async (req: Request, res: Response) => {
    const rawBody: Buffer | undefined = (req as any).rawBody;
    if (rawBody && !verifySignature(rawBody, req.header("X-Hub-Signature-256"))) {
      console.warn("[whatsapp-webhook] Signature verification failed");
      res.sendStatus(401);
      return;
    }

    // Ack immediately — Meta expects a fast 2xx and will retry/disable the
    // webhook on timeouts or errors, so DB work must never block the response.
    res.sendStatus(200);

    try {
      const messages = extractMessages(req.body);
      if (messages.length === 0) return;

      const db = await getDb();
      if (!db) {
        console.error("[whatsapp-webhook] Database not available, dropping", messages.length, "message(s)");
        return;
      }

      for (const msg of messages) {
        await db
          .insert(whatsappInboundMessages)
          .values({
            waMessageId: msg.id ?? null,
            fromPhone: msg.from ?? null,
            messageType: msg.type ?? null,
            body: msg.text?.body ?? null,
            rawPayload: JSON.stringify(msg),
          })
          .onDuplicateKeyUpdate({ set: { waMessageId: whatsappInboundMessages.waMessageId } });
      }
      console.log(`[whatsapp-webhook] Stored ${messages.length} inbound message(s)`);
    } catch (err) {
      console.error("[whatsapp-webhook] Failed to process payload:", err);
    }
  });
}
