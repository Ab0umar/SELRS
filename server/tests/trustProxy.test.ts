import express from "express";
import { createServer } from "node:http";
import type { AddressInfo } from "node:net";
import { describe, expect, it } from "vitest";
import { parseTrustProxy } from "../_core/trustProxy";

describe("parseTrustProxy", () => {
  it("trusts one hop in production and none elsewhere by default", () => {
    expect(parseTrustProxy(undefined, "production")).toBe(1);
    expect(parseTrustProxy("", "development")).toBe(false);
  });
  it("reads explicit values", () => {
    expect(parseTrustProxy("2", "production")).toBe(2);
    expect(parseTrustProxy("0", "production")).toBe(false);
    expect(parseTrustProxy("true", "development")).toBe(true);
    expect(parseTrustProxy("10.0.0.0/8, 192.168.0.0/16", "production")).toEqual([
      "10.0.0.0/8",
      "192.168.0.0/16",
    ]);
  });
});

describe("req.ip behind one trusted hop", () => {
  it("uses the proxy-written address, not a forged left-most entry", async () => {
    const app = express();
    app.set("trust proxy", parseTrustProxy(undefined, "production"));
    app.get("/ip", (req, res) => res.json({ ip: req.ip }));
    const server = createServer(app).listen(0);
    const { port } = server.address() as AddressInfo;
    try {
      const res = await fetch(`http://127.0.0.1:${port}/ip`, {
        headers: { "X-Forwarded-For": "6.6.6.6, 203.0.113.9" },
      });
      expect((await res.json()).ip).toBe("203.0.113.9");
    } finally {
      server.close();
    }
  });
});
