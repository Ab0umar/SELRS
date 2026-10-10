import { once } from "node:events";
import type { Server } from "node:http";
import type { AddressInfo } from "node:net";
import express from "express";
import { afterEach, beforeAll, describe, expect, it } from "vitest";

const originalAllowlist = process.env.ZK_ADMS_DEVICE_ALLOWLIST;
let server: Server | undefined;
let registerZKTecoAdms: (typeof import("../../server/_core/zktecoAdms"))["registerZKTecoAdms"];

beforeAll(async () => {
  process.env.JWT_SECRET ??=
    "attendance-adms-test-secret-012345678901234567890123";
  ({ registerZKTecoAdms } = await import("../../server/_core/zktecoAdms"));
});

afterEach(async () => {
  if (server?.listening) {
    server.close();
    await once(server, "close");
  }
  server = undefined;
  if (originalAllowlist === undefined) {
    delete process.env.ZK_ADMS_DEVICE_ALLOWLIST;
  } else {
    process.env.ZK_ADMS_DEVICE_ALLOWLIST = originalAllowlist;
  }
});

async function requestAdmsPath(
  path: string,
  init?: RequestInit,
): Promise<Response> {
  const app = express();
  registerZKTecoAdms(app);
  server = app.listen(0);
  await once(server, "listening");
  const { port } = server.address() as AddressInfo;
  return fetch(`http://127.0.0.1:${port}${path}`, init);
}

describe("ZKTeco ADMS request access", () => {
  it("denies device requests when no explicit device allowlist is configured", async () => {
    delete process.env.ZK_ADMS_DEVICE_ALLOWLIST;

    const response = await requestAdmsPath(
      `/iclock/cdata?SN=unconfigured-${Date.now()}`,
    );

    expect(response.status).toBe(403);
  });

  it("allows only the configured serial from its configured source IP", async () => {
    const serial = `trusted-${Date.now()}`;
    process.env.ZK_ADMS_DEVICE_ALLOWLIST = `${serial}@127.0.0.1`;

    const response = await requestAdmsPath(
      `/iclock/cdata?SN=${encodeURIComponent(serial)}`,
    );

    expect(response.status).toBe(200);
  });

  it("rejects a serial that is not paired with the request source IP", async () => {
    process.env.ZK_ADMS_DEVICE_ALLOWLIST = `trusted-${Date.now()}@127.0.0.2`;

    const response = await requestAdmsPath(
      `/iclock/cdata?SN=untrusted-${Date.now()}`,
    );

    expect(response.status).toBe(403);
  });

  it("protects the command queue from untrusted requesters", async () => {
    delete process.env.ZK_ADMS_DEVICE_ALLOWLIST;

    const response = await requestAdmsPath(
      `/iclock/getrequest?SN=untrusted-${Date.now()}`,
    );

    expect(response.status).toBe(403);
  });

  it("rejects untrusted punch uploads before processing their body", async () => {
    delete process.env.ZK_ADMS_DEVICE_ALLOWLIST;

    const response = await requestAdmsPath(
      `/iclock/cdata?SN=untrusted-${Date.now()}&table=ATTLOG`,
      { method: "POST", body: "31\t2026-09-29 10:00:00\t0\t1" },
    );

    expect(response.status).toBe(403);
  });
});
