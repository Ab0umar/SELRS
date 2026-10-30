export const GROK_TEXT_MODEL = "grok-4.7";
export const GROK_IMAGE_MODEL = "grok-imagine-image-2.0";
export function isMarketingWorkload(workload: string) {
  return workload === "marketing.text" || workload === "marketing.image";
}
export function marketingModelProvider(model: string): "gemini" | "grok" {
  if (/^grok-[a-z0-9.-]+$/.test(model)) return "grok";
  if (/^gemini-[a-z0-9.-]+$/.test(model)) return "gemini";
  throw new Error("Unsupported marketing model");
}
