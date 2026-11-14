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

const FIXED_REPLY_COOLDOWN_MS = 6 * 60 * 60 * 1000;
const fixedReplyAt = new Map<string, number>();

/** Claims the fixed reply for a number; false when one went out in the last 6 hours. In memory: a restart allows one extra reply. */
export function claimWhatsAppFixedReply(phone: string, now = Date.now()) {
  fixedReplyAt.forEach((at, key) => {
    if (now - at >= FIXED_REPLY_COOLDOWN_MS) fixedReplyAt.delete(key);
  });
  if (fixedReplyAt.has(phone)) return false;
  fixedReplyAt.set(phone, now);
  return true;
}

/** Gives the claim back when the reply was not sent. */
export function releaseWhatsAppFixedReply(phone: string) {
  fixedReplyAt.delete(phone);
}
