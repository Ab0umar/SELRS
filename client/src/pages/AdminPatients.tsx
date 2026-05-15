import { useCallback, useMemo, useState } from "react";
import { BarChart3, Users, RefreshCw, AlertCircle } from "lucide-react";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { toast } from "sonner";
import { BulkActionsBar } from "@/components/admin-patients/BulkActionsBar";
import { AdminPatientsTable } from "@/components/admin-patients/AdminPatientsTable";
import { AdminPatientsToolbar } from "@/components/admin-patients/AdminPatientsToolbar";
import { StatCard } from "@/components/admin-patients/StatCard";
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
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [confirmAction, setConfirmAction] = useState<"reset-service-type" | null>(null);

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
  const resetPatientServiceTypesMutation = trpc.medical.resetPatientServiceTypesFromServiceCode.useMutation();


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

  return (
    <div className="w-full space-y-6 px-2 pb-4 text-right sm:px-4 lg:px-6" dir="rtl">
      <Card dir="rtl" className="border-border bg-card text-right shadow-sm">
        <CardHeader className="flex flex-col gap-4 space-y-0 border-b border-border py-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex h-11 w-11 sm:h-10 sm:w-10 items-center justify-center rounded-xl bg-secondary/10 text-secondary">
              <Users className="h-5 w-5" />
            </div>
            <Badge variant="secondary" className="tabular-nums">
              {list.patientDashboardRollup.totalUnique}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-6 p-4 sm:p-6">
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <div className="space-y-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-2 font-semibold text-foreground">
                  <BarChart3 className="h-4 w-4 text-secondary" aria-hidden />
                  <span className="text-sm sm:text-base">إحصائيات شهرية ({monthTitleKey})</span>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Select value={list.statsMonth} onValueChange={list.setStatsMonth}>
                    <SelectTrigger className="h-9 w-24 rounded-lg text-sm">
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
                    <SelectTrigger className="h-9 w-20 rounded-lg text-sm">
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
              <div className="grid grid-cols-2 gap-2 text-center sm:grid-cols-4 sm:gap-3">
                {monthlyBannerStats.map((item) => (
                  <StatCard
                    key={item.label}
                    label={item.label}
                    value={item.value}
                    isTotal={item.label === "الإجمالي"}
                  />
                ))}
              </div>
            </div>
            <div className="space-y-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:flex-wrap">
                <div className="flex items-center gap-2 font-semibold text-foreground">
                  <BarChart3 className="h-4 w-4 text-secondary" aria-hidden />
                  <span className="text-sm sm:text-base">إحصائيات سنوية ({list.statsYear})</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-9 gap-2 rounded-lg text-sm"
                    onClick={() => syncRegistrationCatalogMutation.mutate()}
                    disabled={syncRegistrationCatalogMutation.isPending}
                    aria-label="مزامنة قائمة الخدمات والأطباء من MSSQL"
                  >
                    <RefreshCw className="h-4 w-4" />
                    {syncRegistrationCatalogMutation.isPending ? "جاري..." : "مزامنة"}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-9 rounded-lg text-sm"
                    disabled={resetPatientServiceTypesMutation.isPending}
                    onClick={async () => {
                      try {
                        const out = await resetPatientServiceTypesMutation.mutateAsync({
                          dryRun: true,
                        });
                        toast.success(`فحص جاهز: سيتم تعديل ${out.updated} من أصل ${out.scanned}`);
                      } catch (error: any) {
                        toast.error("فشل الفحص: " + (error?.message || "خطأ غير معروف"));
                      }
                    }}
                    aria-label="فحص (بدون تعديل) لتحديث serviceType حسب آخر كود خدمة"
                  >
                    فحص التصحيح
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-9 rounded-lg text-sm border-warning text-warning hover:bg-warning/10 focus-visible:ring-2 focus-visible:ring-warning focus-visible:ring-offset-2"
                    disabled={resetPatientServiceTypesMutation.isPending}
                    onClick={() => {
                      setConfirmAction("reset-service-type");
                      setConfirmDialogOpen(true);
                    }}
                    aria-label="تطبيق التصحيح الفعلي"
                  >
                    تطبيق التصحيح
                  </Button>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2 text-center sm:grid-cols-4 sm:gap-3">
                {yearlyBannerStats.map((item) => (
                  <StatCard
                    key={item.label}
                    label={item.label}
                    value={item.value}
                    isTotal={item.label === "الإجمالي"}
                  />
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

      <ConfirmDialog
        open={confirmDialogOpen}
        title="تطبيق التصحيح"
        description="تشغيل تصحيح serviceType لكل المرضى حسب آخر كود خدمة؟ لا يمكن التراجع عن هذا الإجراء."
        confirmLabel="تطبيق"
        cancelLabel="إلغاء"
        isDestructive={true}
        isPending={resetPatientServiceTypesMutation.isPending}
        onConfirm={async () => {
          try {
            const out = await resetPatientServiceTypesMutation.mutateAsync({
              dryRun: false,
            });
            toast.success(`تم تصحيح ${out.updated} مريض`);
            await list.utils.medical.getAllPatients.invalidate();
            setConfirmDialogOpen(false);
            setConfirmAction(null);
          } catch (error: any) {
            toast.error("فشل التصحيح: " + (error?.message || "خطأ غير معروف"));
          }
        }}
        onCancel={() => {
          setConfirmDialogOpen(false);
          setConfirmAction(null);
        }}
      />
    </div>
  );
}
