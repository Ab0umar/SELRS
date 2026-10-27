import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
import { chromium } from "@playwright/test";

const base = process.env.DESIGN_PREVIEW_URL || "http://127.0.0.1:5199";
const output = "outputs/employee-history-alignment";
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE });
try {
  for (const theme of ["light", "dark"]) for (const width of [390, 1280, 1920]) {
    const page = await browser.newPage({ viewport: { width, height: 1000 } });
    await page.addInitScript(theme => localStorage.setItem("theme", theme), theme);
    await page.route("**/api/**", async route => {
      assert.equal(route.request().method(), "GET", "No attendance writes");
      const url = new URL(route.request().url());
      const results = (url.pathname.split("/api/trpc/")[1]?.split(",") ?? []).map(method => ({ result: { data: { json:
        method === "auth.me" ? { id: 999999, role: "admin", name: "Test" }
        : method === "attendance.employeesList" ? { employees: [{ empCd: "13", fullName: "موظف اختبار", isActive: true }] }
        : method === "attendance.leaveBalance" ? { annualAllocation: 21, remainingAnnual: 21, usedAnnual: 0 }
        : method === "attendance.dailyByEmployee" ? [
          { workDate: "2026-10-25", shiftId: 1, firstIn: "2026-10-25T12:41:00", lastOut: "2026-10-25T18:49:00", workedMinutes: 368, lateMinutes: 0, earlyLeaveMin: 5, status: "partial" },
          { workDate: "2026-10-26", shiftId: 1, firstIn: null, lastOut: null, workedMinutes: null, lateMinutes: 0, earlyLeaveMin: 0, status: "leave" },
        ] : []
      } } }));
      await route.fulfill({ json: url.searchParams.has("batch") ? results : results[0] });
    });
    await page.goto(`${base}/attendance/employees/13`);
    await page.getByText("سجل الحضور", { exact: true }).waitFor();
    if (width >= 1280) {
      const table = page.getByRole("table", { name: "سجل حضور الموظف", exact: true });
      await table.locator("tbody tr").first().waitFor();
      const columns = await table.evaluate(table => [...table.querySelectorAll("th")].map((head, index) => {
        const cells = [...table.querySelectorAll("tbody tr")].map(row => row.children[index]);
        const rangeCenter = element => {
          const range = document.createRange(); range.selectNodeContents(element);
          const rect = range.getBoundingClientRect(); return rect.x + rect.width / 2;
        };
        return { heading: head.textContent.trim(), align: getComputedStyle(head).textAlign,
          cells: cells.map(cell => ({ align: getComputedStyle(cell).textAlign, delta: Math.abs(rangeCenter(head) - rangeCenter(cell)) })) };
      }));
      for (const column of columns) {
        assert.equal(column.align, "center", column.heading);
        for (const cell of column.cells) {
          assert.equal(cell.align, "center", column.heading);
          assert(cell.delta < 2, `${column.heading}: text centers differ by ${cell.delta}px`);
        }
      }
      await table.scrollIntoViewIfNeeded();
      await table.screenshot({ path: `${output}/${theme}-${width}.png` });
    } else {
      await page.getByText("2026-10-25", { exact: true }).last().waitFor();
      assert.equal(await page.getByRole("table", { name: "سجل حضور الموظف", exact: true }).count(), 0);
    }
    await page.close();
  }
  console.log("Passed 6 light/dark desktop/mobile cases; all seven header and cell text centers align. No data writes.");
} finally { await browser.close(); }
