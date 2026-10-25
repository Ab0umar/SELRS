import express, { type Express } from "express";
import {ingestConfirmationReceipts} from "../services/whatsappConfirmations";
import { enqueueCoexistenceChanges } from "../services/auto-reply/coexistence-sync";
import { rateLimit } from "express-rate-limit";
import { z, ZodError } from "zod";
import { verifyMetaSignature } from "../services/auto-reply/policy";
import {
  parseMetaEvents,
  parseDeliveryReceipts,
} from "../services/auto-reply/events";
import {
  ingestEvents,
  recordDeliveryReceipts,
} from "../services/auto-reply/store";

export async function ingestAutoReplyPayload(body: unknown) {
  await ingestConfirmationReceipts(body);
  await enqueueCoexistenceChanges(body);
  const events = parseMetaEvents(body);
  const receipts = parseDeliveryReceipts(body);
  await ingestEvents(events);
  await recordDeliveryReceipts(receipts);
  return { parsedEvents: events.length, deliveryReceipts: receipts.length };
}
const diagnosticEnvelope = z.object({
  object: z.enum(["page", "whatsapp_business_account", "other"]).catch("other"),
  entry: z
    .array(
      z.object({
        changes: z.array(z.object({ field: z.string() })).optional(),
      }),
    )
    .default([]),
});
function logWebhookDiagnostic(
  outcome:
    | "accepted"
    | "invalid_signature"
    | "invalid_json"
    | "invalid_schema"
    | "missing_secret"
    | "storage_unavailable",
  payload?: unknown,
  counts?: { parsedEvents: number; deliveryReceipts: number },
) {
  if (process.env.AUTO_REPLY_WEBHOOK_DIAGNOSTICS !== "true") return;
  const metadata = diagnosticEnvelope.safeParse(payload);
  console.info(
    "[auto-reply-webhook-diagnostic]",
    JSON.stringify({
      at: new Date().toISOString(),
      outcome,
      object: metadata.success ? metadata.data.object : "unknown",
      feedChanges: metadata.success
        ? metadata.data.entry.reduce(
            (sum, entry) =>
              sum +
              (entry.changes?.filter((change) => change.field === "feed")
                .length ?? 0),
            0,
          )
        : 0,
      ...counts,
    }),
  );
}
export function registerAutoReplyWebhook(app: Express) {
  const route = "/webhook/auto-reply/meta";
  app.get(route, (req, res) => {
    const verifyToken = process.env.AUTO_REPLY_VERIFY_TOKEN;
    if (!verifyToken) {
      res.sendStatus(503);
      return;
    }
    if (
      req.query["hub.mode"] !== "subscribe" ||
      req.query["hub.verify_token"] !== verifyToken
    ) {
      res.sendStatus(403);
      return;
    }
    const challenge = req.query["hub.challenge"];
    if (typeof challenge !== "string" || !/^[\w.~:-]{1,256}$/.test(challenge)) {
      res.sendStatus(400);
      return;
    }
    res.type("text/plain").send(Buffer.from(challenge));
  });
  app.post(
    route,
    rateLimit({
      windowMs: 60_000,
      limit: 600,
      standardHeaders: "draft-7",
      legacyHeaders: false,
    }),
    express.raw({ type: "application/json", limit: "2mb" }),
    async (req, res) => {
      const secret = process.env.AUTO_REPLY_META_APP_SECRET;
      if (!secret) {
        logWebhookDiagnostic("missing_secret");
        res.sendStatus(503);
        return;
      }
      if (
        !Buffer.isBuffer(req.body) ||
        !verifyMetaSignature(
          req.body,
          req.header("X-Hub-Signature-256"),
          secret,
        )
      ) {
        logWebhookDiagnostic("invalid_signature");
        res.sendStatus(401);
        return;
      }
      let payload: unknown;
      try {
        payload = JSON.parse(req.body.toString("utf8"));
      } catch {
        logWebhookDiagnostic("invalid_json");
        res.sendStatus(400);
        return;
      }
      try {
        const counts = await ingestAutoReplyPayload(payload);
        logWebhookDiagnostic("accepted", payload, counts);
        res.sendStatus(200);
      } catch (error) {
        if (error instanceof ZodError) {
          logWebhookDiagnostic("invalid_schema", payload);
          res.sendStatus(400);
          return;
        }
        console.error("[auto-reply] WEBHOOK_STORAGE_UNAVAILABLE");
        logWebhookDiagnostic("storage_unavailable", payload);
        res.sendStatus(503);
      }
    },
  );
}
