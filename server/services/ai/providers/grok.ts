import { z } from "zod";

export class GrokRequestError extends Error {
  constructor(readonly status?: number) {
    super("Grok request failed");
  }
}
export type GrokOutput = {
  text?: string;
  image?: { bytes: Buffer; mimeType: string };
  inputTokens: number;
  outputTokens: number;
  usageKnown: boolean;
};
export async function requestGrok(input: {
  model: string;
  image: boolean;
  instruction: string;
  input: string;
  references?: Array<{ bytes: Buffer; mimeType: string }>;
}): Promise<GrokOutput> {
  const imageRequest = input.image;
  const body = imageRequest
    ? {
        model: input.model,
        prompt: `${input.instruction}\n\nReference content:\n${input.input}`,
        n: 1,
        aspect_ratio: "1:1",
        resolution: "1k",
        response_format: "b64_json",
      }
    : {
        model: input.model,
        messages: [
          {
            role: "system",
            content: `${input.instruction}\nReturn only the requested JSON object.`,
          },
          {
            role: "user",
            content: [
              { type: "text", text: input.input },
              ...(input.references ?? []).map((image) => ({
                type: "image_url",
                image_url: {
                  url: `data:${image.mimeType};base64,${image.bytes.toString("base64")}`,
                },
              })),
            ],
          },
        ],
        response_format: { type: "json_object" },
        max_tokens: 5000,
      };
  let response: Response;
  try {
    response = await fetch(
      `https://api.x.ai/v1/${imageRequest ? "images/generations" : "chat/completions"}`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.XAI_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(imageRequest ? 180000 : 120000),
        redirect: "error",
      },
    );
  } catch {
    throw new GrokRequestError();
  }
  if (!response.ok) {
    await response.body?.cancel();
    throw new GrokRequestError(response.status);
  }
  if (!response.body) throw new GrokRequestError();
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let length = 0;
  try {
    for (;;) {
      const part = await reader.read();
      if (part.done) break;
      length += part.value.byteLength;
      if (length > 30 * 1024 * 1024) {
        await reader.cancel();
        throw new GrokRequestError();
      }
      chunks.push(part.value);
    }
  } catch {
    throw new GrokRequestError();
  }
  const raw: unknown = JSON.parse(Buffer.concat(chunks).toString("utf8"));
  const result = z
    .object({
      choices: z
        .array(
          z.object({
            finish_reason: z.string(),
            message: z.object({ content: z.string().nullable() }),
          }),
        )
        .optional(),
      data: z
        .array(
          z.object({
            b64_json: z.string().max(28_000_000).optional(),
            respect_moderation: z.boolean().optional(),
          }),
        )
        .optional(),
      usage: z
        .object({
          prompt_tokens: z.number().int().nonnegative(),
          completion_tokens: z.number().int().nonnegative(),
        })
        .optional()
        .catch(undefined),
    })
    .parse(raw);
  const output: GrokOutput = {
    inputTokens: result.usage?.prompt_tokens ?? 0,
    outputTokens: result.usage?.completion_tokens ?? 0,
    usageKnown: Boolean(result.usage),
  };
  if (!imageRequest) {
    if (
      result.choices?.[0]?.finish_reason !== "stop" ||
      !result.choices[0].message.content
    )
      throw new GrokRequestError();
    return { ...output, text: result.choices[0].message.content };
  }
  const image = result.data?.[0];
  if (!image?.b64_json || image.respect_moderation === false)
    throw new GrokRequestError();
  const bytes = Buffer.from(image.b64_json, "base64");
  if (bytes.length < 32 || bytes.length > 20 * 1024 * 1024)
    throw new GrokRequestError();
  const mimeType = bytes
    .subarray(0, 8)
    .equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
    ? "image/png"
    : bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255
      ? "image/jpeg"
      : bytes.toString("ascii", 0, 4) === "RIFF" &&
          bytes.toString("ascii", 8, 12) === "WEBP"
        ? "image/webp"
        : null;
  if (!mimeType) throw new GrokRequestError();
  return { ...output, image: { bytes, mimeType } };
}
