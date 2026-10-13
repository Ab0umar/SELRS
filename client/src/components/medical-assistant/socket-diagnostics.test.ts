import { afterEach, expect, it, vi } from "vitest";
import { observeSpeechSocket } from "./socket-diagnostics";
afterEach(() => vi.unstubAllGlobals());
it("counts only actual Azure binary sends and restores the original method", () => {
  class Socket {
    url = "wss://eastus.stt.speech.microsoft.com/speech/recognition";
    bufferedAmount = 3200;
    readyState = 1;
    send(_data: unknown) {}
  }
  vi.stubGlobal("WebSocket", Socket);
  const original = Socket.prototype.send;
  const probe = observeSpeechSocket();
  const socket = new Socket();
  socket.send("configuration");
  socket.send(new ArrayBuffer(3200));
  const unrelated = new Socket();
  unrelated.url = "wss://example.com";
  unrelated.send(new ArrayBuffer(3200));
  expect(probe.read()).toMatchObject({
    frames: 1,
    bufferedBytes: 3200,
    state: "Open",
  });
  expect(probe.read().lastSendAt).toBeTypeOf("number");
  socket.readyState = 3;
  expect(probe.read().state).toBe("Closed");
  probe.dispose();
  expect(Socket.prototype.send).toBe(original);
});
it("does not count a send that throws", () => {
  class Socket {
    url = "wss://eastus.stt.speech.microsoft.com";
    send(_data: unknown) {
      throw new Error("closed");
    }
  }
  vi.stubGlobal("WebSocket", Socket);
  const probe = observeSpeechSocket();
  expect(() => new Socket().send(new ArrayBuffer(1))).toThrow("closed");
  expect(probe.read().frames).toBe(0);
  probe.dispose();
});
