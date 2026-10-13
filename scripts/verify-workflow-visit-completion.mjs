import assert from 'node:assert/strict';
import { chromium } from '@playwright/test';

const browser = await chromium.launch({ executablePath: 'C:/Users/SELRS/AppData/Local/ms-playwright/chromium-1234/chrome-win64/chrome.exe' });
try {
  for (const failSave of [false, true]) {
    const page = await browser.newPage({ viewport: { width: 390, height: 900 } });
    const writes = [];
    const errors = [];
    let finished = false;
    page.on('pageerror', error => errors.push(error.message));
    await page.route('**/api/**', async route => {
      const url = new URL(route.request().url());
      const responses = [];
      for (const method of url.pathname.split('/api/trpc/')[1]?.split(',') ?? []) {
        if (route.request().method() !== 'GET') {
          writes.push(method);
          if (failSave && method === 'medical.replacePrescriptionWithItems') {
            responses.push({ error: { json: { message: 'WORKFLOW_SAVE_FAILED', code: -32603, data: { code: 'INTERNAL_SERVER_ERROR', httpStatus: 500 } } } });
            continue;
          }
          if (method === 'medical.updateVisitQueueStatus') finished = true;
        }
        const fixtures = {
          'auth.me': { id: 123, role: 'admin', name: 'Fixture admin' },
          'patient.getPatient': { id: 999999, fullName: 'WORKFLOW_PATIENT', patientCode: 'FIXTURE' },
          'medical.getTodayPatientsByQueueStatus': [
            { id: 999999, visitId: 42, fullName: 'WORKFLOW_PATIENT', queueStatus: finished ? 'treated' : 'clinic1', serviceType: 'specialist', locationType: 'center' },
            { id: 999998, visitId: 43, fullName: 'NEXT_PATIENT', queueStatus: 'clinic1', serviceType: 'specialist', locationType: 'center' },
            { id: 999997, visitId: 99, fullName: 'COMPLETED_PATIENT', queueStatus: 'treated', serviceType: 'specialist', locationType: 'center' },
          ],
          'medical.getDoctorReportsByVisit': [{ id: 5, diagnosis: 'Saved diagnosis' }],
          'medical.getReadyTemplateOverrides': {},
        };
        const data = route.request().method() !== 'GET' ? { success: true } : method in fixtures ? fixtures[method] : [];
        responses.push({ result: { data: { json: data } } });
      }
      await route.fulfill({ json: url.searchParams.has('batch') ? responses : responses[0] ?? {} });
    });
    await page.goto('http://127.0.0.1:5181/workflow');
    const picker = page.getByRole('combobox', { name: 'المريض', exact: true });
    await picker.waitFor();
    await page.waitForTimeout(700);
    assert.equal(await picker.locator('option[value="99"]').count(), 0, 'Completed visits are excluded');
    assert.equal(await picker.locator('option[value="42"]').count(), 1);
    await picker.selectOption('42');
    await page.locator('button[title="الشيت النهائي"]').click();
    assert.equal(await page.locator('.selrs-mobile-brand-canvas').evaluate(node => getComputedStyle(node).backgroundColor), 'rgb(247, 249, 252)', 'Floating navigation surroundings match the workflow canvas');
    assert.equal(await page.locator('.selrs-app-content > [data-app-bottom-nav-clearance]').count(), 1);
    await page.screenshot({ path: 'outputs/mobile-module-chrome/workflow-final-390.png' });
    await page.getByRole('button', { name: 'حفظ وإنهاء الزيارة', exact: true }).click();
    if (failSave) {
      await page.getByText('WORKFLOW_SAVE_FAILED', { exact: true }).first().waitFor();
      assert(!writes.includes('medical.updateVisitQueueStatus'));
      assert.equal(await picker.locator('option[value="42"]').count(), 1);
    } else {
      await page.getByText('تم حفظ وإنهاء الزيارة', { exact: true }).waitFor();
      assert(writes.indexOf('medical.updateVisitQueueStatus') > writes.indexOf('medical.replacePrescriptionWithItems'));
      assert.equal(await picker.locator('option[value="42"]').count(), 0);
      assert.equal(await picker.locator('option[value="43"]').count(), 1);
    }
    assert.deepEqual(errors, []);
    await page.close();
  }
  console.log('Standalone workflow picker excludes treated visits; successful final save completes and removes only its visit; failed save keeps it open. Mocked API only.');
} finally { await browser.close(); }
