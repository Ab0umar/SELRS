import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Printer, ImageDown, CalendarClock, ChevronDown, FolderCheck, Pencil, Trash2, Users, Syringe } from "lucide-react";
import { operationTypeLabel } from "@/lib/operationsPricing";
import {
  type ListData,
  type SavedSummary,
} from "@/hooks/operations/operationsShared";

type OperationTotalsProps = {
  accountingTotals: {
    centerAmount: number;
    paid: number;
    remainingAmount: number;
  };
  accountsAdjustmentInputs: {
    radiology: string;
    external: string;
    cashbox: string;
  };
  accountsAdjustmentsTotal: number;
  accountsNetAfterAdjustments: number;
  canManageList: boolean;
  computeAccounting: (row: ListData) => {
    centerAmount: number;
    paid: number;
    remainingAmount: number;
  };
  currentList: ListData[];
  exportDateLabel: string;
  exportDoctorLabel: string;
  exportOperationLabel: string;
  exportTimeLabel: string;
  filteredSavedSummaries: SavedSummary[];
  onAccountsAdjustmentBlur: (key: "radiology" | "external" | "cashbox") => void;
  onAccountsAdjustmentChange: (
    key: "radiology" | "external" | "cashbox",
    value: string,
  ) => void;
  onDeleteSavedSummary: (key: string, listId?: number) => void;
  onEditSavedSummary: (summary: SavedSummary) => void;
  onUpdateRow: (id: number, field: keyof ListData | string, value: any) => void;
  operationType: string;
  showSawafAdjustments: boolean;
  onPrint?: () => void;
  onSaveJpg?: () => void;
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
  onPrint,
  onSaveJpg,
}: OperationTotalsProps) {
  const [savedSummariesExpanded, setSavedSummariesExpanded] = useState(true);
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({});

  const toggleGroup = (title: string) => {
    setCollapsedGroups((prev) => ({
      ...prev,
      [title]: !prev[title],
    }));
  };
  const rowLabel = (appointment: ListData, field: string) =>
    `${field}${appointment.name ? `، ${appointment.name}` : ""}`;

  const groupedSummaries = useMemo(() => {
    const map = new Map<string, SavedSummary[]>();
    for (const item of filteredSavedSummaries) {
      const rawType = item.operationType || (item as any).items?.[0]?.operationType || "اخري";
      const label = operationTypeLabel(rawType) || "عمليات أخرى";
      if (!map.has(label)) {
        map.set(label, []);
      }
      map.get(label)!.push(item);
    }
    return Array.from(map.entries());
  }, [filteredSavedSummaries]);

  return (
    <>
      <div className="mb-6 overflow-x-auto" dir="rtl">
        <div className="mb-1 flex items-center justify-between gap-2">
          <span className="text-sm font-bold">حسابات العمليات</span>
          <div className="flex gap-1 print:hidden">
            {onPrint && (
              <Button
                variant="outline"
                size="sm"
                className="h-7 gap-1 px-2 text-xs"
                onClick={onPrint}
              >
                <Printer className="h-3.5 w-3.5" /> طباعة
              </Button>
            )}
            {onSaveJpg && (
              <Button
                variant="outline"
                size="sm"
                className="h-7 gap-1 px-2 text-xs"
                onClick={onSaveJpg}
              >
                <ImageDown className="h-3.5 w-3.5" /> JPG
              </Button>
            )}
          </div>
        </div>
        <div className="mb-2 text-xs text-muted-foreground">
          التاريخ: {exportDateLabel} | الساعة: {exportTimeLabel} | الطبيب:{" "}
          {exportDoctorLabel} | نوع العملية: {exportOperationLabel}
        </div>
        <table className="w-full border-collapse border border-border text-center text-xs">
          <thead>
            <tr className="bg-muted/50">
              <th className="border border-border p-2 font-bold">اسم المريض</th>
              <th className="border border-border p-2 font-bold">
                نوع العملية
              </th>
              <th className="border border-border p-2 font-bold">المبلغ</th>
              <th className="border border-border p-2 font-bold">نوع الخصم</th>
              <th className="border border-border p-2 font-bold">الخصم</th>
              <th className="border border-border p-2 font-bold">المدفوع</th>
              <th className="border border-border p-2 font-bold">
                حساب المركز
              </th>
              <th className="border border-border p-2 font-bold">
                المتبقي للدكتور
              </th>
            </tr>
          </thead>
          <tbody>
            {currentList.map((appointment) => {
              const values = computeAccounting(appointment);
              return (
                <tr key={`acc-${appointment.id}`}>
                  <td className="border border-border p-2">
                    {appointment.name || "-"}
                  </td>
                  <td className="border border-border p-2">
                    {operationTypeLabel(
                      appointment.operation || operationType || "Other",
                    )}
                  </td>
                  <td className="border border-border p-2">
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      value={String(appointment.amount ?? 0)}
                      onChange={(event) => {
                        const raw = Number(event.target.value);
                        onUpdateRow(
                          appointment.id,
                          "amount",
                          Number.isFinite(raw) ? raw : 0,
                        );
                      }}
                      readOnly={!canManageList}
                      className="h-9 text-center"
                      aria-label={rowLabel(appointment, "المبلغ")}
                    />
                  </td>
                  <td className="border border-border p-2">
                    <select
                      value={appointment.discountType}
                      onChange={(event) =>
                        onUpdateRow(
                          appointment.id,
                          "discountType",
                          event.target.value === "percent"
                            ? "percent"
                            : "amount",
                        )
                      }
                      disabled={!canManageList}
                      className="rounded border border-border bg-background px-2 py-1 text-xs"
                      aria-label={rowLabel(appointment, "نوع الخصم")}
                    >
                      <option value="amount">قيمة</option>
                      <option value="percent">نسبة %</option>
                    </select>
                  </td>
                  <td className="border border-border p-2">
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      value={String(appointment.discountValue ?? 0)}
                      onChange={(event) => {
                        const raw = Number(event.target.value);
                        onUpdateRow(
                          appointment.id,
                          "discountValue",
                          Number.isFinite(raw) ? raw : 0,
                        );
                      }}
                      readOnly={!canManageList}
                      className="h-9 text-center"
                      aria-label={rowLabel(appointment, "قيمة الخصم")}
                    />
                  </td>
                  <td className="border border-border p-2">
                    {values.paid.toFixed(2)}
                  </td>
                  <td className="border border-border p-2">
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      value={String(
                        appointment.doctorAmount ?? values.centerAmount,
                      )}
                      onChange={(event) => {
                        const rawText = event.target.value.trim();
                        if (rawText === "") {
                          onUpdateRow(appointment.id, "doctorAmount", null);
                          return;
                        }
                        const raw = Number(rawText);
                        onUpdateRow(
                          appointment.id,
                          "doctorAmount",
                          Number.isFinite(raw) ? raw : null,
                        );
                      }}
                      readOnly={!canManageList}
                      className="h-9 text-center"
                      aria-label={rowLabel(appointment, "حساب المركز")}
                    />
                  </td>
                  <td className="border border-border p-2">
                    {values.remainingAmount.toFixed(2)}
                  </td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr className="bg-muted font-bold">
              <td className="border border-border p-2 text-center" colSpan={5}>
                الإجمالي العام
              </td>
              <td className="border border-border p-2">
                {accountingTotals.centerAmount.toFixed(2)}
              </td>
              <td className="border border-border p-2">
                {accountingTotals.paid.toFixed(2)}
              </td>
              <td className="border border-border p-2">
                {accountingTotals.remainingAmount.toFixed(2)}
              </td>
            </tr>
            {showSawafAdjustments && (
              <>
                <tr className="bg-background">
                  <td className="border border-border p-2" colSpan={5}></td>
                  <td className="border border-border p-2 font-semibold">
                    الأشعة
                  </td>
                  <td className="border border-border p-2" colSpan={2}>
                    <Input
                      type="text"
                      inputMode="decimal"
                      step="0.01"
                      value={accountsAdjustmentInputs.radiology}
                      onChange={(event) =>
                        onAccountsAdjustmentChange(
                          "radiology",
                          event.target.value,
                        )
                      }
                      onBlur={() => onAccountsAdjustmentBlur("radiology")}
                      className="h-8 text-center"
                      aria-label="تعديل الأشعة"
                    />
                  </td>
                </tr>
                <tr className="bg-background">
                  <td className="border border-border p-2" colSpan={5}></td>
                  <td className="border border-border p-2 font-semibold">
                    خارجي
                  </td>
                  <td className="border border-border p-2" colSpan={2}>
                    <Input
                      type="text"
                      inputMode="decimal"
                      step="0.01"
                      value={accountsAdjustmentInputs.external}
                      onChange={(event) =>
                        onAccountsAdjustmentChange(
                          "external",
                          event.target.value,
                        )
                      }
                      onBlur={() => onAccountsAdjustmentBlur("external")}
                      className="h-8 text-center"
                      aria-label="تعديل خارجي"
                    />
                  </td>
                </tr>
                <tr className="bg-background">
                  <td className="border border-border p-2" colSpan={5}></td>
                  <td className="border border-border p-2 font-semibold">
                    الصندوق
                  </td>
                  <td className="border border-border p-2" colSpan={2}>
                    <Input
                      type="text"
                      inputMode="decimal"
                      step="0.01"
                      value={accountsAdjustmentInputs.cashbox}
                      onChange={(event) =>
                        onAccountsAdjustmentChange(
                          "cashbox",
                          event.target.value,
                        )
                      }
                      onBlur={() => onAccountsAdjustmentBlur("cashbox")}
                      className="h-8 text-center"
                      aria-label="تعديل الصندوق"
                    />
                  </td>
                </tr>
                <tr className="bg-muted font-semibold">
                  <td className="border border-border p-2" colSpan={5}>
                    إجمالي التعديلات
                  </td>
                  <td className="border border-border p-2">
                    {accountsAdjustmentsTotal.toFixed(2)}
                  </td>
                  <td className="border border-border p-2">
                    {accountingTotals.centerAmount.toFixed(2)}
                  </td>
                  <td className="border border-border p-2">
                    {accountsNetAfterAdjustments.toFixed(2)}
                  </td>
                </tr>
              </>
            )}
          </tfoot>
        </table>
      </div>

      {filteredSavedSummaries.length > 0 && (
        <div className="mt-6 rounded-2xl border border-slate-200/80 bg-slate-50/50 p-4 md:p-5 print:hidden" dir="rtl">
          <button
            type="button"
            className={`flex w-full items-center justify-between gap-2 text-right ${savedSummariesExpanded ? "border-b border-slate-200/60 pb-3" : ""}`}
            onClick={() => setSavedSummariesExpanded((expanded) => !expanded)}
            aria-expanded={savedSummariesExpanded}
            aria-controls="saved-operation-summaries"
          >
            <div className="flex items-center gap-2">
              <FolderCheck className="h-5 w-5 text-[#2563eb]" />
              <h3 className="text-sm md:text-base font-bold text-slate-800">الملخصات والحسابات المحفوظة</h3>
            </div>
            <div className="flex items-center gap-2">
              <span className="rounded-lg bg-blue-100/80 px-2.5 py-0.5 text-xs font-bold text-[#2563eb]">
                {filteredSavedSummaries.length} ملخص محفوظ
              </span>
              <ChevronDown
                className={`h-5 w-5 text-slate-500 transition-transform ${savedSummariesExpanded ? "rotate-180" : ""}`}
              />
            </div>
          </button>

          {savedSummariesExpanded && (
            <div id="saved-operation-summaries" className="mt-5 space-y-4">
              {groupedSummaries.map(([opGroupTitle, summaries]) => {
                const isCollapsed = collapsedGroups[opGroupTitle];
                return (
                  <div key={opGroupTitle} className="space-y-2.5">
                    <button
                      type="button"
                      onClick={() => toggleGroup(opGroupTitle)}
                      className="flex w-full items-center justify-between gap-2 text-xs font-bold text-slate-700 bg-slate-200/70 hover:bg-slate-200 px-3 py-2 rounded-lg border border-slate-200 transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        <Syringe className="h-3.5 w-3.5 text-[#2563eb]" />
                        <span>{opGroupTitle} ({summaries.length})</span>
                      </div>
                      <ChevronDown
                        className={`h-4 w-4 text-slate-500 transition-transform duration-200 ${!isCollapsed ? "rotate-180" : ""}`}
                      />
                    </button>

                    {!isCollapsed && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2.5 items-start">
                        {summaries.map((item) => (
                          <div
                            key={item.key}
                            className="flex flex-col h-auto gap-2 rounded-lg border border-slate-200 bg-white p-2.5 shadow-2xs hover:border-blue-400 hover:shadow-xs transition-all"
                          >
                            <div className="space-y-1.5">
                              <div className="flex items-center justify-between gap-1.5 border-b border-slate-100 pb-1.5">
                                <div className="flex items-center gap-1 font-bold text-xs text-slate-800">
                                  <CalendarClock className="h-3.5 w-3.5 text-[#2563eb]" />
                                  <span>{item.date}</span>
                                </div>
                                {item.names?.length ? (
                                  <span className="text-[10px] font-semibold text-slate-600 bg-slate-100 px-1.5 py-0.2 rounded flex items-center gap-0.5">
                                    <Users className="h-2.5 w-2.5" />
                                    {item.names.length}
                                  </span>
                                ) : null}
                              </div>

                              <div className="text-[11px] text-slate-600">
                                {item.names.length > 0 ? (
                                  <div className="flex flex-wrap gap-0.5 mt-0.5">
                                    {item.names.map((name, idx) => (
                                      <span
                                        key={idx}
                                        className="inline-block rounded bg-slate-50 border border-slate-200/60 px-1.5 py-0.2 text-[10px] font-medium text-slate-700"
                                      >
                                        {name}
                                      </span>
                                    ))}
                                  </div>
                                ) : (
                                  <span className="text-slate-400 italic text-[10px]">لا توجد أسماء</span>
                                )}
                              </div>
                            </div>

                            <div className="flex items-center justify-end gap-1 pt-1.5 border-t border-slate-100 mt-0.5">
                              <Button
                                variant="outline"
                                size="sm"
                                className="h-6 text-[10px] font-medium rounded px-2 text-slate-700 border-slate-300 hover:bg-slate-50 gap-1"
                                onClick={() => onEditSavedSummary(item)}
                              >
                                <Pencil className="h-3 w-3 text-slate-500" />
                                تعديل
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 px-1.5 text-[10px] font-medium rounded text-red-600 hover:bg-red-50 hover:text-red-700 gap-0.5"
                                onClick={() => onDeleteSavedSummary(item.key, item.listId)}
                                disabled={!canManageList}
                              >
                                <Trash2 className="h-3 w-3" />
                                حذف
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </>
  );
}
