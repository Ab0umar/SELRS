import { and, eq, inArray, ne } from "drizzle-orm";
import type { MySql2Database } from "drizzle-orm/mysql2";
import {
  marketingGenerationJobs,
  aiMarketingJobs,
} from "../../../drizzle/schema";
import { AiManagementError, AiManagementStore } from "../ai/managementStore";
import { getDbConnection } from "../../db";
import { marketingUsageId } from "./requestIds";

// Every caller holds the source-post row lock until its image-job claim commits.
export async function assertDraftImageAvailable(
  tx: Pick<MySql2Database, "select">,
  postId: number,
  ownCentralId?: string,
) {
  const legacy = await tx
    .select({ id: marketingGenerationJobs.id })
    .from(marketingGenerationJobs)
    .where(
      and(
        eq(marketingGenerationJobs.postId, postId),
        inArray(marketingGenerationJobs.state, [
          "starting",
          "running",
          "uncertain",
        ]),
      ),
    )
    .limit(1);
  if (legacy.length) throw new AiManagementError("capacity");
  const central = await tx
    .select({
      id: aiMarketingJobs.id,
      state: aiMarketingJobs.state,
      imageUsageId: aiMarketingJobs.imageUsageId,
    })
    .from(aiMarketingJobs)
    .where(
      and(
        eq(aiMarketingJobs.sourcePostId, postId),
        inArray(aiMarketingJobs.state, ["running", "uncertain"]),
        ownCentralId ? ne(aiMarketingJobs.id, ownCentralId) : undefined,
      ),
    );
  for (const job of central) {
    if (job.state === "running") throw new AiManagementError("capacity");
    const usage = await new AiManagementStore(getDbConnection).findRequest(
      job.imageUsageId || marketingUsageId(job.id, "marketing.image"),
    );
    if (usage?.state !== "failed") throw new AiManagementError("capacity");
  }
}
