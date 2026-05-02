import { useState } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { PatientsHeader } from "@/components/patients/PatientsHeader";
import { PatientsFilters } from "@/components/patients/PatientsFilters";
import { PatientsTabs } from "@/components/patients/PatientsTabs";
import { PatientsTable } from "@/components/patients/PatientsTable";
import { usePatientsList } from "@/hooks/patients/usePatientsList";
import { usePatientsActions } from "@/hooks/patients/usePatientsActions";
import { StatCard, STAT_CARDS_MOBILE_ROW } from "@/components/shared/StatCard";
import { cn } from "@/lib/utils";
import { Users, Stethoscope, Eye, CalendarCheck } from "lucide-react";
import { PullToRefresh } from "@/components/PullToRefresh";
import { OfflinePageState } from "@/components/OfflinePageState";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";



export default function Patients() {
  const { user, isAuthenticated } = useAuth();
  const [location, setLocation] = useLocation();
  const patientDetailPath = (id: number) =>
    location.startsWith("/patient-hub") ? `/patient-hub/file/${id}` : `/patients/${id}`;
  const isAdmin = user?.role === "admin";
  const canEditPatients = user?.role === "admin" || user?.role === "manager" || user?.role === "reception";

  const {
    searchTerm,
    setSearchTerm,
    isSearchFocused,
    setIsSearchFocused,
    activeSuggestionIndex,
    setActiveSuggestionIndex,
    cursor,
    setCursor,
    cursorHistory,
    setCursorHistory,
    pageSize,
    setPageSize,
    dateFrom,
    setDateFrom,
    dateTo,
    setDateTo,
    activeTab,
    setActiveTab,
    userStateQuery,
    doctorDirectoryQuery,
    serviceDirectoryQuery,
    patientsQuery,
    currentPatients,
    tabFilteredPatients,
    filteredPatients,
    searchSuggestions,
    groupedSearchSuggestions,
    flatSearchSuggestions,
    filteredRowKeys,
    isAllSelected,
    selectedCount,
    serviceCodeToLabel,
    serviceCodeToType,
    serviceTypeToDefaultName,
    hasMore,
    nextCursor,
    currentPage,
    getPatientRowKey,
    resolveServiceTypes,
    availableDoctors,
    doctorsLoading,
  } = usePatientsList(isAuthenticated);

  const {
    createPatientMutation,
    updatePatientMutation,
    deletePatientMutation,
    saveSheetMutation,
    savePatientStateMutation,
    bulkAssignSheetMutation,
    stageImportMutation,
    applyImportMutation,
    downloadInvalidImportCsv,
    applyStagedImport,
    handleImportPatients,
    handleUpdatePatient,
    handleDeletePatient,
    handleSavePatientFromForm,
    importDateFormat,
    setImportDateFormat,
    importBatchId,
    setImportBatchId,
    importSummary,
    setImportSummary,
    importPreviewRows,
    setImportPreviewRows,
    importPreviewOpen,
    setImportPreviewOpen,
    fileInputRef,
  } = usePatientsActions(isAuthenticated, patientsQuery, trpc.useUtils());

  if (!isAuthenticated) return null;

  const handleOpenSheet = (serviceType: string, patientId: number) => {
    const patient = currentPatients.find((entry) => Number(entry.id) === Number(patientId));
    const url = `/sheets/${serviceType === "surgery" ? "operation" : serviceType === "external" ? "external" : serviceType}/${patientId}`;
    // Simplification for now, should use the logic from original file if more complex
    setLocation(url);
  };

  const handlePrintSheet = (serviceType: string, patientId: number) => {
    // Logic for printing
    window.open(`/print/sheets/${serviceType}/${patientId}`, "_blank");
  };

  const handleOpenRefraction = (patientId: number) => {
    setLocation(`/refraction/${patientId}`);
  };

  const handlePrintRefraction = (patientId: number) => {
    window.open(`/print/refraction/${patientId}`, "_blank");
  };

  const handleOpenFollowup = (serviceType: string, patientId: number) => {
    setLocation(`/sheets/${serviceType}/${patientId}/followup`);
  };

  const [selectedRowKeys, setSelectedRowKeys] = useState<Set<string>>(new Set());

  return (
    <div className="min-h-screen bg-background" dir="rtl" style={{ direction: "rtl", textAlign: "center" }}>
      <PatientsHeader 
        canEditPatients={canEditPatients} 
        onAddNewPatient={() => setLocation("/examination")} 
      />

      <PullToRefresh
        onRefresh={async () => {
          await Promise.all([
            patientsQuery.refetch(),
            doctorDirectoryQuery.refetch(),
            serviceDirectoryQuery.refetch(),
            userStateQuery.refetch(),
          ]);
        }}
        className="min-h-screen"
      >
        <main className="max-w-[1280px] mx-auto w-full px-4 py-8">
          <div className={cn(STAT_CARDS_MOBILE_ROW, "mb-4 gap-2 sm:mb-6 sm:grid sm:grid-cols-2 sm:gap-4 lg:grid-cols-4")}>
            <StatCard title="إجمالي المرضى" value={currentPatients.length} icon={Users} iconColor="bg-blue-100 text-blue-600 dark:bg-blue-950/60 dark:text-blue-400" />
            <StatCard title="القسم الحالي" value={filteredPatients.length} icon={Stethoscope} iconColor="bg-primary/10 text-primary dark:bg-primary/20 dark:text-primary" />
            <StatCard title="المحدد" value={selectedCount} icon={Eye} iconColor="bg-amber-100 text-amber-600 dark:bg-amber-950/60 dark:text-amber-400" />
            <StatCard title="الأطباء" value={availableDoctors.length} icon={CalendarCheck} iconColor="bg-purple-100 text-purple-600 dark:bg-purple-950/60 dark:text-purple-400" />
          </div>

          {(patientsQuery.isError || doctorDirectoryQuery.isError || serviceDirectoryQuery.isError) && (
            <div className="mb-6">
              <OfflinePageState
                title="تعذر تحديث بيانات المرضى"
                body="قد لا تظهر أحدث قائمة مرضى أو الأدلة المرجعية حتى يعود الاتصال. جرّب المزامنة مرة أخرى."
                onRetry={() => {
                  void patientsQuery.refetch();
                  void doctorDirectoryQuery.refetch();
                  void serviceDirectoryQuery.refetch();
                }}
              />
            </div>
          )}

          <div className="space-y-3 mb-4 sm:mb-6">
            <PatientsFilters
              searchTerm={searchTerm}
              setSearchTerm={setSearchTerm}
              isSearchFocused={isSearchFocused}
              setIsSearchFocused={setIsSearchFocused}
              activeSuggestionIndex={activeSuggestionIndex}
              setActiveSuggestionIndex={setActiveSuggestionIndex}
              groupedSearchSuggestions={groupedSearchSuggestions}
              flatSearchSuggestions={flatSearchSuggestions}
              dateFrom={dateFrom}
              setDateFrom={setDateFrom}
              dateTo={dateTo}
              setDateTo={setDateTo}
              isAdmin={isAdmin}
              importDateFormat={importDateFormat}
              setImportDateFormat={setImportDateFormat}
              handleImportPatients={handleImportPatients}
              fileInputRef={fileInputRef}
              onSuggestionSelect={(id) => setLocation(patientDetailPath(id))}
            />
            <PatientsTabs activeTab={activeTab} onSelect={setActiveTab} />
          </div>

          <div className="flex gap-4">
            <div className="flex-1">
              <PatientsTable
                patients={filteredPatients}
                serviceType={activeTab}
                serviceCodeToLabel={serviceCodeToLabel}
                serviceCodeToType={serviceCodeToType}
                onOpenRefraction={handleOpenRefraction}
                onPrintRefraction={handlePrintRefraction}
                onOpenFollowup={handleOpenFollowup}
                onOpenSheet={handleOpenSheet}
                onPrintSheet={handlePrintSheet}
                onDeletePatient={handleDeletePatient}
                onEditPatient={(patient) => {}} // This should trigger a modal, not implemented in this thin container yet
                onOpenDetails={(patientId) => setLocation(patientDetailPath(patientId))}
                user={user}
                canBulkManage={isAdmin}
                selectedRowKeys={selectedRowKeys}
                onToggleSelect={(rowKey, checked) => {
                  setSelectedRowKeys((prev) => {
                    const next = new Set(prev);
                    if (checked) next.add(rowKey);
                    else next.delete(rowKey);
                    return next;
                  });
                }}
              />
              <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
                <div className="text-sm text-muted-foreground rounded-xl border border-slate-200 bg-white/80 px-3 py-2">
                  Page {currentPage}
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    className="rounded-xl border-slate-200 bg-white"
                    onClick={() => {
                      if (cursorHistory.length === 0) return;
                      const prev = [...cursorHistory];
                      const previousCursor = prev.pop() ?? null;
                      setCursorHistory(prev);
                      setCursor(previousCursor);
                    }}
                    disabled={cursorHistory.length === 0}
                  >
                    Prev
                  </Button>
                  <Button
                    variant="outline"
                    className="rounded-xl border-slate-200 bg-white"
                    onClick={() => {
                      if (!nextCursor) return;
                      setCursorHistory((prev) => [...prev, cursor]);
                      setCursor(nextCursor);
                    }}
                    disabled={!hasMore || !nextCursor}
                  >
                    Next
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </main>
      </PullToRefresh>
    </div>
  );
}
