import assert from 'node:assert/strict';
import { chromium } from '@playwright/test';

const browser = await chromium.launch({ executablePath: 'C:/Users/SELRS/AppData/Local/ms-playwright/chromium-1234/chrome-win64/chrome.exe' });
const page = await browser.newPage();
try {
  await page.route('**/__clinical-print-fixture', route => route.fulfill({ contentType: 'text/html', body: '<!doctype html><html><head><link rel="stylesheet" href="/src/styles/web.css"><style>@media print{.legacy-print-paper{width:210mm!important;min-height:297mm!important;padding:12mm!important;}}</style></head><body><script type="module">import * as runtime from "/src/lib/clinicalPrintSettings.ts";window.printRuntime=runtime;</script></body></html>' }));
  await page.goto(`${process.env.DESIGN_PREVIEW_URL || 'http://127.0.0.1:5197'}/__clinical-print-fixture`);
  await page.waitForFunction(() => Boolean(window.printRuntime));
  await page.emulateMedia({ media: 'print' });
  const count = await page.evaluate(() => {
    const { PRINT_DOCUMENTS, setClinicalPrintSettings, applyClinicalPrintSettings } = window.printRuntime;
    const enabled = { enabled: true, widthMm: 148, heightMm: 210, topMm: 50, bottomMm: 10, rightMm: 5, leftMm: 5, header: '<b>literal header</b>', footer: 'footer' };
    for (const definition of PRINT_DOCUMENTS) {
      const paper = document.createElement('article');
      paper.className = `${definition.selector.split(',')[0].trim().slice(1)} legacy-print-paper`;
      paper.dataset.clinicalPrintProfile = definition.id;
      paper.textContent = 'Original clinical content';
      document.body.append(paper);
      const before = { width: getComputedStyle(paper).width, padding: getComputedStyle(paper).padding };
      setClinicalPrintSettings(null); applyClinicalPrintSettings();
      if (getComputedStyle(paper).width !== before.width || paper.hasAttribute('data-configured-print-root')) throw Error('Default changed: ' + definition.id);
      setClinicalPrintSettings({ version: 1, profiles: { [definition.id]: enabled } }); applyClinicalPrintSettings();
      const style = getComputedStyle(paper);
      if (Math.abs(parseFloat(style.width) - 138 * 96 / 25.4) > 0.2 || parseFloat(style.paddingTop) !== 0 || !document.getElementById('clinical-print-settings-style').textContent.includes('margin:50mm 5mm 10mm 5mm')) throw Error('Geometry not applied: ' + definition.id + ' ' + style.width + ' ' + style.paddingTop);
      if (paper.querySelector('b') || paper.querySelector('[data-clinical-print-text="header"]').textContent !== enabled.header) throw Error('Header is not literal text');
      applyClinicalPrintSettings();
      if (paper.querySelectorAll('[data-clinical-print-text]').length !== 2) throw Error('Duplicate print text');
      setClinicalPrintSettings({ version: 1, profiles: { [definition.id]: { ...enabled, enabled: false } } }); applyClinicalPrintSettings();
      if (getComputedStyle(paper).width !== before.width || getComputedStyle(paper).padding !== before.padding || paper.querySelector('[data-clinical-print-text]')) throw Error('Original not restored: ' + definition.id);
      paper.remove();
    }
    return PRINT_DOCUMENTS.length;
  });
  assert(count >= 15);
  console.log(`Passed ${count} print profile runtime bindings: custom geometry, literal text, no duplicates, disabled defaults and restoration. No API calls or data writes.`);
} finally { await browser.close(); }
