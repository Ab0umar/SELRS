import assert from 'node:assert/strict';
import { chromium } from '@playwright/test';

const browser = await chromium.launch({ executablePath: 'C:/Users/SELRS/AppData/Local/ms-playwright/chromium-1234/chrome-win64/chrome.exe' });
try {
  for (const failPrescription of [false, true]) {
    const page = await browser.newPage({ viewport: { width: 390, height: 900 } });
    let treated = false;
    const writes = [];
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.route('**/api/**', async route => {
      const url = new URL(route.request().url());
      const methods = url.pathname.split('/api/trpc/')[1]?.split(',') ?? [];
      const responses = [];
      for (const method of methods) {
        if (route.request().method() !== 'GET') {
          writes.push(method);
          if (method === 'medical.replacePrescriptionWithItems' && failPrescription) {
            responses.push({ error: { json: { message: 'FIXTURE_SAVE_FAILED', code: -32603, data: { code: 'INTERNAL_SERVER_ERROR', httpStatus: 500 } } } });
            continue;
          }
          if (method === 'medical.updateVisitQueueStatus') treated = true;
        }
        const fixtures = {
          'auth.me': { id: 123, role: 'admin', name: 'Fixture admin' },
          'patient.getPatient': { id: 999999, fullName: 'COMPLETION_PATIENT', patientCode: 'FIXTURE' },
          'medical.getTodayPatientsByQueueStatus': [
            { id: 999999, visitId: 42, fullName: 'COMPLETION_PATIENT', queueStatus: treated ? 'treated' : 'clinic1', hasQueueCompletionData: true, locationType: 'center' },
            { id: 999998, visitId: 43, fullName: 'EMPTY_PATIENT', queueStatus: 'clinic1', hasQueueCompletionData: false, locationType: 'center' },
          ],
          'medical.getVisits': [{ id: 42, patientId: 999999, visitDate: '2026-10-13', queueStatus: 'clinic1' }],
          'medical.getExaminationsByPatient': [{ id: 7, visitId: 42, patientId: 999999, createdAt: '2026-10-13T12:00:00', sphereOD: '1.00' }],
          'medical.getPatientMedicalStatus': {},
          'medical.getReadyTemplateOverrides': {},
        };
        const data = route.request().method() !== 'GET' ? { success: true } : method in fixtures ? fixtures[method] : [];
        responses.push({ result: { data: { json: data } } });
      }
      await route.fulfill({ json: url.searchParams.has('batch') ? responses : responses[0] ?? {} });
    });
    await page.goto('http://127.0.0.1:5181/dashboard');
    const patientCard = page.getByRole('button', { name: 'فتح اختصارات المريض COMPLETION_PATIENT', exact: true });
    await patientCard.waitFor();
    assert.equal(await patientCard.getByRole('button', { name: 'معالج', exact: true }).count(), 1);
    assert.equal(await page.getByRole('button', { name: 'فتح اختصارات المريض EMPTY_PATIENT', exact: true }).getByRole('button', { name: 'معالج', exact: true }).count(), 0);
    await patientCard.click();
    await page.getByRole('button', { name: 'القياسات و الفحص', exact: true }).click();
    const panel = page.locator('[data-medical-file-surface]');
    await panel.getByRole('combobox').filter({ hasText: 'اختر فحص' }).click();
    await page.getByRole('option').first().click();
    await panel.getByRole('button', { name: 'حفظ وإنهاء الزيارة', exact: true }).click();
    if (failPrescription) {
      await page.getByText('FIXTURE_SAVE_FAILED', { exact: true }).first().waitFor();
      assert(!writes.includes('medical.updateVisitQueueStatus'), 'A failed save must not complete the visit');
      assert(await panel.isVisible());
    } else {
      await page.getByText('تم حفظ وإنهاء الزيارة', { exact: true }).waitFor();
      assert(writes.indexOf('medical.updateVisitQueueStatus') > writes.indexOf('medical.replacePrescriptionWithItems'));
      await patientCard.waitFor({ state: 'detached' });
    }
    assert.deepEqual(errors, []);
    await page.close();
  }
  console.log('Mocked queue completion: empty-data button hidden; all saves precede completion; failed prescription keeps visit open. No real writes.');
} finally { await browser.close(); }
