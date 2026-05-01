import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ImportDialog } from "./ImportDialog";
import { SearchBar } from "@/components/shared/SearchBar";
import { Calendar, Eye, Loader2, Save } from "lucide-react";
import { type ImportPreviewRow, type SheetTypeChoice } from "@/hooks/admin-patients/adminPatientsShared";

type AdminPatientsToolbarProps = {
  dateFrom: string;
  dateTo: string;
  doctorFilter: string;
  doctorOptions: string[];
  applyImportPending: boolean;
  importDateFormat: "" | "DMY" | "MDY";
  importPreviewOpen: boolean;
  importPreviewRows: ImportPreviewRow[];
  importSummary: { total: number; valid: number; invalid: number } | null;
  isDeleteAllPending: boolean;
  isSavePending: boolean;
  applyFiltersPending?: boolean;
  locationFilter: "all" | "center" | "external";
  normalizeTypedDateInput: (value: string) => string;
  onApplyImport: () => void;
  onDateFromChange: (value: string) => void;
  onDateToChange: (value: string) => void;
  onDeleteAll: () => void;
  onDownloadImportErrors: () => void;
  onDoctorFilterChange: (value: string) => void;
  onImportDateFormatChange: (value: "" | "DMY" | "MDY") => void;
  onImportFile: (file: File) => void;
  onImportOpenChange: (open: boolean) => void;
  onLocationFilterChange: (value: "all" | "center" | "external") => void;
  onApplyFilters: () => void | Promise<void>;
  onSaveAll: () => void;
  onSearchTermChange: (value: string) => void;
  onServiceTypeFilterChange: (value: "all" | SheetTypeChoice) => void;
  searchTerm: string;
  serviceTypeFilter: "all" | SheetTypeChoice;
  showDoctorRecords: boolean;
};

