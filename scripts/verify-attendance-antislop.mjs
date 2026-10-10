import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import { chromium } from "@playwright/test";

const output = "outputs/attendance-antislop";
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE });
const results = [];
try {
  for (const theme of ["light", "dark"]) {
    for (const width of [320, 360, 640, 768, 1024, 1280, 1440]) {
      const context = await browser.newContext({ viewport: { width, height: 1000 } });
      await context.addInitScript(value => localStorage.setItem("theme", value), theme);
      const page = await context.newPage();
      const errors = [];
      page.on("pageerror", error => errors.push(error.message));
      let state = "populated";
      await page.route("**/api/**", async route => {
        assert.equal(route.request().method(), "GET", "Preview must not mutate attendance");
        const url = new URL(route.request().url());
        const responses = (url.pathname.split("/api/trpc/")[1]?.split(",") ?? []).map(method => {
          if (state === "error" && method === "attendance.dailyByDate") {
            return { error: { json: { message: "Fixture failure", code: -32603, data: { code: "INTERNAL_SERVER_ERROR", httpStatus: 500 } } } };
          }
          let data = [];
          if (method === "auth.me") data = { id: 999999, role: "admin", name: "اختبار" };
          if (method === "attendance.deviceStatus") data = { connected: true };
          if (method === "attendance.dashboardSummary") {
            const counts = { insideNow: 1, lateToday: 0, missingCheckoutYesterday: 0, presentMorning: 1, presentEvening: 0 };
            data = { bySection: { center: counts, clinic: counts, unassigned: { presentToday: 0 } } };
          }
          if (method === "attendance.dailyByDate") data = state === "empty" ? [] : [{ empCd: "TEST001", empName: "موظف اختبار", shiftId: 1, firstIn: "2026-10-09T08:00:00", lastOut: null, status: "present", lateMinutes: 0 }];
          return { result: { data: { json: data } } };
        });
        await route.fulfill({ contentType: "application/json", body: JSON.stringify(url.searchParams.has("batch") ? responses : responses[0]) });
      });
      for (const nextState of ["populated", "empty", "error"]) {
        state = nextState;
        await page.goto(`${process.env.DESIGN_PREVIEW_URL || "http://127.0.0.1:5177"}/attendance`);
        const register = page.locator(".attendance-today-register");
        if (state === "populated") {
          await register.getByRole("table").waitFor();
          const search = register.getByLabel("البحث في سجل اليوم", { exact: true });
          await search.fill("غير موجود");
          await register.getByText(/غيّر البحث/).waitFor();
          await search.fill("");
          const filter = register.getByLabel("حالة الحضور في سجل اليوم", { exact: true });
          await filter.selectOption("absent");
          await register.getByText(/غيّر البحث/).waitFor();
          await filter.selectOption("");
          await register.getByRole("table").waitFor();
          await search.focus();
          assert.notEqual(await search.evaluate(node => getComputedStyle(node).outlineStyle), "none");
        } else if (state === "empty") {
          await register.getByText(/لا توجد سجلات حضور اليوم/).waitFor();
        } else {
          const retry = register.getByRole("button", { name: "إعادة المحاولة" });
          await retry.waitFor();
          state = "populated";
          await retry.click();
          await register.getByRole("table").waitFor();
        }
        assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1), false);
        assert.equal(await page.locator("h1").first().evaluate(node => getComputedStyle(node).position === "absolute"), false);
        const nav = page.locator(".attendance-topnav a");
        assert.equal(await nav.count(), 7);
        assert(await nav.evaluateAll(nodes => nodes.every(node => node.getBoundingClientRect().height >= 44)));
        if (width === 360) {
          const bounds = await nav.evaluateAll(nodes => nodes.map(node => { const rect = node.getBoundingClientRect(); return { label: node.textContent, left: rect.left, right: rect.right, width: innerWidth }; }));
          assert(bounds.every(rect => rect.left >= -1 && rect.right <= rect.width + 1), JSON.stringify(bounds));
        }
        assert.deepEqual(errors, []);
        const contrast = await page.evaluate(() => {
          const luminance = color => {
            const channels = color.match(/[\d.]+/g).slice(0, 3).map(Number).map(value => {
              const channel = value / 255;
              return channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
            });
            return channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722;
          };
          return ['.attendance-day-caption', '.attendance-home-eyebrow', '.attendance-home-actions button:first-child', '.attendance-topnav a[aria-current="page"]'].map(selector => {
            const node = document.querySelector(selector);
            const foreground = getComputedStyle(node).color;
            let backgroundNode = node;
            let background = getComputedStyle(backgroundNode).backgroundColor;
            while (background === 'rgba(0, 0, 0, 0)' && backgroundNode.parentElement) {
              backgroundNode = backgroundNode.parentElement;
              background = getComputedStyle(backgroundNode).backgroundColor;
            }
            const values = [luminance(foreground), luminance(background)].sort((a, b) => b - a);
            return { selector, foreground, background, ratio: (values[0] + 0.05) / (values[1] + 0.05) };
          });
        });
        assert(contrast.every(pair => pair.ratio >= 4.5), JSON.stringify(contrast));
        await page.evaluate(() => {
          document.activeElement?.blur();
          document.querySelectorAll('[data-app-scroll-container]').forEach(node => { node.scrollTop = 0; });
        });
        await page.screenshot({ path: `${output}/${theme}-${width}-${nextState}.png`, fullPage: true });
        results.push({ theme, width, state: nextState, overflow: false, visibleTitle: true, touchNavigation: true, contrast, errors: [] });
      }
      await page.goto(`${process.env.DESIGN_PREVIEW_URL || "http://127.0.0.1:5177"}/attendance`);
      await page.locator(".attendance-today-register table").waitFor();
      await page.locator(".attendance-topnav a").first().focus();
      assert.notEqual(await page.locator(".attendance-topnav a").first().evaluate(node => getComputedStyle(node).outlineStyle), "none");
      await page.locator(".attendance-topnav a[href='/attendance/reports']").click();
      await page.waitForURL("**/attendance/reports");
      await page.locator('.attendance-workspace h1').first().waitFor({ state: 'visible' });
      await context.close();
    }
  }
} finally {
  await browser.close();
}
await writeFile(`${output}/verification.json`, JSON.stringify(results, null, 2));
console.log(`Passed ${results.length} attendance state/theme/viewport cases, filters, retry, focus and report navigation.`);
