import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
import { chromium } from "@playwright/test";
await mkdir("outputs/brand-surfaces", { recursive: true });
const browser = await chromium.launch({
  executablePath:
    "C:/Users/SELRS/AppData/Local/ms-playwright/chromium-1234/chrome-win64/chrome.exe",
});
let cases = 0;
const BRAND = {
  light: {
    primary: "#0b4a8f",
    secondary: "#f7941d",
    token: ["#fff", "#ffffff"],
    surface: "rgb(255, 255, 255)",
    nav: "rgb(255, 255, 255)",
  },
  dark: {
    primary: "#6fb1f5",
    secondary: "#f7941d",
    token: ["#0a1a2f"],
    surface: "rgb(10, 26, 47)",
    nav: "rgb(18, 48, 79)",
  },
};
try {
  for (const theme of ["light", "dark"])
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
      await context.addInitScript((t) => localStorage.setItem("theme", t), theme);
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
      const brand = BRAND[theme];
      assert.equal(surfaces.primary, brand.primary);
      assert.equal(surfaces.secondary, brand.secondary);
      assert.equal(await page.locator('[data-app-top-nav]').evaluate(node=>getComputedStyle(node).backgroundColor),brand.nav);
      if (width < 768) {
        assert.equal(await page.locator('[data-app-bottom-nav]').evaluate(node => getComputedStyle(node).backgroundColor), brand.nav);
      }
      if(path.includes('/records/medical')) {
        assert.equal(await page.locator('.medical-records-sidebar').count(),0);
      }
      for (const surface of surfaces.surfaces) {
        if (surface.background === "rgba(0, 0, 0, 0)") continue;
        assert.ok(brand.token.includes(surface.token));
        assert.equal(
          surface.background,
          brand.surface,
          `${theme} ${path} background`,
        );
      }
      assert.equal(
        await page.evaluate(
          () => document.documentElement.scrollWidth > innerWidth + 1,
        ),
        false,
      );
      await page.screenshot({
        path: `outputs/brand-surfaces/${theme}-${path.split("?")[0].replaceAll("/", "-")}-${width}.png`,
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
