import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { operationTypeLabel } from "@/lib/operationsPricing";
import { type ListData, type SavedSummary } from "@/hooks/operations/operationsShared";

type OperationTotalsProps = {
  accountingTotals: { centerAmount: number; paid: number; remainingAmount: number };
  accountsAdjustmentInputs: { radiology: string; external: string; cashbox: string };
  accountsAdjustmentsTotal: number;
  accountsNetAfterAdjustments: number;
  canManageList: boolean;
  computeAccounting: (row: ListData) => { centerAmount: number; paid: number; remainingAmount: number };
  currentList: ListData[];
  exportDateLabel: string;
  exportDoctorLabel: string;
  exportOperationLabel: string;
  exportTimeLabel: string;
  filteredSavedSummaries: SavedSummary[];
  onAccountsAdjustmentBlur: (key: "radiology" | "external" | "cashbox") => void;
  onAccountsAdjustmentChange: (key: "radiology" | "external" | "cashbox", value: string) => void;
  onDeleteSavedSummary: (key: string, listId?: number) => void;
  onEditSavedSummary: (summary: SavedSummary) => void;
  onUpdateRow: (id: number, field: keyof ListData | string, value: any) => void;
  operationType: string;
  showSawafAdjustments: boolean;
};

export function OperationTotals({
  accountingTotals,
  accountsAdjustmentInputs,
  accountsAdjustmentsTotal,
  accountsNetAfterAdjustments,
  canManageList,
  computeAccounting,
  currentList,
  exportDateLabel,
  exportDoctorLabel,
  exportOperationLabel,
  exportTimeLabel,
  filteredSavedSummaries,
  onAccountsAdjustmentBlur,
  onAccountsAdjustmentChange,
  onDeleteSavedSummary,
  onEditSavedSummary,
  onUpdateRow,
  operationType,
  showSawafAdjustments,
}: OperationTotalsProps) {
  return (
    <>
      <div className="mb-6 overflow-x-auto" dir="rtl">
        <div className="mb-1 text-sm font-bold">حسابات العمليات</div>
        <div className="mb-2 text-xs text-muted-foreground">
          التاريخ: {exportDateLabel} | الساعة: {exportTimeLabel} | الطبيب: {exportDoctorLabel} | نوع العملية: {exportOperationLabel}
        </div>
        <table className="w-full border-collapse border border-gray-500 text-center text-xs">
          <thead>
            <tr className="bg-border">
              <th className="border border-gray-500 p-2 font-bold">اسم المريض</th>
              <th className="border border-gray-500 p-2 font-bold">نوع العملية</th>
              <th className="border border-gray-500 p-2 font-bold">المبلغ</th>
              <th className="border border-gray-500 p-2 font-bold">نوع الخصم</th>
              <th className="border border-gray-500 p-2 font-bold">الخصم</th>
              <th className="border border-gray-500 p-2 font-bold">المدفوع</th>
              <th className="border border-gray-500 p-2 font-bold">حساب المركز (من الدكتور)</th>
              <th className="border border-gray-500 p-2 font-bold">المتبقي (حساب الدكتور)</th>
            </tr>
          </thead>
          <tbody>
            {currentList.map((appointment) => {
              const values = computeAccounting(appointment);
              return (
                <tr key={`acc-${appointment.id}`}>
                  <td className="border border-gray-500 p-2">{appointment.name || "-"}</td>
                  <td className="border border-gray-500 p-2">{operationTypeLabel(appointment.operation || operationType || "Other")}</td>
                  <td className="border border-gray-500 p-2">
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      value={String(appointment.amount ?? 0)}
                      onChange={(event) => {
                        const raw = Number(event.target.value);
                        onUpdateRow(appointment.id, "amount", Number.isFinite(raw) ? raw : 0);
                      }}
                      readOnly={!canManageList}
                      className="h-7 text-center"
                    />
                  </td>
                  <td className="border border-gray-500 p-2">
                    <select
                      value={appointment.discountType}
                      onChange={(event) => onUpdateRow(appointment.id, "discountType", event.target.value === "percent" ? "percent" : "amount")}
                      disabled={!canManageList}
                      className="rounded border border-border bg-background px-2 py-1 text-xs"
                    >
                      <option value="amount">قيمة</option>
                      <option value="percent">نسبة %</option>
                    </select>
                  </td>
                  <td className="border border-gray-500 p-2">
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      value={String(appointment.discountValue ?? 0)}
                      onChange={(event) => {
                        const raw = Number(event.target.value);
                        onUpdateRow(appointment.id, "discountValue", Number.isFinite(raw) ? raw : 0);
                      }}
                      readOnly={!canManageList}
                      className="h-7 text-center"
                    />
                  </td>
                  <td className="border border-gray-500 p-2">{values.paid.toFixed(2)}</td>
                  <td className="border border-gray-500 p-2">
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      value={String(appointment.doctorAmount ?? values.centerAmount)}
                      onChange={(event) => {
                        const rawText = event.target.value.trim();
                        if (rawText === "") {
                          onUpdateRow(appointment.id, "doctorAmount", null);
                          return;
                        }
                        const raw = Number(rawText);
                        onUpdateRow(appointment.id, "doctorAmount", Number.isFinite(raw) ? raw : null);
                      }}
                      readOnly={!canManageList}
                      className="h-7 text-center"
                    />
                  </td>
                  <td className="border border-gray-500 p-2">{values.remainingAmount.toFixed(2)}</td>
                </tr>
              );
            })}
            {currentList.length === 0 && (
              <tr>
                <td colSpan={8} className="p-4 text-gray-500">
                  لا توجد حالات في القائمة الحالية.
                </td>
              </tr>
            )}
          </tbody>
          <tfoot>
            <tr className="bg-muted font-bold">
              <td className="border border-gray-500 p-2" colSpan={5}>
                الإجمالي
              </td>
              <td className="border border-gray-500 p-2">{accountingTotals.paid.toFixed(2)}</td>
              <td className="border border-gray-500 p-2">{accountingTotals.centerAmount.toFixed(2)}</td>
              <td className="border border-gray-500 p-2">{accountingTotals.remainingAmount.toFixed(2)}</td>
            </tr>
            {showSawafAdjustments && (
              <>
                <tr className="bg-background">
                  <td className="border border-gray-500 p-2" colSpan={5}></td>
                  <td className="border border-gray-500 p-2 font-semibold">الاشعه</td>
                  <td className="border border-gray-500 p-2" colSpan={2}>
                    <Input
                      type="text"
                      inputMode="decimal"
                      step="0.01"
                      value={accountsAdjustmentInputs.radiology}
                      onChange={(event) => onAccountsAdjustmentChange("radiology", event.target.value)}
                      onBlur={() => onAccountsAdjustmentBlur("radiology")}
                      className="h-8 text-center"
                    />
                  </td>
                </tr>
                <tr className="bg-background">
                  <td className="border border-gray-500 p-2" colSpan={5}></td>
                  <td className="border border-gray-500 p-2 font-semibold">خارجي</td>
                  <td className="border border-gray-500 p-2" colSpan={2}>
                    <Input
                      type="text"
                      inputMode="decimal"
                      step="0.01"
                      value={accountsAdjustmentInputs.external}
                      onChange={(event) => onAccountsAdjustmentChange("external", event.target.value)}
                      onBlur={() => onAccountsAdjustmentBlur("external")}
                      className="h-8 text-center"
                    />
                  </td>
                </tr>
                <tr className="bg-background">
                  <td className="border border-gray-500 p-2" colSpan={5}></td>
                  <td className="border border-gray-500 p-2 font-semibold">الصندوق</td>
                  <td className="border border-gray-500 p-2" colSpan={2}>
                    <Input
                      type="text"
                      inputMode="decimal"
                      step="0.01"
                      value={accountsAdjustmentInputs.cashbox}
                      onChange={(event) => onAccountsAdjustmentChange("cashbox", event.target.value)}
                      onBlur={() => onAccountsAdjustmentBlur("cashbox")}
                      className="h-8 text-center"
                    />
                  </td>
                </tr>
                <tr className="bg-muted font-semibold">
                  <td className="border border-gray-500 p-2" colSpan={5}>
                    إجمالي (الاشعه + خارجي + الصندوق)
                  </td>
                  <td className="border border-gray-500 p-2">{accountsAdjustmentsTotal.toFixed(2)}</td>
                  <td className="border border-gray-500 p-2">{accountingTotals.centerAmount.toFixed(2)}</td>
                  <td className="border border-gray-500 p-2">{accountsNetAfterAdjustments.toFixed(2)}</td>
                </tr>
              </>
            )}
          </tfoot>
        </table>
      </div>

      {filteredSavedSummaries.length > 0 && (
        <div className="mt-4 border-t pt-3 print:hidden" dir="rtl">
          <div className="mb-2 text-sm font-bold">القوائم المحفوظة</div>
          <div className="flex flex-col gap-2 text-sm">
            {filteredSavedSummaries.map((item) => (
              <div key={item.key} className="flex items-start justify-between gap-2 rounded border border-border p-2">
                <div>
                  <div className="font-semibold">{item.date}</div>
                  <div className="text-xs text-muted-foreground">{item.names.length > 0 ? item.names.join(" ") : "-"}</div>
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" onClick={() => onEditSavedSummary(item)}>
                    تعديل
                  </Button>
                  <Button variant="destructive" size="sm" onClick={() => onDeleteSavedSummary(item.key, item.listId)} disabled={!canManageList}>
                    حذف
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  );
}
