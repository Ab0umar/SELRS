import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ send: vi.fn() }));
vi.mock("web-push", () => ({
  default: {
    setVapidDetails: vi.fn(),
    sendNotification: mocks.send,
  },
}));
vi.mock("../db", () => ({}));
vi.mock("../_core/env", () => ({
  ENV: { vapidPublicKey: "pub", vapidPrivateKey: "priv" },
}));

import { sendWebPushToSubscription } from "../_core/webPush";
import { parseWebPushSubscription } from "../_core/webPushSubscription";

const keys = { p256dh: "BPublicKeyValue", auth: "authSecret" };
const sub = (endpoint: string, extra: object = {}) =>
  JSON.stringify({ endpoint, keys, ...extra });

describe("parseWebPushSubscription", () => {
  it.each([
    "https://fcm.googleapis.com/fcm/send/abc",
    "https://updates.push.services.mozilla.com/wpush/v2/abc",
    "https://wns2-par02p.notify.windows.com/w/?token=abc",
    "https://web.push.apple.com/abc",
  ])("accepts %s", (endpoint) => {
    expect(parseWebPushSubscription(sub(endpoint))).toMatchObject({ keys });
  });

  it.each([
    "http://169.254.169.254/latest/meta-data",
    "http://localhost:4000/api/x",
    "https://127.0.0.1/x",
    "https://192.168.1.100/x",
    "http://fcm.googleapis.com/fcm/send/abc",
    "https://fcm.googleapis.com.evil.example/abc",
    "https://evilfcm.googleapis.com.example/abc",
    "https://notfcm.googleapis.com@evil.example/abc",
    "https://user:pass@fcm.googleapis.com/abc",
    "https://fcm.googleapis.com:8443/abc",
    "ftp://fcm.googleapis.com/abc",
    "not a url",
  ])("rejects %s", (endpoint) => {
    expect(parseWebPushSubscription(sub(endpoint))).toBeNull();
  });

  it("rejects missing keys, bad JSON and oversized input", () => {
    expect(
      parseWebPushSubscription(
        JSON.stringify({ endpoint: "https://fcm.googleapis.com/x" }),
      ),
    ).toBeNull();
    expect(parseWebPushSubscription("{not json")).toBeNull();
    expect(parseWebPushSubscription("x".repeat(5000))).toBeNull();
    expect(parseWebPushSubscription(null)).toBeNull();
  });
});

describe("sendWebPushToSubscription", () => {
  beforeEach(() => mocks.send.mockReset());
  const payload = { notificationId: "1", title: "t", body: "b" };

  it("never contacts an endpoint outside the push services", async () => {
    const result = await sendWebPushToSubscription(
      sub("http://169.254.169.254/latest/meta-data"),
      payload,
    );
    expect(result).toBe("expired");
    expect(mocks.send).not.toHaveBeenCalled();
  });

  it("sends to a real push service endpoint", async () => {
    mocks.send.mockResolvedValue({});
    const result = await sendWebPushToSubscription(
      sub("https://fcm.googleapis.com/fcm/send/abc"),
      payload,
    );
    expect(result).toBe("sent");
    expect(mocks.send).toHaveBeenCalledTimes(1);
  });
});
