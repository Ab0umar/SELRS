import assert from "node:assert/strict";
import { chromium } from "@playwright/test";
import { PDFDocument } from "pdf-lib";
import { tmpdir } from "node:os";
import { join } from "node:path";

const browser = await chromium.launch({ channel: "msedge" });
const page = await browser.newPage({ viewport: { width: 1366, height: 900 } });
const errors = [];
page.on("pageerror", (error) => errors.push(error.message));
await page.route("**/api/**", async (route) => {
  const url = new URL(route.request().url());
  assert.equal(route.request().method(), "GET");
  const methods = url.pathname.split("/api/trpc/")[1]?.split(",") ?? [];
  const responses = methods.map((method) => ({
    result: {
      data: {
        json: method === "auth.me" ? { id: 999999, role: "admin", name: "اختبار التقارير" } : [],
      },
    },
  }));
  await route.fulfill({
    contentType: "application/json",
    body: JSON.stringify(url.searchParams.has("batch") ? responses : responses[0]),
  });
});

try {
  for (const tab of ["offdays", "pre-post-op", "referral", "medical-report", "condition", "clinical"]) {
    await page.goto(`http://127.0.0.1:5186/reports?tab=${tab}`);
    const panel = page.locator('[role="tabpanel"][data-state="active"]');
    await panel.waitFor();
    await panel.locator(".report-sheet-body, .printable-report-sheet").first().waitFor();
    const stock = page.locator("#clinical-report-stock");
    for (const mode of ["blank", "preprinted"]) {
      await stock.selectOption(mode);
      await page.locator(`[data-report-stock="${mode}"]`).waitFor();
      const preview = await panel.locator(".report-sheet-body, .printable-report-sheet").first().evaluate((element) => ({
        header: getComputedStyle(element.querySelector(".report-stationery-letterhead")).display,
        top: Number.parseFloat(getComputedStyle(element).paddingTop),
      }));
      assert.equal(preview.header === "none", mode === "preprinted", `${tab}: ${mode} screen preview`);
      if (mode === "preprinted") assert.ok(preview.top > 180, `${tab}: preprinted screen clearance`);
      await page.emulateMedia({ media: "print" });
      const sheet = panel.locator(".report-sheet-body, .printable-report-sheet").filter({ visible: true }).first();
      const state = await sheet.evaluate((element) => {
        const head = element.querySelector(".report-stationery-letterhead");
        const foot = element.querySelector(".report-stationery-footer");
        return {
          head: head && getComputedStyle(head).display,
          foot: foot && getComputedStyle(foot).display,
          top: getComputedStyle(element).paddingTop,
          width: element.getBoundingClientRect().width,
          text: element.textContent,
          color: getComputedStyle(element).color,
          stock: element.closest("[data-report-stock]")?.getAttribute("data-report-stock"),
        };
      });
      assert.ok(state.head && state.foot, `${tab}: stationery elements`);
      assert.equal(state.head === "none", mode === "preprinted", `${tab}: ${mode} letterhead`);
      assert.equal(state.foot === "none", mode === "preprinted", `${tab}: ${mode} footer`);
      assert.ok(Math.abs(Number.parseFloat(state.top) - (mode === "preprinted" ? 188.98 : 30.24)) < 3, `${tab}: ${mode} top clearance ${state.top}`);
      assert.ok(Math.abs(state.width - 793.7) < 3, `${tab}: A4 width ${state.width}`);
      assert.ok(["rgb(0, 0, 0)", "rgb(17, 17, 17)"].includes(state.color), `${tab}: monochrome ink ${state.color}`);
      assert.ok(state.text.length > 100, `${tab}: document content`);
      const pdf = await PDFDocument.load(await page.pdf({ format: "A4", printBackground: true, preferCSSPageSize: true }));
      assert.equal(pdf.getPageCount(), 1, `${tab}: ${mode} sample PDF page count`);
      console.log(`${tab}: ${mode} PDF pages ${pdf.getPageCount()}`);
      if (tab === "offdays" && mode === "blank") {
        await sheet.screenshot({ path: join(tmpdir(), "selrs-report-quiet-blank.png") });
      }
      await page.emulateMedia({ media: "screen" });
      console.log(`${tab}: ${mode} print layout passed`);
    }
  }
  await page.emulateMedia({ media: "print" });
  await page.locator('main.clinical-report-frame .report-sheet-body').last().evaluate((element) => {
    const paragraph = document.createElement("p");
    paragraph.textContent = "تفاصيل متابعة الحالة الطبية مع الطبيب المعالج. ".repeat(300);
    element.append(paragraph);
  });
  const longPdf = await PDFDocument.load(await page.pdf({ format: "A4", printBackground: true, preferCSSPageSize: true }));
  assert.ok(longPdf.getPageCount() > 1, "long clinical content should paginate");
  console.log(`clinical: long content spans ${longPdf.getPageCount()} PDF pages`);
  assert.deepEqual(errors, []);
} finally {
  await browser.close();
}
