import "dotenv/config";
import assert from "node:assert/strict";
import { readFile, mkdir, writeFile, stat } from "node:fs/promises";

const token = process.env.WHATSAPP_ACCESS_TOKEN;
const phoneId = process.env.WHATSAPP_PHONE_NUMBER_ID;
const report: Record<string, unknown> = {
  readOnly: true,
  noMessagesSent: true,
  configuration: {
    tokenConfigured: Boolean(token),
    phoneIdConfigured: Boolean(phoneId),
    confirmationTemplate: process.env.WHATSAPP_CONFIRMATION_TEMPLATE || null,
    cancellationTemplate: process.env.WHATSAPP_CANCELLATION_TEMPLATE || null,
    language: process.env.WHATSAPP_TEMPLATE_LANGUAGE || "ar",
    apiVersion: process.env.WHATSAPP_API_VERSION || "v25.0",
  },
};
try {
  const log = await readFile("E:/SRV100.log", "utf8");
  const events = [
    ...log.matchAll(/\[(booking|operation)-whatsapp\][^\r\n]*/g),
  ].map((match) => {
    const text = log.slice(match.index, match.index! + 1800);
    const code = text.match(/"code"\s*:\s*(\d+)/);
    const subcode = text.match(/"error_subcode"\s*:\s*(\d+)/);
    return {
      channel: match[1],
      kind: /Meta accepted/.test(match[0])
        ? "accepted"
        : /not configured/.test(match[0])
          ? "not_configured"
          : /no valid/.test(match[0])
            ? "invalid_phone"
            : "failure",
      ...(code ? { code: Number(code[1]) } : {}),
      ...(subcode ? { subcode: Number(subcode[1]) } : {}),
      tokenExpired: /Session has expired|session.*expired/i.test(text),
      tokenInvalid: /Error validating access token/i.test(text),
      templateMismatch:
        /number of parameters|does not match|parameter.*mismatch/i.test(text),
    };
  });
  report.logSummary = {
    events: events.length,
    last: events.slice(-12),
    logModifiedAt: (await stat("E:/SRV100.log")).mtime.toISOString(),
  };
} catch {
  report.logSummary = { available: false };
}
if (token && phoneId) {
  const response = await fetch(
    `https://graph.facebook.com/${process.env.WHATSAPP_API_VERSION || "v25.0"}/${encodeURIComponent(phoneId)}?fields=id`,
    {
      headers: { Authorization: `Bearer ${token}` },
      signal: AbortSignal.timeout(15000),
    },
  );
  const data = await response.json();
  report.tokenPhoneRead = {
    ok: response.ok,
    status: response.status,
    code: data.error?.code ?? null,
    subcode: data.error?.error_subcode ?? null,
    type: data.error?.type ?? null,
    expired: /Session has expired|session.*expired/i.test(
      data.error?.message || "",
    ),
    invalidToken: /Error validating access token/i.test(
      data.error?.message || "",
    ),
  };
}
await mkdir("outputs/booking-whatsapp-diagnostic", { recursive: true });
await writeFile(
  "outputs/booking-whatsapp-diagnostic/report.json",
  JSON.stringify(report, null, 2),
);
console.log(JSON.stringify(report));
assert.ok(
  token && phoneId && process.env.WHATSAPP_CONFIRMATION_TEMPLATE,
  "Confirmation configuration is incomplete",
);
assert.equal(
  (report.tokenPhoneRead as { ok?: boolean } | undefined)?.ok,
  true,
  "Current confirmation credential cannot access the configured Meta phone",
);
