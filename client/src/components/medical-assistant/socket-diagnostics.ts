export function observeSpeechSocket() {
  const original = WebSocket.prototype.send;
  let socket: WebSocket | undefined;
  let frames = 0;
  let lastSendAt: number | undefined;
  const wrapped: typeof original = function (this: WebSocket, data) {
    const result = original.call(this, data);
    let speech = false;
    try {
      const hostname = new URL(this.url).hostname;
      speech =
        hostname.endsWith(".stt.speech.microsoft.com") ||
        hostname.endsWith(".cognitiveservices.azure.com");
    } catch {
      /* Ignore non-URL socket implementations. */
    }
    if (speech) {
      socket = this;
      if (typeof data !== "string") {
        frames++;
        lastSendAt = performance.now();
      }
    }
    return result;
  };
  WebSocket.prototype.send = wrapped;
  return {
    read: () => ({
      frames,
      lastSendAt,
      bufferedBytes: socket?.bufferedAmount ?? 0,
      state: socket
        ? (["Connecting", "Open", "Closing", "Closed"][socket.readyState] ??
          "Unknown")
        : "No observed Azure socket",
    }),
    dispose() {
      if (WebSocket.prototype.send === wrapped)
        WebSocket.prototype.send = original;
      socket = undefined;
    },
  };
}
