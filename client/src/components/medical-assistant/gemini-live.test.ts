import { describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({
  connect: vi.fn(),
  send: vi.fn(),
  close: vi.fn(),
}));
vi.mock("@google/genai", () => ({
  GoogleGenAI: class {
    live = { connect: mocks.connect };
  },
}));
import { connectGeminiLive, pcmBase64 } from "./gemini-live";
describe("Gemini live audio transport", () => {
  it("encodes PCM without changing bytes", () => {
    expect(pcmBase64(new Uint8Array([0, 255, 128, 1]).buffer)).toBe("AP+AAQ==");
  });
  it("streams PCM, separates interim from final, and ignores events after close", async () => {
    mocks.connect.mockResolvedValue({
      sendRealtimeInput: mocks.send,
      close: mocks.close,
    });
    const callbacks = { final: vi.fn(), partial: vi.fn(), error: vi.fn() };
    const transport = await connectGeminiLive(
      { token: "temporary", model: "gemini-3.5-transcribe-live", config: {} },
      callbacks,
    );
    const events = mocks.connect.mock.calls[0][0].callbacks;
    events.onmessage({
      serverContent: { interimInputTranscription: { text: "partial" } },
    });
    events.onmessage({
      serverContent: { inputTranscription: { text: "final" } },
    });
    expect(callbacks.partial).toHaveBeenCalledWith("partial");
    expect(callbacks.final).toHaveBeenCalledWith("final");
    transport.write(new Uint8Array([0, 1]).buffer);
    expect(mocks.send).toHaveBeenCalledWith({
      audio: { data: "AAE=", mimeType: "audio/pcm;rate=16000" },
    });
    transport.finish();
    expect(mocks.send).toHaveBeenLastCalledWith({ audioStreamEnd: true });
    transport.close();
    events.onmessage({
      serverContent: { inputTranscription: { text: "late" } },
    });
    events.onclose();
    expect(callbacks.final).toHaveBeenCalledTimes(1);
    expect(callbacks.error).not.toHaveBeenCalled();
  });
});
