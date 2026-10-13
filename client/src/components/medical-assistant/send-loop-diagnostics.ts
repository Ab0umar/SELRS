type Method = (...args: unknown[]) => Promise<unknown>;
export function observeSendLoop(recognizer: unknown) {
  const counters = {
    connectionPending: 0,
    delayPending: 0,
    maxDelayMs: 0,
    sendsStarted: 0,
    sendsCompleted: 0,
    sendsRejected: 0,
  };
  const target = (recognizer as { internalData?: Record<string, unknown> })
    ?.internalData;
  const restore: Array<() => void> = [];
  if (target)
    for (const name of ["fetchConnection", "delay", "sendAudio"] as const) {
      const original = target[name];
      if (typeof original !== "function") continue;
      const method = original as Method;
      const wrapped = async function (this: unknown, ...args: unknown[]) {
        if (name === "fetchConnection") counters.connectionPending++;
        if (name === "delay") {
          counters.delayPending++;
          counters.maxDelayMs = Math.max(
            counters.maxDelayMs,
            typeof args[0] === "number" ? args[0] : 0,
          );
        }
        if (name === "sendAudio") counters.sendsStarted++;
        try {
          const result = await method.apply(this, args);
          if (name === "sendAudio") counters.sendsCompleted++;
          return result;
        } catch (error) {
          if (name === "sendAudio") counters.sendsRejected++;
          throw error;
        } finally {
          if (name === "fetchConnection") counters.connectionPending--;
          if (name === "delay") counters.delayPending--;
        }
      };
      target[name] = wrapped;
      restore.push(() => {
        if (target[name] === wrapped) target[name] = original;
      });
    }
  return {
    read: () =>
      target
        ? `Connection waits: ${counters.connectionPending} · Pacing waits: ${counters.delayPending} · Max pacing ms: ${Math.round(counters.maxDelayMs)} · Send loops: ${counters.sendsStarted}/${counters.sendsCompleted}/${counters.sendsRejected} (started/completed/rejected) · Disposed: ${String(target.privIsDisposed)} · Generation: ${String((target.privRequestSession as { recogNumber?: number } | undefined)?.recogNumber)}`
        : "Unavailable",
    dispose: () => restore.forEach((action) => action()),
  };
}
