import { and, eq } from "drizzle-orm";
import { getDb } from "../../db";
import { aiMarketingJobContext } from "../../../drizzle/schema";
export async function readMarketingJobContext(
  jobId: string,
  provider: "manus" | "gemini",
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const [context] = await db
    .select()
    .from(aiMarketingJobContext)
    .where(
      and(
        eq(aiMarketingJobContext.jobId, jobId),
        eq(aiMarketingJobContext.provider, provider),
      ),
    )
    .limit(1);
  return context ?? null;
}
