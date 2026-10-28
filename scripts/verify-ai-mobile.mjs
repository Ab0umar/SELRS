import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import { chromium, expect } from "@playwright/test";

const base = process.env.AI_UI_BASE_URL || "http://127.0.0.1:4179";
const output = "outputs/ai-mobile/verification";
await mkdir(output, { recursive: true });
const browser = await chromium.launch({
  executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE,
});
const results = [];
try {
  for (const mobile of [true, false]) {
    const context = await browser.newContext({
      viewport: { width: 390, height: 844 },
      userAgent: `Mozilla/5.0${mobile ? " SELRS-AI/1" : ""}`,
    });
    let authenticated = true;
    let role = "admin";
    const page = await context.newPage();
    const errors = [];
    page.on("pageerror", (error) => errors.push(error.message));
    page.on("console", (message) => {
      if (message.type() === "error" && message.text().includes("Uncaught render error"))
        errors.push(message.text());
    });
    await page.route("**/api/**", async (route) => {
      const url = new URL(route.request().url());
      if (!url.pathname.includes("/api/trpc/")) {
        return route.fulfill({
          json: { ok: true, version: "ai-mobile-fixture" },
        });
      }
      const methods = url.pathname.split("/api/trpc/")[1].split(",");
      const data = methods.map((method) => {
        if (method === "auth.logout") authenticated = false;
        let value = [];
        if (method === "auth.me")
          value = authenticated
            ? { id: 999999, role, name: "اختبار معزول" }
            : null;
        if (method === "aiManagement.status")
          value = {
            enabled: true,
            marketingDraftAvailable: true,
            whatsappCopyAvailable: true,
            credentials: { gemini: true, manus: true, replyGemini: true },
          };
        if (
          method.startsWith("marketing.") ||
          method.startsWith("autoReply.") ||
          method.startsWith("medicalAssistant.")
        ) {
          return {
            error: {
              json: {
                message: "Isolated unavailable data",
                code: -32603,
                data: { code: "INTERNAL_SERVER_ERROR", httpStatus: 500 },
              },
            },
          };
        }
        return { result: { data: { json: value } } };
      });
      return route.fulfill({
        json: url.searchParams.has("batch") ? data : data[0],
      });
    });
    await page.goto(`${base}/ai`);
    await expect(
      page.getByRole("navigation", {
        name: "أقسام الذكاء الاصطناعي",
        exact: true,
      }),
    ).toBeVisible();
    if (mobile) {
      await expect(
        page.getByRole("button", { name: "تسجيل الخروج", exact: true }),
      ).toBeVisible();
      await expect(page.locator('a[href="/home"]')).toHaveCount(0);
      const nav = page.getByRole("navigation", {
        name: "أقسام الذكاء الاصطناعي",
        exact: true,
      });
      for (const path of [
        "/ai/replies",
        "/ai/medical",
        "/ai/marketing",
        "/ai/whatsapp",
        "/ai/settings",
        "/ai/experiments",
        "/ai/usage",
        "/ai",
      ]) {
        console.log(`Checking ${path}`);
        await nav.locator(`a[href="${path}"]`).click();
        await expect(page).toHaveURL(`${base}${path}`);
        await expect(page.locator("#ai-content")).toBeVisible();
        assert.ok(
          await page.evaluate(
            () => document.documentElement.scrollWidth <= innerWidth,
          ),
          `${path} overflow`,
        );
      }
      await page.goto(`${base}/home`);
      await expect(page).toHaveURL(`${base}/ai`);
      await page.reload();
      await expect(
        page.getByRole("button", { name: "تسجيل الخروج", exact: true }),
      ).toBeVisible();
      await page.screenshot({
        path: `${output}/ai-mobile.png`,
        fullPage: true,
      });
      await page
        .getByRole("button", { name: "تسجيل الخروج", exact: true })
        .click();
      await expect(page).toHaveURL(`${base}/login`);
      await expect(page.getByRole("heading", { name: "SELRS AI", exact: true })).toBeVisible();
      await expect(page.getByRole("navigation", { name: "بوابات المركز" })).toHaveCount(0);
      authenticated = true;
      role = "user";
      await page.goto(`${base}/ai`);
      await expect(page.getByText("ليس لديك صلاحية للوصول لهذه الصفحة", { exact: true })).toBeVisible();
      await expect(page).toHaveURL(`${base}/ai`);
      await page.getByRole("button", { name: "تسجيل الخروج", exact: true }).click();
      await expect(page).toHaveURL(`${base}/login`);
    } else {
      await expect(
        page.locator('.ai-workspace-heading a[href="/home"]'),
      ).toBeVisible();
    }
    assert.deepEqual(errors, []);
    results.push({ mobile, passed: true });
    await context.close();
  }
  await writeFile(`${output}/result.json`, JSON.stringify(results, null, 2));
  console.log(JSON.stringify(results));
} finally {
  await browser.close();
}
