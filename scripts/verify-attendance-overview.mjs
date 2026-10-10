import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
import { chromium } from "@playwright/test";

await mkdir("outputs/attendance-overview", { recursive: true });
const browser = await chromium.launch({
  executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE,
});
let cases = 0;
try {
  for (const theme of (process.env.DESIGN_VERIFY_THEMES?.split(',') ?? ["light", "dark"]))
    for (const width of (process.env.DESIGN_VERIFY_WIDTHS?.split(',').map(Number) ?? [360, 768, 1440])) {
      const context = await browser.newContext({
        viewport: { width, height: 1000 },
      });
      await context.addInitScript(
        (theme) => localStorage.setItem("theme", theme),
        theme,
      );
      const page = await context.newPage();
      const errors = [];
      let state = "populated";
      page.on("pageerror", (error) => errors.push(error.message));
      await page.route("**/api/**", async (route) => {
        assert.equal(
          route.request().method(),
          "GET",
          "Overview verification must not write attendance data",
        );
        const url = new URL(route.request().url());
        const responses = (
          url.pathname.split("/api/trpc/")[1]?.split(",") ?? []
        ).map((method) => {
          if (
            (method === "attendance.dashboardSummary" && state === "error") ||
            (method === "attendance.dailyByDate" && state === "register-error")
          )
            return {
              error: {
                json: {
                  message: "Fixture failure",
                  code: -32603,
                  data: { code: "INTERNAL_SERVER_ERROR", httpStatus: 500 },
                },
              },
            };
          return {
            result: {
              data: {
                json:
                  method === "auth.me"
                    ? { id: 999999, role: "admin", name: "اختبار الحضور" }
                    : method === "attendance.dailyByDate"
                      ? state === "empty"
                        ? []
                        : [
                            {
                              empCd: "TEST001",
                              empName: "أحمد محمد علي",
                              shiftId: 1,
                              firstIn: "2026-10-05T08:00:00",
                              lastOut: null,
                              status: "present",
                              lateMinutes: 0,
                            },
                            {
                              empCd: "TEST002",
                              empName: "محمد محمود السيد",
                              shiftId: 1,
                              firstIn: "2026-10-05T08:25:00",
                              lastOut: null,
                              status: "present",
                              lateMinutes: 25,
                            },
                            {
                              empCd: "TEST003",
                              empName: "سارة أحمد حسن",
                              shiftId: 1,
                              firstIn: null,
                              lastOut: null,
                              status: "absent",
                              lateMinutes: 0,
                            },
                          ]
                      : method === "attendance.dashboardSummary"
                        ? {
                            presentToday: state === "empty" ? 0 : 12,
                            absentToday: 2,
                            lateToday: 1,
                            insideNow: 8,
                            missingCheckoutYesterday: 1,
                            presentMorning: 8,
                            presentEvening: 4,
                          }
                        : method === "attendance.deviceStatus"
                          ? { status: "online" }
                          : method === "attendance.listShifts"
                            ? [
                                { startTime: "08:00", endTime: "12:00" },
                                { startTime: "14:00", endTime: "20:00" },
                              ]
                            : method.includes("getSystemSetting")
                              ? null
                              : [],
              },
            },
          };
        });
        await route.fulfill({
          contentType: "application/json",
          body: JSON.stringify(
            url.searchParams.has("batch") ? responses : responses[0],
          ),
        });
      });
      for (state of ["populated", "empty", "error", "register-error"]) {
        await page.goto(
          `${process.env.DESIGN_PREVIEW_URL || "http://127.0.0.1:5177"}/attendance`,
        );
        const overview = page.locator(".attendance-overview");
        await overview.waitFor();
        const surfaces = await page.evaluate(() => {
          const canvas = getComputedStyle(document.querySelector('.attendance-studio'));
          const content = getComputedStyle(document.querySelector('#module-content'));
          return { canvas: canvas.backgroundColor, content: content.backgroundColor, padding: parseFloat(content.paddingRight) };
        });
        assert.notEqual(surfaces.canvas, surfaces.content, 'Canvas and work surface are distinct');
        assert(surfaces.padding >= 12, 'Work surface retains readable gutters');
        assert.equal(await page.locator('.attendance-sidebar').isVisible(), width >= 1100);
        await overview.getByText("متصل", { exact: true }).waitFor();
        if (state === "error" || state === "register-error")
          await overview
            .getByRole("button", { name: "إعادة المحاولة", exact: true })
            .waitFor();
        else
          await page.waitForFunction(
            () =>
              document.querySelector(".attendance-overview dd")?.textContent ===
                "1" ||
              document.querySelector(".attendance-overview dd")?.textContent ===
                "0",
          );
        assert.equal(
          await page.evaluate(
            () => document.documentElement.scrollWidth > innerWidth + 1,
          ),
          false,
        );
        assert.equal(await overview.locator("a button").count(), 0);
        assert.equal(await overview.locator("dt").count(), 5);
        const register = overview.locator(".attendance-today-register");
        if (state === "empty")
          await register
            .getByText("لا توجد سجلات حضور اليوم.", { exact: true })
            .waitFor();
        else if (state !== "register-error")
          await register.getByRole("table").waitFor();
        if (width < 700 && state === 'populated') {
          const cellsFit = await register.locator('tbody td').evaluateAll(nodes => nodes.every(node => {
            const box = node.getBoundingClientRect();
            return box.left >= 0 && box.right <= innerWidth;
          }));
          assert(cellsFit, JSON.stringify(await register.locator('table, tbody, tr, td').evaluateAll(nodes => nodes.map(node => ({tag:node.tagName,width:node.getBoundingClientRect().width,left:node.getBoundingClientRect().left,min:getComputedStyle(node).minWidth,display:getComputedStyle(node).display})))));
        }
        assert.equal(await overview.locator('.attendance-home-summary dl > div').count(), 3);
        assert.equal(await overview.getByRole("progressbar").count(), 0);
        const summaryHeight = await overview.locator('.attendance-home-summary').evaluate(node => node.getBoundingClientRect().height);
        assert(summaryHeight < 150, `Compact summary: ${summaryHeight}`);
        await overview.getByRole('button', { name: 'إجراءات إدارية' }).click();
        assert.equal(await page.getByRole('menuitem').count(), 2);
        await page.keyboard.press('Escape');
        await page.getByRole('menu').waitFor({ state: 'hidden' });
        await page.evaluate(() => { document.querySelector('[data-app-scroll-container]').scrollTop = 0; });
        await page.screenshot({
          path: `outputs/attendance-overview/${state}-${theme}-${width}.png`,
          fullPage: true,
        });
        if (state === "error" || state === "register-error") {
          state = "populated";
          await overview
            .getByRole("button", { name: "إعادة المحاولة", exact: true })
            .click();
          await page.waitForFunction(
            () =>
              document.querySelector(".attendance-overview dd")?.textContent ===
              "1",
          );
          await register.getByRole("table").waitFor();
        } else {
          await overview
            .getByRole("button", { name: "تحديث", exact: true })
            .click();
        }
        if (state === "populated") {
          const search = register.getByLabel("البحث في سجل اليوم", {
            exact: true,
          });
          await search.fill("سارة");
          assert.equal(await register.locator("tbody tr").count(), 1);
          await search.fill("");
          const filter = register.getByLabel("حالة الحضور في سجل اليوم", {
            exact: true,
          });
          await filter.selectOption("late");
          assert.equal(await register.locator("tbody tr").count(), 1);
          await filter.selectOption("");
          assert.equal(await register.locator("tbody tr").count(), 3);
        }
        cases++;
      }
      assert.deepEqual(errors, []);
      await context.close();
    }
} finally {
  await browser.close();
}
console.log(`Passed ${cases} attendance overview state/theme/viewport cases.`);
