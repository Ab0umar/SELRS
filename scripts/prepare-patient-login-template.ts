import "dotenv/config";
import assert from "node:assert/strict";

const token = process.env.WHATSAPP_ACCESS_TOKEN;
const phone = process.env.WHATSAPP_PHONE_NUMBER_ID;
assert.ok(token && phone, "WhatsApp configuration required");
const version = process.env.WHATSAPP_API_VERSION || "v25.0";
const name =
  process.env.WHATSAPP_AUTHENTICATION_TEMPLATE || "selrs_patient_login_otp";
const language = process.env.WHATSAPP_TEMPLATE_LANGUAGE || "ar";

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
      signal: AbortSignal.timeout(15000),
    },
  );
  const result = await response.json();
  if (!response.ok) {
    const error = result.error;
    throw new Error(
      JSON.stringify({
        code: error?.code ?? response.status,
        subcode: error?.error_subcode,
        message: error?.message,
        detail: error?.error_user_msg ?? error?.error_data?.details,
        fbtrace_id: error?.fbtrace_id,
      }),
    );
  }
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
  (entry: { name: string; language: string }) =>
    entry.name === name && entry.language === language,
);
if (template)
  assert.equal(
    template.category,
    "AUTHENTICATION",
    "Existing template is not an authentication template",
  );
if (!template && process.argv.includes("--apply")) {
  const created = await api(`${account}/message_templates`, {
    name,
    language,
    category: "AUTHENTICATION",
    components: [
      { type: "BODY", add_security_recommendation: true },
      { type: "FOOTER", code_expiration_minutes: 5 },
      { type: "BUTTONS", buttons: [{ type: "OTP", otp_type: "COPY_CODE" }] },
    ],
  });
  template = { ...created, name, language };
}
console.log(
  JSON.stringify({
    name,
    language,
    status: template?.status ?? "NOT_CREATED",
    category: template?.category,
    messagesSent: 0,
  }),
);
