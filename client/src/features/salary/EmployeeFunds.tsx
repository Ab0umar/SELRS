import { useMemo, useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  CalendarDays,
  Gift,
  Plus,
  Printer,
  Search,
  Trash2,
  WalletCards,
} from "lucide-react";
import { toast } from "sonner";

const money = (value: number) =>
  new Intl.NumberFormat("ar-EG", {
    style: "currency",
    currency: "EGP",
    maximumFractionDigits: 2,
  }).format(value || 0);

type FundEmployee = {
  empCd: string;
  fullName: string;
  department: string | null;
};

type PrintKind = "operations" | "eid" | null;

type FundEntry = {
  id: number;
  transactionDate: string | Date;
  amount: string | number;
  doctorName: string;
};

type EidBonus = {
  id: number;
  title: string;
  bonusDate: string | Date;
  amountPerEmployee: string | number;
  employeeCount: number;
};

type DoctorOption = {
  id: number;
  name: string;
  isActive: boolean;
};

export default function EmployeeFunds() {
  const now = new Date();
  const cycleEnd = new Date(
    now.getFullYear(),
    now.getMonth() + (now.getDate() >= 21 ? 1 : 0),
    20,
  );
  const cycleStart = new Date(cycleEnd.getFullYear(), cycleEnd.getMonth() - 1, 21);
  const fromDate = `${cycleStart.getFullYear()}-${String(cycleStart.getMonth() + 1).padStart(2, "0")}-21`;
  const toDate = `${cycleEnd.getFullYear()}-${String(cycleEnd.getMonth() + 1).padStart(2, "0")}-20`;
  const [activeFundTab, setActiveFundTab] = useState<"operations" | "eid">(
    "operations",
  );
  const [employeeSearch, setEmployeeSearch] = useState("");
  const [entry, setEntry] = useState({
    transactionDate: now.toISOString().slice(0, 10),
    amount: "",
    doctorName: "",
    notes: "",
  });
  const [eid, setEid] = useState({
    title: "عيدية",
    bonusDate: now.toISOString().slice(0, 10),
    amountPerEmployee: "",
    notes: "",
  });
  const [printKind, setPrintKind] = useState<PrintKind>(null);
  const utils = trpc.useUtils();
  const query = trpc.salary.getEmployeeFunds.useQuery({ fromDate, toDate });
  const doctorsQuery = trpc.medical.getDoctorDirectory.useQuery(undefined, {
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });
  const doctors = ((doctorsQuery.data ?? []) as DoctorOption[]).filter(
    (doctor) => doctor.isActive,
  );
  const data = query.data;
  const employees = (data?.employees ?? []) as FundEmployee[];
  const fundEligibleEmployees = (data?.fundEligibleEmployees ??
    employees) as FundEmployee[];
  const fundMembers = (data?.fundMembers ?? []) as FundEmployee[];
  const entries = (data?.entries ?? []) as FundEntry[];
  const eidBonuses = (data?.eidBonuses ?? []) as EidBonus[];
  const memberCodes = new Set(
    fundMembers.map((employee) => employee.empCd),
  );

  const refresh = async () =>
    utils.salary.getEmployeeFunds.invalidate({ fromDate, toDate });
  const setMembers = trpc.salary.setOperationFundMembers.useMutation({
    onSuccess: async () => {
      await refresh();
      toast.success("تم تحديث موظفي الصندوق");
    },
    onError: (error) => toast.error(error.message),
  });
  const addEntry = trpc.salary.addOperationFundEntry.useMutation({
    onSuccess: async () => {
      setEntry((current) => ({
        ...current,
        amount: "",
        doctorName: "",
        notes: "",
      }));
      await refresh();
      toast.success("تمت إضافة إيراد العملية");
    },
    onError: (error) => toast.error(error.message),
  });
  const deleteEntry = trpc.salary.deleteOperationFundEntry.useMutation({
    onSuccess: refresh,
  });
  const settleFund = trpc.salary.settleOperationFund.useMutation({
    onSuccess: async () => {
      await refresh();
      toast.success("تم تصفير صندوق العمليات وبدء دورة جديدة");
    },
    onError: (error) => toast.error(error.message),
  });
  const addEid = trpc.salary.addEidBonus.useMutation({
    onSuccess: async () => {
      setEid((current) => ({ ...current, amountPerEmployee: "", notes: "" }));
      await refresh();
      toast.success("تم حفظ العيدية لكل الموظفين");
    },
    onError: (error) => toast.error(error.message),
  });
  const deleteEid = trpc.salary.deleteEidBonus.useMutation({
    onSuccess: refresh,
  });

  const visibleEmployees = useMemo(() => {
    const needle = employeeSearch.trim().toLowerCase();
    if (!needle) return fundEligibleEmployees;
    return fundEligibleEmployees.filter((employee) =>
      `${employee.fullName} ${employee.empCd} ${employee.department ?? ""}`
        .toLowerCase()
        .includes(needle),
    );
  }, [fundEligibleEmployees, employeeSearch]);

  const toggleMember = (empCd: string) => {
    const next = new Set(memberCodes);
    if (next.has(empCd)) next.delete(empCd);
    else next.add(empCd);
    setMembers.mutate({ empCds: Array.from(next) });
  };

  const activeEmployeesCount = employees.length;
  const eidAmount = Number(eid.amountPerEmployee || 0);

  const printSection = (kind: PrintKind) => {
    setPrintKind(kind);
    window.setTimeout(() => {
      window.print();
      setPrintKind(null);
    }, 50);
  };

  return (
    <div className="salary-funds-page space-y-5" dir="rtl">
      <Tabs
        value={activeFundTab}
        onValueChange={(value) =>
          setActiveFundTab(value as "operations" | "eid")
        }
      >
        <div
          dir="rtl"
          className="flex flex-row-reverse items-center justify-between gap-3 overflow-x-auto border-b border-border pb-4"
        >
          {activeFundTab === "operations" && (
            <div className="flex gap-2">
              <Button
                type="button"
                variant="destructive"
                size="sm"
                onClick={() => {
                  if (
                    !window.confirm(
                      `تأكيد صرف صندوق الفترة من ${fromDate} إلى ${toDate}؟ سيتم تصفير حركات هذه الفترة.`,
                    )
                  )
                    return;
                  settleFund.mutate({ fromDate, toDate });
                }}
                disabled={settleFund.isPending || !entries.length}
              >
                <WalletCards className="ml-2 size-4" />
                {settleFund.isPending
                  ? "جاري التصفير..."
                  : "تم الصرف وابدأ جديد"}
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => printSection("operations")}
                disabled={!fundMembers.length}
              >
                <Printer className="ml-2 size-4" />
                طباعة صندوق العمليات
              </Button>
            </div>
          )}
          <div className="flex shrink-0 items-center gap-2 text-sm font-semibold text-muted-foreground" dir="rtl">
            <span>من {fromDate}</span>
            <span>إلى {toDate}</span>
          </div>
          <TabsList dir="rtl" className="flex w-80 shrink-0">
            <TabsTrigger value="operations" className="flex-1">
              <WalletCards className="ml-2 size-4" />
              صندوق العمليات
            </TabsTrigger>
            <TabsTrigger value="eid" className="flex-1">
              <Gift className="ml-2 size-4" />
              العيدية
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="operations" className="mt-4 space-y-4" dir="rtl">
          <div className="grid overflow-hidden rounded-lg border border-border sm:grid-cols-3">
            <div className="p-4">
              <p className="text-xs text-muted-foreground">إجمالي الإيرادات</p>
              <p className="mt-1 text-lg font-black">
                {money(data?.totalRevenue ?? 0)}
              </p>
            </div>
            <div className="border-y border-border p-4 sm:border-y-0 sm:border-x">
              <p className="text-xs text-muted-foreground">
                الموظفون المستفيدون
              </p>
              <p className="mt-1 text-lg font-black">
                {data?.fundMembers.length ?? 0}
              </p>
            </div>
            <div className="p-4">
              <p className="text-xs text-muted-foreground">
                نصيب الموظف يوم 20
              </p>
              <p className="mt-1 text-lg font-black text-primary">
                {money(data?.sharePerMember ?? 0)}
              </p>
            </div>
          </div>

          <div
            dir="rtl"
            className="grid overflow-hidden rounded-lg border border-border lg:grid-cols-[320px_minmax(0,1fr)]"
          >
            <aside className="border-b border-border bg-muted/15 lg:border-b-0 lg:border-l">
              <div className="border-b border-border p-3">
                <h2 className="text-sm font-black">موظفو الصندوق</h2>
                <label className="relative mt-3 block">
                  <Search className="absolute right-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    value={employeeSearch}
                    onChange={(event) => setEmployeeSearch(event.target.value)}
                    placeholder="بحث عن موظف"
                    className="pr-9"
                  />
                </label>
              </div>
              <div className="max-h-[520px] overflow-y-auto p-2">
                {visibleEmployees.map((employee) => (
                  <label
                    key={employee.empCd}
                    className="flex cursor-pointer items-center gap-3 rounded-md px-3 py-2.5 hover:bg-background"
                  >
                    <Checkbox
                      checked={memberCodes.has(employee.empCd)}
                      onCheckedChange={() => toggleMember(employee.empCd)}
                      disabled={setMembers.isPending}
                    />
                    <span className="min-w-0">
                      <span className="block truncate text-xs font-black">
                        {employee.fullName}
                      </span>
                      <span className="text-[10px] text-muted-foreground">
                        {employee.department || employee.empCd}
                      </span>
                    </span>
                  </label>
                ))}
              </div>
            </aside>
            <section className="min-w-0">
              <div className="border-b border-border p-4">
                <h2 className="text-sm font-black">إضافة إيراد عملية</h2>
                <div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                  <Input
                    type="date"
                    value={entry.transactionDate}
                    onChange={(event) =>
                      setEntry({
                        ...entry,
                        transactionDate: event.target.value,
                      })
                    }
                  />
                  <Input
                    type="number"
                    min={0}
                    step={0.01}
                    value={entry.amount}
                    onChange={(event) =>
                      setEntry({ ...entry, amount: event.target.value })
                    }
                    placeholder="المبلغ"
                  />
                  <>
                    <Input
                      list="operation-fund-doctors"
                      value={entry.doctorName}
                      onChange={(event) =>
                        setEntry({ ...entry, doctorName: event.target.value })
                      }
                      placeholder="ابحث باسم الدكتور"
                    />
                    <datalist id="operation-fund-doctors">
                      {doctors.map((doctor) => (
                        <option key={doctor.id} value={doctor.name} />
                      ))}
                    </datalist>
                  </>
                  <Button
                    onClick={() =>
                      addEntry.mutate({
                        transactionDate: entry.transactionDate,
                        amount: Number(entry.amount),
                        doctorName: entry.doctorName,
                        notes: entry.notes || undefined,
                      })
                    }
                    disabled={
                      addEntry.isPending ||
                      !entry.transactionDate ||
                      Number(entry.amount) <= 0 ||
                      !entry.doctorName.trim()
                    }
                  >
                    <Plus className="ml-2 size-4" />
                    إضافة
                  </Button>
                </div>
              </div>
              <div className="divide-y divide-border">
                {entries.map((row) => (
                  <div
                    key={row.id}
                    className="flex items-center justify-between gap-3 px-4 py-3"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-black">
                          {money(Number(row.amount))}
                        </span>
                        <Badge
                          variant="outline"
                          className="rounded text-[10px]"
                        >
                          د. {row.doctorName}
                        </Badge>
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {String(row.transactionDate).slice(0, 10)}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => deleteEntry.mutate({ id: row.id })}
                      aria-label="حذف الحركة"
                    >
                      <Trash2 className="size-4 text-destructive" />
                    </Button>
                  </div>
                ))}
                {!data?.entries.length ? (
                  <div className="p-12 text-center text-sm text-muted-foreground">
                    لا توجد إيرادات مسجلة في الفترة المحددة.
                  </div>
                ) : null}
              </div>
            </section>
          </div>
        </TabsContent>

        <TabsContent value="eid" className="mt-4 space-y-4" dir="rtl">
          <div className="grid gap-4 rounded-lg border border-border p-5 lg:grid-cols-[minmax(0,1fr)_280px]">
            <div>
              <h2 className="text-base font-black">إضافة عيدية لكل الموظفين</h2>
              <p className="mt-1 text-xs text-muted-foreground">
                المبلغ المحدد يُصرف بنفس القيمة لكل موظف نشط.
              </p>
              <div className="mt-4 grid gap-3 sm:grid-cols-3">
                <Input
                  value={eid.title}
                  onChange={(event) =>
                    setEid({ ...eid, title: event.target.value })
                  }
                  placeholder="اسم المناسبة"
                />
                <Input
                  type="date"
                  value={eid.bonusDate}
                  onChange={(event) =>
                    setEid({ ...eid, bonusDate: event.target.value })
                  }
                />
                <Input
                  type="number"
                  min={0}
                  step={0.01}
                  value={eid.amountPerEmployee}
                  onChange={(event) =>
                    setEid({ ...eid, amountPerEmployee: event.target.value })
                  }
                  placeholder="مبلغ كل موظف"
                />
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                <Button
                  onClick={() =>
                    addEid.mutate({
                      title: eid.title,
                      bonusDate: eid.bonusDate,
                      amountPerEmployee: eidAmount,
                      notes: eid.notes || undefined,
                    })
                  }
                  disabled={
                    addEid.isPending || !eid.title.trim() || eidAmount <= 0
                  }
                >
                  <Gift className="ml-2 size-4" />
                  حفظ العيدية
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => printSection("eid")}
                  disabled={!activeEmployeesCount || eidAmount <= 0}
                >
                  <Printer className="ml-2 size-4" />
                  طباعة العيدية
                </Button>
              </div>
            </div>
            <aside className="rounded-md bg-muted/30 p-4">
              <p className="text-xs text-muted-foreground">عدد الموظفين</p>
              <p className="mt-1 text-xl font-black">{activeEmployeesCount}</p>
              <p className="mt-4 text-xs text-muted-foreground">
                إجمالي الصرف المتوقع
              </p>
              <p className="mt-1 text-xl font-black text-primary">
                {money(activeEmployeesCount * eidAmount)}
              </p>
            </aside>
          </div>
          <div className="overflow-hidden rounded-lg border border-border">
            <div className="border-b border-border px-4 py-3 text-sm font-black">
              سجل العيديات
            </div>
            <div className="divide-y divide-border">
              {eidBonuses.map((bonus) => (
                <div
                  key={bonus.id}
                  className="flex items-center justify-between gap-3 px-4 py-3"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-black">{bonus.title}</span>
                      <Badge variant="secondary">
                        {money(Number(bonus.amountPerEmployee))} لكل موظف
                      </Badge>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      <CalendarDays className="ml-1 inline size-3" />
                      {String(bonus.bonusDate).slice(0, 10)} ·{" "}
                      {bonus.employeeCount} موظف · الإجمالي{" "}
                      {money(
                        Number(bonus.amountPerEmployee) * bonus.employeeCount,
                      )}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => deleteEid.mutate({ id: bonus.id })}
                    aria-label="حذف العيدية"
                  >
                    <Trash2 className="size-4 text-destructive" />
                  </Button>
                </div>
              ))}
              {!data?.eidBonuses.length ? (
                <div className="p-10 text-center text-sm text-muted-foreground">
                  لا توجد عيديات مسجلة.
                </div>
              ) : null}
            </div>
          </div>
        </TabsContent>
      </Tabs>

      {printKind ? (
        <div className="fund-print-container hidden print:block" dir="rtl">
          <style>{`
            @media print {
              @page {
                size: A4 portrait;
                margin: 8mm;
              }
              html, body { margin: 0 !important; padding: 0 !important; }
              .salary-funds-page > * { display: none !important; }
              .salary-funds-page > .fund-print-container { display: block !important; }
              .fund-print-root {
                position: static;
                width: 100%;
                height: 281mm;
                box-sizing: border-box;
                padding: 0;
                page-break-before: avoid;
              }
              .fund-print-root table {
                width: 100%;
                height: 230mm;
                page-break-inside: auto;
              }
              .fund-print-root th,
              .fund-print-root td { font-size: 13px; vertical-align: middle; }
              .fund-print-root tr {
                page-break-inside: avoid;
                page-break-after: auto;
              }
            }
          `}</style>
          <div className="fund-print-root">
            <h1 className="text-xl font-black">
              {printKind === "operations"
                ? "صندوق العمليات"
                : eid.title || "العيدية"}
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              من {fromDate} إلى {toDate}
            </p>
            <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
              <div>
                <span className="font-black">إجمالي المبلغ: </span>
                {money(
                  printKind === "operations"
                    ? data?.totalRevenue ?? 0
                    : activeEmployeesCount * eidAmount,
                )}
              </div>
              <div>
                <span className="font-black">عدد الموظفين: </span>
                {printKind === "operations"
                  ? fundMembers.length
                  : activeEmployeesCount}
              </div>
            </div>
            <table className="mt-5 w-full border-collapse text-sm">
              <thead>
                <tr>
                  <th className="border border-black/30 p-1 text-right">
                    الموظف
                  </th>
                  <th className="border border-black/30 p-1 text-right">
                    المبلغ
                  </th>
                  <th className="border border-black/30 p-1 text-right">
                    التوقيع
                  </th>
                </tr>
              </thead>
              <tbody>
                {(printKind === "operations" ? fundMembers : employees).map(
                  (employee) => (
                    <tr key={employee.empCd}>
                      <td className="border border-black/30 p-1">
                        {employee.fullName}
                      </td>
                      <td className="border border-black/30 p-1">
                        {money(
                          printKind === "operations"
                            ? data?.sharePerMember ?? 0
                            : eidAmount,
                        )}
                      </td>
                      <td className="border border-black/30 p-1">&nbsp;</td>
                    </tr>
                  ),
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}
    </div>
  );
}
