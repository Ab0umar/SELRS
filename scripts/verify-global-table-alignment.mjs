import assert from "node:assert/strict";
import { chromium } from "@playwright/test";

const browser = await chromium.launch({ executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE });
const base = process.env.DESIGN_PREVIEW_URL || "http://127.0.0.1:5199";
try {
  for (const theme of ["light", "dark"]) for (const width of [390, 768, 1440]) {
    const page = await browser.newPage({ viewport: { width, height: 1000 } });
    await page.addInitScript(theme => localStorage.setItem("theme", theme), theme);
    await page.route("**/api/**", async route => {
      assert.equal(route.request().method(), "GET");
      const url = new URL(route.request().url());
      const results = (url.pathname.split("/api/trpc/")[1]?.split(",") ?? []).map(method => ({ result: { data: { json:
        method === "auth.me" ? { id: 999999, role: "admin", name: "Test" } : []
      } } }));
      await route.fulfill({ json: url.searchParams.has("batch") ? results : results[0] });
    });
    await page.goto(`${base}/attendance/employees/13`);
    await page.waitForFunction(() => [...document.styleSheets].some(sheet => sheet.ownerNode?.getAttribute?.("data-vite-dev-id")?.endsWith("table-alignment.css")));
    await page.evaluate(() => {
      const fixture = document.createElement("div"); fixture.id = "alignment-fixture"; fixture.dir = "rtl";
      for (const kind of ["raw", "shared", "custom", "clinical", "nested"]) {
        const host = document.createElement("div");
        if (kind === "clinical") host.className = "prescription-paper";
        const table = document.createElement("table"); table.dataset.testTable = kind;
        table.style.width = "100%";
        if (kind === "custom") table.dataset.tableAlignment = "custom";
        table.innerHTML = '<thead><tr><th class="text-start" scope="col">الاسم</th><th class="text-left" scope="col">المبلغ</th><th scope="col">الحالة</th></tr></thead><tbody><tr><td>اسم عربي</td><td dir="ltr">1,234.50</td><td>حاضر</td></tr><tr><td>English name</td><td>-</td><td>—</td></tr></tbody><tfoot><tr><th>الإجمالي</th><td>1,234.50</td><td>2</td></tr></tfoot>';
        if (kind === "shared") table.querySelectorAll("th,td").forEach(cell => cell.setAttribute("data-slot", cell.tagName === "TH" ? "table-head" : "table-cell"));
        if (kind === "nested") {
          const cell = table.querySelector("tbody td");
          cell.innerHTML = '<table data-table-alignment="custom"><tbody><tr><td class="text-left">Nested custom</td></tr></tbody></table>';
        }
        host.append(table); fixture.append(host);
      }
      document.getElementById("root").append(fixture);
    });
    const styles = () => page.locator("#alignment-fixture th, #alignment-fixture td").evaluateAll(cells => cells.map(cell => ({ align: getComputedStyle(cell).textAlign, bidi: getComputedStyle(cell).unicodeBidi })));
    const snapshot = await styles();
    for (const kind of ["raw", "shared", "nested"]) {
      const cells = await page.locator(`[data-test-table="${kind}"] > :is(thead,tbody,tfoot) > tr > :is(th,td)`).evaluateAll(cells => cells.map(cell => [getComputedStyle(cell).textAlign, getComputedStyle(cell).unicodeBidi]));
      for (const cell of cells) assert.deepEqual(cell, ["center", "isolate"], `${kind}/${theme}/${width}`);
    }
    const toggle = enabled => page.evaluate(enabled => {
      [...document.styleSheets].filter(sheet => sheet.ownerNode?.getAttribute?.("data-vite-dev-id")?.endsWith("table-alignment.css")).forEach(sheet => { sheet.disabled = !enabled; });
    }, enabled);
    await toggle(false);
    const original = await styles();
    await toggle(true);
    const excluded = await page.locator('[data-test-table="custom"] th, [data-test-table="custom"] td, .prescription-paper th, .prescription-paper td, [data-test-table="nested"] table td').evaluateAll(cells => cells.map(cell => getComputedStyle(cell).textAlign));
    await toggle(false);
    const excludedOriginal = await page.locator('[data-test-table="custom"] th, [data-test-table="custom"] td, .prescription-paper th, .prescription-paper td, [data-test-table="nested"] table td').evaluateAll(cells => cells.map(cell => getComputedStyle(cell).textAlign));
    assert.deepEqual(excluded, excludedOriginal, "Clinical and custom tables are unchanged");
    assert.notDeepEqual(snapshot, original, "Shared screen rule actually changes alignment");
    await page.emulateMedia({ media: "print" });
    const printOriginal = await styles();
    await toggle(true);
    assert.deepEqual(await styles(), printOriginal, "Browser print is unaffected");
    await page.close();
  }
  console.log("Passed 6 theme/viewport cases: raw/shared/nested tables, RTL numbers, totals, clinical/custom exclusions and unchanged print styles. No API writes.");
} finally { await browser.close(); }
