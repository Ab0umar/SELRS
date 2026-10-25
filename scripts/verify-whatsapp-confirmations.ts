import "dotenv/config";
import assert from "node:assert/strict";
import { randomUUID, createHmac } from "node:crypto";
import { readFile, mkdir, writeFile } from "node:fs/promises";
import type { AddressInfo } from "node:net";
import mysql, { type RowDataPacket } from "mysql2/promise";
import express from "express";
const originalUrl = process.env.DATABASE_URL!;
const database = `selrs_confirmation_test_${randomUUID().replaceAll("-", "")}`;
assert.match(database, /^selrs_confirmation_test_[a-f0-9]{32}$/);
const owner = await mysql.createConnection(originalUrl);
const uri = new URL(originalUrl);
uri.pathname = `/${database}`;
let pool: ReturnType<typeof mysql.createPool> | undefined;
let server: ReturnType<ReturnType<typeof express>["listen"]> | undefined;
const originalFetch = globalThis.fetch,
  originalError = console.error;
const checks: string[] = [];
let providerCalls = 0;
let mode: "accept" | "reject" | "timeout" | "fastReceipt" = "accept";
try {
  await owner.query(`CREATE DATABASE \`${database}\``);
  pool = mysql.createPool({ uri: uri.toString(), multipleStatements: true });
  await pool.query(
    await readFile(
      new URL("../drizzle/whatsapp_confirmations.sql", import.meta.url),
      "utf8",
    ),
  );
  process.env.DATABASE_URL = uri.toString();
  await pool.query(
    await readFile(
      new URL("../drizzle/whatsapp_confirmation_actions.sql", import.meta.url),
      "utf8",
    ),
  );
  process.env.WHATSAPP_ACCESS_TOKEN = "synthetic-token";
  process.env.WHATSAPP_PHONE_NUMBER_ID = "fixture-confirmation-phone";
  process.env.WHATSAPP_APP_SECRET = "fixture-signing-secret";
  process.env.WHATSAPP_CONFIRMATION_TEMPLATE = "exams_confirmation";
  process.env.WHATSAPP_CANCELLATION_TEMPLATE = "exam_cancelation";
  process.env.WHATSAPP_OPERATION_TEMPLATE = "op_confirmation";
  process.env.WHATSAPP_OPERATION_CANCELLATION_TEMPLATE = "op_cancelation";
  const { sendBookingStatusWhatsApp, sendBookingReceiptWhatsApp } =
    await import("../server/services/bookingWhatsApp.service");
  const { sendOperationListWhatsApp } =
    await import("../server/services/operationWhatsApp.service");
  const { ingestConfirmationReceipts, listWhatsAppConfirmations } =
    await import("../server/services/whatsappConfirmations");
  const { registerWhatsAppWebhook } =
    await import("../server/_core/whatsappWebhook");
  const payload = (id: string, state: string, code?: number) => ({
    object: "whatsapp_business_account",
    entry: [
      {
        changes: [
          {
            field: "messages",
            value: {
              metadata: { phone_number_id: "fixture-confirmation-phone" },
              statuses: [
                {
                  id,
                  status: state,
                  timestamp: String(Math.floor(Date.now() / 1000)),
                  recipient_id: "201000000000",
                  ...(code
                    ? {
                        errors: [
                          {
                            code,
                            error_data: {
                              details:
                                "Synthetic delivery failed 201000000000 EAAfixtureSecret",
                            },
                          },
                        ],
                      }
                    : {}),
                },
              ],
            },
          },
        ],
      },
    ],
  });
  globalThis.fetch = async (url, options) => {
    assert.ok(
      String(url).startsWith("https://graph.facebook.com/"),
      "Unmocked external request",
    );
    providerCalls++;
    const body = JSON.parse(String(options?.body));
    assert.equal(body.to, "201000000000");
    const id = `wamid.synthetic.${providerCalls}`;
    if (mode === "timeout") throw new Error("Synthetic network timeout");
    if (mode === "reject")
      return Response.json(
        { error: { code: 132000, message: "Synthetic parameter mismatch" } },
        { status: 400 },
      );
    if (mode === "fastReceipt")
      await ingestConfirmationReceipts(payload(id, "delivered"));
    return Response.json({ messages: [{ id, message_status: "accepted" }] });
  };
  const app = express();
  registerWhatsAppWebhook(app);
  server = await new Promise((resolve) => {
    const listener = app.listen(0, "127.0.0.1", () => resolve(listener));
  });
  const endpoint = `http://127.0.0.1:${(server.address() as AddressInfo).port}/webhook/whatsapp`;
  const webhook = async (body: unknown) => {
    const text = JSON.stringify(body);
    return originalFetch(endpoint, {
      method: "POST",
      body: text,
      headers: {
        "Content-Type": "application/json",
        "X-Hub-Signature-256": `sha256=${createHmac("sha256", "fixture-signing-secret").update(text).digest("hex")}`,
      },
    });
  };
  const booking = {
    recipientPhone: "01000000000",
    patientName: "حالة خيالية للسجل",
    bookingTypeLabel: "كشف أخصائي",
    bookingDate: "2026-10-26",
    branch: "tanta",
    status: "confirmed" as const,
  };
  await sendBookingStatusWhatsApp(booking);
  let list = await listWhatsAppConfirmations({});
  const first = list.rows[0];
  assert.equal(first.state, "accepted");
  assert.equal(first.kind, "booking_confirmed");
  const failed = payload(first.provider_message_id!, "failed", 131026);
  assert.equal((await webhook(failed)).status, 200);
  list = await listWhatsAppConfirmations({});
  assert.equal(list.rows[0].state, "failed");
  assert.equal(list.rows[0].error_code, "131026");
  assert.ok(!list.rows[0].error_details!.includes("201000000000"));
  assert.equal((await webhook(failed)).status, 200);
  const [duplicates] = await pool.query<RowDataPacket[]>(
    "SELECT COUNT(*) AS total FROM whatsapp_confirmation_receipts",
  );
  assert.equal(Number(duplicates[0].total), 1);
  checks.push(
    "Meta acceptance is not delivery; signed status-only failure becomes a visible failed confirmation, with error code, redaction and duplicate receipt protection",
  );
  await ingestConfirmationReceipts(payload(first.provider_message_id!, "read"));
  await ingestConfirmationReceipts(payload(first.provider_message_id!, "sent"));
  await ingestConfirmationReceipts(failed);
  list = await listWhatsAppConfirmations({});
  assert.equal(list.rows[0].state, "read");
  assert.equal(list.rows[0].error_code, null);
  checks.push(
    "delivered/read evidence is never regressed by late sent or failed events",
  );
  mode = "fastReceipt";
  await sendBookingStatusWhatsApp({
    ...booking,
    patientName: "إشعار سريع خيالي",
  });
  assert.equal(
    (await listWhatsAppConfirmations({ search: "إشعار سريع" })).rows[0].state,
    "delivered",
  );
  checks.push(
    "a receipt arriving before the send response is attached when the provider message ID is saved",
  );
  mode = "accept";
  const callsBeforeDedup = providerCalls;
  const requestKey = randomUUID();
  await Promise.all([
    sendBookingStatusWhatsApp({ ...booking, requestKey }),
    sendBookingStatusWhatsApp({ ...booking, requestKey }),
  ]);
  assert.equal(providerCalls, callsBeforeDedup + 1);
  await sendBookingStatusWhatsApp({ ...booking, requestKey: randomUUID() });
  assert.equal(providerCalls, callsBeforeDedup + 2);
  await sendBookingReceiptWhatsApp({
    recipientPhone: booking.recipientPhone,
    patientName: "استلام خيالي",
    requestKey: randomUUID(),
  });
  assert.equal(
    (await listWhatsAppConfirmations({ kind: "booking_received" })).rows[0]
      .template_name,
    "booking_request_received",
  );
  checks.push(
    "same request is sent once under concurrent calls; a new deliberate request can resend; pending receipt uses its own template",
  );
  await sendOperationListWhatsApp({
    recipientPhone: "01000000000",
    patientName: "عملية خيالية",
    operationName: "عملية تدريبية",
    operationDate: "2026-10-26",
    operationTime: "12:00",
    doctorName: "طبيب تدريبي",
    hospitalName: "مستشفى تدريبي",
    status: "confirmed",
  });
  assert.equal(
    (await listWhatsAppConfirmations({ kind: "operation_confirmed" })).total,
    1,
  );
  mode = "reject";
  await assert.rejects(
    sendBookingStatusWhatsApp({ ...booking, patientName: "رفض فوري خيالي" }),
  );
  assert.equal(
    (await listWhatsAppConfirmations({ search: "رفض فوري" })).rows[0].state,
    "failed",
  );
  mode = "timeout";
  const beforeTimeout = providerCalls;
  const unknownRequest = randomUUID();
  await assert.rejects(
    sendBookingStatusWhatsApp({
      ...booking,
      patientName: "نتيجة مجهولة خيالية",
      requestKey:unknownRequest,
    }),
  );
  assert.equal(providerCalls, beforeTimeout + 1);
  await sendBookingStatusWhatsApp({...booking,requestKey:unknownRequest});
  assert.equal(providerCalls,beforeTimeout+1);
  assert.equal(
    (await listWhatsAppConfirmations({ search: "نتيجة مجهولة" })).rows[0].state,
    "unknown",
  );
  const beforeInvalid = providerCalls;
  await sendBookingStatusWhatsApp({
    ...booking,
    recipientPhone: "invalid",
    patientName: "رقم غير صالح خيالي",
  });
  assert.equal(providerCalls, beforeInvalid);
  assert.equal(
    (await listWhatsAppConfirmations({ search: "رقم غير صالح" })).rows[0].state,
    "skipped",
  );
  checks.push(
    "booking and operation attempts are searchable separately; immediate rejection, unknown network outcome and invalid phone remain distinct; no automatic retries",
  );
  await pool.query(
    "CREATE TRIGGER fixture_receipt_failure BEFORE INSERT ON whatsapp_confirmation_receipts FOR EACH ROW SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Synthetic receipt storage failure'",
  );
  console.error = () => {};
  const retry = payload("wamid.retry.fixture", "failed", 131026);
  assert.equal((await webhook(retry)).status, 503);
  await pool.query("DROP TRIGGER fixture_receipt_failure");
  assert.equal((await webhook(retry)).status, 200);
  assert.ok(
    (await listWhatsAppConfirmations({})).unmatchedReceipts.some(
      (row) => row.provider_message_id === "wamid.retry.fixture",
    ),
  );
  checks.push(
    "status persistence failure returns HTTP 503; retry commits successfully; unmatched historical receipts remain visible",
  );
  const wrong = payload("wrong-number", "failed");
  wrong.entry[0].changes[0].value.metadata.phone_number_id = "other-phone";
  await ingestConfirmationReceipts(wrong);
  assert.ok(
    !(await listWhatsAppConfirmations({})).unmatchedReceipts.some(
      (row) => row.provider_message_id === "wrong-number",
    ),
  );
  await pool.query(
    "UPDATE whatsapp_confirmation_attempts SET state='sending',created_at=DATE_SUB(CURRENT_TIMESTAMP,INTERVAL 5 MINUTE) WHERE patient_name='نتيجة مجهولة خيالية'",
  );
  assert.equal(
    (
      await listWhatsAppConfirmations({
        state: "unknown",
        search: "نتيجة مجهولة",
      })
    ).total,
    1,
  );
  checks.push(
    "other-number receipts are isolated; interrupted sending attempts display and filter as unknown after two minutes",
  );
  await mkdir("outputs/booking-whatsapp-diagnostic", { recursive: true });
  await writeFile(
    "outputs/booking-whatsapp-diagnostic/workflow.json",
    JSON.stringify(
      {
        ok: true,
        checks,
        productionDataChanged: false,
        network: "simulated Meta; real isolated SQL and signed local webhook",
      },
      null,
      2,
    ),
  );
  console.log(
    JSON.stringify({ ok: true, checks, productionDataChanged: false }),
  );
} finally {
  globalThis.fetch = originalFetch;
  console.error = originalError;
  await new Promise<void>((resolve) => {
    if (!server) return resolve();
    server.close(() => resolve());
    server.closeAllConnections();
  });
  await pool?.end();
  await owner.query(`DROP DATABASE IF EXISTS \`${database}\``);
  await owner.end();
}
process.exit(0);
