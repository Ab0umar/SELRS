import "dotenv/config";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import {
  withMarketingBudget,
  marketingUsageId,
} from "../server/services/ai/marketingDraft";
import { marketingImagePrompt } from "../server/services/marketing/imagePolicy";
assert.ok(process.argv.includes("--live"));
const requestId = randomUUID();
const request = {
  instruction: marketingImagePrompt(
    "Create an original square medical marketing photograph. No text, no logos, no watermarks. Use only the specified equipment and background.",
  ),
  input:
    "Ophthalmic diagnostic equipment in a clean empty examination room, blue and white palette. No people, faces, eyes, hands, portraits, posters of people, silhouettes or reflections of people.",
};
const image = await withMarketingBudget(
  requestId,
  "marketing.image",
  request,
  (gateway, model) =>
    gateway.generateImage({ ...request, workload: "marketing.image", model }),
);
const directory = "outputs/marketing-image-policy";
await mkdir(directory, { recursive: true });
const filename = `${directory}/empty-exam-room.${image.mimeType === "image/png" ? "png" : image.mimeType === "image/webp" ? "webp" : "jpg"}`;
await writeFile(filename, image.bytes);
await writeFile(
  `${directory}/verification.json`,
  JSON.stringify(
    {
      requestId,
      usageId: marketingUsageId(requestId, "marketing.image"),
      filename,
      bytes: image.bytes.length,
      noDraftOrPublication: true,
      visualReviewRequired: true,
    },
    null,
    2,
  ),
);
console.log(
  JSON.stringify({
    ok: true,
    filename,
    bytes: image.bytes.length,
    noDraftOrPublication: true,
  }),
);
process.exit(0);
