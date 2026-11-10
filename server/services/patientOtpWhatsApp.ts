import { ENV } from "../_core/env";
import { confirmationPhone } from "./whatsappConfirmations";
import { z } from "zod";

export function patientOtpConfigured(): boolean {
  return Boolean(
    ENV.whatsappAccessToken &&
    ENV.whatsappPhoneNumberId &&
    ENV.whatsappAuthenticationTemplate,
  );
}

export async function sendPatientLoginOtp(
  phone: string,
  code: string,
): Promise<void> {
  if (
    !patientOtpConfigured() ||
    !confirmationPhone(phone) ||
    !/^\d{6}$/.test(code)
  ) {
    throw new Error("Patient OTP delivery is not configured");
  }
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
        to: confirmationPhone(phone),
        type: "template",
        template: {
          name: ENV.whatsappAuthenticationTemplate,
          language: { code: ENV.whatsappTemplateLanguage },
          components: [
            { type: "body", parameters: [{ type: "text", text: code }] },
            {
              type: "button",
              sub_type: "url",
              index: "0",
              parameters: [{ type: "text", text: code }],
            },
          ],
        },
      }),
      signal: AbortSignal.timeout(15000),
    },
  );
  const parsed = z
    .object({ messages: z.array(z.object({ id: z.string().min(1) })).min(1) })
    .safeParse(await response.json().catch(() => null));
  if (!response.ok || !parsed.success) {
    throw new Error("Patient OTP delivery was not accepted");
  }
}
