import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
const PCM_WORKLET_SOURCE = readFileSync(
  new URL("../../../public/medical-pcm-worklet.js", import.meta.url),
  "utf8",
);

function capture() {
  const packets: ArrayBuffer[] = [];
  let create:
    (new () => { process: (inputs: Float32Array[][]) => boolean }) | undefined;
  class Processor {
    port = { postMessage: (bytes: ArrayBuffer) => packets.push(bytes) };
  }
  new Function(
    "AudioWorkletProcessor",
    "registerProcessor",
    PCM_WORKLET_SOURCE,
  )(Processor, (_name: string, constructor: typeof create) => {
    create = constructor;
  });
  if (!create) throw new Error("Processor not registered");
  return { processor: new create(), packets };
}
describe("PCM capture", () => {
  it("sends continuous audio through speech, silence and resumed speech", () => {
    const f = capture();
    for (const value of [0.5, 0, -0.5]) {
      for (let i = 0; i < 25; i++)
        expect(f.processor.process([[new Float32Array(128).fill(value)]])).toBe(
          true,
        );
    }
    expect(f.packets).toHaveLength(6);
    expect(new DataView(f.packets[0]).getInt16(0, true)).toBe(16384);
    expect(new DataView(f.packets[2]).getInt16(0, true)).toBe(0);
    expect(new DataView(f.packets[4]).getInt16(0, true)).toBe(-16384);
  });
  it("clamps out-of-range audio without overflowing PCM", () => {
    const f = capture();
    f.processor.process([[new Float32Array(1600).fill(2)]]);
    expect(new DataView(f.packets[0]).getInt16(0, true)).toBe(32767);
  });
});
