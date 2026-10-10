import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
import { chromium } from "@playwright/test";

const base = process.env.DESIGN_PREVIEW_URL || "http://127.0.0.1:5179";
await mkdir("outputs/legacy-homes", { recursive: true });
const browser = await chromium.launch({
  executablePath:
    process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE ||
    "C:/Users/SELRS/AppData/Local/ms-playwright/chromium-1234/chrome-win64/chrome.exe",
});
let cases = 0;
try {
  for (const width of [360, 768, 1440]) {
    for (const path of ["/home", "/salary", "/attendance"]) {
      const context = await browser.newContext({
        viewport: { width, height: 1000 },
      });
      await context.addInitScript(() => localStorage.setItem("theme", "light"));
      const page = await context.newPage();
      const errors = [];
      const months = [];
      let salaryState = "populated";
      page.on("pageerror", (error) => errors.push(error.message));
      await page.route("**/api/**", async (route) => {
        assert.equal(
          route.request().method(),
          "GET",
          "UI verification must not write data",
        );
        const url = new URL(route.request().url());
        if (!url.pathname.includes("/api/trpc/"))
          return route.fulfill({ json: {} });
        const input = JSON.parse(url.searchParams.get("input") || "{}");
        const fixtures = {
          "auth.me": { id: 999999, role: "admin", name: "اختبار الواجهة" },
          "attendance.dashboardSummary": {
            presentToday: 12,
            absentToday: 2,
            lateToday: 1,
            insideNow: 8,
            missingCheckoutYesterday: 1,
            presentMorning: 8,
            presentEvening: 4,
          },
          "attendance.listShifts": [
            { startTime: "08:00", endTime: "12:00" },
            { startTime: "14:00", endTime: "20:00" },
          ],
          "attendance.deviceStatus": { status: "online" },
          "attendance.dailyByDate": [],
          "salary.monthSummary":
            salaryState === "empty"
              ? {
                  staffCount: 0,
                  finalCount: 0,
                  totalPay: 0,
                  totalCommissions: 0,
                  totalPenalties: 0,
                }
              : {
                  staffCount: 3,
                  finalCount: 1,
                  totalPay: 24000,
                  totalCommissions: 3200,
                  totalPenalties: 100,
                },
          "medical.getSystemSetting": null,
        };
        const responses = url.pathname
          .split("/api/trpc/")[1]
          .split(",")
          .map((method, index) => {
            if (method === "salary.monthSummary") {
              months.push(
                (url.searchParams.has("batch") ? input[index] : input)?.json,
              );
              if (salaryState === "error")
                return {
                  error: {
                    json: {
                      message: "Fixture failure",
                      code: -32603,
                      data: { code: "INTERNAL_SERVER_ERROR", httpStatus: 500 },
                    },
                  },
                };
            }
            return {
              result: {
                data: { json: method in fixtures ? fixtures[method] : [] },
              },
            };
          });
        await route.fulfill({
          json: url.searchParams.has("batch") ? responses : responses[0],
        });
      });
      await page.goto(base + path);
      const root = page.locator(
        path === "/home"
          ? ".legacy-home-menu"
          : path === "/salary"
            ? ".salary-legacy-home"
            : ".attendance-legacy-home",
      );
      await root.waitFor();
      await page.waitForTimeout(600);
      assert.equal(
        await page.evaluate(
          () => document.documentElement.scrollWidth > innerWidth + 1,
        ),
        false,
        `${path} page overflow at ${width}`,
      );
      const clipping = await root
        .locator("h3, dt, dd")
        .evaluateAll((nodes) =>
          nodes
            .filter(
              (node) =>
                node.clientWidth && node.scrollWidth > node.clientWidth + 2,
            )
            .map((node) => node.textContent),
        );
      assert.deepEqual(clipping, [], `${path} clipped labels at ${width}`);
      if (path === "/home") {
        const columns = await root.evaluate(
          (node) =>
            getComputedStyle(node).gridTemplateColumns.split(" ").length,
        );
        assert.equal(columns, width < 1024 ? 3 : 6);
        assert.ok((await root.locator(".lucide-arrow-up-left").count()) > 0);
        await root
          .getByRole("button", { name: "الموظفين الحضور والمرتبات" })
          .click();
        assert.equal(
          await page
            .getByRole("menuitem", { name: "الحضور", exact: true })
            .getAttribute("href"),
          "/attendance",
        );
        assert.equal(
          await page
            .getByRole("menuitem", { name: "المرتبات", exact: true })
            .getAttribute("href"),
          "/salary",
        );
        await page.keyboard.press("Escape");
        await page.getByRole("menu").waitFor({ state: "hidden" });
        await page.waitForTimeout(250);
      } else if (path === "/salary") {
        assert.equal(await root.locator("aside nav a").count(), 4);
        assert.equal(await root.locator("dl dd.rounded-full").count(), 3);
        await root.getByLabel("الشهر", { exact: true }).fill("2026-09");
        await page.waitForTimeout(500);
        assert.ok(
          months.some((input) => input?.year === 2026 && input?.month === 9),
          "Month selection must still update the query",
        );
      } else {
        assert.equal(await root.getByRole("progressbar").count(), 2);
        assert.equal(
          await root.locator('[aria-labelledby="home-commitment"] dd').count(),
          3,
        );
        await root
          .locator(".attendance-today-register")
          .getByText("لا توجد سجلات حضور اليوم.", { exact: true })
          .waitFor();
      }
      await page.screenshot({
        path: `outputs/legacy-homes/${path.slice(1)}-${width}.png`,
        fullPage: true,
      });
      if (path === "/salary") {
        for (salaryState of ["error", "empty"]) {
          await page.reload();
          await root.waitFor();
          if (salaryState === "error") {
            await root
              .getByRole("button", { name: "إعادة المحاولة", exact: true })
              .waitFor();
            salaryState = "populated";
            await root
              .getByRole("button", { name: "إعادة المحاولة", exact: true })
              .click();
            await root.getByText("الكشف مسودة", { exact: true }).waitFor();
          } else
            await root
              .getByText("لا يوجد موظفون في كشف هذا الشهر", { exact: true })
              .waitFor();
        }
      }
      assert.deepEqual(errors, [], `${path} browser errors`);
      cases++;
      await context.close();
    }
  }
} finally {
  await browser.close();
}
console.log(
  `Passed ${cases} legacy home layout checks, including navigation, month selection, errors and empty states.`,
);
