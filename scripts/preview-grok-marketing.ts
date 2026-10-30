import "dotenv/config";
import fs from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import { composeMarketingPageLogo } from "../server/services/marketing/pageBranding";

if (!process.env.XAI_API_KEY) throw new Error("XAI_API_KEY is missing");
const directory = path.resolve("outputs/grok-marketing-comparison-2026-10-30");
await fs.mkdir(directory, { recursive: true });
const logo = await fs.readFile("client/public/center-logo.png");
const common = "Create a premium square Egyptian ophthalmology social media design about diabetes and retinal health. Bright clinical white, restrained navy blue and orange brand accents. One polished detailed medical illustration of the retina and its branching vessels, anatomically plausible and clearly illustrative, not a patient scan. No people, women, faces, gore, fabricated measurements, fake reports, invented devices, guaranteed outcomes or invented contact details. Keep the top-right 18 percent corner empty for an original logo composited later; do not draw a logo or page name. Use accurate readable Arabic right-to-left typography with generous spacing. No extra text beyond the exact requested Arabic copy. Educational public marketing, not personalised medical advice.";
const variants = [
  { key: "short-title", prompt: `${common} Composition: a striking single medical subject with clear visual depth, substantial clinical whitespace, one large short Arabic headline only: «السكري وصحة شبكية العين». No explanatory paragraphs or bullet points.` },
  { key: "infographic-v2", prompt: `${common} Composition: a polished cohesive infographic that combines the retinal illustration with four short highly readable Arabic information blocks, integrated as one design. Reserve a completely blank 180 by 180 pixel area at the TOP RIGHT for the logo. The headline must occupy two centred lines below y=190, never extending into this corner. Main headline on two lines: «السكري وصحة» then «شبكية العين». Subheading: «تابع صحة عينك». Exact information blocks, each ONCE and with NO repeated words: «ارتفاع السكر ممكن يؤثر على أوعية الشبكية»; «المراحل الأولى ممكن تكون من غير أعراض»; «فحص قاع العين يساعد على الاكتشاف المبكر»; «تابع السكر والضغط ومواعيد فحص العين مع طبيبك». Prioritise large legible mobile-friendly type, correct Arabic spelling, hierarchy and uncluttered spacing. Check the Arabic carefully before finishing. This replaces an earlier draft that wrongly repeated the word الموسع; do not use that word at all.` },
];
for (const variant of variants) {
  const finalPath = path.join(directory, `${variant.key}.png`);
  try { await fs.access(finalPath); console.log(`${variant.key}: existing preview retained; no paid request`); continue; } catch {}
  const marker = path.join(directory, `${variant.key}.request.json`);
  const markerHandle = await fs.open(marker, "wx");
  await markerHandle.writeFile(JSON.stringify({ model: "grok-imagine-image-2.0", startedAt: new Date().toISOString(), automaticRetry: false }));
  await markerHandle.close();
  console.log(`${variant.key}: requesting one Grok image`);
  const response = await fetch("https://api.x.ai/v1/images/generations", {
    method: "POST",
    headers: { Authorization: `Bearer ${process.env.XAI_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({ model: "grok-imagine-image-2.0", prompt: variant.prompt, n: 1, aspect_ratio: "1:1", resolution: "1k", response_format: "b64_json" }),
    signal: AbortSignal.timeout(180000),
  });
  if (!response.ok) throw new Error(`Grok HTTP ${response.status}; no automatic retry`);
  const result = await response.json() as { data?: Array<{ b64_json?: string }> };
  const encoded = result.data?.[0]?.b64_json;
  if (!encoded || encoded.length > 30_000_000) throw new Error("Grok returned no valid base64 image");
  const bytes = Buffer.from(encoded, "base64");
  await sharp(bytes, { limitInputPixels: 40_000_000 }).metadata();
  await fs.writeFile(path.join(directory, `${variant.key}-raw.png`), bytes);
  await fs.writeFile(finalPath, await composeMarketingPageLogo(bytes, logo));
  console.log(`${variant.key}: saved ${finalPath}; not published`);
}
