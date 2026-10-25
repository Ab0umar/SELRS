import "dotenv/config";
import assert from "node:assert/strict";

const token = process.env.WHATSAPP_ACCESS_TOKEN;
const phone = process.env.WHATSAPP_PHONE_NUMBER_ID;
assert.ok(token && phone, "WhatsApp configuration required");
const version = process.env.WHATSAPP_API_VERSION || "v25.0";
const name =
  process.env.WHATSAPP_RECEIPT_TEMPLATE || "booking_request_received";
const language = process.env.WHATSAPP_TEMPLATE_LANGUAGE || "ar_EG";
const body =
  "تم استلام طلب حجزك بمركز عيون الشروق.\nسيتم التواصل معك لتأكيد الموعد.";
async function api(path: string, payload?: unknown) {
  const response = await fetch(
    `https://graph.facebook.com/${version}/${path}`,
    {
      method: payload ? "POST" : "GET",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      ...(payload ? { body: JSON.stringify(payload) } : {}),
    },
  );
  const result = await response.json();
  if (!response.ok)
    throw new Error(
      `Meta request failed: ${result.error?.code ?? response.status}`,
    );
  return result;
}
const accounts = await api(
  "2034041873405896/owned_whatsapp_business_accounts?fields=id&limit=100",
);
let account: string | undefined;
for (const candidate of accounts.data ?? []) {
  const numbers = await api(
    `${candidate.id}/phone_numbers?fields=id&limit=100`,
  );
  if (numbers.data?.some((number: { id: string }) => number.id === phone)) {
    account = candidate.id;
    break;
  }
}
assert.ok(account, "Configured sender account not found");
const templates = await api(
  `${account}/message_templates?name=${encodeURIComponent(name)}&limit=100`,
);
let template = templates.data?.find(
  (t: { name: string; language: string }) =>
    t.name === name && t.language === language,
);
if (!template && process.argv.includes("--apply")) {
  template = await api(`${account}/message_templates`, {
    name,
    language,
    category: "UTILITY",
    components: [{ type: "BODY", text: body }],
  });
}
console.log(
  JSON.stringify({
    name,
    language,
    status: template?.status ?? "NOT_CREATED",
    category: template?.category,
    body,
    messagesSent: 0,
  }),
);
