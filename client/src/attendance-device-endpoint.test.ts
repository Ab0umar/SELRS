import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  getDeviceEndpoint,
  requireDeviceEndpoint,
} from "../../server/services/attendance/deviceEndpoint";

beforeEach(() => {
  for (const key of [
    "ATTENDANCE_DEVICE_IP",
    "ATTENDANCE_DEVICE_PORT",
    "ZK_DEVICE_IP",
    "ZK_DEVICE_PORT",
    "ZK4370_IP",
    "ZK4370_PORT",
  ]) {
    vi.stubEnv(key, "");
  }
});
afterEach(() => vi.unstubAllEnvs());

describe("fingerprint endpoints are local to the server environment", () => {
  it("switches FK between local and remote without cached or database addresses", () => {
    vi.stubEnv("ATTENDANCE_DEVICE_IP", "192.168.1.106");
    vi.stubEnv("ATTENDANCE_DEVICE_PORT", "5005");
    expect(requireDeviceEndpoint("fk")).toEqual({
      ip: "192.168.1.106",
      port: 5005,
    });
    vi.stubEnv("ATTENDANCE_DEVICE_IP", "198.51.100.10");
    vi.stubEnv("ATTENDANCE_DEVICE_PORT", "15005");
    expect(requireDeviceEndpoint("fk")).toEqual({
      ip: "198.51.100.10",
      port: 15005,
    });
  });

  it("gives canonical ZK variables precedence over legacy aliases", () => {
    vi.stubEnv("ZK4370_IP", "198.51.100.10");
    vi.stubEnv("ZK4370_PORT", "14370");
    expect(requireDeviceEndpoint("zk")).toEqual({
      ip: "198.51.100.10",
      port: 14370,
    });
    vi.stubEnv("ZK_DEVICE_IP", "192.168.1.106");
    vi.stubEnv("ZK_DEVICE_PORT", "4370");
    expect(requireDeviceEndpoint("zk")).toEqual({
      ip: "192.168.1.106",
      port: 4370,
    });
  });

  it.each(["fk", "zk"] as const)(
    "does not connect %s to a default when env is missing",
    (device) => {
      expect(getDeviceEndpoint(device)).toEqual({ ip: "", port: 0 });
      expect(() => requireDeviceEndpoint(device)).toThrow(
        "in this server's env",
      );
    },
  );

  it.each(["0", "65536", "4370oops", "NaN", "1.5"])(
    "rejects invalid env port %s",
    (port) => {
      vi.stubEnv("ZK_DEVICE_PORT", port);
      expect(() => getDeviceEndpoint("zk")).toThrow("integer from 1 to 65535");
    },
  );

  it("rejects an endpoint with an IP but no explicit port", () => {
    vi.stubEnv("ZK_DEVICE_IP", "192.168.1.106");
    expect(() => requireDeviceEndpoint("zk")).toThrow("ZK_DEVICE_PORT");
  });
});
