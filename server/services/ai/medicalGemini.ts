import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { medicalProposalFields } from "../../../shared/medical-assistant";

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

export async function extractGeminiProposals(prompt: string): Promise<unknown> {
  const { model, configured } = medicalGeminiOptions();
  if (!configured || !/^gemini-[a-z0-9.-]+$/.test(model))
    throw new Error("Gemini documentation configuration is invalid");
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
    {
      method: "POST",
      signal: AbortSignal.timeout(45000),
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": process.env.GEMINI_API_KEY!,
      },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: {
          maxOutputTokens: 8192,
          responseMimeType: "application/json",
          responseJsonSchema: {
            type: "object",
            additionalProperties: false,
            required: ["proposals", "warnings"],
            properties: {
              proposals: {
                type: "array",
                maxItems: 8,
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
                  },
                },
              },
              warnings: { type: "array", items: { type: "string" } },
            },
          },
        },
      }),
    },
  );
  if (!response.ok)
    throw new Error(`Gemini documentation HTTP ${response.status}`);
  const payload = responseSchema.parse(await response.json());
  const candidate = payload.candidates[0];
  if (candidate.finishReason !== "STOP")
    throw new Error("Gemini documentation output is incomplete or blocked");
  return JSON.parse(
    candidate.content.parts
      .filter((part) => !part.thought)
      .map((part) => part.text ?? "")
      .join(""),
  );
}
