import { describe, expect, it, vi, afterEach } from "vitest";
import type { SpeechRecognizer } from "microsoft-cognitiveservices-speech-sdk";
import { maintainContinuousSpeech } from "./continuous-speech";

afterEach(() => vi.useRealTimers());
function fixture() {
  vi.useFakeTimers();
  const recognizer = {
    startContinuousRecognitionAsync: vi.fn((success?: () => void) =>
      success?.(),
    ),
    stopContinuousRecognitionAsync: vi.fn(),
    sessionStopped: undefined as SpeechRecognizer["sessionStopped"],
    canceled: undefined as SpeechRecognizer["canceled"],
  };
  const callbacks = {
    recording: vi.fn(),
    reconnecting: vi.fn(),
    failed: vi.fn(),
  };
  const controller = maintainContinuousSpeech(recognizer, 1, callbacks);
  const sessionEnded = () =>
    recognizer.sessionStopped?.(
      {} as SpeechRecognizer,
      {} as Parameters<SpeechRecognizer["sessionStopped"]>[1],
    );
  return { recognizer, callbacks, controller, sessionEnded };
}
describe("continuous dictation recovery", () => {
  it("restarts an unexpectedly ended session without a Resume click", () => {
    const f = fixture();
    f.sessionEnded();
    vi.advanceTimersByTime(500);
    expect(f.recognizer.startContinuousRecognitionAsync).toHaveBeenCalledOnce();
    expect(f.callbacks.recording).toHaveBeenCalledOnce();
  });
  it("does not restart after the doctor presses Stop", () => {
    const f = fixture();
    f.controller.stop();
    f.sessionEnded();
    vi.advanceTimersByTime(500);
    expect(f.recognizer.startContinuousRecognitionAsync).not.toHaveBeenCalled();
  });
  it("cancels a pending restart when the dialog closes", () => {
    const f = fixture();
    f.sessionEnded();
    f.controller.dispose();
    vi.advanceTimersByTime(500);
    expect(f.recognizer.startContinuousRecognitionAsync).not.toHaveBeenCalled();
  });
  it("does not restart simply because speech is silent", () => {
    const f = fixture();
    vi.advanceTimersByTime(30000);
    expect(f.recognizer.startContinuousRecognitionAsync).not.toHaveBeenCalled();
    expect(f.callbacks.failed).not.toHaveBeenCalled();
  });
  it("bounds repeated session recovery", () => {
    const f = fixture();
    for (let i = 0; i < 3; i++) {
      f.sessionEnded();
      vi.advanceTimersByTime(500);
    }
    expect(f.recognizer.startContinuousRecognitionAsync).toHaveBeenCalledTimes(
      2,
    );
    expect(f.callbacks.failed).toHaveBeenCalledOnce();
  });
});
