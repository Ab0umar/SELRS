import { ENV } from "../_core/env";

type SendWhatsAppReplyInput = {
  recipientPhone: string;
  message: string;
  replyToMessageId?: string | null;
};

type WhatsAppSendResponse = {
  messages?: Array<{ id?: string }>;
  error?: {
    message?: string;
    error_user_title?: string;
    error_user_msg?: string;
  };
};

function normalizedRecipientPhone(rawPhone: string): string {
  const digits = rawPhone.replace(/\D/g, "");
  if (!/^\d{8,15}$/.test(digits)) {
    throw new Error("The WhatsApp sender phone number is invalid.");
  }
  return digits;
}

export async function sendWhatsAppReply(
  input: SendWhatsAppReplyInput,
): Promise<{ messageId: string | null }> {
  if (!ENV.whatsappAccessToken || !ENV.whatsappPhoneNumberId) {
    throw new Error(
      "WhatsApp Cloud API is not configured. Check WHATSAPP_ACCESS_TOKEN and WHATSAPP_PHONE_NUMBER_ID.",
    );
  }

  const payload: Record<string, unknown> = {
    messaging_product: "whatsapp",
    recipient_type: "individual",
    to: normalizedRecipientPhone(input.recipientPhone),
    type: "text",
    text: {
      preview_url: false,
      body: input.message.trim(),
    },
  };

  if (input.replyToMessageId?.trim()) {
    payload.context = { message_id: input.replyToMessageId.trim() };
  }

  const response = await fetch(
    `https://graph.facebook.com/${ENV.whatsappApiVersion}/${ENV.whatsappPhoneNumberId}/messages`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${ENV.whatsappAccessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    },
  );
  const responseBody = (await response
    .json()
    .catch(() => ({}))) as WhatsAppSendResponse;

  if (!response.ok) {
    const errorMessage =
      responseBody.error?.error_user_msg ||
      responseBody.error?.message ||
      `WhatsApp Cloud API returned ${response.status}.`;
    throw new Error(errorMessage);
  }

  return { messageId: responseBody.messages?.[0]?.id ?? null };
}
