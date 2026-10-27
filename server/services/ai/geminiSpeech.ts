import {
  GoogleGenAI,
  AudioTranscriptionConfigMode,
  Modality,
} from "@google/genai";
import { TRPCError } from "@trpc/server";
import { assertMedicalGeminiAvailable } from "./medicalGemini";
import { readMedicalVocabulary } from "../medical-vocabulary";

export async function medicalGeminiSpeechToken() {
  assertMedicalGeminiAvailable();
  const { phrases } = await readMedicalVocabulary();
  const model = "gemini-3.5-transcribe-live";
  const config = {
    responseModalities: [Modality.TEXT],
    inputAudioTranscription: {
      languageCodes: [],
      mode: AudioTranscriptionConfigMode.VERBATIM,
      customVocabulary: phrases.slice(0, 1000),
    },
  };
  try {
    const client = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY!,
      httpOptions: { apiVersion: "v1beta", timeout: 15000 },
    });
    const token = await client.authTokens.create({
      config: {
        uses: 1,
        expireTime: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
        newSessionExpireTime: new Date(Date.now() + 60 * 1000).toISOString(),
        liveConnectConstraints: { model, config },
      },
    });
    if (!token.name) throw new Error("Missing ephemeral token");
    return { token: token.name, model, config };
  } catch {
    throw new TRPCError({
      code: "BAD_GATEWAY",
      message:
        "Gemini Live could not connect. Check model access and API billing. Azure remains available.",
    });
  }
}
