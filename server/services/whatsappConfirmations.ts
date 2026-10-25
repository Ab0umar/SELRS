import { createHash, randomUUID } from "node:crypto";
import { z } from "zod";
import type {
  PoolConnection,
  RowDataPacket,
  ResultSetHeader,
} from "mysql2/promise";
import { ENV } from "../_core/env";
import { getDbConnection } from "../db";
import {
  confirmationListInput,
  confirmationKinds,
  confirmationStates,
} from "../../shared/whatsapp-confirmations";

type Kind = (typeof confirmationKinds)[number];
type Receipt = {
  id: string;
  sender: string;
  recipient: string | null;
  messageId: string;
  state: "sent" | "delivered" | "read" | "failed";
  at: number;
  errorCode: string | null;
  errorDetails: string | null;
};
const priority: Record<string, number> = {
  sending: 0,
  unknown: 0,
  skipped: 0,
  accepted: 1,
  held: 1,
  sent: 2,
  failed: 3,
  delivered: 4,
  read: 5,
};
function safeDetails(value: unknown) {
  return typeof value === "string"
    ? value
        .replace(/EAA[A-Za-z0-9_-]+/g, "[redacted]")
        .replace(/\+?\d{7,}/g, "[number]")
        .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, "[email]")
        .slice(0, 1000)
    : null;
}
function errorMetadata(raw: unknown) {
  const parsed = z
    .object({
      code: z.number().optional(),
      message: z.string().optional(),
      error_data: z.object({ details: z.string().optional() }).optional(),
    })
    .safeParse(raw);
  return {
    errorCode:
      parsed.success && parsed.data.code !== undefined
        ? String(parsed.data.code)
        : null,
    errorDetails: parsed.success
      ? safeDetails(parsed.data.error_data?.details || parsed.data.message)
      : null,
  };
}
export function confirmationPhone(raw: string | null | undefined) {
  const digits = String(raw ?? "").replace(/\D/g, "");
  return /^01\d{9}$/.test(digits)
    ? `2${digits}`
    : /^201\d{9}$/.test(digits)
      ? digits
      : null;
}

