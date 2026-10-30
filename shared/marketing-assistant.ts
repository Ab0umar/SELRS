type Profile = {
  workload: string;
  provider: "gemini" | "manus" | "grok";
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
  if (text.provider === "gemini" || text.provider === "grok")
    return {
      provider: text.provider,
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
  return assistant.provider !== "manus"
    ? `${assistant.provider}:${assistant.model}|${assistant.imageModel}`
    : `manus:${assistant.model}`;
}
