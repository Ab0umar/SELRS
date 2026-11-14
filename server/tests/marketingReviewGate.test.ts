import { beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({
  post: {} as Record<string, string | null>,
  approval: null as string | null,
  push: vi.fn(),
  logs: [] as unknown[],
}));
vi.mock("../db", () => {
  const query = {
    from: () => query,
    where: () => query,
    limit: async () => [mocks.post],
  };
  return {
    getDb: async () => ({
      select: () => query,
      insert: () => ({
        values: async (value: unknown) => {
          mocks.logs.push(value);
        },
      }),
    }),
    getSystemSetting: async () =>
      mocks.approval === null ? null : { value: mocks.approval },
    updateSystemSettings: vi.fn(),
  };
});
vi.mock("../_core/appNotifications", () => ({
  pushAppNotification: mocks.push,
}));
import { checkMarketingContent } from "../services/marketing/contentCheck";
import {
  announceManualDraft,
  finishScheduledDraft,
  marketingApprovalRequired,
} from "../services/marketing/marketingReview";

const clean = {
  title: "جفاف العين في الشتاء",
  content: "نصائح بسيطة لترطيب العين وتقليل الإجهاد أمام الشاشات.",
  cta: "احجز كشفك من الرابط",
  topic: "جفاف العين",
};

beforeEach(() => {
  vi.clearAllMocks();
  mocks.post = { ...clean };
  mocks.approval = null;
  mocks.logs.length = 0;
});

describe("content check rules", () => {
  it.each([
    ["الكشف بـ 300 جنيه فقط", "يذكر سعرًا أو عملة"],
    ["خصم خاص هذا الأسبوع", "يذكر خصمًا أو عرضًا"],
    ["نتيجة مضمونة للجميع", "يحتوي صيغة ضمان"],
    ["نسبة نجاح ٩٩٪ للعملية", "يذكر نسبة أو إحصائية"],
    ["تواصل معنا 01012345678", "يحتوي رقم هاتف داخل النص"],
    ["التفاصيل على www.example.com", "يحتوي رابطًا داخل النص"],
  ])("flags %s", (content, reason) => {
    expect(checkMarketingContent({ ...clean, content })).toContain(reason);
  });
  it("passes a plain educational post, including a CTA booking link", () => {
    expect(
      checkMarketingContent({
        ...clean,
        cta: "احجز: https://selrs.cc/my/book-guest",
      }),
    ).toEqual([]);
  });
});

describe("scheduled draft gate", () => {
  it("approval mode defaults to on when never saved", async () => {
    expect(await marketingApprovalRequired("center")).toBe(true);
  });
  it("never publishes while approval mode is on, and notifies once", async () => {
    const publish = vi.fn();
    expect(await finishScheduledDraft(1, "center", true, publish)).toBe(false);
    expect(publish).not.toHaveBeenCalled();
    expect(mocks.push).toHaveBeenCalledOnce();
    expect(mocks.push.mock.calls[0][0].message).toContain("تنتظر موافقتك");
    expect(mocks.push.mock.calls[0][0].meta.path).toBe(
      "/marketing/drafts?post=1",
    );
  });
  it("never publishes a flagged draft, even with approval off", async () => {
    mocks.approval = "false";
    mocks.post = { ...clean, content: "خصم ٥٠٪ لفترة محدودة" };
    const publish = vi.fn();
    expect(await finishScheduledDraft(1, "center", true, publish)).toBe(false);
    expect(publish).not.toHaveBeenCalled();
    expect(mocks.logs).toContainEqual(
      expect.objectContaining({ action: "content_check" }),
    );
    expect(mocks.push).toHaveBeenCalledOnce();
    expect(mocks.push.mock.calls[0][0].kind).toBe("warning");
  });
  it("publishes a clean draft with approval off and says so once", async () => {
    mocks.approval = "false";
    const publish = vi.fn();
    expect(await finishScheduledDraft(1, "center", true, publish)).toBe(true);
    expect(publish).toHaveBeenCalledOnce();
    expect(mocks.push).toHaveBeenCalledOnce();
    expect(mocks.push.mock.calls[0][0].message).toContain("نُشرت");
  });
  it("does not notify 'published' when publishing fails", async () => {
    mocks.approval = "false";
    await expect(
      finishScheduledDraft(1, "center", true, async () => {
        throw new Error("facebook down");
      }),
    ).rejects.toThrow();
    expect(mocks.push).not.toHaveBeenCalled();
  });
  it("announces a manual draft once, without the post body", async () => {
    await announceManualDraft(1);
    expect(mocks.push).toHaveBeenCalledOnce();
    expect(mocks.push.mock.calls[0][0].message).not.toContain(clean.content);
  });
});
