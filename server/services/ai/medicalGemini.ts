import { TRPCError } from "@trpc/server";
import { z } from "zod";
import {
  medicalProposalFields,
  MedicalProposalValidationError,
} from "../../../shared/medical-assistant";

export class GeminiDocumentationError extends Error {
  constructor(
    readonly reason:
      "request" | "timeout" | "response" | "incomplete" | "invalid_json",
    readonly httpStatus?: number,
  ) {
    super(
      `Gemini documentation ${reason}${httpStatus ? ` HTTP ${httpStatus}` : ""}`,
    );
  }
}

export function geminiDocumentationFailure(error: unknown) {
  let code = "unknown";
  let message = "تعذرت معالجة النص بواسطة Gemini.";
  if (error instanceof GeminiDocumentationError) {
    code = error.reason;
    if (error.reason === "request") {
      code = `http_${error.httpStatus}`;
      message =
        error.httpStatus === 429
          ? "وصل Gemini لحد الاستخدام أو الرصيد المتاح (HTTP 429)."
          : error.httpStatus === 400
            ? "رفض Gemini صيغة طلب استخراج الحقول (HTTP 400)."
            : `تعذر طلب Gemini (HTTP ${error.httpStatus}).`;
    } else if (error.reason === "timeout")
      message = "انتهت مهلة معالجة Gemini.";
    else if (error.reason === "incomplete")
      message = "لم يُكمل Gemini الرد أو حُجب الرد.";
    else message = "أعاد Gemini ردًا غير صالح للقراءة.";
  } else if (error instanceof MedicalProposalValidationError) {
    code = `validation_${error.reason}`;
    const reasons = {
      source: "الاستشهاد النصي في اقتراح Gemini لا يطابق التسجيل.",
      scope: "اقتراح Gemini خارج نطاق الحقل أو الزيارة المحددة.",
      speaker: "لم يتأكد أن القرار الطبي صادر عن الطبيب.",
      duplicate_field: "أعاد Gemini أكثر من اقتراح للحقل نفسه.",
    };
    message = reasons[error.reason];
  } else if (error instanceof z.ZodError) {
    code = "validation_shape";
    message = "صيغة حقول Gemini لا تطابق الحقول المطلوبة.";
  }
  return {
    code,
    message: `${message} النص محفوظ ولم يُطبّق تعديل أو يُرسل طلب بديل تلقائيًا.`,
  };
}

export function medicalGeminiOptions() {
  return {
    configured: Boolean(process.env.GEMINI_API_KEY),
    clinicalEnabled: process.env.MEDICAL_GEMINI_CLINICAL_APPROVED === "true",
    model: process.env.MEDICAL_GEMINI_MODEL || "gemini-3.8-flash",
  };
}

export function assertMedicalGeminiAvailable() {
  const options = medicalGeminiOptions();
  if (!options.clinicalEnabled)
    throw new TRPCError({
      code: "PRECONDITION_FAILED",
      message:
        "Gemini medical documentation is disabled pending confirmation of applicable terms and privacy review. Manus remains unchanged.",
    });
  if (!options.configured)
    throw new TRPCError({
      code: "PRECONDITION_FAILED",
      message: "GEMINI_API_KEY is not configured.",
    });
}

const responseSchema = z.object({
  usageMetadata: z
    .object({
      promptTokenCount: z.number().optional(),
      candidatesTokenCount: z.number().optional(),
      thoughtsTokenCount: z.number().optional(),
    })
    .optional(),
  candidates: z
    .array(
      z.object({
        finishReason: z.string(),
        content: z.object({
          parts: z.array(
            z.object({
              text: z.string().optional(),
              thought: z.boolean().optional(),
            }),
          ),
        }),
      }),
    )
    .min(1),
});

export async function extractGeminiProposals(
  prompt: string,
  selectedModel?: string,
  onUsage?: (usage: { inputTokens: number; outputTokens: number }) => void,
): Promise<unknown> {
  const options = medicalGeminiOptions();
  const { configured } = options;
  const model = selectedModel ?? options.model;
  if (!configured || !/^gemini-[a-z0-9.-]+$/.test(model))
    throw new Error("Gemini documentation configuration is invalid");
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
    {
      method: "POST",
      signal: AbortSignal.timeout(120000),
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": process.env.GEMINI_API_KEY!,
      },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: {
          ...(/^gemini-3[.-]/.test(model)
            ? { thinkingConfig: { thinkingLevel: "LOW" } }
            : {}),
          maxOutputTokens: 8192,
          responseMimeType: "application/json",
          responseJsonSchema: {
            type: "object",
            additionalProperties: false,
            required: ["proposals", "warnings"],
            properties: {
              proposals: {
                type: "array",
                items: {
                  type: "object",
                  additionalProperties: false,
                  required: ["field", "text", "sources", "speaker"],
                  properties: {
                    field: { type: "string", enum: [...medicalProposalFields] },
                    text: { type: "string" },
                    sources: { type: "array", items: { type: "string" } },
                    speaker: {
                      type: "string",
                      enum: ["doctor", "patient", "uncertain"],
                    },
                    medications: {
                      type: "array",
                      items: {
                        type: "object",
                        additionalProperties: false,
                        required: [
                          "name",
                          "source",
                          "dosage",
                          "frequency",
                          "duration",
                          "instructions",
                        ],
                        properties: {
                          name: { type: "string" },
                          source: { type: "string" },
                          dosage: { type: "string" },
                          frequency: { type: "string" },
                          duration: { type: "string" },
                          instructions: { type: "string" },
                        },
                      },
                    },
                  },
                },
              },
              warnings: { type: "array", items: { type: "string" } },
            },
          },
        },
      }),
    },
  ).catch((error: unknown) => {
    if (
      error instanceof Error &&
      ["TimeoutError", "AbortError"].includes(error.name)
    )
      throw new GeminiDocumentationError("timeout");
    throw error;
  });
  if (!response.ok)
    throw new GeminiDocumentationError("request", response.status);
  const raw: unknown = await response.json();
  const accounting = z
    .object({
      usageMetadata: z.object({
        promptTokenCount: z
          .number()
          .int()
          .nonnegative()
          .max(Number.MAX_SAFE_INTEGER),
        candidatesTokenCount: z
          .number()
          .int()
          .nonnegative()
          .max(Number.MAX_SAFE_INTEGER),
        thoughtsTokenCount: z
          .number()
          .int()
          .nonnegative()
          .max(Number.MAX_SAFE_INTEGER)
          .optional(),
      }),
    })
    .safeParse(raw);
  if (
    accounting.success &&
    Number.isSafeInteger(
      accounting.data.usageMetadata.candidatesTokenCount +
        (accounting.data.usageMetadata.thoughtsTokenCount ?? 0),
    )
  )
    onUsage?.({
      inputTokens: accounting.data.usageMetadata.promptTokenCount,
      outputTokens:
        accounting.data.usageMetadata.candidatesTokenCount +
        (accounting.data.usageMetadata.thoughtsTokenCount ?? 0),
    });
  const parsed = responseSchema.safeParse(raw);
  if (!parsed.success) throw new GeminiDocumentationError("response");
  const payload = parsed.data;
  const candidate = payload.candidates[0];
  if (candidate.finishReason !== "STOP")
    throw new GeminiDocumentationError("incomplete");
  const output = candidate.content.parts
    .filter((part) => !part.thought)
    .map((part) => part.text ?? "")
    .join("");
  try {
    return JSON.parse(output);
  } catch {
    throw new GeminiDocumentationError("invalid_json");
  }
}
