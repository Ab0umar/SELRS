import { expect, it } from "vitest";
import { observeSendLoop } from "./send-loop-diagnostics";
it("reports a connection wait until the original method completes", async () => {
  let finish!: (value: unknown) => void;
  const original = () =>
    new Promise((resolve) => {
      finish = resolve;
    });
  const internalData = { fetchConnection: original };
  const probe = observeSendLoop({ internalData });
  const pending = internalData.fetchConnection();
  expect(probe.read()).toContain("Connection waits: 1");
  finish({});
  await pending;
  expect(probe.read()).toContain("Connection waits: 0");
  probe.dispose();
  expect(internalData.fetchConnection).toBe(original);
});
it("distinguishes a completed send loop and a long pacing wait", async () => {
  const internalData = {
    sendAudio: async () => undefined,
    delay: async (_ms: number) => undefined,
  };
  const probe = observeSendLoop({ internalData });
  await internalData.sendAudio();
  await internalData.delay(50);
  expect(probe.read()).toContain("Send loops: 1/1/0");
  expect(probe.read()).toContain("Max pacing ms: 50");
  probe.dispose();
  expect(observeSendLoop({}).read()).toBe("Unavailable");
});
