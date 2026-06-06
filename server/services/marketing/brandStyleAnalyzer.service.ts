/**
 * Brand Style Analyzer Service
 *
 * Uses Gemini 1.5 Flash vision to analyze uploaded reference marketing designs
 * and extract a structured brand style profile.
 *
 * Falls back gracefully when GEMINI_API_KEY is not set — returns null so
 * callers can store the design without analysis and skip brand-aware prompts.
 */

import fs from "node:fs/promises";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { ENV } from "../../_core/env";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface StyleAttributes {
  dominantColors: string[];
  colorMood: string;
  layoutStyle: string;
  imageComposition: string;
  brandingStyle: string;
  medicalVisualStyle: string;
  ctaPositioning: string;
  logoPlacementStyle: string;
  typographyStyle: string;
  overallAesthetic: string;
}

export interface BrandProfile {
  dominantColors: string;
  colorPalette: string;
  layoutStyle: string;
  imageComposition: string;
  brandingStyle: string;
  medicalVisualStyle: string;
  ctaPositioning: string;
  logoPlacementStyle: string;
  overallAesthetic: string;
  designCount: number;
  rawProfile: string;
}

// ─── Analysis prompt ──────────────────────────────────────────────────────────

const ANALYSIS_PROMPT = `You are a professional brand analyst and visual designer specializing in medical marketing.

Analyze this marketing design image for an ophthalmology medical center and extract the following brand style attributes as a JSON object.

Return ONLY a valid JSON object with these exact keys:
{
  "dominantColors": ["list of hex codes or color names, e.g. #1a3a5c, white, gold"],
  "colorMood": "one sentence describing the emotional tone of the color palette",
  "layoutStyle": "describe the layout: grid/centered/asymmetric/full-bleed, whitespace usage, hierarchy",
  "imageComposition": "describe how images are positioned, cropped, and relate to text",
  "brandingStyle": "overall brand personality: clinical/warm/luxury/modern/traditional/etc",
  "medicalVisualStyle": "type of visuals used: real photography/illustrations/icons/abstract/clinical shots",
  "ctaPositioning": "describe where and how call-to-action elements appear",
  "logoPlacementStyle": "logo position, size relative to design, background treatment",
  "typographyStyle": "font personality, Arabic/Latin mix, weight hierarchy, size contrast",
  "overallAesthetic": "one paragraph describing the complete visual identity and what makes this brand recognizable"
}`;

// ─── Single image analysis ────────────────────────────────────────────────────

