import { beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({
  permissions: [] as string[],
  db: vi.fn(),
}));
vi.mock("../_core/env", () => ({ ENV: {} }));
vi.mock("../db", async (original) => ({
  ...(await original<typeof import("../db")>()),
  getDb: mocks.db,
  getEffectiveUserPermissions: async () => mocks.permissions,
}));
import { marketingRouter } from "../routers/marketing";
import { makeCallerAs } from "./helpers/auth";

const staff = () => marketingRouter.createCaller(makeCallerAs("reception"));

beforeEach(() => {
  mocks.permissions = [];
  const query = {
    from: () => query,
    where: () => query,
    orderBy: () => query,
    limit: () => query,
    offset: async () => [],
  };
  mocks.db.mockResolvedValue({ select: () => query });
});

describe("marketing staff permission", () => {
  it("refuses content screens without a marketing permission", async () => {
    mocks.permissions = ["/patients:rw"];
    await expect(staff().listPosts({})).rejects.toThrow(
      "تحتاج صلاحية محتوى التسويق",
    );
  });

  it("lets a drafts reader list posts but not change them", async () => {
    mocks.permissions = ["/marketing/drafts"];
    await expect(staff().listPosts({})).resolves.toEqual([]);
    await expect(staff().deletePost({ id: 1 })).rejects.toThrow(
      "تحتاج صلاحية تعديل محتوى التسويق",
    );
  });

  it("lets a drafts editor reach write procedures", async () => {
    mocks.permissions = ["/marketing/drafts:rw"];
    // Passes the gate and fails later on the mocked database, not on permission.
    await expect(staff().unschedulePost({ id: 1 })).rejects.not.toThrow(
      "صلاحية",
    );
  });

  it.each([
    ["getSettings", () => staff().getSettings()],
    ["getFacebookStatus", () => staff().getFacebookStatus()],
    ["centralSchedulerProviders", () => staff().centralSchedulerProviders()],
    ["listReferenceDesigns", () => staff().listReferenceDesigns({})],
    [
      "setApprovalMode",
      () => staff().setApprovalMode({ pageRole: "center", required: false }),
    ],
    ["runSchedulerNow", () => staff().runSchedulerNow({ pageRole: "center" })],
  ])(
    "keeps %s admin-only even with full marketing permission",
    async (_, call) => {
      mocks.permissions = [
        "/marketing:rw",
        "/marketing/settings:rw",
        "/marketing/brand:rw",
      ];
      await expect(call()).rejects.toThrow("Only administrators");
    },
  );

  it("does not let a settings-only permission open content", async () => {
    mocks.permissions = ["/marketing/settings:rw"];
    await expect(staff().listPosts({})).rejects.toThrow("صلاحية");
  });
});
