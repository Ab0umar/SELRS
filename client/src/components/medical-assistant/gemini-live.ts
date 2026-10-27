import { GoogleGenAI, type LiveConnectConfig } from "@google/genai";

export function pcmBase64(bytes: ArrayBuffer) {
  let binary = "";
  for (const byte of new Uint8Array(bytes)) binary += String.fromCharCode(byte);
  return btoa(binary);
}

export async function connectGeminiLive(
  credentials: { token: string; model: string; config: LiveConnectConfig },
  callbacks: {
    final: (text: string) => void;
    partial: (text: string) => void;
    error: () => void;
  },
) {
  let closed = false;
  const client = new GoogleGenAI({
    apiKey: credentials.token,
    httpOptions: { apiVersion: "v1beta" },
  });
  const session = await client.live.connect({
    model: credentials.model,
    config: credentials.config,
    callbacks: {
      onmessage: (message) => {
        if (closed) return;
        const content = message.serverContent;
        if (content?.interimInputTranscription?.text)
          callbacks.partial(content.interimInputTranscription.text);
        if (content?.inputTranscription?.text)
          callbacks.final(content.inputTranscription.text);
      },
      onerror: () => {
        if (!closed) callbacks.error();
      },
      onclose: () => {
        if (!closed) callbacks.error();
      },
    },
  });
  return {
    write(bytes: ArrayBuffer) {
      if (!closed)
        session.sendRealtimeInput({
          audio: { data: pcmBase64(bytes), mimeType: "audio/pcm;rate=16000" },
        });
    },
    finish() {
      if (!closed) session.sendRealtimeInput({ audioStreamEnd: true });
    },
    close() {
      closed = true;
      session.close();
    },
  };
}
