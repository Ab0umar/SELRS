/**
 * Marketing image generation service.
 *
 * Priority:
 *   1. Forge API (BUILT_IN_FORGE_API_URL + BUILT_IN_FORGE_API_KEY)
 *   2. OpenAI gpt-image-1 (OPENAI_API_KEY)
 *   3. Throws MarketingImageConfigError when neither is configured
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
        "Set OPENAI_API_KEY or BUILT_IN_FORGE_API_URL + BUILT_IN_FORGE_API_KEY."
    );
    this.name = "MarketingImageConfigError";
  }
}

// ─── Local disk storage ───────────────────────────────────────────────────────

function getLocalImageDir(): string {
  return ENV.marketingImageDir || path.resolve(process.cwd(), "uploads", "marketing");
}

async function saveImageLocally(buffer: Buffer, postId: number): Promise<string> {
  const dir = getLocalImageDir();
  await fs.mkdir(dir, { recursive: true });
  const filename = `${postId}-${Date.now()}.png`;
  await fs.writeFile(path.join(dir, filename), buffer);
  return `/uploads/marketing/${filename}`;
}

// ─── DALL-E 3 generation ──────────────────────────────────────────────────────

async function generateWithOpenAI(prompt: string, postId: number): Promise<string> {
  const client = new OpenAI({ apiKey: ENV.openaiApiKey });

  const response = await client.images.generate({
    model: "gpt-image-1",
    prompt,
    n: 1,
    size: "1024x1024",
    quality: "medium",
  });

  const item = response.data?.[0];
  if (!item) throw new Error("gpt-image-1 returned no image data");

  if (item.b64_json) {
    const buffer = Buffer.from(item.b64_json, "base64");
    return saveImageLocally(buffer, postId);
  }

  if (item.url) {
    const res = await fetch(item.url);
    if (!res.ok) throw new Error(`Failed to download image: ${res.status}`);
    const buffer = Buffer.from(await res.arrayBuffer());
    return saveImageLocally(buffer, postId);
  }

  throw new Error("gpt-image-1 returned neither url nor b64_json");
}

// ─── Public API ───────────────────────────────────────────────────────────────

export async function generateMarketingImage(
  imagePrompt: string,
  postId: number
): Promise<string> {
  // Priority 1: Forge API
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
