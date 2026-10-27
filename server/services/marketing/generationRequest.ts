import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "../../db";
import {
  marketingGenerationJobs,
  aiMarketingJobs,
} from "../../../drizzle/schema";
import { readAiOperation } from "../ai/operations";
const requestJobSchema = z.object({
  id: z.string(),
  state: z.enum(["starting", "running", "completed", "failed", "uncertain"]),
  postId: z.number().nullable(),
  pageRole: z.enum(["center", "doctor"]),
  postDay: z.enum(["saturday", "tuesday", "thursday"]),
  topic: z.string(),
});

export async function readMarketingGenerationRequest(
  requestId: string,
  owner: number,
) {
  const operation = await readAiOperation(requestId, "marketing", owner);
  if (operation?.state === "rejected") return { ...operation, job: null };
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const [legacyRow] = await db
    .select({
      id: marketingGenerationJobs.id,
      state: marketingGenerationJobs.state,
      postId: marketingGenerationJobs.postId,
      pageRole: marketingGenerationJobs.pageRole,
      postDay: marketingGenerationJobs.postDay,
      topic: marketingGenerationJobs.topic,
    })
    .from(marketingGenerationJobs)
    .where(
      and(
        eq(marketingGenerationJobs.id, requestId),
        eq(marketingGenerationJobs.createdBy, owner),
      ),
    )
    .limit(1);
  const legacy = legacyRow ? requestJobSchema.parse(legacyRow) : null;
  if (legacy)
    return {
      state: operation?.state ?? ("accepted" as const),
      context: operation?.context ?? {
        requestId,
        pageRole: legacy.pageRole,
        postDay: legacy.postDay,
        topic: legacy.topic,
      },
      job: legacy,
    };
  const [centralRow] = await db
    .select({
      id: aiMarketingJobs.id,
      state: aiMarketingJobs.state,
      postId: aiMarketingJobs.postId,
      pageRole: aiMarketingJobs.pageRole,
      postDay: aiMarketingJobs.postDay,
      topic: aiMarketingJobs.topic,
    })
    .from(aiMarketingJobs)
    .where(
      and(
        eq(aiMarketingJobs.id, requestId),
        eq(aiMarketingJobs.createdBy, owner),
      ),
    )
    .limit(1);
  const central = centralRow ? requestJobSchema.parse(centralRow) : null;
  if (central)
    return {
      state: operation?.state ?? ("accepted" as const),
      context: operation?.context ?? {
        requestId,
        pageRole: central.pageRole,
        postDay: central.postDay,
        topic: central.topic,
      },
      job: central,
    };
  return operation ? { ...operation, job: null } : null;
}
