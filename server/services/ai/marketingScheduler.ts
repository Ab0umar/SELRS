import { eq } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "../../db";
import {
  aiMarketingScheduler,
  aiMarketingScheduleClaims,
  aiMarketingJobs,
  marketingGenerationJobs,
} from "../../../drizzle/schema";
import { AiManagementError, AiManagementStore } from "./managementStore";
import { getDbConnection } from "../../db";
import type { MarketingPageRole } from "../marketing/page.service";

const settingSchema = z.object({
  pageRole: z.enum(["center", "doctor"]),
  provider: z.enum(["manus", "central"]),
});
export async function marketingSchedulerProviders() {
  const db = await getDb();
  if (!db) throw new AiManagementError("unavailable");
  return z
    .array(settingSchema)
    .parse(await db.select().from(aiMarketingScheduler));
}
export async function saveMarketingSchedulerProvider(
  input: z.infer<typeof settingSchema>,
) {
  const setting = settingSchema.parse(input);
  const db = await getDb();
  if (!db) throw new AiManagementError("unavailable");
  if (setting.provider === "central") {
    if (process.env.AI_CORE_MANAGEMENT_ENABLED !== "true")
      throw new AiManagementError("disabled");
    const profiles = await new AiManagementStore(
      getDbConnection,
    ).listProfiles();
    if (
      !["marketing.text", "marketing.image"].every((workload) =>
        profiles.some(
          (profile) =>
            profile.workload === workload &&
            profile.enabled &&
            profile.provider === "gemini",
        ),
      )
    )
      throw new AiManagementError("unavailable");
  }
  await db
    .update(aiMarketingScheduler)
    .set({ provider: setting.provider })
    .where(eq(aiMarketingScheduler.pageRole, setting.pageRole));
  return { ok: true };
}
export async function claimMarketingSchedule(
  requestId: string,
  pageRole: MarketingPageRole,
) {
  const db = await getDb();
  if (!db) throw new AiManagementError("unavailable");
  const settings = await marketingSchedulerProviders();
  const provider =
    settings.find((setting) => setting.pageRole === pageRole)?.provider ??
    "manus";
  const [legacy] = await db
    .select({ id: marketingGenerationJobs.id })
    .from(marketingGenerationJobs)
    .where(eq(marketingGenerationJobs.id, requestId));
  const [central] = await db
    .select({ id: aiMarketingJobs.id })
    .from(aiMarketingJobs)
    .where(eq(aiMarketingJobs.id, requestId));
  if (legacy || central) return { provider, claimed: false };
  try {
    await db
      .insert(aiMarketingScheduleClaims)
      .values({ id: requestId, provider });
  } catch (error) {
    const [existing] = await db
      .select()
      .from(aiMarketingScheduleClaims)
      .where(eq(aiMarketingScheduleClaims.id, requestId));
    if (!existing) throw error;
    return {
      provider: settingSchema.shape.provider.parse(existing.provider),
      claimed: false,
    };
  }
  return { provider, claimed: true };
}
