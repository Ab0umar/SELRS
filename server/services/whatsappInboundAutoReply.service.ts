import { ENV } from "../_core/env";

function internationalSupportPhone(rawPhone: string): string {
  const digits = rawPhone.replace(/\D/g, "");
  if (/^01\d{9}$/.test(digits)) return `2${digits}`;
  if (/^201\d{9}$/.test(digits)) return digits;
  return "201285800309";
}

export function buildWhatsAppInboundAutoReply(): string {
  const supportNumber = ENV.whatsappSupportNumber || "01285800309";
  const supportLink = `https://wa.me/${internationalSupportPhone(supportNumber)}`;
  return `هذه رسالة آلية، برجاء عدم الرد على هذه الرسالة. للاستفسارات تواصل معنا عبر واتساب: ${supportNumber} | ${supportLink}`;
}
