import { beforeEach, describe, expect, it, vi } from "vitest";
import { makeCallerAs } from "./helpers/auth";

vi.mock("../db", () => ({
  getEffectiveUserPermissions: vi.fn().mockResolvedValue([]),
  getDb: vi.fn(),
  logAuditEvent: vi.fn().mockResolvedValue(undefined),
}));

import * as db from "../db";
import {
  makeAccWriteProcedure,
  makeAttWriteProcedure,
  makeKfWriteProcedure,
  makeSalaryWriteProcedure,
  makeStockroomWriteProcedure,
  router,
  writePermissionPath,
} from "../_core/procedures";

const factories = [
  ["kf", "/kf", makeKfWriteProcedure],
  ["accounting", "/accounting", makeAccWriteProcedure],
  ["attendance", "/attendance", makeAttWriteProcedure],
  ["stockroom", "/stockroom", makeStockroomWriteProcedure],
  ["salary", "/salary", makeSalaryWriteProcedure],
] as const;

function callerFor(
  factory: (typeof factories)[number][2],
  path: string,
  permissions: string[],
) {
  vi.mocked(db.getEffectiveUserPermissions).mockResolvedValue(permissions);
  const appRouter = router({ write: factory(path).mutation(() => "ok") });
  return appRouter.createCaller(makeCallerAs("reception"));
}

describe("writePermissionPath", () => {
  it("returns the page only for an explicit :rw token", () => {
    expect(writePermissionPath("/salary:rw")).toBe("/salary");
    expect(writePermissionPath(" /salary/penalties:rw ")).toBe(
      "/salary/penalties",
    );
    expect(writePermissionPath("/salary")).toBeNull();
    expect(writePermissionPath("/salary:r")).toBeNull();
    expect(writePermissionPath(undefined)).toBeNull();
  });
});

describe.each(factories)("%s write procedure", (_name, path, factory) => {
  beforeEach(() => vi.clearAllMocks());

  it("rejects a bare path", async () => {
    await expect(
      callerFor(factory, path, [path]).write(),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("rejects a page the permissions screen set to read (bare + :r)", async () => {
    await expect(
      callerFor(factory, path, [path, `${path}:r`]).write(),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("allows what the permissions screen stores for read-write (bare + :rw)", async () => {
    await expect(
      callerFor(factory, path, [path, `${path}:rw`]).write(),
    ).resolves.toBe("ok");
  });

  it("allows :rw on a parent page, not on an unrelated one", async () => {
    await expect(
      callerFor(factory, `${path}/sub`, [`${path}:rw`]).write(),
    ).resolves.toBe("ok");
    await expect(
      callerFor(factory, path, ["/other:rw"]).write(),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
  });
});
