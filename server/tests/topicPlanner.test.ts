import { beforeEach, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ generate: vi.fn(), budget: vi.fn() }));
vi.mock("../services/marketing/topicHistory", () => ({
  publishedMarketingTopics: async () => ["الليزك"],
}));
vi.mock("../db", () => ({
  getDb: async () => ({
    select: () => ({
      from: () => ({
        orderBy: () => ({
          limit: async () => [
            {
              topic: "فكرة محفوظة",
              title: "عنوان",
              content: "محتوى حديث للصفحتين",
            },
          ],
        }),
      }),
    }),
  }),
}));
vi.mock("../services/ai/marketingDraft", () => ({
  withMarketingBudget: (...args: unknown[]) => {
    mocks.budget(...args.slice(0, 3));
    return (args[3] as Function)(
      { generateJson: mocks.generate },
      "gemini-test",
    );
  },
}));
import { planMarketingTopic } from "../services/marketing/topicPlanner";
beforeEach(() => vi.clearAllMocks());
it("rejects a published alias then selects a new angle using cross-page context", async () => {
  mocks.generate
    .mockResolvedValueOnce({
      domain: "تصحيح الإبصار بالليزر والفيمتوليزر",
      topic: "LASIK",
    })
    .mockResolvedValueOnce({
      domain: "الشبكية والعصب البصري",
      topic: "دور البقعة الصفراء في قراءة التفاصيل الدقيقة",
    });
  expect(await planMarketingTopic()).toBe(
    "دور البقعة الصفراء في قراءة التفاصيل الدقيقة",
  );
  expect(mocks.generate).toHaveBeenCalledTimes(2);
  const input = JSON.parse(mocks.generate.mock.calls[0][0].input);
  expect(input.domains).toHaveLength(12);
  expect(input.recent[0].content).toBe("محتوى حديث للصفحتين");
  expect(input.published).toContain("الليزك");
});
it("bounds rejected proposals instead of generating forever", async () => {
  mocks.generate.mockResolvedValue({
    domain: "صحة عيون الأطفال وتطور الإبصار",
    topic: "فكرة محفوظة",
  });
  await expect(planMarketingTopic()).rejects.toThrow("تعذر اختيار فكرة جديدة");
  expect(mocks.generate).toHaveBeenCalledTimes(3);
});
