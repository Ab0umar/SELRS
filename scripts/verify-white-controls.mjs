import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import { chromium } from '@playwright/test';

await mkdir('outputs/white-controls', { recursive: true });
const browser = await chromium.launch({ executablePath: 'C:/Users/SELRS/AppData/Local/ms-playwright/chromium-1234/chrome-win64/chrome.exe' });
const base = process.env.DESIGN_PREVIEW_URL || 'http://127.0.0.1:5193';
const fixture = `${base}/@fs/E:/selrs.cc/outputs/white-controls/fixture.html`;
const white = 'rgb(255, 255, 255)';
const surface = async locator => {
  await locator.evaluate(el => Promise.all(el.getAnimations().map(animation => animation.finished.catch(() => {}))));
  assert.equal(await locator.evaluate(el => getComputedStyle(el).backgroundColor), white, await locator.evaluate(el => el.outerHTML.slice(0, 300)));
};
let cases = 0;
try {
  for (const theme of ['light', 'dark']) for (const width of [320, 1440]) {
    const page = await browser.newPage({ viewport: { width, height: 1100 } });
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto(fixture);
    await page.getByLabel('Text', { exact: true }).waitFor();
    await page.evaluate(theme => document.documentElement.classList.toggle('dark', theme === 'dark'), theme);
    for (const label of ['Text', 'Disabled', 'Invalid', 'Time', 'Native date', 'Month', 'Number', 'Date', 'Notes', 'Native select', 'Select']) await surface(page.getByLabel(label, { exact: true }));
    await surface(page.locator('[data-field-surface="date"]'));
    await surface(page.locator('[data-field-surface="date"] > button'));
    assert.equal(await page.getByLabel('Disabled', { exact: true }).isDisabled(), true);
    assert.equal(await page.getByLabel('Invalid').getAttribute('aria-invalid'), 'true');
    await page.getByLabel('Text', { exact: true }).fill('Typed');
    assert.equal(await page.getByLabel('Text', { exact: true }).inputValue(), 'Typed');
    assert.notEqual(await page.getByLabel('Text', { exact: true }).evaluate(el => getComputedStyle(el).outlineStyle), 'none');
    await page.getByLabel('Time', { exact: true }).fill('14:45');
    assert.equal(await page.getByLabel('Time', { exact: true }).inputValue(), '14:45');
    await page.getByLabel('Date', { exact: true }).fill('16/10/2026');
    await page.getByLabel('Date', { exact: true }).press('Tab');
    assert.equal(await page.getByLabel('Date', { exact: true }).inputValue(), '16/10/2026');
    await page.getByRole('button', { name: 'اختيار التاريخ' }).click();
    await surface(page.locator('[data-field-surface="picker"]'));
    await surface(page.locator('.rdp-root'));
    await page.keyboard.press('Escape');
    await page.getByLabel('Select', { exact: true }).click();
    await surface(page.locator('[data-slot="select-content"]'));
    await page.getByRole('option', { name: 'Second', exact: true }).click();
    assert.match(await page.getByLabel('Select', { exact: true }).innerText(), /Second/);
    const combo = page.locator('button[role="combobox"]:not([data-slot="select-trigger"])');
    await surface(combo);
    await combo.click();
    await surface(page.locator('[data-field-surface="picker"]'));
    await surface(page.locator('[data-slot="command"]'));
    await page.locator('[data-field-surface="picker"]').getByRole('option', { name: 'First', exact: true }).click();
    assert.match(await combo.innerText(), /First/);
    assert.equal(await page.getByLabel('Print input').evaluate(el => getComputedStyle(el).backgroundColor), 'rgb(250, 240, 220)');
    await page.screenshot({ path: `outputs/white-controls/${theme}-${width}.png`, fullPage: true });
    await page.emulateMedia({ media: 'print' });
    assert.equal(await page.getByLabel('Print input').evaluate(el => getComputedStyle(el).backgroundColor), 'rgb(250, 240, 220)');
    assert.deepEqual(errors, []);
    await page.close();
    cases++;
  }
} finally { await browser.close(); }
console.log(`Passed ${cases} real-component viewport/theme cases: white controls and picker surfaces, editing, selection, focus, disabled/error states and protected print.`);
