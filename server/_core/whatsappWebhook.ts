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
 *      update. We require WHATSAPP_APP_SECRET and verify the
 *      X-Hub-Signature-256 HMAC and commit inbound messages before ack 200.
 *      Storage failures return 503 so delivery can be retried. Automatic replies
 *      run after acknowledgment and remain best-effort.
 */

import type { Express, Request, Response } from "express";
import express from "express";
import { rateLimit } from "express-rate-limit";
import crypto from "crypto";
import { sql } from "drizzle-orm";
import type { MySql2Database } from "drizzle-orm/mysql2";
import { ENV } from "./env";
import { getDb } from "../db";
import { whatsappInboundMessages } from "../../drizzle/schema";
import { sendWhatsAppReply } from "../services/whatsappReply.service";
import { buildWhatsAppInboundAutoReply } from "../services/whatsappInboundAutoReply.service";
import {
  marketingPreferenceFromInbound,
  recordMarketingPreference,
} from "../services/whatsappMarketing.service";

const whatsappWebhookRateLimiter = rateLimit({
  windowMs: 60_000,
  limit: 600,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: { error: "Too many webhook requests" },
});

interface WhatsAppMessage {
  id: string;
  from: string;
  timestamp: string;
  type: string;
  text?: { body: string };
  interactive?: { button_reply?: { id?: string; title?: string } };
  [key: string]: unknown;
}

function verifySignature(rawBody: Buffer, signatureHeader: unknown): boolean {
  if (!ENV.whatsappAppSecret) return false;
  const signature = typeof signatureHeader === "string" ? signatureHeader : "";
  // Validate ASCII hex before timingSafeEqual, including its byte-length invariant.
  if (!/^sha256=[a-f0-9]{64}$/.test(signature)) return false;
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
      res.status(200).type("text/plain").send(String(challenge ?? ""));
      return;
    }
    // The verification token is a credential; never echo it into application logs.
    console.warn("[whatsapp-webhook] Verification failed", { mode });
    res.sendStatus(403);
  });

  app.post(
    "/webhook/whatsapp",
    whatsappWebhookRateLimiter,
    async (req: Request, res: Response) => {
    if (!ENV.whatsappAppSecret) {
      console.error("[whatsapp-webhook] WHATSAPP_APP_SECRET is not configured");
      res.sendStatus(503);
      return;
    }
    const rawBody: Buffer | undefined = (req as any).rawBody;
    if (
      !Buffer.isBuffer(rawBody) ||
      !verifySignature(rawBody, req.header("X-Hub-Signature-256"))
    ) {
      console.warn("[whatsapp-webhook] Signature verification failed");
      res.sendStatus(401);
      return;
    }

    let newMessages: WhatsAppMessage[];
    try {
      const messages = extractMessages(req.body);
      if (messages.length === 0) {
        res.sendStatus(200);
        return;
      }
      // A stable ID is required for safe redelivery; NULL bypasses the unique index.
      if (
        messages.some(
          (msg) =>
            !msg ||
            typeof msg.id !== "string" ||
            !msg.id.trim() ||
            msg.id.length > 128,
        )
      ) {
        res.sendStatus(400);
        return;
      }

      const db = await getDb();
      if (!db) {
        console.error(
          "[whatsapp-webhook] Database not available, retry required for",
          messages.length,
          "message(s)",
        );
        res.sendStatus(503);
        return;
      }

      // Commit the whole delivery before acknowledgment or any outbound side effect.
      newMessages = await db.transaction(
        async (tx: Pick<MySql2Database, "insert">) => {
          const insertedMessages: WhatsAppMessage[] = [];
          for (const msg of messages) {
            const insertResult = await tx
              .insert(whatsappInboundMessages)
              .values({
                waMessageId: msg.id ?? null,
                fromPhone: msg.from ?? null,
                messageType: msg.type ?? null,
                body:
                  msg.text?.body ??
                  msg.interactive?.button_reply?.title ??
                  null,
                rawPayload: JSON.stringify(msg),
              })
              .onDuplicateKeyUpdate({
                set: {
                  waMessageId: sql`${whatsappInboundMessages.waMessageId}`,
                },
              });

            const resultHeader = insertResult[0];
            const insertedNewMessage =
              Number(resultHeader?.affectedRows ?? 0) === 1 &&
              Number(resultHeader?.insertId ?? 0) > 0;

            if (insertedNewMessage) insertedMessages.push(msg);
          }
          return insertedMessages;
        },
      );
      res.sendStatus(200);
    } catch (err) {
      console.error(
        "[whatsapp-webhook] Failed to persist delivery; retry required:",
        err,
      );
      res.sendStatus(503);
      return;
    }

    // Reply failures must not turn a committed delivery into a failed acknowledgment.
    for (const msg of newMessages) {
      if (msg.from) {
        try {
          const preference = marketingPreferenceFromInbound({
            text: msg.text?.body ?? msg.interactive?.button_reply?.title,
            buttonId: msg.interactive?.button_reply?.id,
          });
          if (preference) {
            await recordMarketingPreference(msg.from, preference);
            await sendWhatsAppReply({
              recipientPhone: msg.from,
              message:
                preference === "subscribed"
                  ? "تم اشتراكك في عروض المركز. يمكنك إيقافها في أي وقت بكتابة إلغاء."
                  : "تم إيقاف رسائل العروض. لن تصلك عروض أخرى من المركز.",
              replyToMessageId: msg.id,
            });
            continue;
          }
          await sendWhatsAppReply({
            recipientPhone: msg.from,
            message: buildWhatsAppInboundAutoReply(),
            replyToMessageId: msg.id,
          });
        } catch (replyError) {
          console.error(
            "[whatsapp-webhook] Failed to send automatic reply:",
            replyError,
          );
        }
      }
    }
    },
  );
}
