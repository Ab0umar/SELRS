import assert from 'node:assert/strict';
import { chromium } from '@playwright/test';

const browser = await chromium.launch({ executablePath: 'C:/Users/SELRS/AppData/Local/ms-playwright/chromium-1234/chrome-win64/chrome.exe' });
try {
  for (const delay of [1200, 200]) {
    const page = await browser.newPage({ viewport: { width: 360, height: 1000 } });
    const errors = [];
    let patientRequests = 0;
    page.on('pageerror', error => errors.push(error.message));
    await page.route('**/api/**', async route => {
      if (route.request().method() !== 'GET') {
        await route.abort();
        return;
      }
      const url = new URL(route.request().url());
      const methods = url.pathname.split('/api/trpc/')[1]?.split(',') ?? [];
      if (methods.includes('patient.getPatient')) {
        patientRequests++;
        await new Promise(resolve => setTimeout(resolve, delay));
      }
      const fixtures = {
        'auth.me': { id: 999999, role: 'admin', name: 'اختبار' },
        'patient.getPatient': { id: 999999, fullName: 'HOOK_TRANSITION_PATIENT', patientCode: 'HOOK-001', age: 35, gender: 'male', locationType: 'center' },
        'medical.getSystemSetting': null,
        'medical.getMedicalHistoryByPatient': null,
      };
      const responses = methods.map(method => ({ result: { data: { json: method in fixtures ? fixtures[method] : [] } } }));
      await route.fulfill({ json: url.searchParams.has('batch') ? responses : responses[0] ?? {} });
    });
    await page.goto((process.env.DESIGN_PREVIEW_URL || 'http://127.0.0.1:5181') + '/patient-hub/brief/999999');
    await page.waitForTimeout(delay + 1800);
    assert(patientRequests > 0, 'Actual PatientSummary data query was exercised');
    assert.deepEqual(errors, [], 'Loading-to-loaded must not change the hook count');
    assert.equal(await page.getByText('An Unexpected Error Occurred.', { exact: true }).count(), 0, await page.locator('pre').allTextContents().then(lines => lines.join('\n')));
    await page.getByText('HOOK_TRANSITION_PATIENT', { exact: true }).first().waitFor();
    await page.evaluate(() => history.pushState(null, '', '/patient-hub/brief/999998'));
    await page.waitForTimeout(delay + 1800);
    assert.equal(await page.getByText('An Unexpected Error Occurred.', { exact: true }).count(), 0, 'Changing patient must not render fewer hooks during loading');
    assert.deepEqual(errors, []);
    await page.getByText('HOOK_TRANSITION_PATIENT', { exact: true }).first().waitFor();
    await page.close();
  }
  console.log('Passed PatientSummary loading-to-loaded hook regression with delayed GET-only fixtures.');
} finally { await browser.close(); }
