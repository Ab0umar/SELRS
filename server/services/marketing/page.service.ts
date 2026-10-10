import { eq } from "drizzle-orm";
import { getDb } from "../../db";
import {
  marketingFacebookPages,
  marketingSettings,
  type MarketingFacebookPage,
} from "../../../drizzle/schema";

export type MarketingPageRole = "center" | "doctor";

export type MarketingPageTarget = Pick<
  MarketingFacebookPage,
  | "pageRole"
  | "pageId"
  | "pageName"
  | "contentName"
  | "accessToken"
  | "autoPublish"
  | "saturdayEnabled"
  | "tuesdayEnabled"
  | "thursdayEnabled"
  | "publishHour"
  | "topicDirection"
  | "connected"
>;

/**
 * Reads the new per-page connection and keeps the existing center connection
 * working until migration 0100 has been applied.
 */
export async function getMarketingPageTarget(
  pageRole: MarketingPageRole,
): Promise<MarketingPageTarget | null> {
  const db = await getDb();
  if (!db) return null;

  const [page] = await db
    .select()
    .from(marketingFacebookPages)
    .where(eq(marketingFacebookPages.pageRole, pageRole))
    .limit(1);
  if (page) return page;

  if (pageRole !== "center") return null;

  const [legacy] = await db.select().from(marketingSettings).limit(1);
  if (!legacy?.fbPageId || !legacy.fbAccessToken) return null;
  return {
    pageRole: "center",
    pageId: legacy.fbPageId,
    pageName: legacy.fbPageName ?? legacy.fbPageId,
    contentName: legacy.clinicName ?? legacy.fbPageName ?? legacy.fbPageId,
    accessToken: legacy.fbAccessToken,
    autoPublish: legacy.autoPublish,
    saturdayEnabled: legacy.saturdayEnabled,
    tuesdayEnabled: legacy.tuesdayEnabled,
    thursdayEnabled: legacy.thursdayEnabled,
    publishHour: legacy.publishHour,
    topicDirection: "forward",
    connected: legacy.fbConnected,
  };
}
