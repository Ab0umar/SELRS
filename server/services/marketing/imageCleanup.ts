import fs from "node:fs/promises";
import path from "node:path";
import { eq, or } from "drizzle-orm";
import { getDb } from "../../db";
import { ENV } from "../../_core/env";
import {
  aiMarketingJobs,
  marketingGenerationJobs,
  marketingPosts,
} from "../../../drizzle/schema";

const PREFIX = "/uploads/marketing/";
// Only files this module's generators write at the top level; reference designs
// and equipment photos live in reference-designs/ and never match.
const GENERATED =
  /^(branded-v[23]-.+\.png|manus-[\w-]+\.(png|jpg|webp)|(gemini|grok)-output-[\w-]+\.(png|jpg|webp))$/;

function directory() {
  return path.resolve(
    ENV.marketingImageDir || path.join(process.cwd(), "uploads", "marketing"),
  );
}

function generatedName(url: string | null | undefined) {
  if (!url?.startsWith(PREFIX)) return null;
  const name = decodeURIComponent(url.slice(PREFIX.length));
  return !name.includes("/") && GENERATED.test(name) ? name : null;
}

/** Collects the generated files of a draft before it is deleted. */
export async function marketingDraftFiles(postId: number) {
  const db = await getDb();
  if (!db) return { postId, imageUrl: null, extra: [] as string[] };
  const [post] = await db
    .select({ imageUrl: marketingPosts.imageUrl })
    .from(marketingPosts)
    .where(eq(marketingPosts.id, postId));
  const manus = await db
    .select({ id: marketingGenerationJobs.id })
    .from(marketingGenerationJobs)
    .where(eq(marketingGenerationJobs.postId, postId));
  const central = await db
    .select({ usageId: aiMarketingJobs.imageUsageId })
    .from(aiMarketingJobs)
    .where(
      or(
        eq(aiMarketingJobs.postId, postId),
        eq(aiMarketingJobs.sourcePostId, postId),
      ),
    );
  const ids = [
    ...manus.map((job: { id: string }) => `manus-${job.id}.`),
    ...central.flatMap((job: { usageId: string | null }) =>
      job.usageId ? [`-output-${job.usageId}.`] : [],
    ),
  ];
  let extra: string[] = [];
  if (ids.length) {
    const names = await fs.readdir(directory()).catch(() => [] as string[]);
    extra = names.filter(
      (name) => GENERATED.test(name) && ids.some((id) => name.includes(id)),
    );
  }
  return { postId, imageUrl: post?.imageUrl ?? null, extra };
}

/** Removes a deleted draft's generated and branded files that no other post references. */
export async function removeMarketingDraftFiles(
  files: Awaited<ReturnType<typeof marketingDraftFiles>>,
) {
  const db = await getDb();
  if (!db) return;
  const rows = await db
    .select({ imageUrl: marketingPosts.imageUrl })
    .from(marketingPosts);
  const inUse = new Set<string>(
    rows.map((row: { imageUrl: string | null }) => row.imageUrl ?? ""),
  );
  const names = new Set(files.extra);
  const branded = generatedName(files.imageUrl);
  if (branded && !inUse.has(files.imageUrl!)) {
    names.add(branded);
    const digest = branded.match(/-([a-f0-9]{20})\.png$/)?.[1];
    if (digest && ![...inUse].some((url) => url.includes(digest)))
      names.add(`branding-source-${digest}.png`);
  }
  for (const name of names) {
    if ([...inUse].some((url) => url.endsWith(`/${name}`))) continue;
    await fs.unlink(path.join(directory(), name)).catch(() => undefined);
  }
}
