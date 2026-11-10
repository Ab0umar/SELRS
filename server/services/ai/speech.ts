import { TRPCError } from "@trpc/server";

export async function medicalSpeechToken() {
  const key = process.env.AZURE_SPEECH_KEY;
  const region = process.env.AZURE_SPEECH_REGION?.trim();
  if (!key || !region || !/^[a-z0-9]+$/.test(region)) {
    throw new TRPCError({
      code: "PRECONDITION_FAILED",
      message:
        "اضبط AZURE_SPEECH_KEY و AZURE_SPEECH_REGION على الخادم.",
    });
  }
  try {
    const response = await fetch(
      `https://${region}.api.cognitive.microsoft.com/sts/v1.0/issueToken`,
      {
        method: "POST",
        headers: {
          "Ocp-Apim-Subscription-Key": key,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        signal: AbortSignal.timeout(15000),
      },
    );
    if (!response.ok) throw new Error("Token exchange failed");
    const token = await response.text();
    if (!token.trim()) throw new Error("Empty token");
    return { token, region };
  } catch {
    throw new TRPCError({
      code: "BAD_GATEWAY",
      message:
        "تعذر الاتصال بخدمة Azure Speech. راجع إعدادات مورد Speech على الخادم.",
    });
  }
}
