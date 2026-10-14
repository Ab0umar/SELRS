import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
import { chromium } from "@playwright/test";
import { inspectLayout } from './lib/layout-scan.mjs';

const output = "outputs/attendance-module";
await mkdir(output, { recursive: true });
const employee = {
  empCd: "TEST001",
  fullName: "موظف اختبار الحضور والطلبات",
  department: "مركز",
  isActive: true,
  annualLeaveDays: 21,
};
const shifts = [
  {
    id: 1,
    name: "الوردية الصباحية",
    startTime: "08:00",
    endTime: "12:00",
    branch: "center",
    weekdayMask: 127,
  },
];
const balance = {
  annualAllocation: 21,
  usedAnnual: 2,
  remainingAnnual: 19,
  usedSick: 0,
};
const fixtures = {
  "attendance.listAssignments": [{ id: 999981, empCd: employee.empCd, empName: employee.fullName, shiftId: 1, shiftName: shifts[0].name, effectiveFrom: "2026-07-01", effectiveTo: null, weekdayMask: 127 }],
  "attendance.listUserMappings": [
    { id: 999982, name: "مستخدم تجريبي مرتبط", username: "test-linked", role: "admin", empCd: employee.empCd },
    { id: 999983, name: "مستخدم تجريبي غير مرتبط باسم طويل لاختبار العرض", username: "test-unlinked", role: "worker", empCd: null },
  ],
  "attendance.listHolidays": [{ date: "2026-03-20", label: "عطلة تجريبية باسم طويل لاختبار التفاف النص دون تداخل مع الإجراءات", paid: true }],
  "attendance.listLeaves": [
    { id: 999991, empCd: employee.empCd, empName: employee.fullName, dateFrom: "2026-10-10", dateTo: "2026-10-10", type: "annual", approved: true, note: "ملاحظة اختبار طويلة للتحقق من التفاف النص دون قص داخل القائمة المدمجة" },
    { id: 999992, empCd: employee.empCd, empName: "موظف تجريبي باسم طويل لاختبار عرض سجل الإجازات", dateFrom: "2026-10-11", dateTo: "2026-10-13", type: "annual", approved: false, note: "" },
  ],
  "attendance.listPermissions": [
    { id: 999993, empCd: employee.empCd, empName: employee.fullName, date: "2026-10-10", type: "out", durationMinutes: 30, approved: true, notAffectSalary: true, note: "ملاحظة اختبار طويلة للتحقق من عرض البيانات والإجراءات دون تداخل" },
    { id: 999994, empCd: employee.empCd, empName: "موظف تجريبي باسم طويل لاختبار سجل الأذونات", date: "2026-10-11", type: "in", durationMinutes: 60, approved: false, notAffectSalary: false, note: "" },
  ],
  "attendance.dailyByDate": [
    {
      empCd: employee.empCd,
      empName: employee.fullName,
      workDate: "2026-10-05",
      status: "present",
      firstIn: "2026-10-05T08:00:00",
      lastOut: "2026-10-05T12:00:00",
      lateMins: 0,
      earlyMins: 0,
      workMins: 240,
    },
  ],
  "attendance.employeesList": { employees: [employee] },
  "attendance.listShifts": shifts,
  "attendance.rawPunches": {
    punches: [
      {
        id: 1,
        empCd: employee.empCd,
        timestamp: "2026-10-05T08:00:00",
        direction: "in",
        deviceId: "ef10k",
      },
    ],
    total: 1,
  },
  "attendance.monthlyPunches": {
    employees: [
      {
        empCd: employee.empCd,
        empName: employee.fullName,
        department: employee.department,
        section: "center",
        totalPunches: 2,
        days: {
          "2026-10-05": {
            in: ["2026-10-05T08:00:00"],
            out: ["2026-10-05T12:00:00"],
            other: [],
          },
        },
      },
    ],
  },
  "attendance.rangeReport": [
    {
      empCd: employee.empCd,
      empName: employee.fullName,
      totalDays: 5,
      presentDays: 4,
      absentDays: 1,
      leaveDays: 0,
      holidayDays: 0,
      totalLateMins: 15,
      totalEarlyMins: 0,
      totalOTMins: 60,
    },
  ],
  "attendance.permissionReport": [
    {
      empCd: employee.empCd,
      empName: employee.fullName,
      inCount: 1,
      outCount: 1,
      totalInMins: 15,
      totalOutMins: 30,
    },
  ],
  "attendance.allLeaveBalances": [
    {
      empCd: employee.empCd,
      empName: employee.fullName,
      annualAllocation: 21,
      carryOver: 0,
      total: 21,
      usedDays: 2,
      remainingDays: 19,
    },
  ],
  "salary.getShiftSchedule": { staff: [], attendance: [] },
  "salary.computeShiftPayroll": [],
  "attendance.deviceSettings": {
    ef10k: { enabled: false },
    k40: { enabled: false },
  },
  "attendance.deviceStatus": { connected: false, punchCount: 0 },
  "attendance.admsStatus": { punchCount: 0 },
  "attendance.fkStatus": { punchCount: 0 },
  "attendance.zk40Status": { connected: false },
  "attendance.syncStatus": { runs: [] },
  "attendance.systemHealth": {
    database: "healthy",
    syncRunsLast24h: 0,
    errorsLast24h: 0,
    totalRecordsProcessed: 0,
  },
  "attendance.auditStats": { totalLogsLast24h: 0, leaveActionsLast24h: 0 },
  "attendance.getEntryPermissionRequestsEnabled": { enabled: true },
  "attendance.leaveBalance": balance,
  "attendance.myAttendanceProfile": {
    linked: true,
    empCd: employee.empCd,
    fullName: employee.fullName,
    leaveBalance: balance,
    monthStats: { lateMins: 0, earlyMins: 0, permOutMins: 0 },
    pendingLeaves: [],
    pendingPerms: [],
    pendingShiftChanges: [],
    recentAttendance: [],
    assignments: [],
  },
  "attendance.myShiftRequestOptions": { shifts, cycles: [], colleagues: [] },
};
const hubs = [
  {
    path: "/attendance/employees",
    prefix: "employees",
    tabs: [
      "employees",
      "leaves",
      "permissions",
      "manual-punches",
      "shifts",
      "schedule-swap",
      "mappings",
    ],
  },
  {
    path: "/attendance/reports",
    prefix: "reports",
    tabs: ["daily", "monthly", "perms", "balance", "logs", "fingerprints"],
  },
  {
    path: "/attendance/settings",
    prefix: "settings",
    tabs: ["device", "shifts", "holidays", "settings", "admin"],
  },
];
const browser = await chromium.launch({
  executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE,
});
let cases = 0;
try {
  for (const theme of ["light", "dark"])
    for (const width of process.env.MOBILE_LAYOUT_ONLY ? [360] : [360, 768, 1440]) {
      const context = await browser.newContext({
        viewport: { width, height: 1000 },
      });
      await context.addInitScript(
        (theme) => localStorage.setItem("theme", theme),
        theme,
      );
      const page = await context.newPage();
      const errors = [];
      page.on("pageerror", (error) => errors.push(error.message));
      page.on("console", message => {
        if (message.type() === "error" && /cannot (be a descendant|contain)|Each child in a list/.test(message.text())) errors.push(message.text());
      });
      await page.routeWebSocket("**/ws", (socket) =>
        socket.onMessage(() => {}),
      );
      await page.route("**/api/**", async (route) => {
        assert.equal(
          route.request().method(),
          "GET",
          "Module visual verification must not perform mutations",
        );
        const url = new URL(route.request().url());
        const responses = (
          url.pathname.split("/api/trpc/")[1]?.split(",") ?? []
        ).map((method) => ({
          result: {
            data: {
              json:
                method === "auth.me"
                  ? { id: 999999, role: "admin", name: "اختبار الحضور" }
                  : (fixtures[method] ??
                    (method.includes("getSystemSetting") ? null : [])),
            },
          },
        }));
        await route.fulfill({
          contentType: "application/json",
          body: JSON.stringify(
            url.searchParams.has("batch") ? responses : responses[0],
          ),
        });
      });
      const check = async (name) => {
        await page.waitForTimeout(300);
        const layout = await inspectLayout(page);
        assert.deepEqual(layout.collisions, [], `${name}: overlapping text`);
        assert.deepEqual(layout.fieldCollisions, [], `${name}: text covering fields`);
        assert.deepEqual(layout.clippedButtons, [], `${name}: clipped button labels`);
        assert.deepEqual(errors, [], name);
        assert.equal(
          await page.evaluate(
            () => document.documentElement.scrollWidth > innerWidth + 1,
          ),
          false,
          `${name}: horizontal page overflow`,
        );
        assert.equal(
          await page.locator(".attendance-workspace a button, .attendance-workspace a a").count(),
          0,
          `${name}: nested controls`,
        );
        await page.screenshot({
          path: `${output}/${name}-${theme}-${width}.png`,
          fullPage: true,
        });
        for (const list of await page.locator('.attendance-workspace [role="tablist"]').all()) {
          if (!(await list.isVisible())) continue;
          const listBox = await list.boundingBox();
          for (const tab of await list.getByRole('tab').all()) {
            const tabBox = await tab.boundingBox();
            assert(tabBox.y >= listBox.y - 1 && tabBox.y + tabBox.height <= listBox.y + listBox.height + 1, `${name}: tabs must remain within their strip rather than overlap following content`);
          }
        }
        cases++;
      };
      for (const hub of hubs.filter(hub => !process.env.DESIGN_VERIFY_PATHS || process.env.DESIGN_VERIFY_PATHS.split(',').includes(hub.path))) {
        await page.goto(
          `${process.env.DESIGN_PREVIEW_URL || "http://127.0.0.1:5177"}${hub.path}`,
        );
        for (const tab of hub.tabs) {
          const control = page.locator(`#attendance-${hub.prefix}-tab-${tab}`);
          await control.click();
          await page
            .locator(`#attendance-${hub.prefix}-panel-${tab}`)
            .waitFor();
          assert.equal(await control.getAttribute("aria-selected"), "true");
          await check(`${hub.prefix}-${tab}`);
          if (hub.prefix === "employees" && tab === "employees") {
            const employeeCard = page.locator('.attendance-employee-card').first();
            if (await employeeCard.isVisible()) {
              const box = await employeeCard.boundingBox();
              assert(box.height <= 160, `Employee row must stay compact: ${box.height}px`);
              const toolbar = await page.locator('.attendance-employee-toolbar').boundingBox();
              assert(toolbar.height <= 140, `Employee filters must stay compact: ${toolbar.height}px`);
            }
            const search = page.getByRole("textbox", { name: "بحث بالكود أو الاسم", exact: true });
            await search.fill("no-matching-employee");
            await page.getByText("لا توجد نتائج تطابق البحث في هذا القسم. جرّب اسماً أو كوداً آخر.", { exact: true }).waitFor();
            await check("employees-no-results");
            await search.fill("");
            const filters = page.getByRole("group", { name: "قسم الموظفين", exact: true });
            await filters.getByRole("button").nth(1).click();
            await page.getByText("لا يوجد موظفون في هذا القسم حالياً.", { exact: true }).waitFor();
            await filters.getByRole("button").first().click();
            await page.getByRole("button", { name: "تعديل بيانات الموظف", exact: true }).first().click();
            await page.getByRole("textbox", { name: "اسم الموظف", exact: true }).waitFor();
            await check("employees-edit");
            await page.getByRole("button", { name: "إلغاء التعديل", exact: true }).click();
            await page.getByRole("link", { name: employee.fullName, exact: true }).waitFor();
          }
          if (hub.prefix === "reports" && tab === "daily") {
            await page
              .getByRole("button", { name: "تحميل الفترة", exact: true })
              .click();
            await page
              .getByText(employee.fullName, { exact: true })
              .first()
              .waitFor();
            await check("daily-loaded");
          }
          if (hub.prefix === "reports" && tab === "monthly") {
            for (const key of [
              "monthly",
              "summary",
              "late",
              "absent",
              "ot",
              "permissions",
              "leaves",
            ]) {
              await page.locator(`#attendance-report-tab-${key}`).click();
              await check(`report-detail-${key}`);
            }
          }
          if (hub.prefix === "employees" && tab === "manual-punches") {
            await page.locator("#manual-punches-tab-report").click();
            await check("manual-punches-report");
          }
          if (hub.prefix === "employees" && tab === "shifts") {
            for (const name of ["الدورات", "التبادل", "التعيينات"]) {
              await page.getByRole("button", { name, exact: true }).click();
              await check(`shifts-${name}`);
            }
          }
          if (hub.prefix === "settings" && tab === "admin") {
            for (const name of ["المزامنة", "سجل التدقيق", "سلامة النظام"]) {
              await page.getByRole("tab", { name, exact: true }).click();
              await check(`admin-${name}`);
            }
          }
        }
        const first = page.locator(
          `#attendance-${hub.prefix}-tab-${hub.tabs[0]}`,
        );
        await first.click();
        await first.focus();
        await page.keyboard.press("End");
        assert.equal(
          await page
            .locator(`#attendance-${hub.prefix}-tab-${hub.tabs.at(-1)}`)
            .getAttribute("aria-selected"),
          "true",
        );
      }
      for (const [name, path] of [
        ["home", "/attendance"],
        ["live", "/attendance/live"],
        ["employee-detail", "/attendance/employees/TEST001"],
        ["personal", "/attendance/my"],
        ["console", "/attendance/admin/console"],
        ["sync", "/attendance/admin/sync"],
        ["roster", "/attendance/shift-schedule"],
      ]) {
        if (process.env.DESIGN_VERIFY_PATHS && !process.env.DESIGN_VERIFY_PATHS.split(',').includes(path)) continue;
        await page.goto(
          `${process.env.DESIGN_PREVIEW_URL || "http://127.0.0.1:5177"}${path}`,
        );
        await page.locator(".attendance-workspace").first().waitFor();
        await check(name);
        if (name === "home") {
          for (const button of await page.locator('.attendance-home-actions button').all()) {
            assert.equal(await button.innerText(), '', 'Compact attendance actions must not overflow with visible text');
            assert(await button.evaluate(node => node.scrollWidth <= node.clientWidth + 1));
          }
        }
        if (name === "live") {
          await page
            .getByRole("button", { name: "إيقاف الاستلام", exact: true })
            .click();
          await page
            .getByRole("button", { name: "تشغيل الاستلام", exact: true })
            .waitFor();
        }
      }
      await context.close();
    }
} finally {
  await browser.close();
}
console.log(
  `Passed ${cases} attendance module tab/route/theme/viewport cases.`,
);
