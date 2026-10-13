import { expect, it } from "vitest";
import { hasOutgoingAudioStalled } from "./audio-stall";
it("detects the reported PCM continues but packets stop pattern", () => {
  expect(
    hasOutgoingAudioStalled({
      now: 40000,
      startedAt: 0,
      lastPcmAt: 39900,
      lastPacketAt: 11000,
    }),
  ).toBe(true);
  expect(
    hasOutgoingAudioStalled({
      now: 88000,
      startedAt: 0,
      lastPcmAt: 87900,
      lastPacketAt: 11000,
    }),
  ).toBe(true);
});
it("does not treat ongoing packets or stopped capture as an outgoing stall", () => {
  expect(
    hasOutgoingAudioStalled({
      now: 40000,
      startedAt: 0,
      lastPcmAt: 39900,
      lastPacketAt: 39900,
    }),
  ).toBe(false);
  expect(
    hasOutgoingAudioStalled({
      now: 40000,
      startedAt: 0,
      lastPcmAt: 11000,
      lastPacketAt: 11000,
    }),
  ).toBe(false);
});
it("allows startup grace and detects no first packet while PCM continues", () => {
  expect(
    hasOutgoingAudioStalled({ now: 11000, startedAt: 0, lastPcmAt: 11000 }),
  ).toBe(false);
  expect(
    hasOutgoingAudioStalled({ now: 12000, startedAt: 0, lastPcmAt: 12000 }),
  ).toBe(true);
});
