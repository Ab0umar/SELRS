import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { chromium } from '@playwright/test';

const css = await readFile('client/src/components/layout/mobile-brand-canvas.css', 'utf8');
const source = await readFile('client/src/components/MedicalFilePanel.tsx', 'utf8');
assert(source.includes('data-medical-file-surface'));
assert(source.includes('data-medical-file-overlay={!embedded || undefined}'));
const browser = await chromium.launch({ executablePath: 'C:/Users/SELRS/AppData/Local/ms-playwright/chromium-1234/chrome-win64/chrome.exe' });
try {
  for (const width of [360, 1440]) {
    const page = await browser.newPage({ viewport: { width, height: 900 } });
    await page.setContent(`<style>
      .bg-card { background: white; } .border { border: 1px solid gray; }
      [data-medical-file-overlay] { background: rgba(0,0,0,.4); }
      ${css}
    </style><div class="selrs-mobile-brand-canvas"><main class="selrs-app-content">
      <div data-medical-file-overlay><div data-medical-file-surface class="bg-card border">Medical file</div></div>
      <div class="bg-card border" id="page-card">Page content</div>
    </main></div>`);
    assert.equal(await page.locator('[data-medical-file-overlay]').evaluate(el => getComputedStyle(el).backgroundColor), 'rgba(0, 0, 0, 0.4)');
    assert.equal(await page.locator('[data-medical-file-surface]').evaluate(el => getComputedStyle(el).backgroundColor), 'rgb(255, 255, 255)');
    assert.equal(await page.locator('[data-medical-file-surface]').evaluate(el => getComputedStyle(el).borderTopWidth), '1px');
    if (width < 768) assert.equal(await page.locator('#page-card').evaluate(el => getComputedStyle(el).backgroundColor), 'rgba(0, 0, 0, 0)');
    await page.close();
  }
  console.log('Medical file surface stays opaque, overlay retained, page canvas unchanged at 360/1440px.');
} finally { await browser.close(); }
