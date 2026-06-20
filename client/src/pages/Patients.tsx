import { useMemo, useState } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { PatientsHeader } from "@/components/patients/PatientsHeader";
import { PatientsFilters } from "@/components/patients/PatientsFilters";
import { PatientsTabs } from "@/components/patients/PatientsTabs";
import {
  PatientsDataFilter,
  type PatientsDataFilterValue,
} from "@/components/patients/PatientsDataFilter";
import { PatientsTable } from "@/components/patients/PatientsTable";
import type { PatientMedicalStatus } from "@/components/patients/PatientMedicalStatusBadges";
import { usePatientsList } from "@/hooks/patients/usePatientsList";
import { usePatientsActions } from "@/hooks/patients/usePatientsActions";
import { StatCard, STAT_CARDS_MOBILE_ROW } from "@/components/shared/StatCard";
import { cn } from "@/lib/utils";
import { Users, Stethoscope, Eye, CalendarCheck } from "lucide-react";
import { PullToRefresh } from "@/components/PullToRefresh";
import { OfflinePageState } from "@/components/OfflinePageState";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function Patients() {
  const { user, isAuthenticated } = useAuth();
  const [location, setLocation] = useLocation();
  const patientDetailPath = (id: number) =>
    location.startsWith("/patient-hub")
      ? `/patient-hub/examination/${id}`
      : `/patients/${id}`;
  const isAdmin = user?.role === "admin";
  const canEditPatients =
    user?.role === "admin" ||
    user?.role === "manager" ||
    user?.role === "reception";

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
    locationTypeFilter,
    setLocationTypeFilter,
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

  const visiblePatientIds = filteredPatients
    .map((p: any) => Number(p.id))
    .filter(Boolean);
  const medicalStatusQuery = trpc.medical.getPatientMedicalStatusBatch.useQuery(
    { patientIds: visiblePatientIds },
    { enabled: visiblePatientIds.length > 0, staleTime: 60_000 },
  );

  // "Has data" sub-filter shown next to the tabs (except "all") — reuses the
  // same medical-status signal already powering the colored status dots.
  const [dataFilter, setDataFilter] = useState<PatientsDataFilterValue>("all");
  const hasMedicalData = (status: PatientMedicalStatus | undefined) =>
    Boolean(
      status &&
        (status.autoref ||
          status.afterRef ||
          status.glasses ||
          status.pentacam ||
          status.prescription ||
          status.tests ||
          status.reports),
    );
  const displayedPatients = useMemo(() => {
    if (activeTab === "all" || dataFilter === "all") return filteredPatients;
    return filteredPatients.filter((p: any) => {
      const has = hasMedicalData(medicalStatusQuery.data?.[Number(p.id)]);
      return dataFilter === "full" ? has : !has;
    });
  }, [filteredPatients, activeTab, dataFilter, medicalStatusQuery.data]);

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
    const patient = currentPatients.find(
      (entry) => Number(entry.id) === Number(patientId),
    );
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

  const [selectedRowKeys, setSelectedRowKeys] = useState<Set<string>>(
    new Set(),
  );

  const [editingPatient, setEditingPatient] = useState<any | null>(null);
  const [editDraft, setEditDraft] = useState<{
    fullName: string; phone: string; age: string; dateOfBirth: string; address: string; occupation: string; patientCode: string;
  }>({ fullName: "", phone: "", age: "", dateOfBirth: "", address: "", occupation: "", patientCode: "" });

  const openEdit = (patient: any) => {
    setEditingPatient(patient);
    setEditDraft({
      fullName: patient.fullName ?? "",
      phone: patient.phone ?? "",
      age: patient.age != null ? String(patient.age) : "",
      dateOfBirth: patient.dateOfBirth ?? "",
      address: patient.address ?? "",
      occupation: patient.occupation ?? "",
      patientCode: patient.patientCode ?? "",
    });
  };

  const handleEditSave = async () => {
    if (!editingPatient) return;
    await handleUpdatePatient(editingPatient.id, {
      fullName: editDraft.fullName.trim(),
      phone: editDraft.phone.trim(),
      age: editDraft.age ? Number(editDraft.age) : undefined,
      dateOfBirth: editDraft.dateOfBirth || undefined,
      address: editDraft.address.trim(),
      occupation: editDraft.occupation.trim(),
      patientCode: editDraft.patientCode.trim(),
    });
    setEditingPatient(null);
  };

  return (
    <div className="min-h-screen bg-background" dir="rtl">
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
          <div
            className={cn(
              STAT_CARDS_MOBILE_ROW,
              "mb-4 gap-2 sm:mb-6 sm:grid sm:grid-cols-2 sm:gap-4 lg:grid-cols-4",
            )}
          >
            <StatCard
              title="إجمالي المرضى"
              value={currentPatients.length}
              icon={Users}
              iconColor="bg-primary text-primary-foreground"
            />
            <StatCard
              title="القسم الحالي"
              value={displayedPatients.length}
              icon={Stethoscope}
              iconColor="bg-primary text-primary-foreground"
            />
            <StatCard
              title="المحدد"
              value={selectedCount}
              icon={Eye}
              iconColor="bg-warning/20 text-warning"
            />
            <StatCard
              title="الأطباء"
              value={availableDoctors.length}
              icon={CalendarCheck}
              iconColor="bg-primary/10 text-secondary"
            />
          </div>

          {(patientsQuery.isError ||
            doctorDirectoryQuery.isError ||
            serviceDirectoryQuery.isError) && (
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
              locationTypeFilter={locationTypeFilter}
              setLocationTypeFilter={setLocationTypeFilter}
              isAdmin={isAdmin}
              importDateFormat={importDateFormat}
              setImportDateFormat={setImportDateFormat}
              handleImportPatients={handleImportPatients}
              fileInputRef={fileInputRef}
              onSuggestionSelect={(id) => setLocation(patientDetailPath(id))}
            />
            <PatientsTabs activeTab={activeTab} onSelect={setActiveTab} />
            {activeTab !== "all" ? (
              <PatientsDataFilter value={dataFilter} onSelect={setDataFilter} />
            ) : null}
          </div>

          <div className="flex gap-4">
            <div className="flex-1">
              <PatientsTable
                patients={displayedPatients}
                serviceType={activeTab}
                serviceCodeToLabel={serviceCodeToLabel}
                serviceCodeToType={serviceCodeToType}
                onOpenRefraction={handleOpenRefraction}
                onPrintRefraction={handlePrintRefraction}
                onOpenFollowup={handleOpenFollowup}
                onOpenSheet={handleOpenSheet}
                onPrintSheet={handlePrintSheet}
                onDeletePatient={handleDeletePatient}
                onEditPatient={openEdit}
                onOpenDetails={(patientId) =>
                  setLocation(patientDetailPath(patientId))
                }
                user={user}
                canBulkManage={isAdmin}
                medicalStatuses={medicalStatusQuery.data ?? undefined}
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
                <div className="text-sm text-muted-foreground rounded-xl border border-border bg-background/80 px-3 py-2">
                  صفحة {currentPage}
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    className="rounded-xl border-border bg-background"
                    onClick={() => {
                      if (cursorHistory.length === 0) return;
                      const prev = [...cursorHistory];
                      const previousCursor = prev.pop() ?? null;
                      setCursorHistory(prev);
                      setCursor(previousCursor);
                    }}
                    disabled={cursorHistory.length === 0}
                  >
                    السابق
                  </Button>
                  <Button
                    variant="outline"
                    className="rounded-xl border-border bg-background"
                    onClick={() => {
                      if (!nextCursor) return;
                      setCursorHistory((prev) => [...prev, cursor]);
                      setCursor(nextCursor);
                    }}
                    disabled={!hasMore || !nextCursor}
                  >
                    التالي
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </main>
      </PullToRefresh>
      <Dialog open={!!editingPatient} onOpenChange={(open) => { if (!open) setEditingPatient(null); }}>
        <DialogContent dir="rtl" className="max-w-md">
          <DialogHeader>
            <DialogTitle>تعديل بيانات المريض</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label>الاسم الكامل</Label>
              <Input value={editDraft.fullName} onChange={(e) => setEditDraft((d) => ({ ...d, fullName: e.target.value }))} />
            </div>
            <div className="space-y-1">
              <Label>رقم الهاتف</Label>
              <Input value={editDraft.phone} onChange={(e) => setEditDraft((d) => ({ ...d, phone: e.target.value }))} />
            </div>
            <div className="space-y-1">
              <Label>رمز المريض</Label>
              <Input value={editDraft.patientCode} onChange={(e) => setEditDraft((d) => ({ ...d, patientCode: e.target.value }))} />
            </div>
            <div className="space-y-1">
              <Label>السن</Label>
              <Input type="number" value={editDraft.age} onChange={(e) => setEditDraft((d) => ({ ...d, age: e.target.value }))} />
            </div>
            <div className="space-y-1">
              <Label>العنوان</Label>
              <Input value={editDraft.address} onChange={(e) => setEditDraft((d) => ({ ...d, address: e.target.value }))} />
            </div>
            <div className="space-y-1">
              <Label>المهنة</Label>
              <Input value={editDraft.occupation} onChange={(e) => setEditDraft((d) => ({ ...d, occupation: e.target.value }))} />
            </div>
          </div>
          <DialogFooter className="flex gap-2 mt-2">
            <Button variant="outline" onClick={() => setEditingPatient(null)}>إلغاء</Button>
            <Button onClick={handleEditSave}>حفظ</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
