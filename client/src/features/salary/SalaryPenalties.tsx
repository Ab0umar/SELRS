import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Plus, Trash2, Pencil, Check, X, Printer, ChevronDown, ChevronUp } from "lucide-react";
import { toast } from "sonner";
import { DateInput } from "@/components/ui/date-input";
import AbsentReport from "./AbsentReport";

const now = new Date();
const isoMonthStr = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
const defaultPayrollEnd = new Date(
  now.getFullYear(),
  now.getMonth() - (now.getDate() < 25 ? 1 : 0),
  25,
);
const DEFAULT_FROM = (() => {
  const previousMonth = new Date(defaultPayrollEnd.getFullYear(), defaultPayrollEnd.getMonth() - 1, 26);
  return `${isoMonthStr(previousMonth)}-26`;
})();
const DEFAULT_TO = `${isoMonthStr(defaultPayrollEnd)}-25`;

type Tab = "penalties" | "advances" | "absent" | "lates" | "earlyleave" | "missingcheckout" | "insurance";

const PRINT_CSS = `
  @page { size: A4 landscape; margin: 8mm; }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: "Segoe UI", Tahoma, Arial, sans-serif; font-size: 11px; color: #000; direction: rtl; }
  h1 { text-align: center; font-size: 16px; font-weight: bold; margin-bottom: 8px; }
  table { width: fit-content; min-width: 100%; border-collapse: collapse; margin-top: 6px; table-layout: auto; }
  th { background: #ddd; padding: 5px 8px; border: 1px solid #999; font-size: 10px; text-align: center; white-space: nowrap; }
  td { padding: 5px 8px; border: 1px solid #ccc; font-size: 10px; text-align: center; white-space: nowrap; }
  .emp-col { text-align: right; font-weight: bold; }
  .total-row { background: #eee; font-weight: bold; }
  .zero { color: #aaa; }
`;

