import { and, desc, eq, isNotNull, isNull } from "drizzle-orm";
import {
  patients,
  whatsappMarketingCampaigns,
  whatsappMarketingDeliveries,
  whatsappMarketingSubscriptions,
} from "../../drizzle/schema";
import { ENV } from "../_core/env";
import { getDb } from "../db";

export type MarketingPreference = "subscribed" | "unsubscribed";
type MarketingRecipient = { patientId: number | null; phone: string };
type SubscriptionStatus = "pending" | "subscribed" | "unsubscribed";

function normalizedPhone(rawPhone: string): string | null {
  const digits = rawPhone.replace(/\D/g, "");
  if (/^01\d{9}$/.test(digits)) return `2${digits}`;
  if (/^201\d{9}$/.test(digits)) return digits;
  return /^\d{8,15}$/.test(digits) ? digits : null;
}

function templateName(kind: "opt_in" | "promotion"): string {
  const name =
    kind === "opt_in"
      ? ENV.whatsappMarketingOptInTemplate
      : ENV.whatsappMarketingTemplate;
  if (!name) {
    throw new Error(
      kind === "opt_in"
        ? "WHATSAPP_MARKETING_OPT_IN_TEMPLATE is not configured."
        : "WHATSAPP_MARKETING_TEMPLATE is not configured.",
    );
  }
  return name;
}

async function sendTemplate(
  recipientPhone: string,
  template: string,
): Promise<string | null> {
  if (!ENV.whatsappAccessToken || !ENV.whatsappPhoneNumberId) {
    throw new Error("WhatsApp Cloud API is not configured.");
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
        recipient_type: "individual",
        to: recipientPhone,
        type: "template",
        template: {
          name: template,
          language: { code: ENV.whatsappTemplateLanguage },
        },
      }),
    },
  );
  const payload = (await response.json().catch(() => ({}))) as {
    messages?: Array<{ id?: string }>;
    error?: { message?: string; error_user_msg?: string };
  };
  if (!response.ok) {
    throw new Error(
      payload.error?.error_user_msg ||
        payload.error?.message ||
        `WhatsApp Cloud API returned ${response.status}.`,
    );
  }
  return payload.messages?.[0]?.id ?? null;
}

export function marketingPreferenceFromInbound(input: {
  text?: string | null;
  buttonId?: string | null;
}): MarketingPreference | null {
  const choices = [input.buttonId, input.text]
    .filter((choice): choice is string => Boolean(choice?.trim()))
    .map((choice) => choice.trim().toLocaleLowerCase("ar-EG"));
  if (
    choices.some((choice) =>
      [
        "marketing_continue",
        "continue_marketing",
        "subscribe_marketing",
        "استمرار",
        "اشتراك",
        "اشترك",
        "عروض",
        "ابدأ",
        "نعم",
        "yes",
        "start",
      ].includes(choice),
    )
  ) {
    return "subscribed";
  }
  if (
    choices.some((choice) =>
      [
        "marketing_stop",
        "stop_marketing",
        "unsubscribe_marketing",
        "إيقاف",
        "ايقاف",
        "إلغاء",
        "الغاء",
        "وقف",
        "stop",
        "unsubscribe",
        "cancel",
      ].includes(choice),
    )
  ) {
    return "unsubscribed";
  }
  return null;
}

export async function recordMarketingPreference(
  rawPhone: string,
  preference: MarketingPreference,
): Promise<boolean> {
  const phone = normalizedPhone(rawPhone);
  if (!phone) return false;
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db
    .insert(whatsappMarketingSubscriptions)
    .values({
      phone,
      status: preference,
      source: "whatsapp_reply",
      respondedAt: new Date(),
    })
    .onDuplicateKeyUpdate({
      set: {
        status: preference,
        source: "whatsapp_reply",
        respondedAt: new Date(),
      },
    });
  return true;
}

