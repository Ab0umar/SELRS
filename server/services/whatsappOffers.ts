import { randomUUID } from "node:crypto";
import { z } from "zod";
import { getSystemSetting, updateSystemSettings } from "../db";

/** Offers the WhatsApp copy generator writes from. Customers still receive the Meta-approved template. */
const SETTING_KEY = "whatsapp_marketing_offers";

const isoDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .refine((value) => !Number.isNaN(Date.parse(`${value}T00:00:00Z`)));

export const whatsappOfferFields = z
  .object({
    name: z.string().trim().min(2).max(80),
    details: z.string().trim().min(5).max(300),
    endsOn: isoDate.nullable(),
    enabled: z.boolean(),
  })
  .strict();

export const whatsappOffer = whatsappOfferFields
  .extend({ id: z.string().min(1).max(64) })
  .strict();
export type WhatsAppOffer = z.infer<typeof whatsappOffer>;

const offerList = z.array(whatsappOffer).max(50);

// The three offers that were hard-coded before offers became editable.
export const SEED_WHATSAPP_OFFERS: WhatsAppOffer[] = [
  {
    id: "lasik",
    name: "تصحيح الإبصار",
    details: "خصم يصل إلى 15% على عمليات تصحيح الإبصار.",
    endsOn: null,
    enabled: true,
  },
  {
    id: "cataract",
    name: "المياه البيضاء للتأمين الصحي",
    details:
      "خصم 1000ج على عمليات المياه البيضاء لحامل بطاقة التأمين الصحي.",
    endsOn: null,
    enabled: true,
  },
  {
    id: "exam",
    name: "كشف الأخصائي",
    details:
      "الكشف مع الأخصائي فقط أيام الأحد والثلاثاء والخميس بـ200ج بدلًا من 260ج.",
    endsOn: null,
    enabled: true,
  },
];

export async function listWhatsAppOffers(): Promise<WhatsAppOffer[]> {
  const row = await getSystemSetting(SETTING_KEY);
  if (!row?.value) return SEED_WHATSAPP_OFFERS.map((offer) => ({ ...offer }));
  return offerList.parse(JSON.parse(String(row.value)));
}

export function offerIsActive(offer: WhatsAppOffer, today: string) {
  return offer.enabled && (!offer.endsOn || offer.endsOn >= today);
}

export async function saveWhatsAppOffer(
  input: z.infer<typeof whatsappOfferFields> & { id?: string },
) {
  const fields = whatsappOfferFields.parse({
    name: input.name,
    details: input.details,
    endsOn: input.endsOn,
    enabled: input.enabled,
  });
  const offers = await listWhatsAppOffers();
  const id = input.id ?? randomUUID();
  const index = offers.findIndex((offer) => offer.id === id);
  if (input.id && index < 0) throw new Error("العرض غير موجود");
  const next = { id, ...fields };
  if (index < 0) offers.push(next);
  else offers[index] = next;
  await updateSystemSettings(SETTING_KEY, offerList.parse(offers));
  return next;
}

export async function setWhatsAppOfferEnabled(id: string, enabled: boolean) {
  const offers = await listWhatsAppOffers();
  const offer = offers.find((entry) => entry.id === id);
  if (!offer) throw new Error("العرض غير موجود");
  offer.enabled = enabled;
  await updateSystemSettings(SETTING_KEY, offerList.parse(offers));
  return offer;
}
