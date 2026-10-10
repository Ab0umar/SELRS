import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { chromium } from "@playwright/test";
import { PDFDocument } from "pdf-lib";

const baseURL = process.env.DESIGN_PREVIEW_URL || "http://127.0.0.1:5174";
const output = path.resolve("outputs/clinical-design-verification");
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ headless: true, executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE });
const results = [];
try {
  for (const theme of ["light", "dark"]) {
    for (const width of [360, 768, 1440]) {
      const context = await browser.newContext({ viewport: { width, height: 1000 } });
      await context.addInitScript((value) => localStorage.setItem("theme", value), theme);
      const page = await context.newPage();
      const errors = [];
      const mutations = [];
      page.on("pageerror", (error) => errors.push(error.message));
      await page.route("**/api/**", async (route) => {
        const request = route.request();
        if (request.method() !== "GET") mutations.push(request.url());
        const url = new URL(request.url());
        const methods = url.pathname.split("/api/trpc/")[1]?.split(",") ?? [""];
        const responses = methods.map((method) => ({ result: { data: { json:
          method === "auth.me" ? { id: 999999, role: "admin", name: "اختبار التصميم", username: "design-check" }
          : method === "patient.getPatient" ? { id: 999999, fullName: "مريض اختبار الطباعة ذو الاسم الطويل للتحقق من التفاف النص", age: 45, code: "DESIGN-FIXTURE", dateOfBirth: "1981-01-01" }
          : method === "medical.getVisitsByPatient" ? [{ id: 900001, patientId: 999999, visitDate: "2026-10-02", visitType: "كشف" }]
          : method === "medical.getOpsHealth" ? { dbConnected: true, tunnelConnected: true, patientsCount: 0 }
          : method === "medical.getPostOpOffdaysByPatient" ? [{ id: 900001, patientId: 999999, operationDate: "2026-10-02", leaveStart: "2026-10-02", returnDate: "2026-10-05", durationDays: 4, method: "نص اختبار معزول لطريقة العملية، للتحقق من ظهور النص العربي كاملًا دون قص. ".repeat(3), certificateStatement: "هذه إفادة اختبار معزولة للتحقق من تنسيق الطباعة، وليست شهادة طبية أو بيانات مريض حقيقي." }]
          : ["medical.getSystemSetting", "medical.getSheetEntry", "medical.getPatientPageState", "medical.getMedicalHistoryByPatient", "opHistory.getSuggestedOperationType"].includes(method) ? null
          : []
        } } }));
        await route.fulfill({ contentType: "application/json", body: JSON.stringify(url.searchParams.has("batch") ? responses : responses[0]) });
      });
      await page.goto(`${baseURL}/sheets/lasik/999999`);
      await page.locator('[data-print-document="lasik"]').waitFor({ state: "attached" });
      await page.waitForFunction(() => [...document.querySelectorAll("input")].some((input) => input.value.includes("مريض اختبار الطباعة")));
      await page.evaluate(() => document.fonts.ready);
      const screen = await page.evaluate(() => ({ viewport: innerWidth, content: document.documentElement.scrollWidth, toolbar: [...document.querySelectorAll(".lasik-print-root > header button")].map((button) => { const box = button.getBoundingClientRect(); return { label: button.textContent.trim(), height: box.height, left: box.left, right: box.right }; }) }));
      await page.screenshot({ path: path.join(output, `lasik-screen-${theme}-${width}.png`), fullPage: true });
      await page.emulateMedia({ media: "print" });
      const layout = await page.locator('[data-print-document="lasik"]').evaluate((root) => {
        const pentacam = root.querySelector('.print-lasik-pentacam-right');
        const boxes = [...pentacam.children].map((child) => child.getBoundingClientRect());
        const tables = [...pentacam.querySelectorAll('table')].map((table) => ({
          width: table.getBoundingClientRect().width,
          rows: [...table.rows].map((row) => row.getBoundingClientRect().height),
          columns: [...table.rows[0].cells].map((cell) => cell.getBoundingClientRect().width),
        }));
        const followup = root.querySelector('[data-print-page="followup"]');
        const body = followup.querySelector('.sheet-followup-body');
        return {
          pentacamRight: boxes[1].left >= boxes[0].right - 1 && boxes[2].left >= boxes[1].right - 1,
          tables,
          followupWidth: body.getBoundingClientRect().width,
          pageWidth: followup.getBoundingClientRect().width,
          followupTransform: getComputedStyle(body).transform,
          textareaResize: [...root.querySelectorAll('textarea')].map((field) => getComputedStyle(field).resize),
        };
      });
      assert.equal(layout.pentacamRight, true, 'Pentacam tables must follow the empty left column');
      assert.ok(Math.abs(layout.tables[0].width - layout.tables[1].width) <= 1, 'Pentacam tables must have equal widths');
      for (const key of ['rows', 'columns']) {
        assert.equal(layout.tables[0][key].length, layout.tables[1][key].length);
        layout.tables[0][key].forEach((size, index) => assert.ok(Math.abs(size - layout.tables[1][key][index]) <= 1, `Pentacam ${key} must match`));
      }
      assert.ok(Math.abs(layout.followupWidth - layout.pageWidth) <= 1, 'Attached followups must fill the page width');
      assert.equal(layout.followupTransform, 'none');
      assert.ok(layout.textareaResize.every((value) => value === 'none'), 'Printed textareas must not have resize handles');
      const print = await page.locator('[data-print-document="lasik"]').evaluate((document) => [...document.querySelectorAll(":scope > [data-print-page]")].map((page) => ({ type: page.dataset.printPage, width: page.getBoundingClientRect().width, height: page.getBoundingClientRect().height, contentHeight: page.scrollHeight, background: getComputedStyle(page).backgroundColor, followupGroups: [...page.querySelectorAll(".followup-record-section")].map((group) => ({ height: group.clientHeight, content: group.scrollHeight, font: parseFloat(getComputedStyle(group.querySelector("td")).fontSize) })) })));
      await page.locator('[data-print-document="lasik"]').screenshot({ path: path.join(output, `lasik-print-${theme}-${width}.png`) });
      const pdf = await page.pdf({ path: path.join(output, `lasik-${theme}-${width}.pdf`), format: "A4", preferCSSPageSize: true, printBackground: true });
      const loaded = await PDFDocument.load(pdf);
      const pages = loaded.getPages().map((page) => ({ width: page.getWidth(), height: page.getHeight() }));
      let native;
      if (width === 360) {
        const html = await page.evaluate(async () => {
          const root = document.querySelector('[data-print-document="lasik"]');
          const probe = document.createElement("textarea");
          probe.dataset.cloneProbe = "true";
          probe.style.display = "none";
          probe.textContent = "OLD-FIXTURE-VALUE";
          root.append(probe);
          probe.value = "LIVE-FIXTURE-VALUE";
          const input = document.createElement("input");
          input.dataset.cloneInput = "true";
          input.style.display = "none";
          input.setAttribute("value", "OLD-INPUT");
          input.value = "LIVE-INPUT";
          root.append(input);
          const checkbox = document.createElement("input");
          checkbox.type = "checkbox";
          checkbox.dataset.cloneCheckbox = "true";
          checkbox.style.display = "none";
          checkbox.checked = true;
          root.append(checkbox);
          const select = document.createElement("select");
          select.dataset.cloneSelect = "true";
          select.style.display = "none";
          select.innerHTML = '<option value="old" selected>Old</option><option value="live">Live</option>';
          select.value = "live";
          root.append(select);
          const module = await import("/src/lib/nativePrint.ts");
          const html = module.buildScopedPrintHtml();
          probe.remove();
          input.remove();
          checkbox.remove();
          select.remove();
          return html;
        });
        const snapshot = await context.newPage();
        await snapshot.route("**/api/**", (route) => route.abort());
        await snapshot.setContent(html, { waitUntil: "load" });
        await snapshot.evaluate(() => document.fonts.ready);
        const nativePentacam = await snapshot.locator('.print-lasik-pentacam-right').evaluate((section) => {
          const columns = [...section.children].map((child) => {
            const box = child.getBoundingClientRect();
            return { left: box.left, right: box.right };
          });
          return { columns: columns.length, tablesRight: columns.length === 3 && columns[1].left >= columns[0].right - 1 && columns[2].left >= columns[1].right - 1 };
        });
        assert.equal(nativePentacam.columns, 3, 'Native print must retain the empty Pentacam column');
        assert.equal(nativePentacam.tablesRight, true, 'Native print must keep both Pentacam tables on the right');
        const value = await snapshot.locator("[data-clone-probe]").inputValue();
        const inputValue = await snapshot.locator("[data-clone-input]").inputValue();
        const checkboxValue = await snapshot.locator("[data-clone-checkbox]").isChecked();
        const selectedValue = await snapshot.locator("[data-clone-select]").inputValue();
        const snapshotPdf = await snapshot.pdf({ path: path.join(output, `lasik-native-snapshot-${theme}.pdf`), format: "A4", preferCSSPageSize: true, printBackground: true });
        const snapshotDoc = await PDFDocument.load(snapshotPdf);
        native = { liveValue: value, inputValue, checkboxValue, selectedValue, pentacam: nativePentacam, pages: snapshotDoc.getPageCount(), device: "HTML snapshot in Chromium, not Android device" };
        await snapshot.close();
      }
      results.push({ theme, width, screen, print, layout, pages, native, errors, mutations });
      await writeFile(path.join(output, "results.json"), JSON.stringify(results, null, 2));
      console.log(JSON.stringify(results.at(-1)));
      assert.deepEqual(errors, []);
      assert.deepEqual(mutations, [], "Preview must never save clinical data");
      assert.ok(screen.content <= screen.viewport, "Clinical screen must not overflow");
      for (const control of screen.toolbar) assert.ok(control.height >= 44 && control.left >= 0 && control.right <= width, `Inaccessible toolbar control: ${JSON.stringify(control)}`);
      if (native) {
        assert.equal(native.liveValue, "LIVE-FIXTURE-VALUE");
        assert.equal(native.inputValue, "LIVE-INPUT");
        assert.equal(native.checkboxValue, true);
        assert.equal(native.selectedValue, "live");
        assert.equal(native.pages, 2);
      }
      assert.equal(pages.length, 2, "LASIK and attached follow-up must be two A4 pages");
      for (const group of print.flatMap((page) => page.followupGroups)) {
        assert.ok(group.content <= group.height + 1 && group.font >= 12, `Clipped or undersized follow-up: ${JSON.stringify(group)}`);
      }
      for (const paper of pages) {
        assert.ok(Math.abs(paper.width - 595.28) < 1 && Math.abs(paper.height - 841.89) < 1, "PDF must be A4 portrait");
      }
      if (width !== 768) {
        for (const [view, route, expectedPages] of [["consultant", "/sheets/consultant/999999", 2], ["external", "/sheets/external/999999", 1], ["certificate", "/post-op-offdays/999999", 1]]) {
          await page.emulateMedia({ media: "screen" });
          await page.goto(`${baseURL}${route}`);
          if (view === "certificate") {
            await page.getByLabel("نص الإفادة", { exact: true }).waitFor();
            await page.waitForFunction(() => [...document.querySelectorAll("textarea")].some((input) => input.value.includes("إفادة اختبار")));
            await page.getByRole("checkbox", { name: /إضافة قياسات ما بعد العملية/ }).check();
            await page.getByLabel("طريقة العملية", { exact: true }).waitFor();
          } else {
            await page.locator('[data-print-document="lasik"]').waitFor({ state: "attached" });
            await page.waitForFunction(() => [...document.querySelectorAll("input")].some((input) => input.value.includes("مريض اختبار الطباعة")));
          }
          await page.evaluate(() => document.fonts.ready);
          assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `${view} screen overflow`);
          await page.screenshot({ path: path.join(output, `${view}-screen-${theme}-${width}.png`), fullPage: true });
          await page.emulateMedia({ media: "print" });
          const target = page.locator(view === "certificate" ? ".clinical-report-frame" : '[data-print-document="lasik"]');
          await target.screenshot({ path: path.join(output, `${view}-print-${theme}-${width}.png`) });
          const bytes = await page.pdf({ path: path.join(output, `${view}-${theme}-${width}.pdf`), format: "A4", preferCSSPageSize: true, printBackground: true });
          const document = await PDFDocument.load(bytes);
          assert.equal(document.getPageCount(), expectedPages, `${view} page count`);
          if (view === "certificate") {
            const printedMethodNode = target.getByText(/نص اختبار معزول لطريقة العملية/).last();
            assert.ok(await printedMethodNode.isVisible());
            const printedMethod = await printedMethodNode.innerText();
            assert.ok(printedMethod.includes("دون قص"), "Long method text must have a print text node");
            const patientName = target.getByText("مريض اختبار الطباعة ذو الاسم الطويل للتحقق من التفاف النص", { exact: true });
            assert.equal(await patientName.evaluate((element) => getComputedStyle(element).textOverflow), "clip");
            assert.ok(await patientName.evaluate((element) => element.scrollWidth <= element.clientWidth), "Full patient name must wrap inside its field");
          }
          assert.deepEqual(errors, []);
          assert.deepEqual(mutations, []);
          results.push({ view, theme, width, pages: document.getPageCount(), errors, mutations });
          await writeFile(path.join(output, "results.json"), JSON.stringify(results, null, 2));
          console.log(JSON.stringify(results.at(-1)));
        }
      }
      await context.close();
    }
  }
} finally {
  await browser.close();
}
