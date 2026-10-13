import { expect, it } from "vitest";
import { observeAudioReads, speechLoopState } from "./audio-read-diagnostics";
it("distinguishes a pending SDK read from completed reads", async () => {
  let finish!: (value: unknown) => void;
  const node = {
    read: () =>
      new Promise((resolve) => {
        finish = resolve;
      }),
  };
  const original = node.read;
  const source = { attach: async (_id: string) => node };
  const probe = observeAudioReads(source);
  const attached = await source.attach("test");
  const pending = attached.read();
  expect(probe.stats).toEqual({
    requested: 1,
    completed: 0,
    rejected: 0,
    pending: 1,
  });
  finish({});
  await pending;
  expect(probe.stats).toEqual({
    requested: 1,
    completed: 1,
    rejected: 0,
    pending: 0,
  });
  probe.dispose();
  expect(node.read).toBe(original);
});
it("propagates read failures and reports unavailable internals safely", async () => {
  const source = {
    attach: async () => ({
      read: async () => {
        throw new Error("read failed");
      },
    }),
  };
  const probe = observeAudioReads(source);
  await expect((await source.attach()).read()).rejects.toThrow("read failed");
  expect(probe.stats.rejected).toBe(1);
  expect(probe.stats.pending).toBe(0);
  expect(observeAudioReads({}).available).toBe(false);
  expect(speechLoopState({})).toBe("Unavailable");
  probe.dispose();
});
