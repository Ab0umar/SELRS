import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import { chromium } from "@playwright/test";

const output = process.env.DESIGN_VERIFY_OUTPUT || "outputs/clinical-workspace-verification";
await mkdir(output, { recursive: true });
const pages = process.env.DESIGN_VERIFY_PATHS?.split(',') ?? ["/reports", "/records/patients", "/records/medical", "/sheets"];
const browser = await chromium.launch({ executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE });
const results = [];
try {
  for (const theme of ["light", "dark"]) for (const width of [360, 768, 1440]) {
    const context = await browser.newContext({ viewport: { width, height: 1000 } });
    await context.addInitScript(theme => localStorage.setItem("theme", theme), theme);
    const page = await context.newPage();
    const errors = [], writes = [];
    page.on("pageerror", error => errors.push(error.message));
    await page.route("**/api/**", async route => {
      const request = route.request(), url = new URL(request.url());
      if (request.method() !== "GET") { writes.push(url.pathname); await route.abort(); return; }
      const fixtures = {
        "auth.me": { id: 999999, role: "admin", name: "اختبار واجهة معزول" },
        "legacyPatients.search": { patients: [], total: 0, totalPages: 1 },
        "medical.getAutorefractometryOverview": { rows: [], total: 0 },
        "medical.getRefractionsOverview": { rows: [], total: 0 },
        "medical.getPentacamDashboardStats": { examsToday: 0, totalExams: 0 },
        "medical.getOpsHealth": { dbConnected: true, tunnelConnected: true, patientsCount: 0 },
        "medical.getSystemSetting": null,
        "medical.getSheetEntry": null,
        "medical.getUserPageState": null,
        "medical.getPatientPageState": null,
        "medical.getMedicalHistoryByPatient": null,
        "medical.getMedicalReportsOverview": [
          { id: 1, patientId: 1, patientName: "FIXTURE_LABS", operationType: "lab", diagnosis: "lab record" },
          { id: 2, patientId: 2, patientName: "FIXTURE_RAYS", operationType: "xray", diagnosis: "radiology record" },
          { id: 3, patientId: 3, patientName: "FIXTURE_DIAGNOSIS", operationType: "consult", diagnosis: "consult record" },
        ],
      };
      const responses = (url.pathname.split("/api/trpc/")[1]?.split(",") ?? []).map(method => ({ result: { data: { json: method in fixtures ? fixtures[method] : [] } } }));
      await route.fulfill({ contentType: "application/json", body: JSON.stringify(url.searchParams.has("batch") ? responses : responses[0]) });
    });
    for (const path of pages) {
      await page.goto((process.env.DESIGN_PREVIEW_URL || "http://127.0.0.1:5175") + path);
      const workspace = page.locator(".clinical-workspace").first();
      await workspace.waitFor();
      if (['/records/patients', '/records/medical'].includes(path)) {
        const header = workspace.locator('.records-page-header');
        const headerBox = await header.boundingBox();
        assert.ok(headerBox);
        assert.equal(headerBox.width === 1 && headerBox.height === 1, width < 768, 'Records header is visually hidden only on mobile');
      }
      const tabs = workspace.getByRole("tablist").first().getByRole("tab");
      const count = await tabs.count();
      assert.ok(count >= 4);
      if (path === '/reports') {
        assert.equal(await tabs.first().getAttribute('aria-selected'), 'true', 'Post-op leave is the default report');
        assert.deepEqual(await tabs.allTextContents(), ['إجازة ما بعد العملية', 'تقرير قبل وبعد', 'خطاب الإحالة', 'تقرير طبي', 'تقرير حالة طبية', 'التقرير الشامل']);
        assert.equal(await workspace.locator('[data-slot="tabs"]').first().getAttribute('dir'), 'rtl');
      }
      if (path === '/records/medical') {
        assert.deepEqual(await tabs.allTextContents(), ['AutoRef', 'Refraction', 'Pentacam', 'Test&Rays', 'Diagnosis', 'prescriptions']);
        assert.equal(await workspace.locator('[data-slot="tabs"]').first().getAttribute('dir'), 'ltr');
      }
      if (path === '/records/patients') {
        assert.deepEqual(await tabs.allTextContents(), ['المرضى', 'العمليات', 'الزيارات', 'المتابعات']);
        assert.equal(await workspace.locator('[data-slot="tabs"]').first().getAttribute('dir'), 'rtl');
      }
      if (path === '/sheets') {
        assert.deepEqual(await tabs.allTextContents(), ['كشف', 'مقاس نظارة / أشعة خارجي', 'تصحيح إبصار', 'متابعة', 'د. الصواف']);
        assert.equal(await workspace.locator('[data-slot="tabs"]').first().getAttribute('dir'), 'rtl');
      }
      for (let i = 0; i < count; i++) {
        const tab = tabs.nth(i);
        const label = await tab.innerText();
        await tab.focus(); await page.keyboard.press("Enter");
        await page.waitForTimeout(250);
        assert.equal(await tab.getAttribute("aria-selected"), "true");
        if (path === '/records/medical' && [3, 4].includes(i)) {
          const expected = i === 3 ? ['FIXTURE_LABS', 'FIXTURE_RAYS'] : ['FIXTURE_DIAGNOSIS'];
          for (const name of expected) await page.getByText(name, { exact: true }).waitFor();
          for (const other of ['FIXTURE_LABS', 'FIXTURE_RAYS', 'FIXTURE_DIAGNOSIS'].filter(name => !expected.includes(name))) assert.equal(await page.getByText(other, { exact: true }).count(), 0, 'Medical category must not show another category');
        }
        if (path === '/sheets' && [0, 2, 4].includes(i)) {
          assert.equal(await page.locator('[data-print-document="lasik"]').getAttribute('data-sheet-type'), { 0: 'consultant', 2: 'lasik', 4: 'external' }[i]);
        }
        if (path === '/sheets' && i === 0) {
          assert.equal(await page.locator('#fundus-drawing-description').count(), 0);
          assert.ok(await page.locator('canvas').count() > 0, 'Consultant drawing canvas must remain');
        }
        if (path === '/sheets' && i === 3) {
          await page.locator('#sheets-followup-kind').selectOption('specialist');
          await page.waitForTimeout(250);
          assert.equal(await page.locator('[data-print-document="followup"]').getAttribute('data-followup-kind'), 'specialist');
          await page.locator('#sheets-followup-kind').selectOption('consultant');
          await page.waitForTimeout(250);
          assert.equal(await page.locator('[data-print-document="followup"]').getAttribute('data-followup-kind'), 'consultant');
          for (const button of await page.locator('.consultant-followup-toolbar button').all()) {
            if (!(await button.isVisible())) continue;
            const box = await button.boundingBox();
            assert.ok(box.x >= 0 && box.x + box.width <= width + 1, 'Followup toolbar controls must fit the viewport');
          }
        }
        assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1), false, `${path}/${label}/${width}: overflow`);
        const size = await tab.boundingBox(); assert.ok(size.height >= 44);
        const state = await tab.evaluate(node => ({ color: getComputedStyle(node).color, background: getComputedStyle(node).backgroundColor, textFits: node.scrollWidth <= node.clientWidth + 1 }));
        assert.ok(state.textFits, `${path}/${label}: tab text fit`);
        await page.screenshot({ path: `${output}/${path.replaceAll("/", "-")}-${i}-${theme}-${width}.png`, fullPage: true });
        results.push({ path, label, theme, width, keyboardTab: true, noOverflow: true, ...state });
        await writeFile(`${output}/results.json`, JSON.stringify({ cases: results, errors, blockedWrites: writes }, null, 2));
        assert.deepEqual(errors, [], `${path}/${label}: browser page errors`);
      }
    }
    assert.deepEqual(writes, [], "No persistence requests expected in empty workspace navigation");
    await context.close();
  }
} finally { await browser.close(); }
console.log(`Passed ${results.length} clinical workspace tab cases.`);
