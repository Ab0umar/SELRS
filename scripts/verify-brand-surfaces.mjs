import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
import { chromium } from "@playwright/test";
await mkdir("outputs/brand-surfaces", { recursive: true });
const browser = await chromium.launch({
  executablePath:
    "C:/Users/SELRS/AppData/Local/ms-playwright/chromium-1234/chrome-win64/chrome.exe",
});
let cases = 0;
try {
  for (const width of [360, 1440])
    for (const path of [
      "/records/medical?tab=linking",
      "/attendance",
      "/accounting",
      "/salary",
    ]) {
      const context = await browser.newContext({
        viewport: { width, height: 1000 },
      });
      await context.addInitScript(() => localStorage.setItem("theme", "light"));
      const page = await context.newPage();
      await page.route("**/api/**", async (route) => {
        if (route.request().method() !== "GET") {
          await route.abort();
          return;
        }
        const url = new URL(route.request().url());
        if (!url.pathname.includes("/api/trpc/")) {
          await route.fulfill({ json: { ok: true, files: [], count: 0 } });
          return;
        }
        const fixtures = {
          "auth.me": { id: 999999, role: "admin", name: "اختبار واجهة" },
          "attendance.dashboardSummary": {
            presentToday: 0,
            absentToday: 0,
            lateToday: 0,
            presentNow: 0,
            missingCheckoutYesterday: 0,
            shifts: [],
          },
          "salary.monthSummary": { staffCount: 3, finalCount: 1, totalPay: 24000, totalCommissions: 3200, totalPenalties: 100 },
          "medical.getAutorefractometryOverview": { rows: [], total: 0 },
          "medical.getUserPageState": null,
          "medical.getSystemSetting": null,
          "medical.getPentacamDashboardStats": { examsToday: 0, totalExams: 0 },
        };
        const responses = url.pathname
          .split("/api/trpc/")[1]
          .split(",")
          .map((method) => ({
            result: {
              data: { json: method in fixtures ? fixtures[method] : [] },
            },
          }));
        await route.fulfill({
          json: url.searchParams.has("batch") ? responses : responses[0],
        });
      });
      await page.goto((process.env.DESIGN_PREVIEW_URL || "http://127.0.0.1:5177") + path);
      await page.locator(".selrs-app-content").waitFor();
      await page.waitForTimeout(800);
      const surfaces = await page.evaluate(() => {
        const root = getComputedStyle(document.documentElement);
        const nodes = [
          document.body,
          document.querySelector(".selrs-page-bg"),
          document.querySelector("[data-app-scroll-container]"),
          document.querySelector(
            ".medical-records-workspace, [data-operational-module], .attendance-workspace",
          ),
        ].filter(Boolean);
        return {
          primary: root.getPropertyValue("--primary").trim(),
          secondary: root.getPropertyValue("--secondary").trim(),
          surfaces: nodes.map((node) => ({
            background: getComputedStyle(node).backgroundColor,
            token: getComputedStyle(node)
              .getPropertyValue("--background")
              .trim(),
          })),
        };
      });
      assert.equal(surfaces.primary, "#003d82");
      assert.equal(surfaces.secondary, "#ff9500");
      assert.equal(await page.locator('[data-app-top-nav]').evaluate(node=>getComputedStyle(node).backgroundColor),'rgb(255, 255, 255)');
      if (width < 768) {
        assert.equal(await page.locator('[data-app-bottom-nav]').evaluate(node => getComputedStyle(node).backgroundColor), 'rgb(0, 61, 130)');
      }
      if(path.includes('/records/medical')) {
        assert.equal(await page.locator('.medical-records-sidebar').count(),0);
      }
      for (const surface of surfaces.surfaces) {
        assert.ok(["#fff", "#ffffff"].includes(surface.token));
        assert.equal(
          surface.background,
          "rgb(255, 255, 255)",
          `${path} background`,
        );
      }
      assert.equal(
        await page.evaluate(
          () => document.documentElement.scrollWidth > innerWidth + 1,
        ),
        false,
      );
      await page.screenshot({
        path: `outputs/brand-surfaces/${path.split("?")[0].replaceAll("/", "-")}-${width}.png`,
      });
      cases++;
      await context.close();
    }
} finally {
  await browser.close();
}
console.log(
  `Passed ${cases} brand palette / unified surface / viewport checks.`,
);
