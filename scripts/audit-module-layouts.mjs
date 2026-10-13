import { readFile, readdir, mkdir, writeFile } from 'node:fs/promises';
import ts from 'typescript';
import { chromium } from '@playwright/test';
import { inspectLayout } from './lib/layout-scan.mjs';

const output = 'outputs/module-layout-audit';
await mkdir(output, { recursive: true });
const constants = new Map();
const routes = new Set(['/home', '/dashboard', '/workflow', '/stockroom', '/marketing', '/sheets', '/reports', '/records/patients']);
function parse(text, filename) { return ts.createSourceFile(filename, text, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX); }
function visit(node, callback) { callback(node); ts.forEachChild(node, child => visit(child, callback)); }
const routeFile = parse(await readFile('shared/routes.ts', 'utf8'), 'routes.ts');
visit(routeFile, node => {
  if (ts.isPropertyAssignment(node) && ts.isStringLiteral(node.initializer)) constants.set(node.name.getText(routeFile), node.initializer.text);
});
const routeFiles = ['client/src/App.tsx', ...(await readdir('client/src/routes')).filter(name => name.endsWith('.tsx')).map(name => `client/src/routes/${name}`)];
for (const filename of routeFiles) {
  const source = parse(await readFile(filename, 'utf8'), filename);
  visit(source, node => {
    if (!ts.isJsxAttribute(node) || node.name.getText(source) !== 'path' || !node.initializer) return;
    if (ts.isStringLiteral(node.initializer)) routes.add(node.initializer.text);
    else if (ts.isJsxExpression(node.initializer) && node.initializer.expression) {
      const expression = node.initializer.expression;
      if (ts.isPropertyAccessExpression(expression) && expression.expression.getText(source) === 'ROUTES') {
        const value = constants.get(expression.name.text);
        if (value) routes.add(value);
      } else if (ts.isStringLiteral(expression)) routes.add(expression.text);
    }
  });
}
const admin = parse(await readFile('client/src/features/admin/AdminHubShell.tsx', 'utf8'), 'AdminHubShell.tsx');
visit(admin, node => {
  if (ts.isPropertyAssignment(node) && node.name.getText(admin) === 'href' && ts.isStringLiteral(node.initializer)) routes.add(node.initializer.text);
});
const parameters = { empCd: 'TEST001', secCd: '15', trTy: 'RC', trNo: '999999', patientCode: '999999', doctorCode: '999999' };
const catalog = [...new Set([...routes].filter(route => route.startsWith('/') && !route.includes('*') && route !== '/404').map(route => route.replace(/:([\w]+)\??/g, (_, name) => parameters[name] ?? '999999')))];
const selected = process.env.SCREEN_AUDIT_PATHS?.split(',');
const paths = (selected ? catalog.filter(route => selected.includes(route)) : catalog).sort();
const widths = (process.env.SCREEN_AUDIT_WIDTHS || '320,768,1440').split(',').map(Number);
const themes = (process.env.SCREEN_AUDIT_THEMES || 'light,dark').split(',');
const cssMode = process.env.SCREEN_AUDIT_NATIVE_CSS ? 'native-css' : 'web';
const mobileCssFile = (await readdir('dist/public/assets')).find(name => /^mobile-.*\.css$/.test(name));
const mobileCss = cssMode === 'native-css' ? await readFile(`dist/public/assets/${mobileCssFile}`, 'utf8') : null;
const patient = { id: 999999, code: '999999', patientCode: '999999', fullName: 'مريض اختبار باسم عربي طويل للتحقق من عرض النص كاملًا', name: 'مريض اختبار باسم عربي طويل للتحقق من عرض النص كاملًا', phone: '01000000000', age: 45, gender: 'male', dateOfBirth: '1981-01-01', createdAt: '2026-10-13' };
const employee = { empCd: 'TEST001', fullName: 'موظف اختبار الحضور والطلبات ذو الاسم الطويل', empName: 'موظف اختبار الحضور والطلبات ذو الاسم الطويل', department: 'مركز', isActive: true, annualLeaveDays: 21 };
const fixtures = {
  'auth.me': { id: 999999, role: 'admin', name: 'اختبار الواجهة' },
  'medical.getOpsHealth': { dbConnected: true, tunnelConnected: true, patientsCount: 42 },
  'patient.getPatient': patient,
  'medical.getPatient': patient,
  'medical.getAllPatients': [patient],
  'medical.getVisitsByPatient': [{ id: 999999, patientId: 999999, visitDate: '2026-10-13', visitType: 'كشف', status: 'clinic' }],
  'medical.getPatientMedicalStatusBatch': {},
  'medical.getPatientMedicalStatus': {},
  'medical.searchMedicalReference': { rows: [], total: 0 },
  'attendance.employeesList': { employees: [employee] },
  'attendance.dashboardSummary': { bySection: { center: { insideNow: 12, lateToday: 3, missingCheckoutYesterday: 2, morningInsideNow: 6, eveningInsideNow: 6 }, clinic: { insideNow: 8, lateToday: 1, missingCheckoutYesterday: 0, morningInsideNow: 4, eveningInsideNow: 4 } } },
  'attendance.deviceStatus': { status: 'online', connected: true },
  'attendance.dailyByDate': [{ ...employee, workDate: '2026-10-13', status: 'missing_checkout', firstIn: '2026-10-13T08:00:00', lastOut: null, lateMinutes: 15, lateMins: 15, workMins: 240 }],
  'attendance.listShifts': [{ id: 1, name: 'وردية اختبار ذات اسم طويل للتحقق من عرضها', startTime: '08:00', endTime: '16:00', branch: 'center', weekdayMask: 127 }],
  'attendance.rawPunches': { punches: [], total: 0 },
  'attendance.monthlyPunches': { employees: [] },
  'attendance.getLeaveBalance': { annualAllocation: 21, usedAnnual: 2, remainingAnnual: 19, usedSick: 0 },
  'salary.getShiftSchedule': { attendance: [], staff: [] },
  'salary.getMarkazAutoCommissionPools': { breakdown: {}, examPool: 0, pentacamDrPool: 0, pentacamPool: 0 },
  'salary.getEmployeeFunds': { employees: [], fundEligibleEmployees: [], fundMembers: [], entries: [], eidBonuses: [], totalRevenue: 0, sharePerMember: 0 },
  'accounting.dashboardSummary': { totalRevenueToday: 123456.75, totalReceiptsToday: 25, totalExpensesToday: 1234.5 },
  'accounting.accLedgerSummary': { balance: 123456.75, dailyRevenue: 23456.5, monthlyRevenue: 123456.75 },
  'accounting.dailyRevenue': { rows: [], totals: { totalReceipts: 0, totalGross: 0, totalDiscount: 0, totalCash: 0, totalPaid: 0, netAfterDiscount: 0 } },
  'accounting.accExpenses': { rows: [], total: 0, totalExpense: 123456.75 },
  'accounting.serviceRevenue': { sections: [], grandTotal: { rowCount: 0, totalGross: 0, totalDiscount: 0, totalPaid: 0 } },
  'accounting.patientLasikSummary': { patientCode: '999999', patientName: patient.fullName, receipts: [], services: [], totals: { totalReceipts: 0, totalServices: 0, totalGross: 0, totalDiscount: 0, totalPaid: 0, totalPatientAmount: 0, totalCompanyAmount: 0, lastTransactionDate: null } },
  'accounting.lasikCostSummary': { fromDate: '2026-10-01', toDate: '2026-10-13', period: 'month', revenue: { totalGross: 0, totalDiscount: 0, netAfterDiscount: 0, totalPaid: 0, serviceRows: 0, operationCount: 0 }, expenses: { cashbookExpense: 0, excludedExpense: 0, includedRows: 0, excludedRows: 0 }, stock: { stockValue: 0, itemCount: 0, unpricedItemCount: 0 }, cost: { totalCost: 0, costPerOperation: 0, profitOnPaid: 0, profitPerOperation: 0 } },
  'patientPortal.getMyProfile': patient,
  'doctorPortal.getMyPatients': [patient],
  'doctorPortal.getPatientImages': { patient, refractions: [], prescriptions: [], images: [] },
  'stockroom.getReports': { inventory: [] },
  'marketing.dashboardSummary': { counts: { total: 10, draft: 1, published: 9, failed: 0, publishing: 0, scheduled: 0 }, recentPosts: [] },
  'marketing.getSettings': {},
  'marketing.getSchedulerStatus': {},
  'kf.getPatient': patient,
  'kf.getPatientWorkflowData': { patient: { ...patient, kfId: 999999, kfCode: 'KF-999999' }, visit: null, examination: null, prescription: null, testRequest: null },
};