export async function marketingSummary() {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const [subscriptions, campaigns] = await Promise.all([
    db.select().from(whatsappMarketingSubscriptions),
    db
      .select()
      .from(whatsappMarketingCampaigns)
      .orderBy(desc(whatsappMarketingCampaigns.createdAt))
      .limit(10),
  ]);
  return {
    subscriptions: {
      pending: subscriptions.filter(
        (row: { status: SubscriptionStatus }) => row.status === "pending",
      ).length,
      subscribed: subscriptions.filter(
        (row: { status: SubscriptionStatus }) => row.status === "subscribed",
      ).length,
      unsubscribed: subscriptions.filter(
        (row: { status: SubscriptionStatus }) => row.status === "unsubscribed",
      ).length,
    },
    campaigns,
  };
}

export async function sendMarketingBatch(input: {
  kind: "opt_in" | "promotion";
  name: string;
  createdBy: number;
  limit: number;
  testPhone?: string;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const template = templateName(input.kind);
  const [campaignResult] = await db.insert(whatsappMarketingCampaigns).values({
    name: input.name,
    kind: input.kind,
    templateName: template,
    status: "sending",
    createdBy: input.createdBy,
  });
  const campaignId = Number(
    (campaignResult as { insertId?: number }).insertId ?? 0,
  );
  if (!campaignId) throw new Error("Could not create marketing campaign.");

  const recipientCandidates: Array<{
    id: number | null;
    phone: string | null;
  }> = input.testPhone
    ? [{ id: null, phone: input.testPhone }]
    : input.kind === "promotion"
      ? await db
          .select({
            id: whatsappMarketingSubscriptions.patientId,
            phone: whatsappMarketingSubscriptions.phone,
          })
          .from(whatsappMarketingSubscriptions)
          .where(eq(whatsappMarketingSubscriptions.status, "subscribed"))
          .limit(input.limit)
      : await db
          .select({ id: patients.id, phone: patients.phone })
          .from(patients)
          .leftJoin(
            whatsappMarketingSubscriptions,
            eq(patients.id, whatsappMarketingSubscriptions.patientId),
          )
          .where(
            and(
              isNotNull(patients.phone),
              isNull(whatsappMarketingSubscriptions.id),
            ),
          )
          .limit(input.limit);

  const recipients = recipientCandidates
    .map((row: { id: number | null; phone: string | null }) => ({
      patientId: row.id,
      phone: row.phone ? normalizedPhone(row.phone) : null,
    }))
    .filter((row): row is MarketingRecipient => Boolean(row.phone))
    .slice(0, input.limit);

  let accepted = 0;
  let failed = 0;
  for (const recipient of recipients) {
    try {
      const metaMessageId = await sendTemplate(recipient.phone, template);
      await db.insert(whatsappMarketingDeliveries).values({
        campaignId,
        patientId: recipient.patientId,
        recipientPhone: recipient.phone,
        status: "accepted",
        metaMessageId,
      });
      if (input.kind === "opt_in" && !input.testPhone) {
        await db
          .insert(whatsappMarketingSubscriptions)
          .values({
            phone: recipient.phone,
            patientId: recipient.patientId,
            status: "pending",
            source: "opt_in_campaign",
          })
          .onDuplicateKeyUpdate({ set: { patientId: recipient.patientId } });
      }
      accepted++;
    } catch (error) {
      await db.insert(whatsappMarketingDeliveries).values({
        campaignId,
        patientId: recipient.patientId,
        recipientPhone: recipient.phone,
        status: "failed",
        errorMessage: error instanceof Error ? error.message : "Unknown error",
      });
      failed++;
    }
  }
  await db
    .update(whatsappMarketingCampaigns)
    .set({
      status: failed > 0 && accepted === 0 ? "failed" : "sent",
      sentAt: new Date(),
    })
    .where(eq(whatsappMarketingCampaigns.id, campaignId));
  return { campaignId, attempted: recipients.length, accepted, failed };
}
