import { beforeEach, describe, expect, it, vi } from "vitest";
import { makeCallerAs } from "./helpers/auth";

vi.mock("../db", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../db")>()),
  getDb: vi.fn(),
}));
import * as db from "../db";
import { systemRouter } from "../_core/systemRouter";

beforeEach(() => vi.clearAllMocks());

describe("medical migration review access", () => {
  it.each(["doctor", "nurse", "reception"])(
    "blocks %s before reading archived clinical values",
    async (role) => {
      await expect(
        systemRouter
          .createCaller(makeCallerAs(role))
          .medicalMigrationConflicts({ page: 1 }),
      ).rejects.toMatchObject({ code: "FORBIDDEN" });
      expect(db.getDb).not.toHaveBeenCalled();
    },
  );
  it("tells the admin when the review migration has not been applied", async () => {
    vi.mocked(db.getDb).mockResolvedValue({
      execute: async () => [[], []],
    } as Awaited<ReturnType<typeof db.getDb>>);
    await expect(
      systemRouter
        .createCaller(makeCallerAs("admin"))
        .medicalMigrationConflicts({ page: 1 }),
    ).resolves.toEqual({ migrationRequired: true, total: 0, rows: [] });
  });
});
