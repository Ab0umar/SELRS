/**
 * Marketing image generation service.
 *
 * Priority:
 *   1. Existing Forge API (BUILT_IN_FORGE_API_URL + BUILT_IN_FORGE_API_KEY)
 *   2. Gemini image generation (GEMINI_API_KEY) — gemini-2.0-flash-preview-image-generation
 *   3. Throws MarketingImageConfigError when neither is configured
 *
 * Storage:
 *   - Forge path: handled internally by generateImage() → storagePut() → returns URL
 *   - Gemini path: returns inline base64 bytes → saves to uploads/marketing/ → /uploads/marketing/<file>
 */

import fs from "node:fs/promises";
import path from "node:path";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { ENV } from "../../_core/env";
import { generateImage as forgeGenerateImage } from "../../_core/imageGeneration";

export class MarketingImageConfigError extends Error {
  constructor() {
    super(
      "No image generation API configured. " +
        "Set GEMINI_API_KEY or BUILT_IN_FORGE_API_URL + BUILT_IN_FORGE_API_KEY."
    );
    this.name = "MarketingImageConfigError";
  }
}

// ─── Local disk storage ───────────────────────────────────────────────────────

function getLocalImageDir(): string {
  return ENV.marketingImageDir || path.resolve(process.cwd(), "uploads", "marketing");
}

async function saveImageLocally(buffer: Buffer, mimeType: string, postId: number): Promise<string> {
  const dir = getLocalImageDir();
  await fs.mkdir(dir, { recursive: true });
  const ext = mimeType === "image/png" ? "png" : mimeType === "image/webp" ? "webp" : "jpg";
  const filename = `${postId}-${Date.now()}.${ext}`;
  await fs.writeFile(path.join(dir, filename), buffer);
  return `/uploads/marketing/${filename}`;
}

// ─── Gemini image generation ──────────────────────────────────────────────────

async function generateWithGemini(prompt: string, postId: number): Promise<string> {
  const genAI = new GoogleGenerativeAI(ENV.geminiApiKey);

  const model = genAI.getGenerativeModel({
    model: "gemini-2.0-flash-preview-image-generation",
    // responseModalities not yet typed in @google/generative-ai 0.24.x but required for image output
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    generationConfig: { responseModalities: ["IMAGE"] } as any,
  });

  const result = await model.generateContent(prompt);
  const candidates = result.response.candidates ?? [];

  for (const candidate of candidates) {
    for (const part of candidate.content.parts) {
      if (part.inlineData?.data && part.inlineData?.mimeType) {
        const buffer = Buffer.from(part.inlineData.data, "base64");
        return saveImageLocally(buffer, part.inlineData.mimeType, postId);
      }
    }
  }

  throw new Error("Gemini returned no image data — check model availability in your region");
}

// ─── Public API ───────────────────────────────────────────────────────────────

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

  // Priority 2: Gemini image generation
  if (ENV.geminiApiKey) {
    return generateWithGemini(imagePrompt, postId);
  }

  throw new MarketingImageConfigError();
}
