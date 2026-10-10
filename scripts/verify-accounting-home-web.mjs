import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
import { chromium, expect } from "@playwright/test";

const browser = await chromium.launch({
  executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE ||
    "C:/Users/SELRS/AppData/Local/ms-playwright/chromium-1234/chrome-win64/chrome.exe",
});
await mkdir("outputs/accounting-home-web", { recursive: true });
try {
  for (const width of process.env.MOBILE_SURFACE_ONLY ? [360] : [1024, 1440]) {
    const page = await browser.newPage({ viewport: { width, height: 1000 } });
    await page.addInitScript(() => localStorage.setItem("theme", "light"));
    await page.route("**/api/**", async route => {
      assert.equal(route.request().method(), "GET", "Review must not write data");
      const url = new URL(route.request().url());
      if (!url.pathname.includes("/api/trpc/")) return route.fulfill({ json: {} });
      const fixtures = {
        "accounting.accLedgerNavigator": [
          { id: 42, txDate: "2026-10-07", income: 20, expense: 5, notes: "قيد اختبار", remarks: "", balance: 15, total: 1015 },
          { id: 43, txDate: "2026-10-07", income: 30, expense: 0, notes: "قيد آخر", remarks: "", balance: 30, total: 1045 },
        ],
        "accounting.accReports": {
          advances: [{ totalAdvance: 100, totalRepaid: 20, remaining: 80 }],
          loans: [{ totalLoan: 200, totalPaid: 50, remaining: 150 }],
          instapay: { totalIn: 300, totalOut: 10, net: 290 },
          home: { totalIn: 400, totalOut: 20, net: 380 },
          saadany: { totalWithdrawals: 500, totalRepaid: 100, remaining: 400 },
        },
        "auth.me": { id: 999999, role: "admin", name: "اختبار" },
        "accounting.dashboardSummary": { totalRevenueToday: 300, totalReceiptsToday: 2 },
        "accounting.accLedgerSummary": { currentBalance: 1000, totalIncome: 1200, totalExpense: 200 },
        "accounting.serviceEntryCatalog": { services: [], doctors: [] },
        "medical.getSystemSetting": null,
      };
      const input = JSON.parse(url.searchParams.get("input") || "{}");
      const result = url.pathname.split("/api/trpc/")[1].split(",").map((method, index) => {
        let data = method in fixtures ? fixtures[method] : [];
        const params = (url.searchParams.has("batch") ? input[index] : input)?.json;
        if (method === "accounting.accLedgerSummary" && params?.dateFrom && params?.dateTo) {
          data = params.dateFrom === params.dateTo
            ? { currentBalance: 1000, totalIncome: params.dateFrom === "2026-09-08" ? 115 : params.dateFrom === "2026-09-09" ? 116 : 100, totalExpense: 25 }
            : { currentBalance: 1000, totalIncome: params.dateFrom === "2026-09-01" ? 1200 : 1000, totalExpense: 300 };
        }
        return { result: { data: { json: data } } };
      });
      await route.fulfill({ json: url.searchParams.has("batch") ? result : result[0] });
    });
    await page.goto((process.env.DESIGN_PREVIEW_URL || "http://127.0.0.1:5181") + "/accounting");
    const root = page.locator(".accounting-home-workspace");
    await root.waitFor();
    await page.waitForTimeout(400);
    if (process.env.MOBILE_SURFACE_ONLY) {
      const surface = await page.locator('#module-content').evaluate(node => {
        const style = getComputedStyle(node);
        return { border: style.borderTopWidth, shadow: style.boxShadow, background: style.backgroundColor };
      });
      assert.deepEqual(surface, { border: '0px', shadow: 'none', background: 'rgba(0, 0, 0, 0)' });
      const editor = await root.locator('.accounting-entry-workspace').evaluate(node => {
        const style = getComputedStyle(node);
        return { border: style.borderTopWidth, shadow: style.boxShadow, background: style.backgroundColor };
      });
      assert.deepEqual(editor, { border: '0px', shadow: 'none', background: 'rgba(0, 0, 0, 0)' });
      assert(await root.locator('section').filter({ has: page.getByRole('heading', { name: 'حركات اليوم', exact: true }) }).evaluate(node => parseFloat(getComputedStyle(node).borderTopWidth) > 0), 'Inner activity card border retained');
      assert(await page.locator('#ledger-income').evaluate(node => parseFloat(getComputedStyle(node).borderTopWidth) > 0), 'Input border retained');
      const navigation = await page.locator('nav[aria-label="أقسام الوحدة"]').evaluate(node => {
        const style = getComputedStyle(node);
        const active = getComputedStyle(node.querySelector('[aria-current="page"]'));
        return { border: style.borderTopWidth, underline: style.borderBottomWidth, radius: style.borderRadius, wrap: style.flexWrap, activeRadius: active.borderRadius };
      });
      assert.deepEqual(navigation, { border: '0px', underline: '2px', radius: '0px', wrap: 'nowrap', activeRadius: '0px' });
      const tabHeights = await page.locator('nav[aria-label="أقسام الوحدة"] > :is(a, label), .accounting-entry-tabs > button').evaluateAll(nodes => nodes.map(node => node.getBoundingClientRect().height));
      assert(tabHeights.length > 0 && tabHeights.every(height => height === 44), 'All mobile tabs, including nested menus, have the same 44px height');
      assert.equal(await page.locator('nav[aria-label="أقسام الوحدة"]').evaluate(node => node.getBoundingClientRect().height), 46, 'Tab strip is 44px plus its 2px underline');
      for (const strip of await root.page().locator('nav[aria-label="أقسام الوحدة"], .accounting-entry-tabs').all()) {
        assert.equal(await strip.evaluate(node => getComputedStyle(node).backgroundColor), 'rgba(0, 0, 0, 0)', 'Tab strip must reveal the page canvas');
      }
      await root.getByRole('tab', { name: 'خدمة', exact: true }).click();
      assert.equal(await root.getByRole('tab', { name: 'خدمة', exact: true }).getAttribute('aria-selected'), 'true');
      await root.getByRole('tab', { name: 'قيد', exact: true }).click();
      await page.waitForTimeout(300);
      assert.equal(await root.getByRole('tab', { name: 'قيد', exact: true }).evaluate(node => getComputedStyle(node).color), 'rgb(255, 255, 255)');
      await page.screenshot({ path: 'outputs/accounting-home-web/mobile-unframed.png', fullPage: true });
      await page.close();
      continue;
    }
    await root.getByRole("button", { name: "إجمالي شامل", exact: true }).click();
    const dialog = page.getByRole("dialog");
    await dialog.getByText("إجمالي انستا", { exact: true }).waitFor();
    for (const label of ["إجمالي السلف", "إجمالي القرض", "إجمالي انستا", "إجمالي البيت", "إجمالي د. السعدني"])
      assert.equal(await dialog.getByRole("heading", { name: label, exact: true }).count(), 1);
    await dialog.getByText(/^(290|٢٩٠)$/).waitFor();
    await page.waitForTimeout(250);
    await page.screenshot({ path: `outputs/accounting-home-web/${width}-combined-summary.png` });
    await page.keyboard.press("Escape");
    for (const tab of ["قيد", "خدمة", "قرض"]) {
      await root.getByRole("tab", { name: tab, exact: true }).click();
      const layout = await root.locator(".accounting-ledger > div").evaluate(element => {
        const form = element.querySelector("form").getBoundingClientRect();
        return { formBottom: form.bottom, asideTops: [...element.querySelectorAll(":scope > aside")].map(aside => aside.getBoundingClientRect().top) };
      });
      assert(layout.asideTops.every(top => top >= layout.formBottom), "Secondary controls must follow form");
      assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), "No horizontal overflow");
      await page.screenshot({ path: `outputs/accounting-home-web/${width}-${tab}.png`, fullPage: true });
    }
    await root.getByRole("tab", { name: "قيد", exact: true }).click();
    assert.equal(await root.locator('nav[aria-label="حسابات مرتبطة"]').count(), 0);
    assert.equal(await root.getByRole("button", { name: "إجمالي السلف", exact: true }).count(), 0);
    await root.getByText("الإيصال", { exact: true }).waitFor();
    const centers = await root.locator(".accounting-ledger-header").evaluate(element => {
      const header = element.getBoundingClientRect();
      const balance = element.querySelector(".accounting-current-balance").getBoundingClientRect();
      const total = element.parentElement.querySelector(".accounting-revenue-totals").getBoundingClientRect();
      return { header: header.x + header.width / 2, balance: balance.x + balance.width / 2, total: total.x + total.width / 2 };
    });
    assert(Math.abs(centers.header - centers.balance) < 2);
    assert(Math.abs(centers.balance - centers.total) < 2);
    assert.equal(await root.locator(".accounting-current-balance").evaluate(element => getComputedStyle(element).flexDirection), "row");
    const receipt = page.locator("#ledger-receipt");
    await page.locator("#ledger-date").fill("08/09/2026");
    await expect(root.getByLabel("الإيراد اليومي", { exact: true })).toHaveText(/^(90|٩٠)$/);
    await expect(root.getByLabel("الإيراد الشهري", { exact: true })).toHaveText(/^(900|٩٠٠)$/);
    await page.locator("#ledger-date").fill("30/02/2026");
    await expect(root.getByLabel("الإيراد اليومي", { exact: true })).toHaveText("تاريخ غير صالح");
    await expect(root.getByLabel("الإيراد الشهري", { exact: true })).toHaveText("تاريخ غير صالح");
    await page.locator("#ledger-date").fill("09/09/2026");
    await expect(root.getByLabel("الإيراد اليومي", { exact: true })).toHaveText(/^(91|٩١)$/);
    await expect(root.getByLabel("الإيراد الشهري", { exact: true })).toHaveText(/^(900|٩٠٠)$/);
    await receipt.fill("٤٢");
    await receipt.press("Enter");
    await page.waitForFunction(() => document.getElementById("ledger-income").value === "20");
    assert.equal(await page.locator("#ledger-income").inputValue(), "20");
    await expect(root.getByLabel("الإيراد اليومي", { exact: true })).toHaveText(/^(75|٧٥)$/);
    await expect(root.getByLabel("الإيراد الشهري", { exact: true })).toHaveText(/^(700|٧٠٠)$/);
    assert.equal(await page.locator('[list="ledger-employees"]').inputValue(), "قيد اختبار");
    await receipt.fill("99999");
    await receipt.press("Enter");
    await page.getByText("رقم الإيصال غير موجود.", { exact: true }).waitFor();
    assert.equal(await page.locator("#ledger-income").inputValue(), "20");
    await receipt.fill("42");
    await receipt.press("Enter");
    page.once("dialog", dialog => dialog.dismiss());
    await receipt.fill("43");
    await receipt.press("Enter");
    assert.equal(await page.locator("#ledger-income").inputValue(), "20", "Cancelled navigation must retain entered data");
    for (const id of ["ledger-income", "ledger-expense", "ledger-date"])
      assert.equal(await page.locator(`#${id}`).evaluate(element => getComputedStyle(element).direction), "ltr");
    await page.locator("#ledger-income").fill("-10");
    await page.locator("#ledger-expense").fill("3");
    assert.equal(await page.locator("#ledger-income").inputValue(), "-10");
    await expect(root.getByLabel("الإيراد اليومي", { exact: true })).toHaveText(/^(75|٧٥)$/);
    await expect(root.getByLabel("الإيراد الشهري", { exact: true })).toHaveText(/^(700|٧٠٠)$/);
    await page.close();
  }
  console.log(process.env.MOBILE_SURFACE_ONLY ? "Passed mobile outer frame removal; input borders retained; no writes." : "Passed: three entry tabs at 1024/1440, form ordering, overflow, negative ledger input; no writes.");
} finally {
  await browser.close();
}