export async function analyzeDesignImage(
  filePath: string,
  mimeType: string
): Promise<StyleAttributes | null> {
  if (!ENV.geminiApiKey) {
    console.warn("[brand-analyzer] GEMINI_API_KEY not set — skipping analysis");
    return null;
  }

  let imageData: string;
  try {
    const buffer = await fs.readFile(filePath);
    imageData = buffer.toString("base64");
  } catch (err) {
    console.error("[brand-analyzer] Failed to read image file:", err);
    return null;
  }

  try {
    const genAI = new GoogleGenerativeAI(ENV.geminiApiKey);
    const model = genAI.getGenerativeModel({
      model: "gemini-2.0-flash",
      generationConfig: {
        temperature: 0.3,
        maxOutputTokens: 1024,
        responseMimeType: "application/json",
      },
    });

    const result = await model.generateContent([
      ANALYSIS_PROMPT,
      {
        inlineData: {
          mimeType: mimeType as "image/jpeg" | "image/png" | "image/webp",
          data: imageData,
        },
      },
    ]);

    const text = result.response.text();
    const cleaned = text
      .replace(/^```json\s*/i, "")
      .replace(/^```\s*/i, "")
      .replace(/```\s*$/i, "")
      .trim();

    const parsed = JSON.parse(cleaned) as StyleAttributes;
    return parsed;
  } catch (err) {
    console.error("[brand-analyzer] Gemini Vision analysis failed:", err);
    return null;
  }
}

// ─── Aggregate into brand profile ────────────────────────────────────────────

const AGGREGATION_PROMPT = (analyses: StyleAttributes[]): string =>
  `You are a brand strategist for a medical ophthalmology center.

Below are style analyses from ${analyses.length} reference marketing designs from the same brand:

${JSON.stringify(analyses, null, 2)}

Synthesize these into a single unified brand profile. Identify consistent patterns, ignore one-off anomalies.

Return ONLY a valid JSON object:
{
  "dominantColors": "comma-separated list of 3-5 core brand colors",
  "colorPalette": "one sentence describing the overall color strategy",
  "layoutStyle": "unified description of the brand's typical layout approach",
  "imageComposition": "how this brand typically uses images in their designs",
  "brandingStyle": "the brand's overall personality and positioning",
  "medicalVisualStyle": "what types of medical visuals define this brand",
  "ctaPositioning": "where and how this brand places calls to action",
  "logoPlacementStyle": "the brand's logo usage conventions",
  "overallAesthetic": "a 2-3 sentence description that a designer could use to create new on-brand designs without seeing the originals"
}`;

export async function buildBrandProfile(
  analyses: StyleAttributes[],
  designCount: number
): Promise<BrandProfile | null> {
  if (analyses.length === 0) return null;

  // With only one design, use it directly
  if (analyses.length === 1) {
    const a = analyses[0]!;
    const profile: BrandProfile = {
      dominantColors: a.dominantColors.join(", "),
      colorPalette: a.colorMood,
      layoutStyle: a.layoutStyle,
      imageComposition: a.imageComposition,
      brandingStyle: a.brandingStyle,
      medicalVisualStyle: a.medicalVisualStyle,
      ctaPositioning: a.ctaPositioning,
      logoPlacementStyle: a.logoPlacementStyle,
      overallAesthetic: a.overallAesthetic,
      designCount,
      rawProfile: JSON.stringify(analyses),
    };
    return profile;
  }

  if (!ENV.geminiApiKey) {
    // Simple aggregation without AI
    const allColors = analyses.flatMap((a) => a.dominantColors).slice(0, 5);
    const profile: BrandProfile = {
      dominantColors: [...new Set(allColors)].join(", "),
      colorPalette: analyses[0]!.colorMood,
      layoutStyle: analyses[0]!.layoutStyle,
      imageComposition: analyses[0]!.imageComposition,
      brandingStyle: analyses[0]!.brandingStyle,
      medicalVisualStyle: analyses[0]!.medicalVisualStyle,
      ctaPositioning: analyses[0]!.ctaPositioning,
      logoPlacementStyle: analyses[0]!.logoPlacementStyle,
      overallAesthetic: analyses[0]!.overallAesthetic,
      designCount,
      rawProfile: JSON.stringify(analyses),
    };
    return profile;
  }

  try {
    const genAI = new GoogleGenerativeAI(ENV.geminiApiKey);
    const model = genAI.getGenerativeModel({
      model: "gemini-2.0-flash",
      generationConfig: {
        temperature: 0.2,
        maxOutputTokens: 1024,
        responseMimeType: "application/json",
      },
    });

    const result = await model.generateContent(AGGREGATION_PROMPT(analyses));
    const text = result.response.text();
    const cleaned = text
      .replace(/^```json\s*/i, "")
      .replace(/^```\s*/i, "")
      .replace(/```\s*$/i, "")
      .trim();

    const agg = JSON.parse(cleaned) as Omit<BrandProfile, "designCount" | "rawProfile">;
    return {
      ...agg,
      designCount,
      rawProfile: JSON.stringify(analyses),
    };
  } catch (err) {
    console.error("[brand-analyzer] Aggregation failed:", err);
    return null;
  }
}

// ─── Build brand-aware image prompt ──────────────────────────────────────────

export type PartialBrandProfile = {
  dominantColors?: string | null;
  colorPalette?: string | null;
  layoutStyle?: string | null;
  imageComposition?: string | null;
  brandingStyle?: string | null;
  medicalVisualStyle?: string | null;
  ctaPositioning?: string | null;
  overallAesthetic?: string | null;
};

export function buildBrandAwareImagePrompt(
  topic: string,
  brandProfile: PartialBrandProfile | null | undefined
): string {
  if (!brandProfile) {
    return `Professional ophthalmology clinic marketing image for topic: "${topic}". Clean medical aesthetic, blue and white tones, arabic medical center branding.`;
  }

  return `Create a professional marketing design image for an Arabic ophthalmology center.

Topic: ${topic}

STRICTLY follow this brand's visual identity (do NOT create generic medical imagery):
- Color palette: ${brandProfile.dominantColors ?? "professional blues and whites"} — ${brandProfile.colorPalette ?? "clean medical palette"}
- Layout style: ${brandProfile.layoutStyle ?? "clean, modern"}
- Image composition: ${brandProfile.imageComposition ?? "centered, professional"}
- Branding style: ${brandProfile.brandingStyle ?? "trustworthy, clinical"}
- Medical visual style: ${brandProfile.medicalVisualStyle ?? "real clinical photography"}
- CTA positioning: ${brandProfile.ctaPositioning ?? "bottom of frame"}
- Overall aesthetic: ${brandProfile.overallAesthetic ?? "clean medical ophthalmology center"}

The image should look like it belongs to the same brand family as the center's existing designs. Do NOT copy any specific design — create a fresh composition that matches the brand DNA.
No text overlay needed (text will be added separately). Focus on the visual composition and mood.`.trim();
}