export function parseConfirmationReceipts(body: unknown): Receipt[] {
  const envelope = z
    .object({
      object: z.literal("whatsapp_business_account"),
      entry: z.array(
        z.object({
          changes: z
            .array(z.object({ field: z.string(), value: z.unknown() }))
            .optional(),
        }),
      ),
    })
    .safeParse(body);
  if (!envelope.success || !ENV.whatsappPhoneNumberId) return [];
  const result: Receipt[] = [];
  for (const entry of envelope.data.entry)
    for (const change of entry.changes ?? []) {
      if (change.field !== "messages") continue;
      const value = z
        .object({
          metadata: z.object({ phone_number_id: z.string() }),
          statuses: z.array(z.unknown()).optional(),
        })
        .safeParse(change.value);
      if (
        !value.success ||
        value.data.metadata.phone_number_id !== ENV.whatsappPhoneNumberId
      )
        continue;
      for (const raw of value.data.statuses ?? []) {
        const status = z
          .object({
            id: z.string().min(1).max(255),
            status: z.enum(["sent", "delivered", "read", "failed"]),
            timestamp: z.string().regex(/^\d{1,12}$/),
            recipient_id: z.string().max(32).optional(),
            errors: z.array(z.unknown()).optional(),
          })
          .safeParse(raw);
        if (!status.success) continue;
        const s = status.data;
        const at = Number(s.timestamp) * 1000;
        if (!Number.isFinite(at) || at > 8640000000000000) continue;
        result.push({
          id: createHash("sha256")
            .update(
              `${ENV.whatsappPhoneNumberId}:${s.id}:${s.status}:${s.timestamp}`,
            )
            .digest("hex"),
          sender: ENV.whatsappPhoneNumberId,
          recipient: s.recipient_id?.replace(/\D/g, "") || null,
          messageId: s.id,
          state: s.status,
          at,
          ...errorMetadata(s.errors?.[0]),
        });
      }
    }
  return result.sort(
    (a, b) =>
      a.messageId.localeCompare(b.messageId) || a.id.localeCompare(b.id),
  );
}
async function applyReceipt(connection: PoolConnection, receipt: Receipt) {
  const [rows] = await connection.execute<RowDataPacket[]>(
    "SELECT id,state,event_ms FROM whatsapp_confirmation_attempts WHERE sender_phone_id=? AND provider_message_id=? FOR UPDATE",
    [receipt.sender, receipt.messageId],
  );
  const current = rows[0];
  if (!current) return;
  if (
    priority[receipt.state] < priority[current.state] ||
    (priority[receipt.state] === priority[current.state] &&
      receipt.at < Number(current.event_ms ?? 0))
  )
    return;
  await connection.execute(
    "UPDATE whatsapp_confirmation_attempts SET state=?,event_ms=?,error_code=?,error_details=? WHERE id=?",
    [
      receipt.state,
      receipt.at,
      receipt.state === "failed" ? receipt.errorCode : null,
      receipt.state === "failed" ? receipt.errorDetails : null,
      current.id,
    ],
  );
}
export async function ingestConfirmationReceipts(body: unknown) {
  const receipts = parseConfirmationReceipts(body);
  if (!receipts.length) return 0;
  const connection = await getDbConnection();
  try {
    await connection.beginTransaction();
    for (const r of receipts) {
      await connection.execute(
        "INSERT IGNORE INTO whatsapp_confirmation_receipts (id,sender_phone_id,recipient_phone,provider_message_id,state,event_ms,error_code,error_details) VALUES (?,?,?,?,?,?,?,?)",
        [
          r.id,
          r.sender,
          r.recipient,
          r.messageId,
          r.state,
          r.at,
          r.errorCode,
          r.errorDetails,
        ],
      );
      await applyReceipt(connection, r);
    }
    await connection.commit();
    return receipts.length;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}
async function recordAccepted(
  id: string,
  messageId: string,
  state: "accepted" | "held",
) {
  const connection = await getDbConnection();
  try {
    await connection.beginTransaction();
    await connection.execute(
      "UPDATE whatsapp_confirmation_attempts SET provider_message_id=?,state=CASE WHEN state='sending' THEN ? ELSE state END WHERE id=?",
      [messageId, state, id],
    );
    const [rows] = await connection.execute<RowDataPacket[]>(
      "SELECT r.* FROM whatsapp_confirmation_receipts r JOIN whatsapp_confirmation_attempts a ON a.provider_message_id=r.provider_message_id AND a.sender_phone_id=r.sender_phone_id WHERE a.id=? ORDER BY r.event_ms,r.id",
      [id],
    );
    for (const row of rows)
      await applyReceipt(connection, {
        id: row.id,
        sender: row.sender_phone_id,
        recipient: row.recipient_phone,
        messageId: row.provider_message_id,
        state: row.state,
        at: Number(row.event_ms),
        errorCode: row.error_code,
        errorDetails: row.error_details,
      });
    await connection.commit();
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}
async function updateAttempt(
  id: string,
  state: string,
  errorCode: string,
  errorDetails: string | null,
) {
  const connection = await getDbConnection();
  try {
    await connection.execute(
      "UPDATE whatsapp_confirmation_attempts SET state=?,error_code=?,error_details=? WHERE id=? AND state='sending'",
      [state, errorCode, errorDetails, id],
    );
  } finally {
    connection.release();
  }
}

export async function sendWhatsAppConfirmation(input: {
  kind: Kind;
  recipientPhone: string | null | undefined;
  patientName: string | null | undefined;
  templateName: string;
  buildTemplate: () => Record<string, unknown>;
  requestKey?: string;
}): Promise<void> {
  const id = randomUUID(),
    recipient = confirmationPhone(input.recipientPhone);
  const configured = Boolean(
    ENV.whatsappAccessToken && ENV.whatsappPhoneNumberId && input.templateName,
  );
  const skipped = !configured
    ? "configuration_missing"
    : !recipient
      ? "invalid_phone"
      : null;
  const connection = await getDbConnection();
  try {
    const [inserted] = await connection.execute<ResultSetHeader>(
      "INSERT IGNORE INTO whatsapp_confirmation_attempts (id,request_key,kind,sender_phone_id,recipient_phone,patient_name,template_name,language,state,error_code) VALUES (?,?,?,?,?,?,?,?,?,?)",
      [
        id,
        input.requestKey
          ? createHash("sha256").update(input.requestKey).digest("hex")
          : null,
        input.kind,
        ENV.whatsappPhoneNumberId || "",
        recipient,
        input.patientName?.trim().slice(0, 255) || null,
        input.templateName || "",
        ENV.whatsappTemplateLanguage,
        skipped ? "skipped" : "sending",
        skipped,
      ],
    );
    if (!inserted.affectedRows) return;
  } finally {
    connection.release();
  }
  if (skipped) return;
  let requested = false,
    confirmed = false,
    recorded = false;
  try {
    const template = input.buildTemplate();
    requested = true;
    const response = await fetch(
      `https://graph.facebook.com/${ENV.whatsappApiVersion}/${ENV.whatsappPhoneNumberId}/messages`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${ENV.whatsappAccessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messaging_product: "whatsapp",
          to: recipient,
          type: "template",
          template,
        }),
        signal: AbortSignal.timeout(15000),
      },
    );
    const raw: unknown = await response.json().catch(() => null);
    const data = z
      .object({
        messages: z
          .array(
            z.object({
              id: z.string().min(1).max(255),
              message_status: z.string().optional(),
            }),
          )
          .optional(),
        error: z.unknown().optional(),
      })
      .safeParse(raw);
    if (!response.ok) {
      confirmed = true;
      const error = errorMetadata(data.success ? data.data.error : undefined);
      await updateAttempt(
        id,
        response.status >= 500 ? "unknown" : "failed",
        error.errorCode || `http_${response.status}`,
        error.errorDetails,
      );
      throw new Error(
        `WhatsApp confirmation rejected (${error.errorCode || response.status}); inspect the confirmation log.`,
      );
    }
    const message = data.success ? data.data.messages?.[0] : undefined;
    if (!message) throw new Error("Provider acceptance unconfirmed");
    confirmed = true;
    await recordAccepted(
      id,
      message.id,
      message.message_status === "held_for_quality_assessment"
        ? "held"
        : "accepted",
    );
    recorded = true;
    console.info(`[whatsapp-confirmations] Meta accepted attempt ${id}`);
  } catch (error) {
    if (!recorded)
      await updateAttempt(
        id,
        requested ? "unknown" : "failed",
        confirmed
          ? "acceptance_log_uncertain"
          : requested
            ? "provider_outcome_unknown"
            : "invalid_template_payload",
        null,
      );
    if (
      error instanceof Error &&
      error.message.startsWith("WhatsApp confirmation rejected")
    )
      throw error;
    throw new Error(
      "تعذر تأكيد نتيجة رسالة التأكيد؛ راجع سجل الرسائل قبل إعادة المحاولة.",
    );
  }
}

