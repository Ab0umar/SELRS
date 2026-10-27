import { randomUUID } from "node:crypto";
import {
  GoogleGenAI,
  MediaResolution,
  type GenerateContentResponse,
  type GenerateContentConfig,
} from "@google/genai";
import { z, type ZodType } from "zod";

export type AiWorkload =
  | "reply.preview"
  | "reply.live"
  | "marketing.text"
  | "marketing.image"
  | "medical.synthetic"
  | "whatsapp.marketing"
  | "medical.documentation";
const limits = {
  "reply.preview": 2048,
  "reply.live": 2048,
  "marketing.text": 4096,
  "marketing.image": 8192,
  "medical.synthetic": 4096,
  "whatsapp.marketing": 2048,
  "medical.documentation": 0,
} as const;
const busy = new Map<AiWorkload, number>();
export class AiGatewayError extends Error {
  constructor(
    readonly code: "configuration" | "capacity" | "provider" | "invalid_output",
    readonly status?: number,
  ) {
    super(`AI ${code}${status ? ` (${status})` : ""}`);
  }
}
export type AiUsage = {
  requestId: string;
  workload: AiWorkload;
  provider: "gemini";
  model: string;
  durationMs: number;
  inputTokens: number;
  outputTokens: number;
  usageKnown?: boolean;
  status: "success" | "failed";
  finishReason?: string;
  parts?: Array<{ image: boolean; mimeType?: string; thought: boolean }>;
};
type AiRequest = {
  workload: AiWorkload;
  instruction: string;
  input: string;
  model?: string;
  referencePurpose?: "brand-analysis";
  references?: Array<{
    bytes: Buffer;
    mimeType: "image/png" | "image/jpeg" | "image/webp";
  }>;
};

function configuredClient(workload: AiWorkload) {
  const apiKey =
    workload === "reply.preview" || workload === "reply.live"
      ? process.env.AUTO_REPLY_GEMINI_KEY
      : process.env.GEMINI_API_KEY;
  if (!apiKey) throw new AiGatewayError("configuration");
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      timeout: workload === "marketing.image" ? 90000 : 30000,
      retryOptions: { attempts: 1 },
    },
  });
}

function selectedModel(workload: AiWorkload) {
  const model =
    workload === "marketing.image"
      ? process.env.AI_GEMINI_IMAGE_MODEL || "gemini-nano-banana-2.1"
      : process.env.AI_GEMINI_TEXT_MODEL || "gemini-3.8-flash";
  if (!/^gemini-[a-z0-9.-]+$/.test(model))
    throw new AiGatewayError("configuration");
  return model;
}

function validateRequest(request: AiRequest) {
  if (request.workload === "medical.documentation")
    throw new AiGatewayError("configuration");
  if (request.references?.length) {
    const brandAnalysis =
      request.workload === "marketing.text" &&
      request.referencePurpose === "brand-analysis";
    if (
      (!brandAnalysis && request.workload !== "marketing.image") ||
      request.references.length > (brandAnalysis ? 1 : 2)
    )
      throw new AiGatewayError("configuration");
    for (const image of request.references) {
      const bytes = image.bytes;
      if (
        !Buffer.isBuffer(bytes) ||
        bytes.length < 32 ||
        bytes.length > (brandAnalysis ? 10 : 2) * 1024 * 1024
      )
        throw new AiGatewayError("configuration");
      const valid =
        image.mimeType === "image/png"
          ? bytes
              .subarray(0, 8)
              .equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
          : image.mimeType === "image/jpeg"
            ? bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255
            : image.mimeType === "image/webp" &&
              bytes.toString("ascii", 0, 4) === "RIFF" &&
              bytes.toString("ascii", 8, 12) === "WEBP";
      if (!valid) throw new AiGatewayError("configuration");
    }
  }
  if (
    !Object.hasOwn(limits, request.workload) ||
    request.input.length > 32000 ||
    !request.input.trim() ||
    request.instruction.length > 32000
  )
    throw new AiGatewayError("configuration");
}

export class AiGateway {
  constructor(private readonly usage: (event: AiUsage) => void) {}

