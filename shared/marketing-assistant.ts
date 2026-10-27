type Profile = {
  workload: string;
  provider: "gemini" | "manus";
  model: string;
  enabled: boolean;
};
export function configuredMarketingAssistant(profiles: readonly Profile[]) {
  const text = profiles.find(
    (profile) => profile.workload === "marketing.text",
  );
  const image = profiles.find(
    (profile) => profile.workload === "marketing.image",
  );
  if (!text?.enabled || !image?.enabled || text.provider !== image.provider)
    return undefined;
  if (text.provider === "gemini")
    return {
      provider: "gemini" as const,
      model: text.model,
      imageModel: image.model,
    };
  if (
    !["standard", "lite", "max"].includes(text.model) ||
    image.model !== text.model
  )
    return undefined;
  return {
    provider: "manus" as const,
    model: text.model as "standard" | "lite" | "max",
  };
}
export function marketingAssistantValue(
  assistant: NonNullable<ReturnType<typeof configuredMarketingAssistant>>,
) {
  return assistant.provider === "gemini"
    ? `gemini:${assistant.model}|${assistant.imageModel}`
    : `manus:${assistant.model}`;
}