const attemptRow = z.object({
  id: z.string().uuid(),
  kind: z.enum(confirmationKinds),
  recipient_phone: z.string().nullable(),
  patient_name: z.string().nullable(),
  template_name: z.string(),
  language: z.string(),
  state: z.enum(confirmationStates),
  provider_message_id: z.string().nullable(),
  error_code: z.string().nullable(),
  error_details: z.string().nullable(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date(),
});
const receiptRow = z.object({
  provider_message_id: z.string(),
  recipient_phone: z.string().nullable(),
  state: z.enum(["sent", "delivered", "read", "failed"]),
  error_code: z.string().nullable(),
  error_details: z.string().nullable(),
  received_at: z.coerce.date(),
});
export async function listWhatsAppConfirmations(raw: unknown) {
  const input = confirmationListInput.parse(raw);
  const where: string[] = [],
    params: unknown[] = [];
  if (input.kind) {
    where.push("kind=?");
    params.push(input.kind);
  }
  const effectiveState =
    "CASE WHEN state='sending' AND created_at < DATE_SUB(CURRENT_TIMESTAMP,INTERVAL 2 MINUTE) THEN 'unknown' ELSE state END";
  if (input.state) {
    where.push(`(${effectiveState})=?`);
    params.push(input.state);
  }
  if (input.search) {
    where.push("(patient_name LIKE ? OR recipient_phone LIKE ?)");
    params.push(
      `%${input.search}%`,
      `%${input.search.replace(/[^\d+]/g, "") || input.search}%`,
    );
  }
  const clause = where.length ? ` WHERE ${where.join(" AND ")}` : "";
  const connection = await getDbConnection();
  try {
    const [rows] = await connection.query<RowDataPacket[]>(
      `SELECT id,kind,recipient_phone,patient_name,template_name,language,provider_message_id,error_code,error_details,created_at,updated_at,${effectiveState} AS state FROM whatsapp_confirmation_attempts${clause} ORDER BY created_at DESC,id DESC LIMIT 25 OFFSET ?`,
      [...params, (input.page - 1) * 25],
    );
    const [counts] = await connection.query<RowDataPacket[]>(
      `SELECT ${effectiveState} AS state,COUNT(*) AS total FROM whatsapp_confirmation_attempts${clause} GROUP BY ${effectiveState}`,
      params,
    );
    const [orphans] = await connection.query<RowDataPacket[]>(
      "SELECT r.provider_message_id,r.recipient_phone,r.state,r.error_code,r.error_details,r.received_at FROM whatsapp_confirmation_receipts r LEFT JOIN whatsapp_confirmation_attempts a ON a.sender_phone_id=r.sender_phone_id AND a.provider_message_id=r.provider_message_id WHERE a.id IS NULL ORDER BY r.received_at DESC LIMIT 20",
    );
    return {
      rows: attemptRow.array().parse(rows),
      total: counts.reduce((sum, row) => sum + Number(row.total), 0),
      counts: counts.map((row) => ({
        state: String(row.state),
        total: Number(row.total),
      })),
      unmatchedReceipts: receiptRow.array().parse(orphans),
    };
  } finally {
    connection.release();
  }
}
