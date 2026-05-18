import { ImageDown, Plus, Printer, RotateCcw, Save, Share2, X, ChevronDown } from "lucide-react";
import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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
  const [searchOpen, setSearchOpen] = useState(false);

  return (
    <>
      {/* Print-only header */}
      <div className="hidden items-center justify-center gap-6 text-[14px] print:flex">
        <div>{formatDayDateLong(toDateInputValue(listDate) || getLocalDateIso())}</div>
        <div>الطبيب المعالج: {doctorName || "-"}</div>
        <div>الساعة: {listTime || "-"}</div>
      </div>

      {/* Toolbar row 1: date/time + operation type + actions */}
      <div className="flex flex-wrap items-center gap-2 print:hidden" dir="rtl">
        {/* Date + time */}
        <div className="flex items-center gap-1.5">
          <input
            type="date"
            value={toDateInputValue(listDate)}
            onChange={(e) => onListDateChange(e.target.value || getLocalDateIso())}
            disabled={!canManageList}
            className="h-8 w-[150px] rounded-md border border-border/60 bg-background px-2 text-xs tabular-nums outline-none focus:border-primary focus:ring-1 focus:ring-primary/30 disabled:cursor-not-allowed disabled:opacity-50"
          />
          <input
            type="time"
            value={listTime}
            onChange={(e) => onListTimeChange(e.target.value)}
            disabled={!canManageList}
            className="h-8 w-[115px] rounded-md border border-border/60 bg-background px-2 text-xs tabular-nums outline-none focus:border-primary focus:ring-1 focus:ring-primary/30 disabled:cursor-not-allowed disabled:opacity-50"
          />
        </div>

        {/* Doctor name (others tab only) */}
        {activeTab === TAB_OTHERS && (
          <Input
            value={doctorName}
            onChange={(e) => onDoctorNameChange(e.target.value)}
            className="h-8 w-32 text-center text-xs"
            readOnly={!canManageList}
            placeholder="الطبيب"
          />
        )}

        {/* Operation type combo */}
        <div className="w-[168px] shrink-0">
          <Select value={operationType || "__all__"} onValueChange={(value) => onOperationTypeChange(value === "__all__" ? "" : value)}>
            <SelectTrigger className="h-8 w-full text-xs">
              <SelectValue placeholder="نوع العملية" />
            </SelectTrigger>
            <SelectContent align="start">
              <SelectItem value="__all__">الكل</SelectItem>
              {operationOptions.map((opt) => (
                <SelectItem key={opt} value={opt}>
                  {operationTypeLabel(opt)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Action buttons */}
        <div className="flex items-center gap-1.5">
          {canManageList && (
            <Button size="sm" className="gap-1.5 text-xs h-8" onClick={() => { setSearchOpen(true); searchRef.current?.focus(); }}>
              <Plus className="h-3.5 w-3.5" />
              إضافة مريض
            </Button>
          )}
          <Button variant="outline" size="sm" className="gap-1.5 text-xs h-8" onClick={onSaveList} disabled={!canManageList}>
            <Save className="h-3.5 w-3.5" />
            حفظ
          </Button>
          <Button
            variant={autoSaveEnabled ? "default" : "outline"}
            size="sm"
            className={cn("gap-1 text-xs h-8", autoSaveEnabled && "bg-emerald-600 text-white hover:bg-emerald-700")}
            onClick={onAutoSaveToggle}
            disabled={!canManageList}
          >
            {autoSaveEnabled ? "تلقائي" : "يدوي"}
          </Button>
          <Button variant="outline" size="sm" className="gap-1 text-xs h-8" onClick={onNewList} disabled={!canManageList}>
            <RotateCcw className="h-3.5 w-3.5" />
          </Button>
          <Button variant="outline" size="sm" className="gap-1 text-xs h-8" onClick={onPrint}>
            <Printer className="h-3.5 w-3.5" />
          </Button>
          <Button variant="outline" size="sm" className="gap-1 text-xs h-8" onClick={onSaveJpg}>
            <ImageDown className="h-3.5 w-3.5" />
          </Button>
          <Button variant="outline" size="sm" className="gap-1 text-xs h-8" onClick={onShareJpg}>
            <Share2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {/* Row 2: Patient search (collapsible) */}
      {searchOpen && canManageList && (
        <div className="space-y-2 print:hidden" dir="rtl">
          <div className="flex items-center gap-2">
            <Input
              ref={searchRef}
              value={patientSearchTerm}
              onChange={(e) => onPatientSearchTermChange(e.target.value)}
              placeholder="ابحث بالكود أو الاسم أو الموبايل"
              className="h-8 flex-1 text-right text-xs"
              autoFocus
            />
            <button
              type="button"
              onClick={() => { setSearchOpen(false); onPatientSearchTermChange(""); }}
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/60"
              aria-label="إغلاق البحث"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
          {debouncedPatientSearch.trim().length >= 1 && (
            <div className="overflow-x-auto rounded-lg border border-border/50 bg-background">
              <table className="w-full min-w-[480px] border-collapse text-center text-xs">
                <thead>
                  <tr className="bg-muted/50">
                    <th className="border-b border-border/50 px-3 py-1.5 font-medium">الكود</th>
                    <th className="border-b border-border/50 px-3 py-1.5 font-medium">اسم المريض</th>
                    <th className="border-b border-border/50 px-3 py-1.5 font-medium">الهاتف</th>
                    <th className="w-24 border-b border-border/50 px-3 py-1.5 font-medium">إضافة</th>
                  </tr>
                </thead>
                <tbody>
                  {patientSearchQuery.isLoading && (
                    <tr><td colSpan={4} className="px-3 py-3 text-muted-foreground">جاري البحث...</td></tr>
                  )}
                  {!patientSearchQuery.isLoading && ((patientSearchQuery.data as any[])?.length ?? 0) === 0 && (
                    <tr><td colSpan={4} className="px-3 py-3 text-muted-foreground">لا توجد نتائج</td></tr>
                  )}
                  {!patientSearchQuery.isLoading && ((patientSearchQuery.data as any[]) ?? []).map((patient: any) => (
                    <tr key={patient.id} className="hover:bg-muted/30 transition-colors">
                      <td className="px-3 py-1.5 border-b border-border/30" dir="ltr">{patient.patientCode || "-"}</td>
                      <td className="px-3 py-1.5 border-b border-border/30">{patient.fullName || "-"}</td>
                      <td className="px-3 py-1.5 border-b border-border/30" dir="ltr">{patient.phone || "-"}</td>
                      <td className="px-3 py-1.5 border-b border-border/30">
                        <Button type="button" size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={() => { onAddPatientRow(patient); onPatientSearchTermChange(""); }}>
                          <Plus className="h-3 w-3" />إضافة
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

    </>
  );
}
