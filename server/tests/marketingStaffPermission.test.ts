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
const READ_REFUSED = "تحتاج صلاحية محتوى التسويق";
const WRITE_REFUSED = "تحتاج صلاحية تعديل محتوى التسويق";

beforeEach(() => {
  mocks.permissions = [];
  const query = {
    from: () => query,
    where: () => query,
    orderBy: () => query,
    limit: () => query,
    offset: async () => [],
    then: (resolve: (value: unknown[]) => unknown) =>
      Promise.resolve([]).then(resolve),
  };
  mocks.db.mockResolvedValue({ select: () => query });
});

// A call that passes the permission gate may still fail on the mocked database.
async function passesGate(call: () => Promise<unknown>) {
  try {
    await call();
  } catch (error) {
    expect(String((error as Error).message)).not.toMatch(/صلاحية/);
  }
}

describe("marketing staff permission by screen", () => {
  it("refuses everything without a marketing permission", async () => {
    mocks.permissions = ["/patients:rw"];
    await expect(staff().dashboardSummary()).rejects.toThrow(READ_REFUSED);
    await expect(staff().listPosts({})).rejects.toThrow(READ_REFUSED);
  });

  describe("dashboard only (/marketing)", () => {
    beforeEach(() => {
      mocks.permissions = ["/marketing"];
    });
    it("allows dashboard queries", async () => {
      await expect(staff().dashboardSummary()).resolves.toBeDefined();
    });
    it("refuses drafts read, drafts mutate, publish and history", async () => {
      await expect(staff().listPosts({ status: "draft" })).rejects.toThrow(
        READ_REFUSED,
      );
      await expect(staff().updatePost({ id: 1, title: "x" })).rejects.toThrow(
        WRITE_REFUSED,
      );
      await expect(
        staff().publishPost({ id: 1, pageRole: "center" }),
      ).rejects.toThrow(WRITE_REFUSED);
      await expect(staff().postStats()).rejects.toThrow(READ_REFUSED);
    });
  });

  describe("dashboard with write (/marketing:rw)", () => {
    beforeEach(() => {
      mocks.permissions = ["/marketing:rw"];
    });
    it("allows publishing from the dashboard", async () => {
      await passesGate(() =>
        staff().publishPost({ id: 1, pageRole: "center" }),
      );
    });
    it("does not inherit the drafts screen", async () => {
      await expect(staff().listPosts({})).rejects.toThrow(READ_REFUSED);
      await expect(
        staff().schedulePost({
          id: 1,
          pageRole: "center",
          date: "2030-01-01",
          hour: 9,
        }),
      ).rejects.toThrow(WRITE_REFUSED);
    });
  });

  describe("drafts read-only (/marketing/drafts)", () => {
    beforeEach(() => {
      mocks.permissions = ["/marketing/drafts"];
    });
    it("allows listing drafts", async () => {
      await expect(staff().listPosts({ status: "draft" })).resolves.toEqual([]);
    });
    it("refuses every mutation", async () => {
      await expect(staff().deletePost({ id: 1 })).rejects.toThrow(
        WRITE_REFUSED,
      );
      await expect(
        staff().publishPost({ id: 1, pageRole: "center" }),
      ).rejects.toThrow(WRITE_REFUSED);
    });
  });

  describe("drafts with write (/marketing/drafts:rw)", () => {
    beforeEach(() => {
      mocks.permissions = ["/marketing/drafts:rw"];
    });
    it("allows editing and scheduling drafts", async () => {
      await passesGate(() => staff().updatePost({ id: 1, title: "x" }));
      await passesGate(() =>
        staff().schedulePost({
          id: 1,
          pageRole: "center",
          date: "2030-01-01",
          hour: 9,
        }),
      );
    });
    it("refuses dashboard-only and history-only procedures", async () => {
      await expect(staff().dashboardSummary()).rejects.toThrow(READ_REFUSED);
      await expect(staff().generateWeekDrafts()).rejects.toThrow(WRITE_REFUSED);
      await expect(staff().refreshPostStats()).rejects.toThrow(WRITE_REFUSED);
    });
  });

  describe("history read-only (/marketing/history)", () => {
    beforeEach(() => {
      mocks.permissions = ["/marketing/history"];
    });
    it("allows post performance", async () => {
      await passesGate(() => staff().postStats());
    });
    it("refuses deleting and drafts actions", async () => {
      await expect(staff().deletePost({ id: 1 })).rejects.toThrow(
        WRITE_REFUSED,
      );
      await expect(staff().updatePost({ id: 1, title: "x" })).rejects.toThrow(
        WRITE_REFUSED,
      );
    });
  });

  describe("history with write (/marketing/history:rw)", () => {
    beforeEach(() => {
      mocks.permissions = ["/marketing/history:rw"];
    });
    it("allows refreshing performance and deleting from history", async () => {
      await passesGate(() => staff().refreshPostStats());
      await passesGate(() => staff().deletePost({ id: 1 }));
    });
    it("refuses publishing", async () => {
      await expect(
        staff().publishPost({ id: 1, pageRole: "center" }),
      ).rejects.toThrow(WRITE_REFUSED);
    });
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
  ])("keeps %s admin-only with every marketing permission", async (_, call) => {
    mocks.permissions = [
      "/marketing:rw",
      "/marketing/drafts:rw",
      "/marketing/history:rw",
      "/marketing/settings:rw",
      "/marketing/brand:rw",
    ];
    await expect(call()).rejects.toThrow("Only administrators");
  });

  it("does not let a settings-only permission open content", async () => {
    mocks.permissions = ["/marketing/settings:rw"];
    await expect(staff().listPosts({})).rejects.toThrow(READ_REFUSED);
    await expect(staff().dashboardSummary()).rejects.toThrow(READ_REFUSED);
  });

  it("lets admins through without permissions", async () => {
    await expect(
      marketingRouter.createCaller(makeCallerAs("admin")).listPosts({}),
    ).resolves.toEqual([]);
  });
});
