import "dotenv/config";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import fs from "node:fs/promises";
import {
  withMarketingBudget,
  marketingUsageId,
} from "../server/services/ai/marketingDraft";
import {
  marketingVisualBrief,
  marketingImageData,
} from "../server/services/marketing/prompts";
import {
  readMarketingPageBranding,
  composeMarketingPageLogo,
  marketingContactFooter,
} from "../server/services/marketing/pageBranding";
assert.ok(
  process.argv.includes("--live"),
  "Explicit --live is required; this creates paid provider images only, never posts",
);
const folder = "outputs/medical-marketing-visuals";
await fs.mkdir(folder, { recursive: true });
const cases = [
  {
    key: "dry-eye",
    topic: "جفاف العين",
    pageRole: "center" as const,
    content: "توضيح طبقة الدموع ودورها في ترطيب سطح العين.",
  },
  {
    key: "corneal-thickness",
    topic: "سماكة القرنية",
    pageRole: "center" as const,
    content:
      "شرح سماكة القرنية كطبقة شفافة في مقدمة العين، وليست سماكة عدسة العين.",
  },
  {
    key: "cataract",
    topic: "المياه البيضاء (الكتاراكت)",
    pageRole: "doctor" as const,
    content: "شرح المياه البيضاء كعتامة في عدسة العين الطبيعية خلف القزحية.",
  },
  {
    key: "pentacam",
    topic: "البنتاكام",
    pageRole: "center" as const,
    content:
      "التصوير غير التلامسي للجزء الأمامي من العين وخرائط القرنية باستخدام البنتاكام.",
  },
];
const results = [];
const only = process.argv
  .find((arg) => arg.startsWith("--only="))
  ?.slice(7)
  .split(",");
const suffix =
  process.argv.find((arg) => arg.startsWith("--suffix="))?.slice(9) || "";
assert.match(suffix, /^[a-z0-9-]{0,20}$/);
for (const sample of cases.filter(
  (sample) => !only || only.includes(sample.key),
)) {
  const branding = await readMarketingPageBranding(sample.pageRole);
  const requestId = randomUUID();
  const request = {
    instruction: marketingVisualBrief(sample.topic),
    input: JSON.stringify({
      ...marketingImageData(
        { title: sample.topic, content: sample.content },
        sample.topic,
      ),
      brand: {
        colors:
          sample.pageRole === "doctor"
            ? "navy and restrained gold accents in the background only"
            : "navy blue and restrained orange accents in the background only",
      },
    }),
  };
  console.log(JSON.stringify({ started: sample.key, requestId }));
  const image = await withMarketingBudget(
    requestId,
    "marketing.image",
    request,
    (gateway, model) =>
      gateway.generateImage({ ...request, workload: "marketing.image", model }),
  );
  await fs.writeFile(
    `${folder}/${sample.key}-raw.${image.mimeType === "image/png" ? "png" : image.mimeType === "image/webp" ? "webp" : "jpg"}`,
    image.bytes,
  );
  const filename = `${folder}/${sample.key}${suffix ? `-${suffix}` : ""}.png`;
  await fs.writeFile(
    filename,
    await composeMarketingPageLogo(image.bytes, branding.logo, branding.name),
  );
  const result = {
    topic: sample.topic,
    pageRole: sample.pageRole,
    filename,
    requestId,
    usageId: marketingUsageId(requestId, "marketing.image"),
    caption: `${sample.content}\n\n${marketingContactFooter(branding)}`,
    noDraftOrPublication: true,
  };
  results.push(result);
  await fs.writeFile(
    `${folder}/results${suffix ? `-${suffix}` : ""}.json`,
    JSON.stringify(results, null, 2),
  );
  console.log(JSON.stringify({ completed: sample.key, filename }));
}
process.exit(0);
