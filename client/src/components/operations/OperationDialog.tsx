import { ImageDown, Plus, Printer, RotateCcw, Save, Share2, Trash2 } from "lucide-react";
import { useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { TAB_OTHERS, operationTypeLabel } from "@/lib/operationsPricing";
import { arabicWeekdays, formatDayDateLong, getLocalDateIso, getWeekdayIndex, shiftDateToWeekday, toDateInputValue } from "@/hooks/operations/operationsShared";

type OperationDialogProps = {
  activeTab: string;
  autoSaveEnabled: boolean;
  canManageList: boolean;
  compact?: boolean;
  currentListCount?: number;
  onDeleteAll?: () => void;
  debouncedPatientSearch: string;
  doctorName: string;
  exportDateLabel: string;
  exportDoctorLabel: string;
  exportOperationLabel: string;
  exportTimeLabel: string;
  listDate: string;
  listTime: string;
  onAddPatientRow: (patient: any) => void;
  onAutoSaveToggle: () => void;
  onDoctorNameChange: (value: string) => void;
  onListDateChange: (value: string) => void;
  onListTimeChange: (value: string) => void;
  onNewList: () => void;
  onOperationTypeChange: (value: string) => void;
  onOperationTypeOtherChange: (value: string) => void;
  onPatientSearchTermChange: (value: string) => void;
  onPrint: () => void;
  onSaveJpg: () => void;
  onSaveList: () => void;
  onShareJpg: () => void;
  operationOptions: string[];
  operationType: string;
  operationTypeOther: string;
  patientSearchQuery: any;
  patientSearchTerm: string;
};

export function OperationDialog({
  activeTab,
  autoSaveEnabled,
  canManageList,
  compact = false,
  currentListCount = 0,
  onDeleteAll,
  debouncedPatientSearch,
  doctorName,
  exportDateLabel,
  exportDoctorLabel,
  exportOperationLabel,
  exportTimeLabel,
  listDate,
  listTime,
  onAddPatientRow,
  onAutoSaveToggle,
  onDoctorNameChange,
  onListDateChange,
  onListTimeChange,
  onNewList,
  onOperationTypeChange,
  onOperationTypeOtherChange,
  onPatientSearchTermChange,
  onPrint,
  onSaveJpg,
  onSaveList,
  onShareJpg,
  operationOptions,
  operationType,
  operationTypeOther,
  patientSearchQuery,
  patientSearchTerm,
}: OperationDialogProps) {
  const searchRef = useRef<HTMLInputElement>(null);

  if (compact) {
    return (
      <>
        {/* Print header */}
        <div className="hidden items-center justify-center gap-6 text-[14px] print:flex">
          <div>{formatDayDateLong(toDateInputValue(listDate) || getLocalDateIso())}</div>
          <div>الطبيب المعالج: {doctorName || "-"}</div>
          <div>الساعة: {listTime || "-"}</div>
        </div>

        {/* Row 1: Search (right) + Date/Time (left) */}
        <div className="mb-3 flex items-center gap-3 print:hidden" dir="rtl">
          {canManageList && (
            <Input
              ref={searchRef}
              value={patientSearchTerm}
              onChange={(e) => onPatientSearchTermChange(e.target.value)}
              placeholder="بحث..."
              className="h-8 flex-1 text-right"
            />
          )}
          <div className="flex shrink-0 items-center gap-2">
            <Input
              type="time"
              value={listTime}
              onChange={(e) => onListTimeChange(e.target.value)}
              disabled={!canManageList}
              className="h-8 w-28 text-center text-sm"
            />
            <Input
              type="date"
              value={toDateInputValue(listDate)}
              onChange={(e) => onListDateChange(e.target.value || getLocalDateIso())}
              disabled={!canManageList}
              className="h-8 w-36 text-center text-sm"
            />
          </div>
        </div>

        {/* Patient search results */}
        {canManageList && debouncedPatientSearch.trim().length >= 1 && (
          <div className="mb-3 overflow-x-auto rounded-lg border border-border bg-card">
            <table className="w-full min-w-[480px] border-collapse text-center text-xs">
              <thead>
                <tr className="bg-muted">
                  <th className="border border-border px-3 py-2">الكود</th>
                  <th className="border border-border px-3 py-2">اسم المريض</th>
                  <th className="border border-border px-3 py-2">الهاتف</th>
                  <th className="w-24 border border-border px-3 py-2">إضافة</th>
                </tr>
              </thead>
              <tbody>
                {patientSearchQuery.isLoading && (
                  <tr><td colSpan={4} className="px-3 py-4 text-muted-foreground">جاري البحث...</td></tr>
                )}
                {!patientSearchQuery.isLoading && ((patientSearchQuery.data as any[])?.length ?? 0) === 0 && (
                  <tr><td colSpan={4} className="px-3 py-4 text-muted-foreground">لا توجد نتائج</td></tr>
                )}
                {!patientSearchQuery.isLoading && ((patientSearchQuery.data as any[]) ?? []).map((patient: any) => (
                  <tr key={patient.id} className="hover:bg-muted/40">
                    <td className="border border-border px-3 py-2" dir="ltr">{patient.patientCode || "-"}</td>
                    <td className="border border-border px-3 py-2">{patient.fullName || "-"}</td>
                    <td className="border border-border px-3 py-2" dir="ltr">{patient.phone || "-"}</td>
                    <td className="border border-border px-3 py-2">
                      <Button type="button" size="sm" variant="outline" onClick={() => { onAddPatientRow(patient); onPatientSearchTermChange(""); }}>
                        <Plus className="ml-1 h-4 w-4" />إضافة
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Row 2: Operation type filter tabs */}
        <div className="mb-3 flex flex-wrap gap-1 rounded-lg bg-muted/50 p-1 print:hidden" dir="rtl">
          <button
            type="button"
            onClick={() => onOperationTypeChange("")}
            className={cn("rounded-md px-3 py-1.5 text-sm font-semibold transition-all", operationType === "" ? "bg-background text-primary shadow-sm" : "text-muted-foreground hover:text-foreground")}
          >
            الكل
          </button>
          {operationOptions.map((opt) => (
            <button
              key={opt}
              type="button"
              onClick={() => onOperationTypeChange(opt)}
              className={cn("rounded-md px-3 py-1.5 text-sm font-semibold transition-all", operationType === opt ? "bg-background text-primary shadow-sm" : "text-muted-foreground hover:text-foreground")}
            >
              {operationTypeLabel(opt)}
            </button>
          ))}
        </div>

        {/* Row 3: Patient count (right) + Action buttons (left) */}
        <div className="mb-4 flex items-center justify-between border-b-2 pb-3 print:hidden" dir="rtl">
          <span className="text-sm font-medium text-muted-foreground">{currentListCount} مريض</span>
          <div className="flex gap-2">
            {canManageList && (
              <Button variant="default" size="sm" onClick={() => searchRef.current?.focus()}>
                <Plus className="ml-1 h-4 w-4" />
                إضافة مريض
              </Button>
            )}
            <Button variant="outline" size="sm" onClick={onPrint}>
              <Printer className="ml-1 h-4 w-4" />
              طباعة
            </Button>
            <Button variant="outline" size="sm" onClick={onSaveList} disabled={!canManageList}>
              <Save className="ml-1 h-4 w-4" />
              حفظ
            </Button>
            {canManageList && onDeleteAll && (
              <Button variant="outline" size="sm" className="border-destructive/50 text-destructive hover:bg-destructive/10" onClick={onDeleteAll}>
                <Trash2 className="ml-1 h-4 w-4" />
                حذف الكل
              </Button>
            )}
          </div>
        </div>

        <div className="mb-2 text-xs text-muted-foreground">
          التاريخ: {exportDateLabel} | الساعة: {exportTimeLabel} | الطبيب: {exportDoctorLabel} | نوع العملية: {exportOperationLabel}
        </div>
      </>
    );
  }

  return (
    <>
      <div className="mb-4 border-b-2 pb-3" style={{ textAlign: "center" }}>
        <div className="flex flex-wrap items-center justify-center gap-6 text-sm print:hidden">
          <label className="flex items-center gap-2">
            <span>تاريخ القائمة:</span>
            {!compact && (
              <select
                value={getWeekdayIndex(toDateInputValue(listDate) || getLocalDateIso())}
                onChange={(event) => {
                  const targetIndex = Number(event.target.value);
                  const base = toDateInputValue(listDate) || getLocalDateIso();
                  onListDateChange(shiftDateToWeekday(base, targetIndex));
                }}
                disabled={!canManageList}
                className="rounded border border-gray-300 bg-white px-2 py-1 text-sm"
              >
                {arabicWeekdays.map((day, index) => (
                  <option key={day} value={index}>
                    {day}
                  </option>
                ))}
              </select>
            )}
            <Input
              type="date"
              value={toDateInputValue(listDate)}
              onChange={(event) => onListDateChange(event.target.value || getLocalDateIso())}
              disabled={!canManageList}
              className="h-7 w-40 text-center text-sm"
            />
          </label>
          {!compact && (
            <label className="flex items-center gap-2">
              <span>الطبيب المعالج:</span>
              <Input
                value={doctorName}
                onChange={(event) => onDoctorNameChange(event.target.value)}
                className="h-7 w-40 text-center text-sm"
                readOnly={!canManageList || activeTab !== TAB_OTHERS}
              />
            </label>
          )}
          {!compact && (
            <div className="flex items-center gap-2">
              <span>نوع العملية:</span>
              <select
                value={operationType}
                onChange={(event) => onOperationTypeChange(event.target.value)}
                disabled={!canManageList}
                className="rounded border border-gray-300 bg-white px-2 py-1 text-sm"
              >
                <option value="">-- اختر النوع --</option>
                {operationOptions.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
              {operationType === "Other" && (
                <Input
                  value={operationTypeOther}
                  onChange={(event) => onOperationTypeOtherChange(event.target.value)}
                  disabled={!canManageList}
                  className="h-7 w-36 text-center text-sm"
                  placeholder="أخرى"
                />
              )}
            </div>
          )}
          <label className="flex items-center gap-2">
            <span>الساعة:</span>
            <Input
              type="time"
              value={listTime}
              onChange={(event) => onListTimeChange(event.target.value)}
              disabled={!canManageList}
              className="h-7 w-32 text-center text-sm"
            />
          </label>
        </div>
        <div className="hidden items-center justify-center gap-6 text-[14px] print:flex">
          <div>{formatDayDateLong(toDateInputValue(listDate) || getLocalDateIso())}</div>
          <div>الطبيب المعالج: {doctorName || "-"}</div>
          <div>الساعة: {listTime || "-"}</div>
        </div>
        <div className="mt-4 flex flex-wrap items-center justify-center gap-2 print:hidden">
          <Button variant="outline" size="sm" onClick={onSaveList} disabled={!canManageList}>
            <Save className="mr-2 h-4 w-4" />
            {compact ? "حفظ" : "حفظ القائمة"}
          </Button>
          {!compact && (
            <Button
              variant={autoSaveEnabled ? "default" : "outline"}
              size="sm"
              onClick={onAutoSaveToggle}
              disabled={!canManageList}
              className={autoSaveEnabled ? "bg-green-600 text-white hover:bg-green-700" : ""}
            >
              الحفظ التلقائي: {autoSaveEnabled ? "مفعل" : "متوقف"}
            </Button>
          )}
          {!compact && (
            <Button variant="outline" size="sm" onClick={onNewList} disabled={!canManageList}>
              <RotateCcw className="mr-2 h-4 w-4" />
              قائمة جديدة
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={onPrint}>
            <Printer className="mr-2 h-4 w-4" />
            طباعة
          </Button>
          {!compact && (
            <Button variant="outline" size="sm" onClick={onSaveJpg}>
              <ImageDown className="mr-2 h-4 w-4" />
              حفظ JPG
            </Button>
          )}
          {!compact && (
            <Button variant="outline" size="sm" onClick={onShareJpg}>
              <Share2 className="mr-2 h-4 w-4" />
              مشاركة JPG
            </Button>
          )}
        </div>
      </div>

      {canManageList && (
        <div className="mb-4 space-y-3 print:hidden" dir="rtl">
          <Input
            value={patientSearchTerm}
            onChange={(event) => onPatientSearchTermChange(event.target.value)}
            placeholder="ابحث في جدول المرضى بالكود أو الاسم أو الموبايل"
            className="ml-auto w-full max-w-md text-right"
          />
          {debouncedPatientSearch.trim().length >= 1 && (
            <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
              <table className="w-full min-w-[520px] border-collapse text-center text-xs">
                <thead>
                  <tr className="bg-slate-100">
                    <th className="border border-slate-200 px-3 py-2">الكود</th>
                    <th className="border border-slate-200 px-3 py-2">اسم المريض</th>
                    <th className="border border-slate-200 px-3 py-2">الهاتف</th>
                    <th className="w-24 border border-slate-200 px-3 py-2">إضافة</th>
                  </tr>
                </thead>
                <tbody>
                  {patientSearchQuery.isLoading && (
                    <tr>
                      <td colSpan={4} className="px-3 py-4 text-muted-foreground">
                        جاري البحث...
                      </td>
                    </tr>
                  )}
                  {!patientSearchQuery.isLoading && ((patientSearchQuery.data as any[])?.length ?? 0) === 0 && (
                    <tr>
                      <td colSpan={4} className="px-3 py-4 text-muted-foreground">
                        لا توجد نتائج
                      </td>
                    </tr>
                  )}
                  {!patientSearchQuery.isLoading &&
                    ((patientSearchQuery.data as any[]) ?? []).map((patient: any) => (
                      <tr key={patient.id} className="hover:bg-slate-50">
                        <td className="border border-slate-200 px-3 py-2" dir="ltr">
                          {patient.patientCode || "-"}
                        </td>
                        <td className="border border-slate-200 px-3 py-2">{patient.fullName || "-"}</td>
                        <td className="border border-slate-200 px-3 py-2" dir="ltr">
                          {patient.phone || "-"}
                        </td>
                        <td className="border border-slate-200 px-3 py-2">
                          <Button type="button" size="sm" variant="outline" onClick={() => onAddPatientRow(patient)}>
                            <Plus className="ml-1 h-4 w-4" />
                            إضافة
                          </Button>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      <div className="mb-2 text-xs text-muted-foreground">
        التاريخ: {exportDateLabel} | الساعة: {exportTimeLabel} | الطبيب: {exportDoctorLabel} | نوع العملية: {exportOperationLabel}
      </div>
    </>
  );
}
