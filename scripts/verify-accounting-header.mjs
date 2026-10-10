import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
import { chromium } from "@playwright/test";

await mkdir("outputs/accounting-header", { recursive: true });
const browser = await chromium.launch({ executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE || "C:/Users/SELRS/AppData/Local/ms-playwright/chromium-1234/chrome-win64/chrome.exe" });
try {
  for (const width of [360, 1440]) {
    const page = await browser.newPage({ viewport: { width, height: 1000 } });
    page.setDefaultTimeout(15000);
    await page.route("**/api/**", async route => {
      assert.equal(route.request().method(), "GET");
      const url = new URL(route.request().url());
      if (!url.pathname.includes("/api/trpc/")) return route.fulfill({ json: {} });
      const result = url.pathname.split("/api/trpc/")[1].split(",").map(method => {
        const data = method === "auth.me" ? { id: 999999, role: "admin", name: "اختبار" }
          : method === "accounting.accReports" ? { advances: [], loans: [], home: { totalIn: 0, totalOut: 0, net: 0 }, instapay: { totalIn: 0, totalOut: 0, net: 0 }, saadany: { totalWithdrawals: 0, totalRepaid: 0, remaining: 0 } }
          : method === "accounting.accLedgerSummary" ? { currentBalance: 100, totalIncome: 100, totalExpense: 0 }
          : method === "accounting.serviceEntryCatalog" ? { services: [], doctors: [] }
          : method === "salary.monthSummary" ? { staffCount: 0, finalCount: 0, totalPay: 0, totalCommissions: 0, totalPenalties: 0 }
          : method === "attendance.dashboardSummary" ? { presentToday: 0, absentToday: 0, lateToday: 0, insideNow: 0, missingCheckoutYesterday: 0, presentMorning: 0, presentEvening: 0 }
          : method.endsWith("Ledger") || method === "accounting.accLedger" ? { rows: [], total: 0 }
          : [];
        return { result: { data: { json: data } } };
      });
      await route.fulfill({ json: url.searchParams.has("batch") ? result : result[0] });
    });
    for (const path of ["/accounting", "/accounting/advances", "/accounting/loans", "/accounting/instapay", "/accounting/home-fund", "/accounting/dr-saadany", "/accounting/cashbook"]) {
      console.log(`Checking ${width} ${path}`);
      await page.goto((process.env.DESIGN_PREVIEW_URL || "http://127.0.0.1:5181") + path);
      const nav = page.getByRole("navigation", { name: "أقسام الوحدة", exact: true });
      await nav.waitFor().catch(async error => { await page.screenshot({ path: "outputs/accounting-header/failure.png" }); throw error; });
      await page.waitForTimeout(250);
      assert(await nav.evaluate(element => element.parentElement.firstElementChild === element), `No metrics strip before navigation: ${width} ${path}`);
      const spacing = await nav.evaluate(element => {
        const topNav = document.querySelector("[data-app-top-nav]").getBoundingClientRect();
        const root = element.closest("[data-operational-module]");
        const main = element.closest("main");
        return { gap: element.getBoundingClientRect().top - topNav.bottom, rootPadding: getComputedStyle(root).paddingTop, mainPadding: getComputedStyle(main).paddingTop, rootMargin: getComputedStyle(root).marginTop, spacer: main.querySelector('[aria-hidden]')?.getBoundingClientRect().height, topNavHeight: topNav.height };
      });
      assert(Math.abs(spacing.gap - 8) <= 1, `Expected 8px header gap, got ${JSON.stringify(spacing)}: ${width} ${path}`);
      if (path === "/accounting") assert.equal(await page.getByRole("button", { name: "إجمالي شامل", exact: true }).count(), 1);
      await page.screenshot({ path: `outputs/accounting-header/${width}-${path.split("/").at(-1)}.png`, fullPage: true });
    }
    for (const path of ["/salary", "/attendance", "/stockroom", "/kf"]) {
      console.log(`Checking ${width} ${path}`);
      await page.goto((process.env.DESIGN_PREVIEW_URL || "http://127.0.0.1:5181") + path);
      const root = page.locator("[data-operational-module]").first();
      await root.waitFor();
      const gap = await root.evaluate(element => element.getBoundingClientRect().top + parseFloat(getComputedStyle(element).paddingTop) - document.querySelector("[data-app-top-nav]").getBoundingClientRect().bottom);
      assert(Math.abs(gap - 8) <= 1, `Expected 8px module spacing: ${path} ${width} got ${gap}`);
      await page.screenshot({ path: `outputs/accounting-header/${width}-${path.slice(1)}.png`, fullPage: true });
    }
    for (const path of ["/home", "/patients-hub", "/clinics-hub", "/services-hub", "/reports", "/records/patients", "/records/medical", "/sheets", "/archive", "/workflow-hub", "/patient-hub", "/admin-hub", "/marketing"]) {
      console.log(`Checking ${width} ${path}`);
      await page.goto((process.env.DESIGN_PREVIEW_URL || "http://127.0.0.1:5181") + path);
      const start = page.locator("[data-module-content-start], .selrs-app-content > .clinical-workspace > div, .selrs-app-content > [data-admin-hub] > main").first();
      await start.waitFor();
      const spacing = await start.evaluate(element => ({ padding: parseFloat(getComputedStyle(element).paddingTop), top: element.getBoundingClientRect().top, headerBottom: document.querySelector("[data-app-top-nav]").getBoundingClientRect().bottom }));
      assert.equal(spacing.padding, 8, `Module top padding: ${path} ${width}`);
      assert(spacing.top >= spacing.headerBottom - 1, `Header must not cover content: ${path} ${width}`);
      await page.screenshot({ path: `outputs/accounting-header/${width}-${path.slice(1).replaceAll("/", "-")}.png`, fullPage: true });
    }
    await page.close();
  }
  console.log("Passed: 24 routes at mobile/desktop (48 cases); module top spacing verified; accounting summary retained; no writes.");
} finally {
  await browser.close();
}