  private async execute<T>(
    request: AiRequest,
    config: GenerateContentConfig,
    consume: (response: GenerateContentResponse) => T,
  ): Promise<T> {
    validateRequest(request);
    const client = configuredClient(request.workload);
    const model = request.model ?? selectedModel(request.workload);
    if (!/^gemini-[a-z0-9.-]+$/.test(model))
      throw new AiGatewayError("configuration");
    if ((busy.get(request.workload) ?? 0) >= 2)
      throw new AiGatewayError("capacity");
    busy.set(request.workload, (busy.get(request.workload) ?? 0) + 1);
    const started = Date.now();
    const event: AiUsage = {
      requestId: randomUUID(),
      workload: request.workload,
      provider: "gemini",
      model,
      durationMs: 0,
      inputTokens: 0,
      outputTokens: 0,
      status: "failed",
    };
    try {
      const response = await client.models.generateContent({
        model,
        contents: [
          {
            role: "user",
            parts: [
              { text: request.input },
              ...(request.references ?? []).map((image) => ({
                inlineData: {
                  mimeType: image.mimeType,
                  data: image.bytes.toString("base64"),
                },
              })),
            ],
          },
        ],
        config: {
          ...config,
          systemInstruction: request.instruction,
          maxOutputTokens: limits[request.workload],
          ...(request.references?.length
            ? { mediaResolution: MediaResolution.MEDIA_RESOLUTION_HIGH }
            : {}),
        },
      });
      const metadata = response.usageMetadata;
      event.usageKnown = [
        metadata?.promptTokenCount,
        metadata?.candidatesTokenCount,
        metadata?.thoughtsTokenCount ?? 0,
      ].every(
        (count) =>
          typeof count === "number" &&
          Number.isSafeInteger(count) &&
          count >= 0,
      );
      event.inputTokens = response.usageMetadata?.promptTokenCount ?? 0;
      event.outputTokens =
        (response.usageMetadata?.candidatesTokenCount ?? 0) +
        (response.usageMetadata?.thoughtsTokenCount ?? 0);
      event.finishReason = response.candidates?.[0]?.finishReason;
      event.parts = response.candidates?.[0]?.content?.parts?.map((part) => ({
        image: Boolean(part.inlineData),
        mimeType: part.inlineData?.mimeType,
        thought: Boolean(part.thought),
      }));
      if (response.candidates?.[0]?.finishReason !== "STOP")
        throw new AiGatewayError("invalid_output");
      const output = consume(response);
      event.status = "success";
      return output;
    } catch (error) {
      if (error instanceof AiGatewayError) throw error;
      const failure = z
        .object({ status: z.number().int().min(100).max(599) })
        .safeParse(error);
      throw new AiGatewayError(
        "provider",
        failure.success ? failure.data.status : undefined,
      );
    } finally {
      busy.set(request.workload, (busy.get(request.workload) ?? 1) - 1);
      event.durationMs = Date.now() - started;
      try {
        this.usage(event);
      } catch {
        console.error("[ai-gateway] Usage recording failed");
      }
    }
  }

  generateJson<T>(
    request: AiRequest & { schema: ZodType<T>; jsonSchema: unknown },
  ): Promise<T> {
    if (request.workload === "marketing.image")
      throw new AiGatewayError("configuration");
    return this.execute(
      request,
      {
        responseMimeType: "application/json",
        responseJsonSchema: request.jsonSchema,
      },
      (response) => {
        try {
          const text =
            response
              .candidates![0].content?.parts?.filter((part) => !part.thought)
              .map((part) => part.text ?? "")
              .join("") ?? "";
          return request.schema.parse(JSON.parse(text));
        } catch {
          throw new AiGatewayError("invalid_output");
        }
      },
    );
  }

  generateImage(
    request: AiRequest,
  ): Promise<{ bytes: Buffer; mimeType: string }> {
    if (request.workload !== "marketing.image")
      throw new AiGatewayError("configuration");
    return this.execute(
      request,
      {
        responseModalities: ["TEXT", "IMAGE"],
        imageConfig: { aspectRatio: "1:1", imageSize: "1K" },
      },
      (response) => {
        const inline = response.candidates![0].content?.parts?.find(
          (part) => !part.thought && part.inlineData,
        )?.inlineData;
        if (
          !inline?.data ||
          !inline.mimeType ||
          !["image/png", "image/jpeg", "image/webp"].includes(inline.mimeType)
        )
          throw new AiGatewayError("invalid_output");
        const bytes = Buffer.from(inline.data, "base64");
        if (bytes.length < 32 || bytes.length > 20 * 1024 * 1024)
          throw new AiGatewayError("invalid_output");
        const signatureMatches =
          inline.mimeType === "image/png"
            ? bytes
                .subarray(0, 8)
                .equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
            : inline.mimeType === "image/jpeg"
              ? bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255
              : bytes.toString("ascii", 0, 4) === "RIFF" &&
                bytes.toString("ascii", 8, 12) === "WEBP";
        if (!signatureMatches) throw new AiGatewayError("invalid_output");
        return { bytes, mimeType: inline.mimeType };
      },
    );
  }
}
