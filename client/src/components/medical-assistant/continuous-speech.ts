import type { SpeechRecognizer } from "microsoft-cognitiveservices-speech-sdk";

type Recognizer = Pick<
  SpeechRecognizer,
  | "startContinuousRecognitionAsync"
  | "stopContinuousRecognitionAsync"
  | "sessionStopped"
  | "canceled"
>;

export function maintainContinuousSpeech(
  recognizer: Recognizer,
  errorReason: number,
  callbacks: {
    recording: () => void;
    reconnecting: () => void;
    failed: (message: string) => void;
  },
) {
  let ended = false;
  let restarting = false;
  let retries = 0;
  let timer: ReturnType<typeof setTimeout> | undefined;
  const fail = (message: string) => {
    if (ended) return;
    ended = true;
    clearTimeout(timer);
    callbacks.failed(message);
  };
  const restart = () => {
    if (ended || restarting) return;
    if (++retries > 2) {
      fail(
        "Azure repeatedly ended the session. Captured text is preserved; close and try again.",
      );
      return;
    }
    restarting = true;
    callbacks.reconnecting();
    timer = setTimeout(() => {
      if (ended) return;
      recognizer.startContinuousRecognitionAsync(
        () => {
          restarting = false;
          if (!ended) callbacks.recording();
        },
        () => fail("Azure could not reconnect. Captured text is preserved."),
      );
    }, 500);
  };
  recognizer.sessionStopped = restart;
  recognizer.canceled = (_, event) => {
    if (event.reason === errorReason) {
      fail(
        `Azure stopped recording (error ${event.errorCode}). Captured text is preserved.`,
      );
    } else restart();
  };
  return {
    stop() {
      ended = true;
      clearTimeout(timer);
    },
    dispose() {
      ended = true;
      clearTimeout(timer);
      recognizer.sessionStopped = undefined!;
      recognizer.canceled = undefined!;
    },
  };
}
