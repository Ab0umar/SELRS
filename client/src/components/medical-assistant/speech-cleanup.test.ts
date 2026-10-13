import { expect, it, vi } from "vitest";
import { releaseSpeechResources } from "./speech-cleanup";

it("still stops microphone tracks when SDK cleanup throws", () => {
  const stopTracks = vi.fn();
  expect(() => releaseSpeechResources([
    () => { throw new TypeError("Cannot read properties of undefined (reading 'then')"); },
    stopTracks,
  ])).not.toThrow();
  expect(stopTracks).toHaveBeenCalledOnce();
});
