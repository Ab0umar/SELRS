import { beforeEach, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({
  generate: vi.fn(),
  budget: vi.fn(),
  reusable: [] as string[],
}));
vi.mock("../services/marketing/topicHistory", () => ({
  marketingTopicHistory: async () => ({
    blocking: ["الليزك"],
    reusable: mocks.reusable,
  }),
}));
vi.mock("../db", () => ({
  getDb: async () => ({
    select: (fields: Record<string, unknown>) => ({
      from: () => ({
        orderBy: () => ({
          limit: async () => {
            const row: Record<string, string> = {
              topic: "فكرة محفوظة",
              title: "عنوان",
              content: "محتوى حديث للصفحتين",
            };
            return [
              Object.fromEntries(
                Object.keys(fields).map((key) => [key, row[key]]),
              ),
            ];
          },
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
import {
  buildPlannerInput,
  planMarketingTopic,
  PLANNER_INPUT_LIMIT,
  PLANNER_PUBLISHED_CAP,
} from "../services/marketing/topicPlanner";
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
  expect(input.recent[0]).toEqual({ topic: "فكرة محفوظة", title: "عنوان" });
  expect(input.published).toContain("الليزك");
  expect(input.rejected).toEqual([]);
  const retry = JSON.parse(mocks.generate.mock.calls[1][0].input);
  expect(retry.rejected).toEqual(["LASIK"]);
});
it("keeps the model input under the gateway limit with 300 published posts", () => {
  const published = Array.from(
    { length: 300 },
    (_, index) =>
      `موضوع تثقيفي طويل عن صحة العين وأساليب الوقاية رقم ${index} مع زاوية مختلفة للشرح`,
  );
  const recent = published
    .slice(-60)
    .reverse()
    .map((topic) => ({ topic, title: `عنوان ${topic}` }));
  const input = buildPlannerInput(published, recent, []);
  expect(input.length).toBeLessThanOrEqual(PLANNER_INPUT_LIMIT);
  const parsed = JSON.parse(input);
  expect(parsed.published.length).toBeLessThanOrEqual(PLANNER_PUBLISHED_CAP);
  expect(parsed.published.at(-1)).toBe(published.at(-1));
  expect(parsed.published).not.toContain(published[0]);
  expect(JSON.stringify(parsed.recent)).not.toContain("content");
});
it("rejects exact repeats from the full history, beyond the capped prompt list", async () => {
  mocks.generate.mockResolvedValue({
    domain: "صحة عيون الأطفال وتطور الإبصار",
    topic: "الليزك",
  });
  await expect(planMarketingTopic()).rejects.toThrow("تعذر اختيار فكرة جديدة");
});
it("bounds rejected proposals instead of generating forever", async () => {
  mocks.generate.mockResolvedValue({
    domain: "صحة عيون الأطفال وتطور الإبصار",
    topic: "فكرة محفوظة",
  });
  await expect(planMarketingTopic()).rejects.toThrow("تعذر اختيار فكرة جديدة");
  expect(mocks.generate).toHaveBeenCalledTimes(3);
});
