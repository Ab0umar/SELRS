import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
import { chromium } from "@playwright/test";
import { inspectLayout } from './lib/layout-scan.mjs';

const output = "outputs/salary-module";
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE });
const paths = ["basics", "pools", "funds", "penalties", "payroll", "shift-staff", "shift-payroll", "current-data", "absent-report", "settings"];
let cases = 0;
try {
  for (const theme of ["light", "dark"]) for (const width of [320, 768, 1440]) {
    const context = await browser.newContext({ viewport: { width, height: 1000 } });
    await context.addInitScript(theme => localStorage.setItem("theme", theme), theme);
    const page = await context.newPage();
    const errors = [];
    page.on("pageerror", error => errors.push(error.message));
    await page.routeWebSocket("**/ws", socket => socket.onMessage(() => {}));
    await page.route("**/api/**", async route => {
      assert.equal(route.request().method(), "GET", "Visual checks must not write salary data");
      const url = new URL(route.request().url());
      const responses = (url.pathname.split("/api/trpc/")[1]?.split(",") ?? []).map(method => ({ result: { data: { json:
        method === "auth.me" ? { id: 999999, role: "admin", name: "اختبار الرواتب" }
        : method === "salary.getShiftSchedule" ? { attendance: [], staff: [] }
        : method === "salary.getMarkazAutoCommissionPools" ? { breakdown: {}, examPool: 0, pentacamDrPool: 0, pentacamPool: 0 }
        : method === "salary.getEmployeeFunds" ? { employees: [], fundEligibleEmployees: [], fundMembers: [], entries: [], eidBonuses: [], totalRevenue: 0, sharePerMember: 0 }
        : method.includes("getSystemSetting") ? null : []
      } } }));
      await route.fulfill({ contentType: "application/json", body: JSON.stringify(url.searchParams.has("batch") ? responses : responses[0]) });
    });
    for (const path of paths) {
      const url = `${process.env.DESIGN_PREVIEW_URL || "http://127.0.0.1:5178"}/salary/${path}`;
      const destination = page.locator(`nav[aria-label="أقسام الوحدة"] a[href="/salary/${path}"]`);
      if (await destination.count()) {
        await destination.click();
        await page.waitForURL(url);
      } else await page.goto(url);
      await page.waitForTimeout(1000);
      assert.equal(await page.getByText('An Unexpected Error Occurred.', { exact: true }).count(), 0, `${path}: error boundary`);
      assert.deepEqual(errors, [], `${path}: render errors`);
      await page.locator('[data-operational-module="salary"] #module-content').waitFor();
      await page.waitForTimeout(700);
      assert.deepEqual(errors, [], path);
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1), false, `${path}: page overflow`);
      const layout = await inspectLayout(page);
      assert.deepEqual(layout.collisions, [], `${path}: overlapping text`);
      assert.deepEqual(layout.fieldCollisions, [], `${path}: text covering fields`);
      assert.deepEqual(layout.clippedButtons, [], `${path}: clipped button labels`);
      const nav = page.getByRole("navigation", { name: "أقسام الوحدة", exact: true });
      await nav.locator('a[aria-current="page"]').waitFor();
      assert.equal(await nav.locator('a[aria-current="page"]').count(), 1, path);
      for (const link of await nav.locator("a").all()) {
        await link.evaluate(node => node.scrollIntoView({ block: 'nearest', inline: 'nearest' }));
        const bounds = await link.boundingBox();
        assert(bounds && bounds.height >= 44 && bounds.x >= 0 && bounds.x + bounds.width <= width + 1, `${path}: nav target`);
      }
      await page.screenshot({ path: `${output}/${path}-${theme}-${width}.png`, fullPage: true });
      cases++;
    }
    await context.close();
  }
} finally { await browser.close(); }
console.log(`Passed ${cases} salary route/theme/viewport cases with no financial writes.`);
