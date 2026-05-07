import { useCallback, useMemo } from "react";
import { BarChart3, Users, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { BulkActionsBar } from "@/components/admin-patients/BulkActionsBar";
import { AdminPatientsTable } from "@/components/admin-patients/AdminPatientsTable";
import { AdminPatientsToolbar } from "@/components/admin-patients/AdminPatientsToolbar";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAdminPatientsBulk } from "@/hooks/admin-patients/useAdminPatientsBulk";
import { useAdminPatientsList } from "@/hooks/admin-patients/useAdminPatientsList";
import { trpc } from "@/lib/trpc";

const MONTHS_AR = [
  "يناير",
  "فبراير",
  "مارس",
  "أبريل",
  "مايو",
  "يونيو",
  "يوليو",
  "أغسطس",
  "سبتمبر",
  "أكتوبر",
  "نوفمبر",
  "ديسمبر",
];

export default function AdminPatients() {
  const list = useAdminPatientsList();
  const bulk = useAdminPatientsBulk({
    activeDoctors: list.activeDoctors,
    filteredPatients: list.filteredPatients,
    getRowServiceCode: list.getRowServiceCode,
    savePatientPageStateMutation: list.savePatientPageStateMutation,
    setManualLockOverrides: list.setManualLockOverrides,
  });

  const syncRegistrationCatalogMutation = trpc.medical.syncRegistrationCatalogFromMssql.useMutation({
    onSuccess: (data) => {
      toast.success(`تم مزامنة: ${data.servicesUpserted} خدمة، ${data.doctorsUpserted} طبيب`);
      list.utils.medical.getRegistrationCatalog.invalidate();
    },
    onError: (error) => {
      toast.error("فشلت المزامنة: " + (error.message || "خطأ غير معروف"));
    },
  });

  const handleApplyFilters = useCallback(async () => {
    await Promise.all([
      list.utils.medical.getAllPatients.invalidate(),
      list.utils.medical.getPatientStats.invalidate(),
    ]);
    toast.success("تم تحديث القائمة والإحصائيات.");
  }, [list.utils]);

  const monthLabelShort = MONTHS_AR[Math.max(0, Math.min(11, Number(list.statsMonth) - 1))] ?? list.statsMonth;
  const monthTitleKey = `${String(list.statsMonth).padStart(2, "0")}/${list.statsYear}`;
  const monthlyBannerStats = [
    { label: "الليزك", value: list.monthStats.lasik },
    { label: "المركز", value: list.monthStats.center },
    { label: "خارجي", value: list.monthStats.external },
    { label: "الإجمالي", value: list.monthStats.total },
  ];
  const yearlyBannerStats = [
    { label: "الليزك", value: list.yearStats.lasik },
    { label: "المركز", value: list.yearStats.center },
    { label: "خارجي", value: list.yearStats.external },
    { label: "الإجمالي", value: list.yearStats.total },
  ];

  const doctorNamesForRows = useMemo(() => list.doctorOptions, [list.doctorOptions]);

  return (
    <div className="w-full space-y-5 px-2 pb-2 text-right sm:px-3 lg:px-4" dir="rtl">
      <Card dir="rtl" className="border-border/90 bg-card text-right shadow-sm">
        <CardHeader className="flex flex-col gap-4 space-y-0 border-b border-border/70 py-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Users className="h-5 w-5" />
            </div>
            <Badge variant="secondary" className="tabular-nums">
              {list.patientDashboardRollup.totalUnique}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4 p-3 sm:p-4 lg:p-5">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <div className="rounded-xl border border-border/80 bg-card p-3 shadow-sm">
              <div className="mb-2 flex flex-wrap items-center justify-between gap-2 border-b border-border/60 pb-2">
                <div className="flex items-center gap-2 font-semibold text-foreground">
                  <BarChart3 className="h-3.5 w-3.5 text-primary" aria-hidden />
                  <span className="text-sm">إحصائيات شهرية ({monthTitleKey})</span>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Select value={list.statsMonth} onValueChange={list.setStatsMonth}>
                    <SelectTrigger className="h-8 min-w-[120px] rounded-lg">
                      <SelectValue>{monthLabelShort}</SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {Array.from({ length: 12 }).map((_, idx) => {
                        const value = String(idx + 1).padStart(2, "0");
                        return (
                          <SelectItem key={value} value={value}>
                            {MONTHS_AR[idx] ?? value}
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                  <Select value={list.statsYear} onValueChange={list.setStatsYear}>
                    <SelectTrigger className="h-8 min-w-[94px] rounded-lg">
                      <SelectValue placeholder="السنة" />
                    </SelectTrigger>
                    <SelectContent>
                      {list.years.map((year) => (
                        <SelectItem key={year} value={year}>
                          {year}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-4 gap-1.5 text-center">
                {monthlyBannerStats.map((item) => (
                  <div key={item.label} className="rounded-lg border border-border/60 bg-muted/20 px-2 py-1.5">
                    <p className="text-[11px] font-medium text-muted-foreground leading-tight">{item.label}</p>
                    <p className="mt-0.5 text-lg font-black tabular-nums leading-none text-foreground">{item.value}</p>
                  </div>
                ))}
              </div>
            </div>
            <div className="rounded-xl border border-border/80 bg-card p-3 shadow-sm">
              <div className="mb-2 flex flex-wrap items-center justify-between gap-2 border-b border-border/60 pb-2">
                <div className="flex items-center gap-2 font-semibold text-foreground">
                  <BarChart3 className="h-3.5 w-3.5 text-primary" aria-hidden />
                  <span className="text-sm">إحصائيات سنوية ({list.statsYear})</span>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-8 gap-2 rounded-lg"
                  onClick={() => syncRegistrationCatalogMutation.mutate()}
                  disabled={syncRegistrationCatalogMutation.isPending}
                  title="مزامنة قائمة الخدمات والأطباء من MSSQL"
                >
                  <RefreshCw className="h-4 w-4" />
                  {syncRegistrationCatalogMutation.isPending ? "جاري المزامنة..." : "مزامنة الكتالوج"}
                </Button>
              </div>
              <div className="grid grid-cols-4 gap-1.5 text-center">
                {yearlyBannerStats.map((item) => (
                  <div key={item.label} className="rounded-lg border border-border/60 bg-muted/20 px-2 py-1.5">
                    <p className="text-[11px] font-medium text-muted-foreground leading-tight">{item.label}</p>
                    <p className="mt-0.5 text-lg font-black tabular-nums leading-none text-foreground">{item.value}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <AdminPatientsToolbar
            applyFiltersPending={list.patientsQuery.isFetching}
            applyImportPending={bulk.applyImportMutation.isPending}
            dateFrom={list.dateFrom}
            dateTo={list.dateTo}
            doctorFilter={list.doctorFilter}
            doctorOptions={list.doctorOptions}
            importDateFormat={bulk.importDateFormat}
            importPreviewOpen={bulk.importPreviewOpen}
            importPreviewRows={bulk.importPreviewRows}
            importSummary={bulk.importSummary}
            isDeleteAllPending={list.deleteAllPatientsMutation.isPending}
            isSavePending={list.updatePatientMutation.isPending}
            locationFilter={list.locationFilter}
            normalizeTypedDateInput={list.normalizeTypedDateInput}
            onApplyFilters={handleApplyFilters}
            onApplyImport={bulk.applyStagedImport}
            onDateFromChange={list.setDateFrom}
            onDateToChange={list.setDateTo}
            onDeleteAll={list.handleDeleteAll}
            onDownloadImportErrors={bulk.downloadInvalidImportCsv}
            onDoctorFilterChange={list.setDoctorFilter}
            onImportDateFormatChange={bulk.setImportDateFormat}
            onImportFile={bulk.handleImportPatients}
            onImportOpenChange={bulk.setImportPreviewOpen}
            onLocationFilterChange={list.setLocationFilter}
            onSaveAll={list.handleSaveAll}
            onSearchTermChange={list.setSearchTerm}
            onServiceTypeFilterChange={list.setServiceTypeFilter}
            searchTerm={list.searchTerm}
            serviceTypeFilter={list.serviceTypeFilter}
            showDoctorRecords={list.doctorFilter !== "all"}
          />

          <BulkActionsBar
            activeDoctors={list.activeDoctors}
            bulkDoctorId={bulk.bulkDoctorId}
            bulkManualLock={bulk.bulkManualLock}
            bulkSheetType={bulk.bulkSheetType}
            canUndo={bulk.lastBulkSnapshots.length > 0}
            isBusy={list.updatePatientMutation.isPending}
            isSaveStatePending={list.savePatientPageStateMutation.isPending}
            isUndoPending={bulk.bulkRestoreMutation.isPending}
            onBulkDoctorChange={bulk.setBulkDoctorId}
            onBulkManualLockChange={bulk.setBulkManualLock}
            onBulkSheetTypeChange={bulk.setBulkSheetType}
            onSetFilteredDoctor={bulk.handleSetFilteredDoctor}
            onSetFilteredManualLock={bulk.handleSetFilteredManualLock}
            onSetFilteredSheetType={bulk.handleSetFilteredSheetType}
            onUndoLastBulkAction={bulk.handleUndoLastBulkAction}
          />

          <AdminPatientsTable
            allVisibleSelected={list.allVisibleSelected}
            currentPage={list.currentPage}
            deletePatientPending={list.deletePatientMutation.isPending}
            deletePatientFromMssqlPending={list.deletePatientFromMssqlMutation.isPending}
            doctorSelectOptions={doctorNamesForRows}
            getDraft={list.getDraft}
            hasMore={list.hasMore}
            isExpanded={list.isExpanded}
            isManualLockEnabled={list.isManualLockEnabled}
            nextCursor={list.nextCursor}
            onDeleteFromMssql={list.handleDeleteFromMssql}
            onDeletePatient={list.handleDeletePatient}
            onNextPage={list.goToNextPage}
            onPreviousPage={list.goToPreviousPage}
            onSavePatientRow={list.savePatientRow}
            onSetDraftField={list.setDraftField}
            onToggleExpanded={list.toggleExpanded}
            onToggleManualLock={list.handleToggleManualLock}
            onToggleSelectAllVisible={list.toggleSelectAllVisible}
            onToggleSelectedPatient={list.toggleSelectedPatient}
            pageSize={list.pageSize}
            patientsLoading={list.patientsQuery.isLoading}
            rowSaveState={list.rowSaveState}
            savePatientPageStatePending={list.savePatientPageStateMutation.isPending}
            selectedPatients={list.selectedPatients}
            serviceCodeToLabel={list.serviceCodeToLabel}
            setPageSize={list.setPageSize}
            updatePatientPending={list.updatePatientMutation.isPending}
            visiblePatients={list.visiblePatients}
          />
        </CardContent>
      </Card>
    </div>
  );
}
