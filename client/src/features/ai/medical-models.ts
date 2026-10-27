import type { AssistantOption } from "./AssistantModelSelect";

export function medicalModelOptions(options?: {
  gemini?: {
    clinicalEnabled?: boolean;
    configured?: boolean;
    model?: string;
    models?: Array<{ id: string; label: string }>;
  };
}): AssistantOption[] {
  const result: AssistantOption[] = ["standard", "lite", "max"].map(
    (model) => ({ value: `manus:${model}`, label: `Manus · ${model}` }),
  );
  const models = new Map(
    (options?.gemini?.models ?? []).map((model) => [model.id, model.label]),
  );
  if (options?.gemini?.model)
    models.set(options.gemini.model, options.gemini.model);
  if (!models.size) models.set("unavailable", "بانتظار إعداد المساعد");
  for (const [id, label] of models)
    result.push({
      value: `gemini:${id}`,
      label: `Gemini · ${label}`,
      disabled: !options?.gemini?.clinicalEnabled || !options.gemini.configured,
    });
  return result;
}
