/**
 * Marketing image generation service.
 *
 * Priority:
 *   1. Forge API (BUILT_IN_FORGE_API_URL + BUILT_IN_FORGE_API_KEY)
 *   2. OpenAI gpt-image-1 with brand reference images via edit endpoint
 *   3. OpenAI gpt-image-1 text-only fallback
 *   4. Throws MarketingImageConfigError when neither is configured
 *
 * Note: Gemini image generation is country-restricted (unavailable in Egypt).
 * gpt-image-1 returns b64_json — saved directly to disk.
 */

import fs from "node:fs/promises";
import path from "node:path";
import OpenAI from "openai";
import { ENV } from "../../_core/env";
import { generateImage as forgeGenerateImage } from "../../_core/imageGeneration";

export class MarketingImageConfigError extends Error {
  constructor() {
    super(
      "No image generation API configured. " +
        "Set OPENAI_API_KEY or BUILT_IN_FORGE_API_URL + BUILT_IN_FORGE_API_KEY.",
    );
    this.name = "MarketingImageConfigError";
  }
}

// ─── Local disk storage ───────────────────────────────────────────────────────

function getLocalImageDir(): string {
  return (
    ENV.marketingImageDir || path.resolve(process.cwd(), "uploads", "marketing")
  );
}

async function saveImageLocally(
  buffer: Buffer,
  postId: number,
): Promise<string> {
  const dir = getLocalImageDir();
  await fs.mkdir(dir, { recursive: true });
  const filename = `${postId}-${Date.now()}.png`;
  await fs.writeFile(path.join(dir, filename), buffer);
  return `/uploads/marketing/${filename}`;
}

// ─── OpenAI image generation ──────────────────────────────────────────────────

async function generateWithOpenAI(
  prompt: string,
  postId: number,
  referenceImagePaths: string[],
): Promise<string> {
  const client = new OpenAI({ apiKey: ENV.openaiApiKey });

  // When reference brand designs are available, pass ALL of them to the edit
  // endpoint so gpt-image-1 can extract a consistent brand style from all samples.
  if (referenceImagePaths.length > 0) {
    try {
      const imageFiles = await Promise.all(
        referenceImagePaths.slice(0, 16).map(async (fp) => {
          const buf = await fs.readFile(fp);
          const ext = path.extname(fp).toLowerCase().replace(".", "") || "png";
          const mime = ext === "jpg" || ext === "jpeg" ? "image/jpeg" : "image/png";
          return OpenAI.toFile(buf, path.basename(fp), { type: mime });
        }),
      );

      const stylePrompt =
        `You are provided with ${imageFiles.length} brand reference design(s) from an Arabic ophthalmology medical center. ` +
        `Study their visual style carefully: color palette, layout composition, lighting, photography style, and overall aesthetic. ` +
        `Now generate a COMPLETELY NEW professional medical marketing image for the following topic, ` +
        `designed to look like it belongs to the SAME brand family as the reference designs — ` +
        `same colors, same visual language, same quality level. ` +
        `Topic: ${prompt} ` +
        `Requirements: no text, no Arabic writing, no watermarks, photorealistic, ultra high quality.`;

      const editResponse = await (client.images as any).edit({
        model: "gpt-image-1",
        image: imageFiles.length === 1 ? imageFiles[0] : imageFiles,
        prompt: stylePrompt,
        n: 1,
        size: "1024x1024",
        quality: "high",
      });

      const item = editResponse.data?.[0];
      if (item?.b64_json) {
        const buffer = Buffer.from(item.b64_json, "base64");
        return saveImageLocally(buffer, postId);
      }
      if (item?.url) {
        const res = await fetch(item.url);
        if (!res.ok) throw new Error(`Failed to download image: ${res.status}`);
        const buffer = Buffer.from(await res.arrayBuffer());
        return saveImageLocally(buffer, postId);
      }
    } catch (err) {
      console.warn("[marketing] Brand-reference edit failed, falling back to text-only:", String(err));
    }
  }

  // Fallback: text-only generation
  const response = await client.images.generate({
    model: "gpt-image-1",
    prompt,
    n: 1,
    size: "1024x1024",
    quality: "high",
  });

  const item = response.data?.[0];
  if (!item) throw new Error("gpt-image-1 returned no image data");

  if ((item as any).b64_json) {
    const buffer = Buffer.from((item as any).b64_json, "base64");
    return saveImageLocally(buffer, postId);
  }

  if (item.url) {
    const res = await fetch(item.url);
    if (!res.ok) throw new Error(`Failed to download image: ${res.status}`);
    const buffer = Buffer.from(await res.arrayBuffer());
    return saveImageLocally(buffer, postId);
  }

  throw new Error("gpt-image-1 returned no image data");
}

// ─── Public API ───────────────────────────────────────────────────────────────

export async function generateMarketingImage(
  imagePrompt: string,
  postId: number,
  referenceImagePaths: string[] = [],
): Promise<string> {
  // Priority 1: Forge API
  if (ENV.forgeApiUrl && ENV.forgeApiKey) {
    const result = await forgeGenerateImage({ prompt: imagePrompt });
    if (!result.url) throw new Error("Forge image generation returned no URL");
    return result.url;
  }

  // Priority 2: OpenAI gpt-image-1
  if (ENV.openaiApiKey) {
    return generateWithOpenAI(imagePrompt, postId, referenceImagePaths);
  }

  throw new MarketingImageConfigError();
}
