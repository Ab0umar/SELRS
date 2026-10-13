import { describe, expect, it } from "vitest";
import { routeTranscript } from "./transcript-routing";

describe("medical recording scope", () => {
  it("routes the assistant conversation without limiting it to a field", () => {
    expect(
      routeTranscript(
        { kind: "conversation", mode: "conversation" },
        " full visit ",
      ),
    ).toEqual({
      kind: "conversation",
      mode: "conversation",
      transcript: "full visit",
    });
  });
  it("keeps doctor dictation in the full-visit scope", () => {
    expect(
      routeTranscript(
        { kind: "conversation", mode: "dictation" },
        "visit summary",
      ),
    ).toEqual({
      kind: "conversation",
      mode: "dictation",
      transcript: "visit summary",
    });
  });
  it("routes field recording only to its selected field", () => {
    expect(
      routeTranscript(
        { kind: "field", label: "Complaints" },
        "symptoms and history",
      ),
    ).toEqual({
      kind: "field",
      label: "Complaints",
      transcript: "symptoms and history",
    });
  });
  it("rejects an empty transcript", () => {
    expect(() =>
      routeTranscript({ kind: "field", label: "Complaints" }, "  "),
    ).toThrow("transcript first");
  });
});