const browser = await chromium.launch({ executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE || 'C:/Users/SELRS/AppData/Local/ms-playwright/chromium-1234/chrome-win64/chrome.exe' });
const results = [];
const cases = themes.flatMap(theme => widths.map(width => ({ theme, width })));
let nextCase = 0;
let saveQueue = Promise.resolve();
console.log(`Catalog: ${catalog.length} registered routes; checking ${paths.length} routes at ${widths.join('/')}px in ${themes.join('/')}.`);
await writeFile(`${output}/route-catalog.json`, JSON.stringify(catalog, null, 2));
try {
  const runCases = async () => {
  while (nextCase < cases.length) {
    const { theme, width } = cases[nextCase++];
    const context = await browser.newContext({ viewport: { width, height: 1000 }, isMobile: width < 768, hasTouch: width < 1100 });
    await context.addInitScript(value => {
      localStorage.setItem('theme', value);
      localStorage.setItem('tabs:swipe-hint-seen', '1');
      const token = payload => `fixture.${btoa(JSON.stringify(payload))}.fixture`;
      localStorage.setItem('doctor_portal_token', token({ type: 'externalDoctor', doctorId: 999999 }));
      localStorage.setItem('doctor_portal_meta', JSON.stringify({ id: 999999, fullName: 'طبيب اختبار ذو اسم طويل', username: 'fixture' }));
      localStorage.setItem('patient_portal_token', token({ type: 'patient', patientId: 999999 }));
      localStorage.setItem('patient_portal_meta', JSON.stringify({ name: 'مريض اختبار ذو اسم طويل', patientCode: '999999' }));
    }, theme);
    const page = await context.newPage();
    if (mobileCss) await page.route('**/assets/web-*.css', route => route.fulfill({ contentType: 'text/css', body: mobileCss }));
    page.setDefaultTimeout(12000);
    let errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.routeWebSocket('**/ws', socket => socket.onMessage(() => {}));
    await page.route('**/api/**', async route => {
      const url = new URL(route.request().url());
      if (route.request().method() !== 'GET') {
        if (/saveUserPageState|savePatientPageState/.test(url.pathname)) {
          const methods = url.pathname.split('/api/trpc/')[1]?.split(',') ?? [];
          const data = methods.map(() => ({ result: { data: { json: { success: true } } } }));
          return route.fulfill({ json: url.searchParams.has('batch') ? data : data[0] });
        }
        errors.push('WRITE_BLOCKED: ' + url.pathname);
        return route.abort();
      }
      const responses = (url.pathname.split('/api/trpc/')[1]?.split(',') ?? []).map(method => ({ result: { data: { json: method in fixtures ? fixtures[method] : /getSystemSetting|getSheetEntry|getUserPageState|getPatientPageState|getMedicalHistoryByPatient|SuggestedOperationType/.test(method) ? null : [] } } }));
      await route.fulfill({ json: url.searchParams.has('batch') ? responses : responses[0] ?? {} });
    });
    for (const route of paths) {
      errors = [];
      try {
        const destination = page.locator(`a[href=${JSON.stringify(route)}]:not([target="_blank"]):not([download])`).first();
        const quickSelect = page.locator('select[aria-label="الانتقال السريع لصفحة أخرى"]');
        if (await destination.count() && await destination.isVisible()) {
          const previousRoute = new URL(page.url()).pathname;
          await destination.evaluate(node => node.click());
          await page.waitForTimeout(150);
          if (new URL(page.url()).pathname === previousRoute && previousRoute !== route) await page.goto((process.env.SCREEN_AUDIT_URL || 'http://127.0.0.1:5183') + route);
        } else if (await quickSelect.count() && await quickSelect.locator(`option[value=${JSON.stringify(route)}]`).count()) {
          await quickSelect.selectOption(route);
          await page.waitForTimeout(150);
        } else await page.goto((process.env.SCREEN_AUDIT_URL || 'http://127.0.0.1:5183') + route);
        await page.locator('.selrs-app-content, main, #root').first().waitFor();
        await page.waitForFunction(() => {
          const root = document.querySelector('.selrs-app-content') ?? document.querySelector('main') ?? document.querySelector('#root');
          return root && root.innerText.trim().length > 10 && root.querySelector('h1, h2, input, table, a, button');
        }, undefined, { timeout: 12000 });
        await page.waitForTimeout(350);
        await page.evaluate(() => document.fonts.ready);
        for (const details of await page.locator('.selrs-app-content details:not([open])').all()) {
          const summary = details.locator(':scope > summary');
          if (await summary.isVisible()) await summary.evaluate(node => node.click());
        }
        await page.waitForTimeout(100);
        const layout = await inspectLayout(page);
        const scroll = page.locator('[data-app-scroll-container]').first();
        if (await scroll.count()) {
          for (const fraction of [.5, 1]) {
            await scroll.evaluate((node, fraction) => { node.scrollTop = (node.scrollHeight - node.clientHeight) * fraction; }, fraction);
            await page.waitForTimeout(60);
            const below = await inspectLayout(page);
            for (const key of ['collisions', 'fieldCollisions', 'tabEscapes', 'clippedButtons']) {
              layout[key] = [...new Map([...layout[key], ...below[key]].map(item => [JSON.stringify(item), item])).values()];
            }
          }
          await scroll.evaluate(node => { node.scrollTop = 0; });
        }
        const body = await page.locator('body').innerText();
        const row = { route, finalRoute: new URL(page.url()).pathname, theme, width, cssMode, ...layout, errors: [...errors], boundary: body.includes('An Unexpected Error Occurred.'), missing: body.includes('Page Not Found') || body.includes('الصفحة غير موجودة'), denied: body.includes('لا تملك صلاحية الوصول') };
        if (row.boundary) row.boundaryMessage = body.slice(body.indexOf('Error:'), body.indexOf('Error:') + 300);
        row.paperOnly = !row.textCount && await page.locator('[data-print-document], .prescription-root, .refraction-print-card, .request-tests-paper, .request-tests-root').count() > 0;
        if (!row.textCount && !row.denied && !row.paperOnly) row.errors.push('NO_MEASURABLE_SCREEN_TEXT');
        results.push(row);
        const count = row.collisions.length + row.fieldCollisions.length + row.tabEscapes.length + row.clippedButtons.length;
        if (count || row.overflow || row.errors.length || row.boundary || process.env.SCREEN_AUDIT_CAPTURE_ALL) {
          const name = `${route.replace(/[^a-z0-9]/gi, '_')}-${cssMode}-${theme}-${width}`;
          await page.screenshot({ path: `${output}/${name}.png`, fullPage: true });
          if (count || row.overflow || row.errors.length || row.boundary) console.log('FINDING', route, theme, width, JSON.stringify({ collisions: row.collisions.slice(0, 3), fields: row.fieldCollisions.slice(0, 3), tabs: row.tabEscapes, buttons: row.clippedButtons.slice(0, 3), errors: row.errors.slice(0, 2), overflow: row.overflow, boundary: row.boundary }));
        }
      } catch (error) { results.push({ route, theme, width, loadError: error.message, errors: [...errors] }); console.log('LOAD_ERROR', route, error.message.split('\n')[0]); }
      if (results.length % 20 === 0) {
        console.log(`Checked ${results.length} page loads.`);
        const snapshot = JSON.stringify(results, null, 2);
        saveQueue = saveQueue.then(() => writeFile(`${output}/results.json`, snapshot));
      }
    }
    await context.close();
  }
  };
  await Promise.all(Array.from({ length: Math.min(Number(process.env.SCREEN_AUDIT_CONCURRENCY || 3), cases.length) }, () => runCases()));
} finally { await browser.close(); await saveQueue; await writeFile(`${output}/results-${cssMode}.json`, JSON.stringify(results, null, 2)); await writeFile(`${output}/results.json`, JSON.stringify(results, null, 2)); }
const findings = results.filter(row => row.loadError || row.boundary || row.errors?.length || row.overflow || row.collisions?.length || row.fieldCollisions?.length || row.tabEscapes?.length || row.clippedButtons?.length);
console.log(`Completed ${results.length} page loads; ${findings.length} require inspection. Paper surfaces excluded; all API writes blocked.`);
process.exitCode = findings.length ? 1 : 0;