export default function SalaryPenalties() {
  const [fromDate, setFromDate] = useState(DEFAULT_FROM);
  const [toDate, setToDate] = useState(DEFAULT_TO);
  const [tab, setTab] = useState<Tab>("penalties");

  // Keep newly added penalties and advances in the same payroll month as the range end.
  const [year, month] = toDate.split("-").map(Number);
  const periodLabel = `${new Date(fromDate + "T00:00:00").toLocaleDateString("ar-EG")} — ${new Date(toDate + "T00:00:00").toLocaleDateString("ar-EG")}`;
  const [showForm, setShowForm] = useState(false);
  const [editPenaltyId, setEditPenaltyId] = useState<number | null>(null);
  const [penaltyMode, setPenaltyMode] = useState<"days" | "amount">("days");
  const [form, setForm] = useState({ empCd: "", amount: "", penaltyDays: "", penaltyDate: "", reason: "" });
  const [editingInsurance, setEditingInsurance] = useState<{
    id: number;
    value: string;
  } | null>(null);
  const [expandedRows, setExpandedRows] = useState<Record<string | number, boolean>>({});
  const toggleRow = (id: string | number) => {
    setExpandedRows((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const empsQ = (trpc as any).salary.listEmployees.useQuery();
  const employees: any[] = empsQ.data ?? [];
  const empName = (empCd: string) =>
    employees.find((e: any) => e.empCd === empCd)?.fullName ?? empCd;
  const empDept = (empCd: string) =>
    employees.find((e: any) => e.empCd === empCd)?.department ?? "—";

  // ── Penalties ──────────────────────────────────────────────────────────────
  const penaltiesQ = (trpc as any).salary.listPenalties.useQuery({
    fromDate,
    toDate,
  });
  const penalties: any[] = penaltiesQ.data ?? [];

  const updatePenaltyMut = (trpc as any).salary.updatePenalty.useMutation({
    onSuccess: () => { penaltiesQ.refetch(); resetForm(); toast.success("تم تعديل الجزاء"); },
    onError: (e: any) => toast.error("خطأ: " + e.message),
  });

  const openEditPenalty = (r: any) => {
    setEditPenaltyId(r.id);
    const hasDays = r.penaltyDays && Number(r.penaltyDays) > 0;
    setPenaltyMode(hasDays ? "days" : "amount");
    setForm({
      empCd: r.empCd,
      amount: hasDays ? "" : String(Number(r.amount)),
      penaltyDays: hasDays ? String(Number(r.penaltyDays)) : "",
      penaltyDate: r.penaltyDate ? String(r.penaltyDate).slice(0, 10) : "",
      reason: r.reason ?? "",
    });
    setShowForm(true);
    setTab("penalties");
  };

  const addPenaltyMut = (trpc as any).salary.addPenalty.useMutation({
    onSuccess: () => {
      penaltiesQ.refetch();
      setShowForm(false);
      setForm({ empCd: "", amount: "", penaltyDays: "", penaltyDate: "", reason: "" });
      toast.success("تم إضافة الجزاء");
    },
    onError: (e: any) => toast.error("خطأ: " + e.message),
  });

  const deletePenaltyMut = (trpc as any).salary.deletePenalty.useMutation({
    onSuccess: () => {
      penaltiesQ.refetch();
      toast.success("تم الحذف");
    },
    onError: (e: any) => toast.error("خطأ: " + e.message),
  });

  // ── Advances ───────────────────────────────────────────────────────────────
  const advancesQ = (trpc as any).salary.listAdvances.useQuery({ fromDate, toDate });
  const advances: any[] = advancesQ.data ?? [];

  const addAdvanceMut = (trpc as any).salary.addAdvance.useMutation({
    onSuccess: () => {
      advancesQ.refetch();
      setShowForm(false);
      setForm({ empCd: "", amount: "", penaltyDays: "", penaltyDate: "", reason: "" });
      toast.success("تم إضافة السلفة");
    },
    onError: (e: any) => toast.error("خطأ: " + e.message),
  });

  const deleteAdvanceMut = (trpc as any).salary.deleteAdvance.useMutation({
    onSuccess: () => {
      advancesQ.refetch();
      toast.success("تم الحذف");
    },
    onError: (e: any) => toast.error("خطأ: " + e.message),
  });

  // ── Accounting Advances Import ─────────────────────────────────────────────
  const [showAccImport, setShowAccImport] = useState(false);
  const accAdvQ = (trpc as any).salary.listAccAdvancesLinked.useQuery(
    { fromDate, toDate },
    { enabled: showAccImport },
  );
  const accAdvRows: any[] = accAdvQ.data ?? [];
  // per-emp: enabled flag + editable amount (keyed by empCd)
  const [importState, setImportState] = useState<Record<string, { enabled: boolean; amount: string }>>({});

  function initImportState(rows: any[]) {
    const state: Record<string, { enabled: boolean; amount: string }> = {};
    for (const r of rows) {
      state[r.empCd] = { enabled: r.net > 0, amount: String(r.net > 0 ? r.net : r.totalAdvance) };
    }
    setImportState(state);
  }

  const [importingId, setImportingId] = useState<string | null>(null);

  async function importSelected() {
    const toImport = accAdvRows.filter((r: any) => importState[r.empCd]?.enabled);
    for (const r of toImport) {
      const amount = parseFloat(importState[r.empCd]?.amount ?? "");
      if (!amount || amount <= 0) continue;
      setImportingId(r.empCd);
      await addAdvanceMut.mutateAsync({
        empCd: r.empCd,
        year,
        month,
        amount,
        reason: `من المحاسبة — ${r.empName}`,
      });
    }
    setImportingId(null);
    setShowAccImport(false);
    setImportState({});
  }

  // ── Late Days ──────────────────────────────────────────────────────────────
  const lateDaysQ = (trpc as any).salary.listLateDays.useQuery({ fromDate, toDate });
  const lateDaysRaw: any[] = lateDaysQ.data ?? [];

  // Group by employee
  const lateByEmp: Record<string, { empCd: string; empName: string; department: string; days: { workDate: string; lateMinutes: number }[] }> = {};
  for (const r of lateDaysRaw) {
    if (!lateByEmp[r.empCd]) {
      lateByEmp[r.empCd] = { empCd: r.empCd, empName: r.empName ?? r.empCd, department: r.department ?? "—", days: [] };
    }
    lateByEmp[r.empCd].days.push({ workDate: r.workDate, lateMinutes: Number(r.lateMinutes) });
  }
  const lateEmpRows = Object.values(lateByEmp).sort((a, b) => a.empName.localeCompare(b.empName, "ar"));

  // ── Missing Checkout Days ─────────────────────────────────────────────────
  const missingCheckoutQ = (trpc as any).salary.listMissingCheckoutDays.useQuery({ fromDate, toDate });
  const mcExclusionsQ = (trpc as any).salary.listMissingCheckoutExclusions.useQuery({ fromDate, toDate });
  const toggleMcExclusionMut = (trpc as any).salary.toggleMissingCheckoutExclusion.useMutation({
    onSuccess: () => { mcExclusionsQ.refetch(); },
    onError: (e: any) => toast.error("خطأ: " + e.message),
  });
  const mcExcludedSet = new Set<string>(
    (mcExclusionsQ.data ?? []).map((r: any) => `${r.empCd}|${r.workDate}`)
  );
  const missingCheckoutRaw: any[] = missingCheckoutQ.data ?? [];

  const missingByEmp: Record<string, { empCd: string; empName: string; department: string; days: string[] }> = {};
  for (const r of missingCheckoutRaw) {
    if (!missingByEmp[r.empCd]) {
      missingByEmp[r.empCd] = { empCd: r.empCd, empName: r.empName ?? r.empCd, department: r.department ?? "—", days: [] };
    }
    missingByEmp[r.empCd].days.push(r.workDate);
  }
  const missingEmpRows = Object.values(missingByEmp).sort((a, b) => a.empName.localeCompare(b.empName, "ar"));

  // ── Early Leave Days ───────────────────────────────────────────────────────
  const earlyLeaveQ = (trpc as any).salary.listEarlyLeaveDays.useQuery({ fromDate, toDate });
  const earlyLeaveRaw: any[] = earlyLeaveQ.data ?? [];

  const earlyByEmp: Record<string, { empCd: string; empName: string; department: string; days: { workDate: string; earlyLeaveMin: number }[] }> = {};
  for (const r of earlyLeaveRaw) {
    if (!earlyByEmp[r.empCd]) {
      earlyByEmp[r.empCd] = { empCd: r.empCd, empName: r.empName ?? r.empCd, department: r.department ?? "—", days: [] };
    }
    earlyByEmp[r.empCd].days.push({ workDate: r.workDate, earlyLeaveMin: Number(r.earlyLeaveMin) });
  }
  const earlyEmpRows = Object.values(earlyByEmp).sort((a, b) => a.empName.localeCompare(b.empName, "ar"));

  // ── Insurance (latest salaryBasics per employee — not month-filtered) ───────
  const basicsQ = (trpc as any).salary.listBasics.useQuery();
  const basics: any[] = basicsQ.data ?? [];
  const latestByEmp: any[] = Object.values(
    basics.reduce((acc: Record<string, any>, b: any) => {
      if (
        !acc[b.empCd] ||
        String(b.effectiveFrom) > String(acc[b.empCd].effectiveFrom)
      )
        acc[b.empCd] = b;
      return acc;
    }, {}),
  );

  const updateBasicMut = (trpc as any).salary.updateBasic.useMutation({
    onSuccess: () => {
      basicsQ.refetch();
      setEditingInsurance(null);
      toast.success("تم التحديث");
    },
    onError: (e: any) => toast.error("خطأ: " + e.message),
  });

  // ── Tab-specific print functions ──────────────────────────────────────────
  function openTabPrint(html: string, title: string) {
    const full = `<!DOCTYPE html><html dir="rtl"><head><meta charset="utf-8"/><title>${title}</title><style>${PRINT_CSS}</style></head><body>${html}</body></html>`;
    const iframe = document.createElement("iframe");
    iframe.style.cssText = "position:fixed;top:0;left:0;width:0;height:0;border:none;visibility:hidden;";
    document.body.appendChild(iframe);
    const doc = iframe.contentDocument!;
    doc.open(); doc.write(full); doc.close();
    const cleanup = () => { iframe.remove(); window.removeEventListener("afterprint", cleanup); };
    window.addEventListener("afterprint", cleanup);
    iframe.contentWindow!.focus();
    iframe.contentWindow!.print();
  }

  function printPenaltiesTab() {
    const fmtN = (n: number) => n === 0 ? `<span class="zero">—</span>` : n.toLocaleString("ar-EG", { minimumFractionDigits: 2 });
    const total = penalties.reduce((s: number, r: any) => s + Number(r.amount), 0);
    const bodyRows = penalties.map((r: any) => `
      <tr>
        <td class="emp-col">${r.fullName ?? empName(r.empCd)}</td>
        <td>${r.department ?? empDept(r.empCd)}</td>
        <td>${r.penaltyDate ? String(r.penaltyDate).slice(0, 10) : "—"}</td>
        <td>${r.penaltyDays ? r.penaltyDays + " يوم" : "—"}</td>
        <td>${r.penaltyDays ? "يُحسب عند الرواتب" : fmtN(Number(r.amount))}</td>
        <td>${r.reason ?? "—"}</td>
      </tr>`).join("");
    const html = `
      <h1>كشف الجزاءات — ${periodLabel}</h1>
      <table>
        <thead><tr>
          <th>الموظف</th><th>القسم</th><th>التاريخ</th><th>أيام</th><th>المبلغ</th><th>السبب</th>
        </tr></thead>
        <tbody>
          ${bodyRows}
          <tr class="total-row"><td colspan="4" class="emp-col">الإجمالي</td><td>${fmtN(total)}</td><td></td></tr>
        </tbody>
      </table>`;
    openTabPrint(html, `جزاءات — ${periodLabel}`);
  }

  function printAdvancesTab() {
    const fmtN = (n: number) => n === 0 ? `<span class="zero">—</span>` : n.toLocaleString("ar-EG", { minimumFractionDigits: 2 });
    const total = advances.reduce((s: number, r: any) => s + Number(r.amount), 0);
    const bodyRows = advances.map((r: any) => `
      <tr>
        <td class="emp-col">${r.fullName ?? empName(r.empCd)}</td>
        <td>${r.department ?? empDept(r.empCd)}</td>
        <td>${fmtN(Number(r.amount))}</td>
        <td>${r.reason ?? "—"}</td>
      </tr>`).join("");
    const html = `
      <h1>كشف السلف — ${periodLabel}</h1>
      <table>
        <thead><tr>
          <th>الموظف</th><th>القسم</th><th>المبلغ</th><th>السبب</th>
        </tr></thead>
        <tbody>
          ${bodyRows}
          <tr class="total-row"><td colspan="2" class="emp-col">الإجمالي</td><td>${fmtN(total)}</td><td></td></tr>
        </tbody>
      </table>`;
    openTabPrint(html, `سلف — ${periodLabel}`);
  }

  function printLatesTab() {
    const bodyRows = lateEmpRows.map((emp) => {
      const totalMins = emp.days.reduce((s, d) => s + d.lateMinutes, 0);
      const hours = Math.floor(totalMins / 60);
      const mins = totalMins % 60;
      const dayRows = emp.days.map((d) => `
        <tr>
          <td class="emp-col">${emp.empName}</td>
          <td>${emp.department}</td>
          <td>${d.workDate}</td>
          <td>${d.lateMinutes}</td>
        </tr>`).join("");
      return dayRows;
    }).join("");
    const totalMinsAll = lateEmpRows.reduce((s, emp) => s + emp.days.reduce((ss, d) => ss + d.lateMinutes, 0), 0);
    const html = `
      <h1>كشف التأخيرات — ${periodLabel}</h1>
      <table>
        <thead><tr>
          <th>الموظف</th><th>القسم</th><th>التاريخ</th><th>مدة التأخير (دقيقة)</th>
        </tr></thead>
        <tbody>
          ${bodyRows}
          <tr class="total-row"><td colspan="3" class="emp-col">الإجمالي</td><td>${totalMinsAll} د</td></tr>
        </tbody>
      </table>`;
    openTabPrint(html, `تأخيرات — ${periodLabel}`);
  }

  function printMissingCheckoutTab() {
    const bodyRows = missingEmpRows.map((emp) =>
      emp.days.map((d) => `
        <tr>
          <td class="emp-col">${emp.empName}</td>
          <td>${emp.department}</td>
          <td>${d}</td>
        </tr>`).join("")
    ).join("");
    const html = `
      <h1>كشف الحضور بدون انصراف (بصمة واحدة) — ${periodLabel}</h1>
      <table>
        <thead><tr>
          <th>الموظف</th><th>القسم</th><th>التاريخ</th>
        </tr></thead>
        <tbody>
          ${bodyRows}
          <tr class="total-row"><td colspan="2" class="emp-col">الإجمالي</td><td>${missingCheckoutRaw.length} يوم</td></tr>
        </tbody>
      </table>`;
    openTabPrint(html, `بصمة واحدة — ${periodLabel}`);
  }

  function printEarlyLeaveTab() {
    const bodyRows = earlyEmpRows.map((emp) => {
      return emp.days.map((d) => `
        <tr>
          <td class="emp-col">${emp.empName}</td>
          <td>${emp.department}</td>
          <td>${d.workDate}</td>
          <td>${d.earlyLeaveMin}</td>
        </tr>`).join("");
    }).join("");
    const totalMinsAll = earlyEmpRows.reduce((s, emp) => s + emp.days.reduce((ss, d) => ss + d.earlyLeaveMin, 0), 0);
    const html = `
      <h1>كشف الخروج المبكر — ${periodLabel}</h1>
      <table>
        <thead><tr>
          <th>الموظف</th><th>القسم</th><th>التاريخ</th><th>مدة الخروج المبكر (دقيقة)</th>
        </tr></thead>
        <tbody>
          ${bodyRows}
          <tr class="total-row"><td colspan="3" class="emp-col">الإجمالي</td><td>${totalMinsAll} د</td></tr>
        </tbody>
      </table>`;
    openTabPrint(html, `خروج مبكر — ${periodLabel}`);
  }

  function printInsuranceTab() {
    const fmtN = (n: number) => n.toLocaleString("ar-EG", { minimumFractionDigits: 2 });
    const total = latestByEmp.reduce((s: number, b: any) => s + Number(b.insuranceDeduction ?? 0), 0);
    const bodyRows = latestByEmp.map((b: any) => `
      <tr>
        <td class="emp-col">${b.fullName ?? b.empCd}</td>
        <td>${b.department ?? "—"}</td>
        <td>${fmtN(Number(b.insuranceDeduction ?? 0))}</td>
      </tr>`).join("");
    const html = `
      <h1>كشف التأمينات الاجتماعية</h1>
      <table>
        <thead><tr>
          <th>الموظف</th><th>القسم</th><th>خصم التأمين</th>
        </tr></thead>
        <tbody>
          ${bodyRows}
          <tr class="total-row"><td colspan="2" class="emp-col">الإجمالي</td><td>${fmtN(total)}</td></tr>
        </tbody>
      </table>`;
    openTabPrint(html, "تأمينات");
  }

  // ── Payroll deductions (for print layout) ─────────────────────────────────
  const deductionsQ = (trpc as any).salary.listPayrollDeductions.useQuery({
    fromDate,
    toDate,
  });
  const payrollDeductions: any[] = deductionsQ.data ?? [];

  // ── Print ──────────────────────────────────────────────────────────────────
  function handlePrint() {
    // Build per-employee map from payroll deductions
    const byEmp: Record<string, any> = {};
    for (const r of payrollDeductions) {
      byEmp[r.empCd] = r;
    }

    // Collect all empCds that appear in any deduction source
    const allEmpCds = Array.from(
      new Set([
        ...payrollDeductions.map((r: any) => r.empCd),
        ...latestByEmp.map((b: any) => b.empCd),
      ]),
    );

    // Build insurance map from salaryBasics
    const insuranceMap: Record<string, number> = {};
    for (const b of latestByEmp) {
      insuranceMap[b.empCd] = Number(b.insuranceDeduction ?? 0);
    }

    const fmt = (n: number) =>
      n === 0
        ? `<span class="zero">—</span>`
        : n.toLocaleString("ar-EG", { minimumFractionDigits: 2 });

    const rows = allEmpCds
      .map((empCd) => {
        const pr = byEmp[empCd];
        const name = pr?.fullName ?? empName(empCd);
        const dept = pr?.department ?? empDept(empCd);
        const jazaat = Number(pr?.penaltyDeduction ?? 0);
        const takhirat =
          Number(pr?.lateDeduction ?? 0) + Number(pr?.earlyLeaveDeduction ?? 0);
        const tameenat = insuranceMap[empCd] ?? 0;
        const ghiyab = Number(pr?.absentDeduction ?? 0);
        const advances = Number(pr?.advancesDeduction ?? 0);
        const total = jazaat + takhirat + tameenat + ghiyab + advances;
        return { name, dept, jazaat, takhirat, tameenat, ghiyab, advances, total };
      })
      .sort((a, b) => a.name.localeCompare(b.name, "ar"));

    const totJazaat = rows.reduce((s, r) => s + r.jazaat, 0);
    const totTakhirat = rows.reduce((s, r) => s + r.takhirat, 0);
    const totTameenat = rows.reduce((s, r) => s + r.tameenat, 0);
    const totGhiyab = rows.reduce((s, r) => s + r.ghiyab, 0);
    const totAdvances = rows.reduce((s, r) => s + r.advances, 0);
    const totAll = rows.reduce((s, r) => s + r.total, 0);

    const bodyRows = rows
      .map(
        (r) => `
      <tr>
        <td class="emp-col">${r.name}</td>
        <td>${r.dept}</td>
        <td>${fmt(r.jazaat)}</td>
        <td>${fmt(r.takhirat)}</td>
        <td>${fmt(r.tameenat)}</td>
        <td>${fmt(r.ghiyab)}</td>
        <td>${fmt(r.advances)}</td>
        <td><strong>${fmt(r.total)}</strong></td>
      </tr>`,
      )
      .join("");

    const html = `<!DOCTYPE html><html dir="rtl"><head><meta charset="utf-8"/>
      <title>كشف الخصومات</title>
      <style>${PRINT_CSS}</style></head><body>
      <h1>كشف الخصومات — ${periodLabel}</h1>
      <table>
        <thead><tr>
          <th style="width:22%">الموظف</th>
          <th style="width:12%">القسم</th>
          <th>جزاءات</th>
          <th>تأخيرات</th>
          <th>تأمينات</th>
          <th>غياب</th>
          <th>سلف</th>
          <th>الإجمالي</th>
        </tr></thead>
        <tbody>
          ${bodyRows}
          <tr class="total-row">
            <td colspan="2">الإجمالي</td>
            <td>${totJazaat.toLocaleString("ar-EG", { minimumFractionDigits: 2 })}</td>
            <td>${totTakhirat.toLocaleString("ar-EG", { minimumFractionDigits: 2 })}</td>
            <td>${totTameenat.toLocaleString("ar-EG", { minimumFractionDigits: 2 })}</td>
            <td>${totGhiyab.toLocaleString("ar-EG", { minimumFractionDigits: 2 })}</td>
            <td>${totAdvances.toLocaleString("ar-EG", { minimumFractionDigits: 2 })}</td>
            <td>${totAll.toLocaleString("ar-EG", { minimumFractionDigits: 2 })}</td>
          </tr>
        </tbody>
      </table>
    </body></html>`;

    const win = window.open("", "_blank", "width=900,height=600");
    if (!win) return;
    win.document.write(html);
    win.document.close();
    win.focus();
    win.print();
  }

  // ── Shared helpers ─────────────────────────────────────────────────────────
  const rows = tab === "penalties" ? penalties : tab === "advances" ? advances : [];
  const total = rows.reduce((s: number, r: any) => s + Number(r.amount), 0);
  const isPending =
    tab === "penalties" ? addPenaltyMut.isPending : tab === "advances" && addAdvanceMut.isPending;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (tab === "penalties") {
      if (penaltyMode === "days") {
        const days = parseFloat(form.penaltyDays);
        if (isNaN(days) || days < 0.25) { toast.error("أدخل عدد أيام صحيح (0.25 كحد أدنى)"); return; }
        const payload = { empCd: form.empCd, year, month, amount: 0, penaltyDays: days, penaltyDate: form.penaltyDate || undefined, reason: form.reason };
        if (editPenaltyId !== null) updatePenaltyMut.mutate({ id: editPenaltyId, ...payload });
        else addPenaltyMut.mutate(payload);
      } else {
        const amount = parseFloat(form.amount);
        if (isNaN(amount) || amount <= 0) { toast.error("أدخل مبلغ صحيح"); return; }
        const payload = { empCd: form.empCd, year, month, amount, penaltyDate: form.penaltyDate || undefined, reason: form.reason };
        if (editPenaltyId !== null) updatePenaltyMut.mutate({ id: editPenaltyId, ...payload });
        else addPenaltyMut.mutate(payload);
      }
    } else {
      const amount = parseFloat(form.amount);
      if (isNaN(amount) || amount <= 0) { toast.error("أدخل مبلغ صحيح"); return; }
      addAdvanceMut.mutate({ empCd: form.empCd, year, month, amount, reason: form.reason });
    }
  };

  const resetForm = () => {
    setShowForm(false);
    setEditPenaltyId(null);
    setForm({ empCd: "", amount: "", penaltyDays: "", penaltyDate: "", reason: "" });
  };

  const tabDefs: { key: Tab; label: string }[] = [
    { key: "penalties", label: "جزاءات" },
    { key: "advances", label: "سلف" },
    { key: "absent", label: "الغياب" },
    { key: "lates", label: "تأخيرات" },
    { key: "earlyleave", label: "خروج مبكر" },
    { key: "missingcheckout", label: "بصمة واحدة" },
    { key: "insurance", label: "تأمينات" },
  ];

  return (
    <div className="space-y-6" dir="rtl">
      {/* Tabs */}
      <div className="flex flex-nowrap items-center justify-between gap-2 overflow-x-auto">
        <div className="flex shrink-0 gap-1 rounded-lg border border-border bg-muted/30 p-1">
          {tabDefs.map(({ key, label }) => (
            <button
              key={key}
              onClick={() => {
                setTab(key);
                resetForm();
                setEditingInsurance(null);
              }}
              className={`rounded-md px-4 py-1.5 text-sm font-medium transition-colors ${
                tab === key
                  ? "bg-background shadow-sm text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
        {(
          <div id="salary-penalties-actions" className="flex shrink-0 flex-nowrap items-center gap-2">
            <DateInput
              value={fromDate}
              onChange={(e) => { setFromDate(e.target.value); resetForm(); }}
              className="w-[132px] shrink-0 rounded-md border border-border bg-background px-3 py-2 text-sm"
            />
            <span className="text-sm text-muted-foreground">—</span>
            <DateInput
              value={toDate}
              onChange={(e) => { setToDate(e.target.value); resetForm(); }}
              className="w-[132px] shrink-0 rounded-md border border-border bg-background px-3 py-2 text-sm"
            />
            {(tab === "penalties" || tab === "advances") && (
              <>
                <Button onClick={() => setShowForm(!showForm)} className="gap-2">
                  <Plus size={16} />
                  {tab === "penalties" ? "إضافة جزاء" : "إضافة سلفة"}
                </Button>
                {tab === "advances" && (
                  <Button variant="outline" onClick={() => {
                    setShowAccImport((v) => {
                      if (!v) { accAdvQ.refetch().then((res: any) => { if (res.data) initImportState(res.data); }); }
                      else { setImportState({}); }
                      return !v;
                    });
                  }} className="gap-2">
                    استيراد من المحاسبة
                  </Button>
                )}
                <Button variant="outline" onClick={handlePrint} className="gap-2">
                  <Printer size={16} /> طباعة
                </Button>
              </>
            )}
            {tab === "lates" && (
              <Button variant="outline" onClick={printLatesTab} className="gap-2">
                <Printer size={16} /> طباعة
              </Button>
            )}
            {tab === "earlyleave" && (
              <Button variant="outline" onClick={printEarlyLeaveTab} className="gap-2">
                <Printer size={16} /> طباعة
              </Button>
            )}
            {tab === "missingcheckout" && (
              <Button variant="outline" onClick={printMissingCheckoutTab} className="gap-2">
                <Printer size={16} /> طباعة
              </Button>
            )}
            {tab === "insurance" && (
              <Button variant="outline" onClick={printInsuranceTab} className="gap-2">
                <Printer size={16} /> طباعة
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Add form — penalties & advances only */}
      {showForm && tab !== "insurance" && tab !== "absent" && tab !== "lates" && tab !== "earlyleave" && tab !== "missingcheckout" && (
        <section className="rounded-xl border border-border bg-background">
          <div className="border-b border-border px-4 py-3">
            <h3 className="text-base font-semibold">
              {tab === "penalties"
                ? editPenaltyId !== null ? "تعديل الجزاء" : "جزاء جديد"
                : "سلفة جديدة"} —{" "}
              {periodLabel}
            </h3>
          </div>
          <form
            onSubmit={handleSubmit}
            className="grid gap-4 px-4 py-4 sm:grid-cols-3"
          >
            <div className="space-y-2">
              <label className="block text-sm font-medium">الموظف</label>
              <select
                value={form.empCd}
                onChange={(e) => setForm({ ...form, empCd: e.target.value })}
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                required
              >
                <option value="">-- اختر موظفاً --</option>
                {employees.map((emp: any) => (
                  <option key={emp.empCd} value={emp.empCd}>
                    {emp.fullName} ({emp.empCd})
                  </option>
                ))}
              </select>
            </div>
            {tab === "penalties" && (
              <div className="space-y-2">
                <label className="block text-sm font-medium">التاريخ</label>
                <DateInput
                  value={form.penaltyDate}
                  onChange={(e) => setForm({ ...form, penaltyDate: e.target.value })}
                  className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                />
              </div>
            )}
            {tab === "penalties" ? (
              <div className="space-y-2">
                <div className="flex items-center gap-3 mb-1">
                  <label className="block text-sm font-medium">الجزاء</label>
                  <div className="flex rounded-md border border-border overflow-hidden text-xs">
                    <button type="button" onClick={() => setPenaltyMode("days")}
                      className={`px-3 py-1 ${penaltyMode === "days" ? "bg-primary text-primary-foreground" : "bg-background text-muted-foreground"}`}>
                      بالأيام
                    </button>
                    <button type="button" onClick={() => setPenaltyMode("amount")}
                      className={`px-3 py-1 ${penaltyMode === "amount" ? "bg-primary text-primary-foreground" : "bg-background text-muted-foreground"}`}>
                      بالمبلغ
                    </button>
                  </div>
                </div>
                {penaltyMode === "days" ? (
                  <input type="number" value={form.penaltyDays} min={0.25} max={30} step={0.25}
                    onChange={(e) => setForm({ ...form, penaltyDays: e.target.value })}
                    placeholder="عدد الأيام (0.25، 0.5، 1، 2...)"
                    className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                    required />
                ) : (
                  <input type="number" value={form.amount} min={0} step="0.01"
                    onChange={(e) => setForm({ ...form, amount: e.target.value })}
                    placeholder="المبلغ"
                    className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                    required />
                )}
              </div>
            ) : (
              <div className="space-y-2">
                <label className="block text-sm font-medium">المبلغ</label>
                <input type="number" value={form.amount} min={0} step="0.01"
                  onChange={(e) => setForm({ ...form, amount: e.target.value })}
                  className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                  required />
              </div>
            )}
            <div className="space-y-2">
              <label className="block text-sm font-medium">السبب</label>
              <input
                type="text"
                value={form.reason}
                placeholder="اختياري"
                onChange={(e) => setForm({ ...form, reason: e.target.value })}
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
              />
            </div>
            <div className="flex gap-2 sm:col-span-3">
              <Button type="submit" disabled={isPending}>
                إضافة
              </Button>
              <Button type="button" variant="outline" onClick={resetForm}>
                إلغاء
              </Button>
            </div>
          </form>
        </section>
      )}

      {/* Penalties / Advances table */}
      {(tab === "penalties" || tab === "advances") && (
        <section className="rounded-xl border border-border bg-background">
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <h3 className="text-base font-semibold">
              {tab === "penalties" ? "الجزاءات" : "السلف"} — {periodLabel}
            </h3>
            <div className="flex items-center gap-3">
              {rows.length > 0 && (
                <span className="text-sm font-bold text-destructive">
                  الإجمالي: {total.toLocaleString("ar-EG")} ج.م
                </span>
              )}
            </div>
          </div>
          <div className="block overflow-x-auto" dir="rtl">
            <table dir="rtl" className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <th className="px-4 py-3 text-right font-medium text-muted-foreground">
                    الموظف
                  </th>
                  <th className="px-4 py-3 text-right font-medium text-muted-foreground">
                    القسم
                  </th>
                  {tab === "penalties" && (
                    <th className="px-4 py-3 text-right font-medium text-muted-foreground">التاريخ</th>
                  )}
                  {tab === "penalties" && (
                    <th className="px-4 py-3 text-right font-medium text-muted-foreground">أيام</th>
                  )}
                  <th className="px-4 py-3 text-right font-medium text-muted-foreground">
                    المبلغ
                  </th>
                  <th className="px-4 py-3 text-right font-medium text-muted-foreground">
                    السبب
                  </th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r: any) => (
                  <tr
                    key={r.id}
                    className="border-b border-border/50 hover:bg-muted/20"
                  >
                    <td className="px-4 py-3 font-medium">
                      {r.fullName ?? empName(r.empCd)}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {r.department ?? empDept(r.empCd)}
                    </td>
                    {tab === "penalties" && (
                      <td className="px-4 py-3 text-sm text-muted-foreground">
                        {r.penaltyDate ? String(r.penaltyDate).slice(0, 10) : "—"}
                      </td>
                    )}
                    {tab === "penalties" && (
                      <td className="px-4 py-3 font-medium text-center">
                        {r.penaltyDays ? `${r.penaltyDays} يوم` : "—"}
                      </td>
                    )}
                    <td className="px-4 py-3 font-bold text-destructive">
                      {r.penaltyDays
                        ? <span className="text-xs text-muted-foreground italic">يُحسب عند الرواتب</span>
                        : `${Number(r.amount).toLocaleString("ar-EG")} ج.م`}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {r.reason ?? "—"}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1">
                        {tab === "penalties" && (
                          <Button variant="ghost" size="sm" onClick={() => openEditPenalty(r)}>
                            <Pencil size={14} className="text-muted-foreground" />
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            if (confirm(`حذف ${tab === "penalties" ? "هذا الجزاء" : "هذه السلفة"}؟`)) {
                              tab === "penalties"
                                ? deletePenaltyMut.mutate({ id: r.id })
                                : deleteAdvanceMut.mutate({ id: r.id });
                            }
                          }}
                        >
                          <Trash2 size={14} className="text-destructive" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
                {rows.length === 0 && (
                  <tr>
                    <td
                      colSpan={5}
                      className="px-4 py-8 text-center text-muted-foreground"
                    >
                      لا توجد {tab === "penalties" ? "جزاءات" : "سلف"} لهذا
                      الشهر
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Mobile Accordion Cards View */}
          <div className="hidden" aria-hidden="true">
            {rows.map((r: any) => {
              const isExpanded = !!expandedRows[r.id];
              return (
                <div
                  key={r.id}
                  className="p-4 bg-card hover:bg-muted/20 transition-colors"
                >
                  <div
                    className="flex items-center justify-between cursor-pointer"
                    onClick={() => toggleRow(r.id)}
                  >
                    <div className="space-y-1">
                      <div className="font-bold text-sm text-foreground">
                        {r.fullName ?? empName(r.empCd)}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        القسم: {r.department ?? empDept(r.empCd)}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="text-left">
                        <div className="text-[10px] font-bold text-muted-foreground uppercase">
                          المبلغ
                        </div>
                        <div className="text-sm font-bold text-destructive tabular-nums">
                          {r.penaltyDays
                            ? `${r.penaltyDays} يوم`
                            : `${Number(r.amount).toLocaleString("ar-EG")} ج.م`}
                        </div>
                      </div>
                      {isExpanded ? (
                        <ChevronUp className="h-4 w-4 text-muted-foreground" />
                      ) : (
                        <ChevronDown className="h-4 w-4 text-muted-foreground" />
                      )}
                    </div>
                  </div>

                  {isExpanded && (
                    <div className="mt-4 pt-4 border-t border-border/40 space-y-3 text-xs">
                      <div className="space-y-2">
                        <div className="flex justify-between border-b border-border/20 pb-1">
                          <span className="text-muted-foreground">السبب:</span>
                          <span className="font-semibold">{r.reason ?? "—"}</span>
                        </div>
                      </div>

                      <div className="flex justify-end gap-2 pt-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            if (
                              confirm(
                                `حذف ${tab === "penalties" ? "هذا الجزاء" : "هذه السلفة"}؟`,
                              )
                            ) {
                              tab === "penalties"
                                ? deletePenaltyMut.mutate({ id: r.id })
                                : deleteAdvanceMut.mutate({ id: r.id });
                            }
                          }}
                          className="h-9 px-3 border-border hover:bg-destructive/10 text-destructive gap-1"
                        >
                          <Trash2 size={14} className="text-destructive" />
                          <span>حذف</span>
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
            {rows.length === 0 && (
              <div className="px-4 py-8 text-center text-muted-foreground text-xs">
                لا توجد {tab === "penalties" ? "جزاءات" : "سلف"} لهذا الشهر
              </div>
            )}
          </div>

          {/* Accounting Advances Import Panel */}
          {tab === "advances" && showAccImport && (
            <div className="border-t border-border px-4 py-4 space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-semibold">استيراد من سلف المحاسبة — {periodLabel}</h4>
                <p className="text-xs text-muted-foreground">فعّل الخصم للسلفات التي تريد تضمينها، وعدّل المبلغ إذا لزم</p>
              </div>
              {accAdvQ.isLoading ? (
                <div className="py-6 text-center text-sm text-muted-foreground">جارٍ التحميل…</div>
              ) : accAdvRows.length === 0 ? (
                <div className="py-6 text-center text-sm text-muted-foreground">لا توجد سلف محاسبة مرتبطة بموظفين في هذه الفترة</div>
              ) : (
                <>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm border border-border/40 rounded-lg overflow-hidden">
                      <thead>
                        <tr className="bg-muted/30 text-xs">
                          <th className="px-3 py-2 text-right font-medium text-muted-foreground">الموظف</th>
                          <th className="px-3 py-2 text-center font-medium text-muted-foreground">إجمالي السلف</th>
                          <th className="px-3 py-2 text-center font-medium text-muted-foreground">إجمالي السداد</th>
                          <th className="px-3 py-2 text-center font-medium text-muted-foreground">المتبقي</th>
                          <th className="px-3 py-2 text-center font-medium text-muted-foreground">مبلغ الخصم</th>
                          <th className="px-3 py-2 text-center font-medium text-muted-foreground">الخصم</th>
                        </tr>
                      </thead>
                      <tbody>
                        {accAdvRows.map((r: any) => {
                          const st = importState[r.empCd] ?? { enabled: false, amount: String(r.net) };
                          return (
                            <tr key={r.empCd} className={`border-t border-border/30 ${st.enabled ? "" : "opacity-50"}`}>
                              <td className="px-3 py-2 font-medium">{r.empName}</td>
                              <td className="px-3 py-2 text-center text-warning">{Number(r.totalAdvance).toLocaleString("ar-EG")} ج.م</td>
                              <td className="px-3 py-2 text-center text-success">{Number(r.totalRepaid).toLocaleString("ar-EG")} ج.م</td>
                              <td className="px-3 py-2 text-center font-bold text-destructive">{Number(r.net).toLocaleString("ar-EG")} ج.م</td>
                              <td className="px-3 py-2 text-center">
                                <input
                                  type="number"
                                  min={0}
                                  step="0.01"
                                  value={st.amount}
                                  disabled={!st.enabled}
                                  onChange={(e) => setImportState((prev) => ({ ...prev, [r.empCd]: { ...st, amount: e.target.value } }))}
                                  className="w-24 rounded border border-border bg-background px-2 py-0.5 text-sm outline-none focus:border-primary disabled:opacity-40"
                                />
                              </td>
                              <td className="px-3 py-2 text-center">
                                <button
                                  type="button"
                                  onClick={() => setImportState((prev) => ({ ...prev, [r.empCd]: { ...st, enabled: !st.enabled } }))}
                                  className={`text-[11px] font-bold px-2 py-0.5 rounded border transition-colors ${st.enabled ? "border-destructive text-destructive hover:bg-destructive/10" : "border-green-500 text-green-600 hover:bg-green-50"}`}
                                >
                                  {st.enabled ? "إلغاء الخصم" : "تفعيل الخصم"}
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                  <div className="flex gap-2 justify-end">
                    <Button
                      size="sm"
                      disabled={addAdvanceMut.isPending || !Object.values(importState).some((s) => s.enabled)}
                      onClick={importSelected}
                    >
                      {addAdvanceMut.isPending && importingId !== null ? "جارٍ الاستيراد…" : "استيراد المحدد"}
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => { setShowAccImport(false); setImportState({}); }}>
                      إغلاق
                    </Button>
                  </div>
                </>
              )}
            </div>
          )}
        </section>
      )}

      {tab === "absent" && (
        <section className="rounded-xl border border-border bg-background p-4">
          <AbsentReport
            sharedFromDate={fromDate}
            sharedToDate={toDate}
            onFromDateChange={(value) => { setFromDate(value); resetForm(); }}
            onToDateChange={(value) => { setToDate(value); resetForm(); }}
          />
        </section>
      )}

      {/* Late Days tab */}
      {tab === "lates" && (
        <section className="rounded-xl border border-border bg-background">
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <div>
              <h3 className="text-base font-semibold">التأخيرات — {periodLabel}</h3>
              <p className="text-xs text-muted-foreground mt-0.5">أيام التأخير لكل موظف مع مدة التأخير يومياً</p>
            </div>
          </div>

          {lateEmpRows.length === 0 ? (
            <div className="px-4 py-8 text-center text-muted-foreground text-sm">
              لا توجد تأخيرات هذا الشهر
            </div>
          ) : (
            <div className="divide-y divide-border/60">
              {lateEmpRows.map((emp) => {
                const totalDays = emp.days.length;
                const totalMins = emp.days.reduce((s, d) => s + d.lateMinutes, 0);
                const hours = Math.floor(totalMins / 60);
                const mins = totalMins % 60;
                const isExpanded = !!expandedRows[emp.empCd];
                return (
                  <div key={emp.empCd} className="bg-card">
                    <div
                      className="flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-muted/20"
                      onClick={() => toggleRow(emp.empCd)}
                    >
                      <div>
                        <div className="font-semibold text-sm">{emp.empName}</div>
                        <div className="text-xs text-muted-foreground">{emp.department}</div>
                      </div>
                      <div className="flex items-center gap-6">
                        <div className="text-center">
                          <div className="text-[10px] text-muted-foreground">عدد الأيام</div>
                          <div className="font-bold text-destructive text-sm">{totalDays}</div>
                        </div>
                        <div className="text-center">
                          <div className="text-[10px] text-muted-foreground">إجمالي التأخير</div>
                          <div className="font-bold text-destructive text-sm">
                            {hours > 0 ? `${hours}س ` : ""}{mins}د
                          </div>
                        </div>
                        {isExpanded ? (
                          <ChevronUp className="h-4 w-4 text-muted-foreground" />
                        ) : (
                          <ChevronDown className="h-4 w-4 text-muted-foreground" />
                        )}
                      </div>
                    </div>
                    {isExpanded && (
                      <div className="px-4 pb-4">
                        <table className="w-full text-sm border border-border/40 rounded-lg overflow-hidden">
                          <thead>
                            <tr className="bg-muted/30 text-xs">
                              <th className="px-3 py-2 text-right text-muted-foreground font-medium">التاريخ</th>
                              <th className="px-3 py-2 text-center text-muted-foreground font-medium">مدة التأخير (دقيقة)</th>
                            </tr>
                          </thead>
                          <tbody>
                            {emp.days.map((d) => (
                              <tr key={d.workDate} className="border-t border-border/30 hover:bg-muted/10">
                                <td className="px-3 py-2 font-medium">{d.workDate}</td>
                                <td className="px-3 py-2 text-center text-destructive font-bold">{d.lateMinutes}</td>
                              </tr>
                            ))}
                            <tr className="border-t border-border bg-muted/30 font-bold text-xs">
                              <td className="px-3 py-2">الإجمالي: {totalDays} يوم</td>
                              <td className="px-3 py-2 text-center text-destructive">
                                {totalMins} د ({hours > 0 ? `${hours}س ` : ""}{mins}د)
                              </td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </section>
      )}

      {/* Early Leave tab */}
      {tab === "earlyleave" && (
        <section className="rounded-xl border border-border bg-background">
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <div>
              <h3 className="text-base font-semibold">الخروج المبكر — {periodLabel}</h3>
              <p className="text-xs text-muted-foreground mt-0.5">أيام الخروج المبكر لكل موظف مع مدة الخروج يومياً</p>
            </div>
          </div>

          {earlyEmpRows.length === 0 ? (
            <div className="px-4 py-8 text-center text-muted-foreground text-sm">
              لا يوجد خروج مبكر هذا الشهر
            </div>
          ) : (
            <div className="divide-y divide-border/60">
              {earlyEmpRows.map((emp) => {
                const totalDays = emp.days.length;
                const totalMins = emp.days.reduce((s, d) => s + d.earlyLeaveMin, 0);
                const hours = Math.floor(totalMins / 60);
                const mins = totalMins % 60;
                const isExpanded = !!expandedRows["el_" + emp.empCd];
                return (
                  <div key={emp.empCd} className="bg-card">
                    <div
                      className="flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-muted/20"
                      onClick={() => toggleRow("el_" + emp.empCd)}
                    >
                      <div>
                        <div className="font-semibold text-sm">{emp.empName}</div>
                        <div className="text-xs text-muted-foreground">{emp.department}</div>
                      </div>
                      <div className="flex items-center gap-6">
                        <div className="text-center">
                          <div className="text-[10px] text-muted-foreground">عدد الأيام</div>
                          <div className="font-bold text-destructive text-sm">{totalDays}</div>
                        </div>
                        <div className="text-center">
                          <div className="text-[10px] text-muted-foreground">إجمالي الخروج المبكر</div>
                          <div className="font-bold text-destructive text-sm">
                            {hours > 0 ? `${hours}س ` : ""}{mins}د
                          </div>
                        </div>
                        {isExpanded ? (
                          <ChevronUp className="h-4 w-4 text-muted-foreground" />
                        ) : (
                          <ChevronDown className="h-4 w-4 text-muted-foreground" />
                        )}
                      </div>
                    </div>
                    {isExpanded && (
                      <div className="px-4 pb-4">
                        <table className="w-full text-sm border border-border/40 rounded-lg overflow-hidden">
                          <thead>
                            <tr className="bg-muted/30 text-xs">
                              <th className="px-3 py-2 text-right text-muted-foreground font-medium">التاريخ</th>
                              <th className="px-3 py-2 text-center text-muted-foreground font-medium">مدة الخروج المبكر (دقيقة)</th>
                            </tr>
                          </thead>
                          <tbody>
                            {emp.days.map((d) => (
                              <tr key={d.workDate} className="border-t border-border/30 hover:bg-muted/10">
                                <td className="px-3 py-2 font-medium">{d.workDate}</td>
                                <td className="px-3 py-2 text-center text-destructive font-bold">{d.earlyLeaveMin}</td>
                              </tr>
                            ))}
                            <tr className="border-t border-border bg-muted/30 font-bold text-xs">
                              <td className="px-3 py-2">الإجمالي: {totalDays} يوم</td>
                              <td className="px-3 py-2 text-center text-destructive">
                                {totalMins} د ({hours > 0 ? `${hours}س ` : ""}{mins}د)
                              </td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </section>
      )}

      {/* Missing Checkout (one punch) tab */}
      {tab === "missingcheckout" && (
        <section className="rounded-xl border border-border bg-background">
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <div>
              <h3 className="text-base font-semibold">بصمة واحدة (بدون انصراف) — {periodLabel}</h3>
              <p className="text-xs text-muted-foreground mt-0.5">أيام الحضور التي لا يوجد فيها بصمة انصراف — خصم ¼ يوم لكل يوم</p>
            </div>
          </div>

          {missingEmpRows.length === 0 ? (
            <div className="px-4 py-8 text-center text-muted-foreground text-sm">
              لا توجد أيام بصمة واحدة هذا الشهر
            </div>
          ) : (
            <div className="divide-y divide-border/60">
              {missingEmpRows.map((emp) => {
                const isExpanded = !!expandedRows["mc_" + emp.empCd];
                return (
                  <div key={emp.empCd} className="bg-card">
                    <div
                      className="flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-muted/20"
                      onClick={() => toggleRow("mc_" + emp.empCd)}
                    >
                      <div>
                        <div className="font-semibold text-sm">{emp.empName}</div>
                        <div className="text-xs text-muted-foreground">{emp.department}</div>
                      </div>
                      <div className="flex items-center gap-6">
                        {(() => {
                          const activeDays = emp.days.filter((d) => !mcExcludedSet.has(`${emp.empCd}|${d}`)).length;
                          return (
                            <div className="text-center">
                              <div className="text-[10px] text-muted-foreground">عدد الأيام</div>
                              <div className="font-bold text-destructive text-sm">
                                {activeDays}
                                {activeDays !== emp.days.length && <span className="text-muted-foreground text-[10px] font-normal">/{emp.days.length}</span>}
                              </div>
                            </div>
                          );
                        })()}
                        {isExpanded ? (
                          <ChevronUp className="h-4 w-4 text-muted-foreground" />
                        ) : (
                          <ChevronDown className="h-4 w-4 text-muted-foreground" />
                        )}
                      </div>
                    </div>
                    {isExpanded && (
                      <div className="px-4 pb-4">
                        <table className="w-full text-sm border border-border/40 rounded-lg overflow-hidden">
                          <thead>
                            <tr className="bg-muted/30 text-xs">
                              <th className="px-3 py-2 text-right text-muted-foreground font-medium">التاريخ</th>
                              <th className="px-3 py-2 text-center text-muted-foreground font-medium w-28">الحالة</th>
                            </tr>
                          </thead>
                          <tbody>
                            {emp.days.map((d) => {
                              const key = `${emp.empCd}|${d}`;
                              const excluded = mcExcludedSet.has(key);
                              return (
                                <tr key={d} className={`border-t border-border/30 ${excluded ? "opacity-50" : "hover:bg-muted/10"}`}>
                                  <td className={`px-3 py-2 font-medium ${excluded ? "line-through text-muted-foreground" : ""}`}>{d}</td>
                                  <td className="px-3 py-2 text-center">
                                    <button
                                      type="button"
                                      disabled={toggleMcExclusionMut.isPending}
                                      onClick={() => toggleMcExclusionMut.mutate({ empCd: emp.empCd, workDate: d, exclude: !excluded })}
                                      className={`text-[10px] font-bold px-2 py-0.5 rounded border transition-colors ${excluded ? "border-green-500 text-green-600 hover:bg-green-50" : "border-destructive text-destructive hover:bg-destructive/10"}`}
                                    >
                                      {excluded ? "تفعيل" : "استثناء"}
                                    </button>
                                  </td>
                                </tr>
                              );
                            })}
                            {(() => {
                              const activeDays = emp.days.filter((d) => !mcExcludedSet.has(`${emp.empCd}|${d}`)).length;
                              return (
                                <tr className="border-t border-border bg-muted/30 font-bold text-xs">
                                  <td className="px-3 py-2">
                                    الإجمالي: {emp.days.length} يوم
                                    {emp.days.length !== activeDays && <span className="text-muted-foreground font-normal"> ({activeDays} مفعّل)</span>}
                                    {" "}— خصم {(activeDays * 0.25).toLocaleString("ar-EG")} يوم
                                  </td>
                                  <td />
                                </tr>
                              );
                            })()}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </section>
      )}

      {/* Insurance tab — fixed per-employee, no month filter */}
      {tab === "insurance" && (
        <section className="rounded-xl border border-border bg-background">
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <div />
          </div>
          <div className="hidden lg:block overflow-x-auto" dir="rtl">
            <table dir="rtl" className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <th className="px-4 py-3 text-right font-medium text-muted-foreground">
                    الموظف
                  </th>
                  <th className="px-4 py-3 text-right font-medium text-muted-foreground">
                    القسم
                  </th>
                  <th className="px-4 py-3 text-right font-medium text-muted-foreground">
                    خصم التأمين
                  </th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {latestByEmp.map((b: any) => {
                  const editing =
                    editingInsurance?.id === b.id ? editingInsurance : null;
                  return (
                    <tr
                      key={b.id}
                      className="border-b border-border/50 hover:bg-muted/20"
                    >
                      <td className="px-4 py-3 font-medium">
                        {b.fullName ?? b.empCd}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {b.department ?? "—"}
                      </td>
                      <td className="px-4 py-3">
                        {editing ? (
                          <input
                            type="number"
                            min={0}
                            step="0.01"
                            value={editing.value}
                            onChange={(e) =>
                              setEditingInsurance({
                                id: b.id,
                                value: e.target.value,
                              })
                            }
                            className="w-28 rounded-md border border-primary bg-background px-2 py-1 text-sm outline-none"
                            autoFocus
                          />
                        ) : (
                          <span
                            className={
                              Number(b.insuranceDeduction) > 0
                                ? "font-bold text-destructive"
                                : "text-muted-foreground"
                            }
                          >
                            {Number(b.insuranceDeduction ?? 0).toLocaleString(
                              "ar-EG",
                            )}{" "}
                            ج.م
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {editing ? (
                          <div className="flex gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              disabled={updateBasicMut.isPending}
                              onClick={() => {
                                const v = parseFloat(editing.value);
                                if (isNaN(v) || v < 0) {
                                  toast.error("أدخل مبلغ صحيح");
                                  return;
                                }
                                updateBasicMut.mutate({
                                  id: b.id,
                                  insuranceDeduction: v,
                                });
                              }}
                            >
                              <Check size={14} className="text-success" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setEditingInsurance(null)}
                            >
                              <X size={14} />
                            </Button>
                          </div>
                        ) : (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() =>
                              setEditingInsurance({
                                id: b.id,
                                value: String(b.insuranceDeduction ?? 0),
                              })
                            }
                          >
                            <Pencil size={14} />
                          </Button>
                        )}
                      </td>
                    </tr>
                  );
                })}
                {latestByEmp.length === 0 && (
                  <tr>
                    <td
                      colSpan={4}
                      className="px-4 py-8 text-center text-muted-foreground"
                    >
                      لا يوجد موظفون بإعدادات راتب
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Mobile Accordion Cards View */}
          <div className="block lg:hidden divide-y divide-border/60">
            {latestByEmp.map((b: any) => {
              const isExpanded = !!expandedRows[b.id];
              const editing = editingInsurance?.id === b.id ? editingInsurance : null;
              return (
                <div
                  key={b.id}
                  className="p-4 bg-card hover:bg-muted/20 transition-colors"
                >
                  <div
                    className="flex items-center justify-between cursor-pointer"
                    onClick={() => toggleRow(b.id)}
                  >
                    <div className="space-y-1">
                      <div className="font-bold text-sm text-foreground">
                        {b.fullName ?? b.empCd}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        القسم: {b.department ?? "—"}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="text-left">
                        <div className="text-[10px] font-bold text-muted-foreground uppercase">
                          خصم التأمين
                        </div>
                        <div className="text-sm font-semibold text-foreground tabular-nums">
                          {editing ? (
                            <input
                              type="number"
                              min={0}
                              step="0.01"
                              value={editing.value}
                              onClick={(e) => e.stopPropagation()}
                              onChange={(e) =>
                                setEditingInsurance({
                                  id: b.id,
                                  value: e.target.value,
                                })
                              }
                              className="w-20 rounded-md border border-primary bg-background px-2 py-0.5 text-xs outline-none"
                              autoFocus
                            />
                          ) : (
                            <span
                              className={
                                Number(b.insuranceDeduction) > 0
                                  ? "font-bold text-destructive"
                                  : "text-muted-foreground"
                              }
                            >
                              {Number(b.insuranceDeduction ?? 0).toLocaleString("ar-EG")} ج.م
                            </span>
                          )}
                        </div>
                      </div>
                      {isExpanded ? (
                        <ChevronUp className="h-4 w-4 text-muted-foreground" />
                      ) : (
                        <ChevronDown className="h-4 w-4 text-muted-foreground" />
                      )}
                    </div>
                  </div>

                  {isExpanded && (
                    <div className="mt-4 pt-4 border-t border-border/40 space-y-3 text-xs">
                      <div className="flex justify-end gap-2 pt-2">
                        {editing ? (
                          <div className="flex gap-1">
                            <Button
                              variant="outline"
                              size="sm"
                              disabled={updateBasicMut.isPending}
                              onClick={() => {
                                const v = parseFloat(editing.value);
                                if (isNaN(v) || v < 0) {
                                  toast.error("أدخل مبلغ صحيح");
                                  return;
                                }
                                updateBasicMut.mutate({
                                  id: b.id,
                                  insuranceDeduction: v,
                                });
                              }}
                              className="h-9 px-3 border-border text-success gap-1"
                            >
                              <Check size={14} />
                              <span>حفظ</span>
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setEditingInsurance(null)}
                              className="h-9 px-3 border-border gap-1"
                            >
                              <X size={14} />
                              <span>إلغاء</span>
                            </Button>
                          </div>
                        ) : (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() =>
                              setEditingInsurance({
                                id: b.id,
                                value: String(b.insuranceDeduction ?? 0),
                              })
                            }
                            className="h-9 px-3 border-border hover:bg-primary/10 text-primary gap-1"
                          >
                            <Pencil size={14} />
                            <span>تعديل الخصم</span>
                          </Button>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
            {latestByEmp.length === 0 && (
              <div className="px-4 py-8 text-center text-muted-foreground text-xs">
                لا يوجد موظفون بإعدادات راتب
              </div>
            )}
          </div>
        </section>
      )}
    </div>
  );
}
