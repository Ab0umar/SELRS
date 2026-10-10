import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import { chromium } from "@playwright/test";

const base = process.env.DESIGN_PREVIEW_URL || "http://127.0.0.1:5174";
const output = "outputs/accounting-register-verification";
await mkdir(output, { recursive: true });
const name = "اسم اختبار معزول طويل للتحقق من عرض اسم الموظف والمقترض بالكامل";
const notes = "بيان اختبار معزول طويل للتحقق من التفاف النص داخل سجل الحركات دون قص أو تغيير في البيانات المالية";
const fixtureRow = { id: 999999, txDate: "2026-10-02", name, employee: name, notes, remarks: notes, income: 1200, expense: 200, balance: 1000, total: 1000, inAmount: 500, outAmount: 200, withdrawals: 500, repayment: 100, advance: 500, amount: 500, remaining: 400, runningTotal: 400 };
const reports = {
  advances: [{ employee: name, totalAdvance: 500, totalRepaid: 100, remaining: 400 }],
  loans: [{ name, totalLoan: 500, totalPaid: 100, remaining: 400 }],
  instapay: { totalIn: 500, totalOut: 200, net: 300 },
  home: { totalIn: 500, totalOut: 200, net: 300 },
  saadany: { totalWithdrawals: 500, totalRepaid: 100, remaining: 400 },
};
const views = [
  { slug: "cashbook", title: "الخزنة", query: "accLedger", label: "حركات الخزنة", search: "#cb-notes" },
  { slug: "advances", title: "السلف", query: "accAdvancesLedger", label: "حركات السلف", search: "#advances-search", value: "#advances-employee", expected: name },
  { slug: "loans", title: "القروض", query: "accLoansLedger", label: "حركات القروض", search: "#loans-search" },
  { slug: "instapay", title: "حساب انستاباي", query: "accInstapayLedger", label: "حركات انستاباي", search: "#instapay-search", value: "#instapay-notes", expected: notes },
  { slug: "home-fund", title: "حساب البيت", query: "accHomeLedger", label: "حركات البيت", search: "#homefund-search", value: "#homefund-notes", expected: notes },
  { slug: "dr-saadany", title: "حساب د. السعدني", query: "accSaadanyLedger", label: "حركات د. السعدني", search: "#saadany-search", value: "#saadany-notes", expected: notes },
];
const browser = await chromium.launch({ executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE });
const results = [];
const resultsFile = process.env.ACCOUNTING_VIEWS || process.env.ACCOUNTING_WIDTHS ? "focused-results.json" : "results.json";
try {
  for (const theme of ["light", "dark"]) {
    for (const width of (process.env.ACCOUNTING_WIDTHS || "1024,1440,1920").split(",").map(Number)) {
      const context = await browser.newContext({ viewport: { width, height: 1000 } });
      await context.addInitScript(theme => localStorage.setItem("theme", theme), theme);
      const page = await context.newPage();
      const errors = [], mutations = [], requests = [];
      let failed = "", empty = "", held = "", release;
      page.on("pageerror", error => { errors.push(error.message); console.error(error.message); });
      await page.route("**/api/**", async route => {
        const request = route.request();
        if (request.method() !== "GET") {
          mutations.push(request.url());
          await route.abort();
          return;
        }
        const url = new URL(request.url());
        const methods = url.pathname.split("/api/trpc/")[1]?.split(",") ?? [];
        const input = JSON.parse(url.searchParams.get("input") || "{}");
        if (methods.includes(held)) await new Promise(resolve => { release = resolve; });
        const responses = methods.map((method, index) => {
          requests.push({ method, input: input[index]?.json ?? input.json });
          if (method === failed) return { error: { json: { message: "Isolated test failure", code: -32603, data: { code: "INTERNAL_SERVER_ERROR", httpStatus: 500 } } } };
          const data = method === "auth.me" ? { id: 999999, role: "admin", name: "اختبار التصميم" }
            : method === "accounting.dashboardSummary" ? { totalRevenueToday: 1200, totalReceiptsToday: 3 }
            : method === "accounting.accLedgerSummary" ? { totalIncome: 1200, totalExpense: 200, currentBalance: 1000 }
            : method === "accounting.accReports" ? reports
            : views.some(view => method === `accounting.${view.query}`) ? { total: method === empty ? 0 : 51, rows: method === empty ? [] : [fixtureRow] }
            : method === "accounting.accEmployeesList" ? [{ id: 999999, name }]
            : [];
          return { result: { data: { json: data } } };
        });
        await route.fulfill({ contentType: "application/json", body: JSON.stringify(url.searchParams.has("batch") ? responses : responses[0]) });
      });
      for (const view of views.filter(view => !process.env.ACCOUNTING_VIEWS || process.env.ACCOUNTING_VIEWS.split(",").includes(view.slug))) {
        await page.goto(`${base}/accounting/${view.slug}`);
        await page.getByRole("heading", { name: view.title, exact: true }).waitFor();
        if (width < 640) {
          await page.locator('.accounting-history').first().waitFor();
          await page.waitForTimeout(300);
          assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `${view.slug}: mobile overflow`);
          const nav = page.getByRole('navigation', { name: 'أقسام الوحدة', exact: true });
          for (const target of await nav.locator(':scope > a, :scope > label').all()) {
            const bounds = await target.boundingBox();
            assert(bounds && bounds.height >= 44 && bounds.x >= 0 && bounds.x + bounds.width <= width + 1, `${view.slug}: mobile nav bounds`);
          }
          await page.screenshot({ path: `${output}/${view.slug}-${theme}-${width}.png`, fullPage: true });
          assert.deepEqual(errors, []);
          assert.deepEqual(mutations, []);
          results.push({ view: view.slug, theme, width, overflow: false, mobileNavigation: 'PASS', data: 'isolated fixtures; no financial writes' });
          await writeFile(`${output}/${resultsFile}`, JSON.stringify(results, null, 2));
          console.log(JSON.stringify(results.at(-1)));
          continue;
        }
        await page.locator(".accounting-history tbody tr").first().waitFor();
        const entry = page.locator('details.accounting-entry');
        if (await entry.count() && (await entry.getAttribute('open')) === null) {
          await entry.locator('summary').click();
        }
        await page.evaluate(() => document.fonts.ready);
        assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `${view.slug}/${width}/${theme} page overflow`);
        const clipped = await page.locator(".accounting-history .truncate").evaluateAll(nodes => nodes.filter(node => node.getBoundingClientRect().width > 0 && node.scrollWidth > node.clientWidth + 1).map(node => node.textContent));
        assert.deepEqual(clipped, [], `${view.slug}: clipped statements`);
        const textContrast = await page.locator(".accounting-entry label").evaluateAll(nodes => {
          const canvas = document.createElement("canvas");
          canvas.width = canvas.height = 1;
          const ctx = canvas.getContext("2d");
          const luminance = color => {
            ctx.clearRect(0, 0, 1, 1);
            ctx.fillStyle = color;
            ctx.fillRect(0, 0, 1, 1);
            const channels = [...ctx.getImageData(0, 0, 1, 1).data].slice(0, 3).map(value => {
              const c = value / 255;
              return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
            });
            return channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722;
          };
          return nodes.filter(node => node.getBoundingClientRect().width > 0).map(node => {
            let ancestor = node;
            while (ancestor.parentElement && ["transparent", "rgba(0, 0, 0, 0)"].includes(getComputedStyle(ancestor).backgroundColor)) ancestor = ancestor.parentElement;
            const foreground = luminance(getComputedStyle(node).color);
            const background = luminance(getComputedStyle(ancestor).backgroundColor);
            return { label: node.textContent.trim(), ratio: (Math.max(foreground, background) + 0.05) / (Math.min(foreground, background) + 0.05) };
          });
        });
        assert.ok(textContrast.every(item => item.ratio >= 4.5), `${view.slug}: field-label contrast ${JSON.stringify(textContrast)}`);
        await page.screenshot({ path: `${output}/${view.slug}-${theme}-${width}.png`, fullPage: true });
        if (view.slug === "advances") {
          const employee = page.locator("#advances-employee");
          await employee.focus();
          await page.getByRole("option", { name }).waitFor();
          await page.keyboard.press("ArrowDown");
          await page.waitForTimeout(200);
          assert.ok(await page.getByRole("option", { name }).evaluate(node => node === document.activeElement));
          await page.keyboard.press("Enter");
          assert.equal(await employee.inputValue(), name);
        }
        if (view.slug === "cashbook") {
          const edit = page.getByRole("button", { name: "تعديل القيد", exact: true }).last();
          await edit.focus();
          await page.keyboard.press("Enter");
          await page.getByRole("dialog", { name: "تعديل القيد" }).waitFor();
          assert.equal(await page.locator("#entry-notes").inputValue(), notes);
          await page.keyboard.press("Escape");
          await page.getByRole("dialog").waitFor({ state: "hidden" });
          assert.ok(await edit.evaluate(node => node === document.activeElement), "Cashbook focus restoration");
        } else {
          const row = view.slug === 'loans'
            ? page.locator('.accounting-history tbody').getByRole('button', { name, exact: true }).last()
            : page.locator(".accounting-history tbody tr[role=button]").last();
          await row.focus();
          assert.ok(await row.evaluate(node => node === document.activeElement), `${view.slug}: row receives focus`);
          await page.keyboard.press("Enter");
          if (view.slug === "loans") {
            await page.waitForTimeout(500);
            await page.screenshot({ path: `${output}/loan-editor-${theme}-${width}.png`, fullPage: true });
            await page.getByRole("dialog", { name: "تعديل القرض" }).waitFor();
            assert.equal(await page.getByRole("dialog").locator("#loan-name").inputValue(), name);
            await page.keyboard.press("Escape");
            await page.getByRole("dialog").waitFor({ state: "hidden" });
            assert.ok(await row.evaluate(node => node === document.activeElement), "Loan focus restoration");
          } else {
            assert.equal(await page.locator(view.value).inputValue(), view.expected);
          }
        }
        if (await page.locator(view.search).count()) {
          await page.locator(view.search).fill("اختبار");
          await page.waitForTimeout(250);
          assert.ok(requests.some(request => request.method === `accounting.${view.query}` && (request.input?.search === "اختبار" || request.input?.notes === "اختبار")), `${view.slug}: search request`);
        }
        let states = "not run at this width";
        if (width === 1440) {
          held = `accounting.${view.query}`;
          release = undefined;
          await page.reload({ waitUntil: "domcontentloaded" });
          await page.getByRole("status").filter({ hasText: `جارٍ تحميل ${view.label}` }).waitFor();
          assert.equal(await page.locator("[data-register-history]").count(), 0);
          held = "";
          release();
          await page.locator(".accounting-history tbody tr").first().waitFor();
          failed = `accounting.${view.query}`;
          await page.reload();
          await page.getByRole("alert").filter({ hasText: `تعذر تحميل ${view.label}` }).waitFor({ timeout: 30000 });
          assert.equal(await page.locator("[data-register-history]").count(), 0);
          failed = "";
          await page.getByRole("button", { name: "إعادة المحاولة", exact: true }).click();
          await page.locator(".accounting-history tbody tr").first().waitFor();
          empty = `accounting.${view.query}`;
          await page.reload();
          await page.locator(".accounting-history").getByText(/لا توجد حركات/).filter({ visible: true }).first().waitFor();
          empty = "";
          states = "loading, error, retry, empty PASS";
        }
        assert.deepEqual(errors, []);
        assert.deepEqual(mutations, []);
        results.push({ view: view.slug, theme, width, overflow: false, keyboardEditing: "PASS", fieldLabelContrast: textContrast, states, data: "isolated fixtures; no financial writes" });
        await writeFile(`${output}/${resultsFile}`, JSON.stringify(results, null, 2));
        console.log(JSON.stringify(results.at(-1)));
      }
      await context.close();
    }
  }
} finally {
  await browser.close();
}
