export const MARKETING_IMAGE_PEOPLE_POLICY =
  "Mandatory marketing brand rule: no women or girls anywhere in the image. " +
  "Do not depict female patients, doctors, nurses, receptionists, children, faces, portraits, silhouettes, reflections, background figures or illustrations. " +
  "Prefer the topic-specific anatomical illustration or real ophthalmology device specified in the clinical visual brief. An empty clinic, abstract eye symbol or beauty-eye portrait must not replace the medical subject. " +
  "If a person is essential to the topic, depict males only. Do not use feminine eye portraits or cosmetic/makeup imagery. " +
  "This rule overrides any conflicting subject in the topic, old post, suggested image prompt, brand description or reference image. " +
  "Reference images supply palette and visual style only; never copy their people or subjects.";

export function marketingImagePrompt(visualBrief: string): string {
  return `${visualBrief}\n\n${MARKETING_IMAGE_PEOPLE_POLICY}`;
}
