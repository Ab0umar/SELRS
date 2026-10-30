import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
import { chromium, expect } from "@playwright/test";
const browser = await chromium.launch({ channel: "msedge" });
const output = "outputs/grok-provider-ui";
await mkdir(output, { recursive: true });
try {
  const page = await browser.newPage({
    viewport: { width: 1440, height: 1100 },
  });
  const profiles = [
    "marketing.text",
    "marketing.image",
    "reply.live",
    "medical.documentation",
    "whatsapp.marketing",
  ].map((workload) => ({
    workload,
    provider: "gemini",
    model: workload === "marketing.image" ? "gemini-test-image" : "gemini-test",
    enabled: true,
    dailyRequests: 20,
    dailyTokens: 100000,
    maxConcurrent: 2,
  }));
  await page.route("**/api/**", async (route) => {
    const url = new URL(route.request().url());
    if (!url.pathname.includes("/api/trpc/"))
      return route.fulfill({ json: {} });
    assert.equal(
      route.request().method(),
      "GET",
      "UI smoke test must not mutate or generate",
    );
    const responses = url.pathname
      .split("/api/trpc/")[1]
      .split(",")
      .map((method) => {
        let data: unknown = [];
        if (method === "auth.me")
          data = { id: 999999, role: "admin", name: "UI fixture" };
        if (method === "aiManagement.status")
          data = {
            enabled: true,
            credentials: { gemini: true, manus: true, grok: true },
            grokModels: { text: "grok-4.7", image: "grok-imagine-image-2.0" },
          };
        if (method === "aiManagement.profiles") data = profiles;
        if (method === "aiManagement.models")
          data = [
            { id: "gemini-test", label: "Test", kind: "text" },
            { id: "gemini-test-image", label: "Test image", kind: "image" },
          ];
        if (method === "marketing.dashboardSummary")
          data = {
            recentPosts: [],
            counts: {
              draft: 0,
              total: 0,
              published: 0,
              failed: 0,
              scheduled: 0,
              publishing: 0,
            },
          };
        if (method === "marketing.getSettings") data = { autoPublish: false };
        if (method === "marketing.getSchedulerStatus")
          data = {
            autoPublish: false,
            schedulerStatus: "idle",
            publishHour: 9,
          };
        return { result: { data: { json: data } } };
      });
    await route.fulfill({
      json: url.searchParams.has("batch") ? responses : responses[0],
    });
  });
  await page.goto("http://127.0.0.1:4000/ai/settings");
  const forms = page.getByRole("form", { name: "إعدادات المهمة" });
  for (const profile of profiles) {
    await page
      .getByLabel("المهمة", { exact: true })
      .selectOption(profile.workload);
    await expect(forms).toHaveCount(1);
    const form = forms;
    const options = await form
      .getByLabel("المزوّد", { exact: true })
      .locator("option")
      .allTextContents();
    assert.equal(
      options.includes("Grok"),
      profile.workload === "marketing.text" ||
        profile.workload === "marketing.image",
      profile.workload,
    );
  }
  await page.screenshot({ path: `${output}/providers.png`, fullPage: true });
  await page.goto("http://127.0.0.1:4000/ai/marketing");
  const picker = page.getByLabel("المساعد والموديل", { exact: true });
  await expect(picker).toHaveValue("gemini:gemini-test|gemini-test-image");
  await picker.selectOption("grok:grok-4.7|grok-imagine-image-2.0");
  await expect(picker).toHaveValue("grok:grok-4.7|grok-imagine-image-2.0");
  await page.screenshot({ path: `${output}/marketing.png`, fullPage: true });
  console.log(
    "PASS: Grok visible and selectable in marketing; excluded from other providers; Gemini default preserved; API mocked, no paid requests.",
  );
} finally {
  await browser.close();
}
