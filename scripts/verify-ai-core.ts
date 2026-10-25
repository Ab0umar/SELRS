import "dotenv/config";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { z } from "zod";
import {
  AiGateway,
  AiGatewayError,
  type AiUsage,
} from "../server/services/ai/gateway";

const directory = path.resolve(
  "outputs/ai-core-verification",
  new Date().toISOString().replace(/[:.]/g, "-"),
);
const events: AiUsage[] = [];
const gateway = new AiGateway((event) => events.push(event));
const report: Record<string, unknown> = {
  stage: "core-only",
  synthetic: true,
  consumersMigrated: false,
};
await mkdir(directory, { recursive: true });
if (!process.argv.includes("--image-only"))
  try {
    report.text = await gateway.generateJson({
      workload: "marketing.text",
      instruction: "Return only the requested JSON. No external actions.",
      input:
        'Synthetic integration test. Return {"ok":true,"message":"اختبار الاتصال"}.',
      schema: z
        .object({ ok: z.literal(true), message: z.string().min(1) })
        .strict(),
      jsonSchema: {
        type: "object",
        properties: { ok: { type: "boolean" }, message: { type: "string" } },
        required: ["ok", "message"],
        additionalProperties: false,
      },
    });
  } catch (error) {
    report.textError =
      error instanceof AiGatewayError ? error.message : "verification_failed";
  }
if (process.argv.includes("--image") || process.argv.includes("--image-only")) {
  try {
    const image = await gateway.generateImage({
      workload: "marketing.image",
      instruction:
        "Generate one real square image. No text, logos, people or private data.",
      input:
        "A photorealistic clean empty eye clinic reception, soft blue and white palette, natural daylight. This is a synthetic software integration test.",
    });
    const filename = `gemini-test.${image.mimeType === "image/jpeg" ? "jpg" : image.mimeType.split("/")[1]}`;
    await writeFile(path.join(directory, filename), image.bytes);
    report.image = {
      filename,
      mimeType: image.mimeType,
      bytes: image.bytes.length,
    };
  } catch (error) {
    report.imageError =
      error instanceof AiGatewayError ? error.message : "verification_failed";
  }
}
report.events = events;
report.directory = directory;
await writeFile(
  path.join(directory, "report.json"),
  JSON.stringify(report, null, 2),
);
console.log(JSON.stringify(report));
if (report.textError || report.imageError) process.exitCode = 1;
