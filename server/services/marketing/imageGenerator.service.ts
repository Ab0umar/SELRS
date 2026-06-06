/**
 * Marketing image generation service.
 *
 * Priority:
 *   1. Existing Forge API (BUILT_IN_FORGE_API_URL + BUILT_IN_FORGE_API_KEY)
 *   2. OpenAI DALL-E 3 (OPENAI_API_KEY)
 *   3. Throws MarketingImageConfigError when neither is configured
 *
 * Storage:
 *   - Forge path: handled internally by generateImage() → storagePut() → returns URL
 *   - OpenAI path: downloads image bytes → saves to <cwd>/uploads/marketing/ →
 *     returns /uploads/marketing/<filename> (served as static by Express)
 */

import fs from "node:fs/promises";
import path from "node:path";
import { ENV } from "../../_core/env";
import { generateImage as forgeGenerateImage } from "../../_core/imageGeneration";

export class MarketingImageConfigError extends Error {
  constructor() {
    super(
      "No image generation API configured. " +
        "Set OPENAI_API_KEY (DALL-E 3) or BUILT_IN_FORGE_API_URL + BUILT_IN_FORGE_API_KEY."
    );
    this.name = "MarketingImageConfigError";
  }
}

// ─── Local-disk storage (OpenAI path) ────────────────────────────────────────

function getLocalImageDir(): string {
  return (
    ENV.marketingImageDir ||
    path.resolve(process.cwd(), "uploads", "marketing")
  );
}

async function saveImageLocally(
  buffer: Buffer,
  ext: string,
  postId: number
): Promise<string> {
  const dir = getLocalImageDir();
  await fs.mkdir(dir, { recursive: true });
  const filename = `${postId}-${Date.now()}.${ext}`;
  await fs.writeFile(path.join(dir, filename), buffer);
  return `/uploads/marketing/${filename}`;
}

// ─── OpenAI DALL-E 3 ─────────────────────────────────────────────────────────

async function generateWithOpenAI(prompt: string, postId: number): Promise<string> {
  const { default: OpenAI } = await import("openai");
  const client = new OpenAI({ apiKey: ENV.openaiApiKey });

  const response = await client.images.generate({
    model: "dall-e-3",
    prompt,
    n: 1,
    size: "1024x1024",
    quality: "standard",
    response_format: "url",
  });

  const imageUrl = response.data?.[0]?.url;
  if (!imageUrl) throw new Error("DALL-E 3 returned no image URL");

  // Download the image (DALL-E URLs expire in ~1h)
  const fetched = await fetch(imageUrl);
  if (!fetched.ok) throw new Error(`Failed to download DALL-E image: ${fetched.status}`);
  const buffer = Buffer.from(await fetched.arrayBuffer());

  return saveImageLocally(buffer, "png", postId);
}

// ─── Public API ──────────────────────────────────────────────────────────────

export async function generateMarketingImage(
  imagePrompt: string,
  postId: number
): Promise<string> {
  // Priority 1: Forge API (existing SRV100 pattern)
  if (ENV.forgeApiUrl && ENV.forgeApiKey) {
    const result = await forgeGenerateImage({ prompt: imagePrompt });
    if (!result.url) throw new Error("Forge image generation returned no URL");
    return result.url;
  }

  // Priority 2: OpenAI DALL-E 3
  if (ENV.openaiApiKey) {
    return generateWithOpenAI(imagePrompt, postId);
  }

  throw new MarketingImageConfigError();
}