export function AdminPatientsToolbar({
  dateFrom,
  dateTo,
  doctorFilter,
  doctorOptions,
  applyImportPending,
  importDateFormat,
  importPreviewOpen,
  importPreviewRows,
  importSummary,
  isDeleteAllPending,
  isSavePending,
  applyFiltersPending,
  locationFilter,
  onApplyImport,
  normalizeTypedDateInput,
  onDateFromChange,
  onDateToChange,
  onDeleteAll,
  onDownloadImportErrors,
  onDoctorFilterChange,
  onImportDateFormatChange,
  onImportFile,
  onImportOpenChange,
  onLocationFilterChange,
  onApplyFilters,
  onSaveAll,
  onSearchTermChange,
  onServiceTypeFilterChange,
  searchTerm,
  serviceTypeFilter,
  showDoctorRecords,
}: AdminPatientsToolbarProps) {
  return (
    <div className="space-y-4 rounded-xl border border-border bg-card p-4 shadow-sm" dir="rtl">
      {/* صف المرجع: بحث واسع + كل الأطباء + كل الأنواع + كل الأماكن */}
      <div className="flex flex-col gap-3 lg:flex-row lg:flex-wrap lg:items-center lg:gap-3">
        <SearchBar
          value={searchTerm}
          onChange={onSearchTermChange}
          placeholder="بحث بالاسم، الكود، الطبيب، الخدمة…"
          className="min-w-0 w-full flex-1 lg:min-w-[280px]"
        />
        <div className="flex w-full flex-wrap items-center gap-2 lg:w-auto lg:flex-nowrap">
          <Select value={doctorFilter} onValueChange={onDoctorFilterChange}>
            <SelectTrigger className="min-w-[min(100%,200px)] flex-1 rounded-lg lg:min-w-[200px] lg:flex-none">
              <SelectValue placeholder="كل الأطباء" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">كل الأطباء</SelectItem>
              {doctorOptions.map((doctor) => (
                <SelectItem key={doctor} value={doctor}>
                  {doctor}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={serviceTypeFilter} onValueChange={(value) => onServiceTypeFilterChange(value as "all" | SheetTypeChoice)}>
            <SelectTrigger className="min-w-[min(100%,180px)] flex-1 rounded-lg lg:min-w-[180px] lg:flex-none">
              <SelectValue placeholder="كل الأنواع" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">كل الأنواع</SelectItem>
              <SelectItem value="consultant">استشاري</SelectItem>
              <SelectItem value="specialist">أخصائي</SelectItem>
              <SelectItem value="pentacam_c">Pentacam C</SelectItem>
              <SelectItem value="pentacam_ex">Pentacam Ex</SelectItem>
              <SelectItem value="pentacam_ex_c">Pentacam Ex.C</SelectItem>
              <SelectItem value="lasik">ليزك</SelectItem>
              <SelectItem value="external">خارجي</SelectItem>
            </SelectContent>
          </Select>
          <Select value={locationFilter} onValueChange={(value) => onLocationFilterChange(value as "all" | "center" | "external")}>
            <SelectTrigger className="min-w-[min(100%,160px)] flex-1 rounded-lg lg:min-w-[160px] lg:flex-none">
              <SelectValue placeholder="كل الأماكن" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">كل الأماكن</SelectItem>
              <SelectItem value="center">المركز</SelectItem>
              <SelectItem value="external">خارجي</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-end gap-2 border-t border-border/50 pt-3">
        <span className="text-sm text-muted-foreground">من:</span>
        <div className="relative flex items-center gap-2">
          <Calendar className="pointer-events-none absolute left-2 h-4 w-4 opacity-40" aria-hidden />
          <Input
            type="text"
            value={dateFrom}
            onChange={(event) => onDateFromChange(event.target.value)}
            onBlur={(event) => onDateFromChange(normalizeTypedDateInput(event.target.value))}
            className="w-[148px] pl-9"
            placeholder="تاريخ"
            dir="ltr"
          />
        </div>
        <span className="text-sm text-muted-foreground">إلى:</span>
        <div className="relative flex items-center gap-2">
          <Calendar className="pointer-events-none absolute left-2 h-4 w-4 opacity-40" aria-hidden />
          <Input
            type="text"
            value={dateTo}
            onChange={(event) => onDateToChange(event.target.value)}
            onBlur={(event) => onDateToChange(normalizeTypedDateInput(event.target.value))}
            className="w-[148px] pl-9"
            placeholder="تاريخ"
            dir="ltr"
          />
        </div>
      </div>

      {showDoctorRecords ? <div className="text-xs font-medium text-primary">عرض خاص بسجل طبيب — قد تظهر أكثر من 50 سجلاً</div> : null}

      <div className="flex flex-wrap items-center justify-end gap-2 border-t border-border/70 pt-4">
        <Button
          type="button"
          variant="secondary"
          className="gap-2 rounded-lg"
          disabled={Boolean(applyFiltersPending)}
          onClick={() => void Promise.resolve(onApplyFilters())}
        >
          {applyFiltersPending ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : null}
          {applyFiltersPending ? "جاري التطبيق…" : "تطبيق"}
        </Button>
        <Button variant="outline" className="gap-2 rounded-lg" onClick={onSaveAll} disabled={isSavePending}>
          <Save className="h-4 w-4 text-primary" aria-hidden />
          حفظ الكل
        </Button>
        <ImportDialog
          applyImportPending={applyImportPending}
          importDateFormat={importDateFormat}
          importPreviewOpen={importPreviewOpen}
          importPreviewRows={importPreviewRows}
          importSummary={importSummary}
          trigger={
            <Button variant="outline" type="button" className="gap-2 rounded-lg">
              <Eye className="h-4 w-4" aria-hidden />
              معاينة
            </Button>
          }
          onApply={onApplyImport}
          onDateFormatChange={onImportDateFormatChange}
          onDownloadErrors={onDownloadImportErrors}
          onImportFile={onImportFile}
          onOpenChange={onImportOpenChange}
        />
        <Button variant="destructive" className="gap-2 rounded-lg" onClick={onDeleteAll} disabled={isDeleteAllPending}>
          حذف الكل
        </Button>
      </div>
    </div>
  );
}
