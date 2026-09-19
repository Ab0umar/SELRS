/**
 * Marketing image generation service.
 *
 * Priority:
 *   1. fal.ai FLUX Redux (brand-reference style transfer — best brand consistency)
 *   2. Forge API
 *   3. OpenAI gpt-image-1 with brand reference images via edit endpoint
 *   4. OpenAI gpt-image-1 text-only fallback
 *
 * Note: Gemini image generation is country-restricted (unavailable in Egypt).
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
        "Set FAL_API_KEY, OPENAI_API_KEY, or BUILT_IN_FORGE_API_URL + BUILT_IN_FORGE_API_KEY.",
    );
    this.name = "MarketingImageConfigError";
  }
}

export class MarketingImageProviderError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "MarketingImageProviderError";
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

async function downloadToBuffer(url: string): Promise<Buffer> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Download failed: ${res.status} ${url}`);
  return Buffer.from(await res.arrayBuffer());
}

// ─── fal.ai FLUX Redux ────────────────────────────────────────────────────────
// FLUX Redux takes a reference image + prompt and generates a new image that
// inherits the visual style/colors/aesthetic of the reference while following
// the prompt for content. Perfect for brand-consistent image generation.

async function generateWithFal(
  prompt: string,
  postId: number,
  referenceImagePaths: string[],
): Promise<string> {
  const availableReferencePaths =
    await existingReferencePaths(referenceImagePaths);
  const hasReference = availableReferencePaths.length > 0;
  const reference = hasReference
    ? await falReferenceImage(availableReferencePaths)
    : null;
  const body = hasReference
    ? {
        image_url: reference,
        prompt: `Create a brand-new professional medical marketing photograph for an Arabic ophthalmology center. The image must show: ${prompt}. Generate completely new content — do NOT reproduce text, logos, or specific elements from the reference image. Match ONLY its visual style: color palette, lighting quality, composition style, and overall aesthetic feel.`,
        image_size: "square_hd",
        num_inference_steps: 28,
        guidance_scale: 2.5,
      }
    : {
        prompt: `Professional, photorealistic medical marketing image for an Arabic ophthalmology center. ${prompt}. No text, no Arabic writing, no logo, no watermark.`,
        image_size: "square_hd",
      };

  const res = await fetch(
    hasReference
      ? "https://fal.run/fal-ai/flux-pro/v1/redux"
      : "https://fal.run/fal-ai/flux-pro/v1.1",
    {
      method: "POST",
      headers: {
        Authorization: `Key ${ENV.falApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    },
  );

  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText);
    if (res.status === 401 || res.status === 403) {
      throw new MarketingImageProviderError(
        "تعذر استخدام fal.ai: مفتاح FAL_API_KEY غير صالح أو تم إلغاؤه. أنشئ مفتاحًا جديدًا من fal.ai ثم حدّثه على الخادم.",
      );
    }
    throw new Error(`fal.ai error ${res.status}: ${text}`);
  }

  const data = (await res.json()) as any;
  const imageUrl: string | undefined =
    data?.images?.[0]?.url ?? data?.image?.url;
  if (!imageUrl)
    throw new Error(`fal.ai returned no image URL: ${JSON.stringify(data)}`);

  const buffer = await downloadToBuffer(imageUrl);
  return saveImageLocally(buffer, postId);
}

async function existingReferencePaths(paths: string[]): Promise<string[]> {
  const availability = await Promise.all(
    paths.map(async (filePath) => {
      try {
        await fs.access(filePath);
        return filePath;
      } catch {
        return null;
      }
    }),
  );
  return availability.filter(
    (filePath): filePath is string => filePath !== null,
  );
}

async function falReferenceImage(
  referenceImagePaths: string[],
): Promise<string> {
  const refPath =
    referenceImagePaths[
      Math.floor(Math.random() * referenceImagePaths.length)
    ]!;
  const refBuffer = await fs.readFile(refPath);
  const ext = path.extname(refPath).toLowerCase();
  const mime = ext === ".jpg" || ext === ".jpeg" ? "image/jpeg" : "image/png";
  return `data:${mime};base64,${refBuffer.toString("base64")}`;
}

// ─── OpenAI gpt-image-1 ───────────────────────────────────────────────────────

async function generateWithOpenAI(
  prompt: string,
  postId: number,
  referenceImagePaths: string[],
): Promise<string> {
  const client = new OpenAI({ apiKey: ENV.openaiApiKey });

  if (referenceImagePaths.length > 0) {
    try {
      const imageFiles = await Promise.all(
        referenceImagePaths.slice(0, 16).map(async (fp) => {
          const buf = await fs.readFile(fp);
          const ext = path.extname(fp).toLowerCase().replace(".", "") || "png";
          const mime =
            ext === "jpg" || ext === "jpeg" ? "image/jpeg" : "image/png";
          return OpenAI.toFile(buf, path.basename(fp), { type: mime });
        }),
      );

      const stylePrompt =
        `You are provided with ${imageFiles.length} brand reference design(s) from an Arabic ophthalmology medical center. ` +
        `Study their visual style: color palette, layout, lighting, photography style, and aesthetic. ` +
        `Generate a COMPLETELY NEW professional medical marketing image for this topic: ${prompt}. ` +
        `The new image must look like it belongs to the same brand family. ` +
        `No text, no Arabic writing, no watermarks, photorealistic, ultra high quality.`;

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
        return saveImageLocally(Buffer.from(item.b64_json, "base64"), postId);
      }
      if (item?.url) {
        return saveImageLocally(await downloadToBuffer(item.url), postId);
      }
    } catch (err) {
      console.warn(
        "[marketing] OpenAI brand-reference edit failed, falling back to text-only:",
        String(err),
      );
    }
  }

  const response = await client.images.generate({
    model: "gpt-image-1",
    prompt,
    n: 1,
    size: "1024x1024",
    quality: "high",
  });

  const item = response.data?.[0];
  if (!item) throw new Error("gpt-image-1 returned no image data");
  if ((item as any).b64_json)
    return saveImageLocally(
      Buffer.from((item as any).b64_json, "base64"),
      postId,
    );
  if (item.url)
    return saveImageLocally(await downloadToBuffer(item.url), postId);
  throw new Error("gpt-image-1 returned no image data");
}

// ─── Public API ───────────────────────────────────────────────────────────────

export async function generateMarketingImage(
  imagePrompt: string,
  postId: number,
  referenceImagePaths: string[] = [],
): Promise<string> {
  const availableReferencePaths =
    await existingReferencePaths(referenceImagePaths);

  // Priority 1: fal.ai FLUX Redux — best brand-style consistency
  if (ENV.falApiKey) {
    try {
      return await generateWithFal(
        imagePrompt,
        postId,
        availableReferencePaths,
      );
    } catch (err) {
      if (err instanceof MarketingImageProviderError) throw err;
      console.warn(
        "[marketing] fal.ai failed, falling back to next option:",
        String(err),
      );
    }
  }

  // Priority 2: Forge API
  if (ENV.forgeApiUrl && ENV.forgeApiKey) {
    const result = await forgeGenerateImage({ prompt: imagePrompt });
    if (!result.url) throw new Error("Forge image generation returned no URL");
    return result.url;
  }

  // Priority 3: OpenAI gpt-image-1
  if (ENV.openaiApiKey) {
    return generateWithOpenAI(imagePrompt, postId, availableReferencePaths);
  }

  throw new MarketingImageConfigError();
}
