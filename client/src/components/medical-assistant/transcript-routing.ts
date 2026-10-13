export type RecordingScope =
  | { kind: "conversation"; mode: "conversation" | "dictation" }
  | { kind: "field"; label: string };

export type RoutedTranscript =
  | {
      kind: "conversation";
      mode: "conversation" | "dictation";
      transcript: string;
    }
  | { kind: "field"; label: string; transcript: string };

export function routeTranscript(
  scope: RecordingScope,
  transcript: string,
): RoutedTranscript {
  const text = transcript.trim();
  if (!text) throw new Error("Record or enter a transcript first.");
  return scope.kind === "conversation"
    ? { kind: "conversation", mode: scope.mode, transcript: text }
    : { kind: "field", label: scope.label, transcript: text };
}
