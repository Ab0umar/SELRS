export const MARKETING_IMAGE_PEOPLE_POLICY =
  "Mandatory marketing brand rule: no women or girls anywhere in the image. " +
  "Do not depict female patients, doctors, nurses, receptionists, children, faces, portraits, silhouettes, reflections, background figures or illustrations. " +
  "Prefer ophthalmology equipment, anatomical diagrams, abstract eye-health visuals or empty clinic spaces without people. " +
  "If a person is essential to the topic, depict males only. Do not use feminine eye portraits or cosmetic/makeup imagery. " +
  "This rule overrides any conflicting subject in the topic, old post, suggested image prompt, brand description or reference image. " +
  "Reference images supply palette and visual style only; never copy their people or subjects.";

export function marketingImagePrompt(visualBrief: string): string {
  return `${visualBrief}\n\n${MARKETING_IMAGE_PEOPLE_POLICY}`;
}
