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
  const [editDraft, setEditDraft] = useState<Record<string, string>>({});
  const editFields = [
    ["fullName", "الاسم الكامل"], ["phone", "رقم الهاتف"],
    ["alternatePhone", "هاتف إضافي"], ["email", "البريد الإلكتروني"],
    ["nationalId", "الرقم القومي"], ["age", "السن"],
    ["dateOfBirth", "تاريخ الميلاد"], ["address", "العنوان"],
    ["occupation", "المهنة"], ["referralSource", "مصدر الإحالة"],
    ["medicalHistory", "التاريخ المرضي"], ["allergies", "الحساسية"],
  ];

  const openEdit = (patient: any) => {
    setEditingPatient(patient);
    setEditDraft(Object.fromEntries([
      ...editFields.map(([key]) => [key, patient[key] == null ? "" : key === "dateOfBirth" ? String(patient[key]).slice(0, 10) : String(patient[key])]),
      ["gender", patient.gender ?? ""], ["doctorCode", patient.doctorCode ?? ""],
    ]));
  };

  const handleEditSave = async () => {
    if (!editingPatient) return;
    const updates = Object.fromEntries(editFields.map(([key]) => [key,
      key === "age" ? (editDraft[key] ? Number(editDraft[key]) : null) :
      key === "dateOfBirth" ? (editDraft[key] || null) : (editDraft[key] ?? "").trim(),
    ]));
    updates.gender = editDraft.gender || null;
    if (editDraft.doctorCode !== String(editingPatient.doctorCode ?? "")) {
      updates.doctorCode = editDraft.doctorCode;
    }
    const saved = await handleUpdatePatient(editingPatient.id, updates);
    if (saved) setEditingPatient(null);
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
        <main className="w-full px-4 py-6 sm:px-6">
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
              iconColor="bg-warning/20 text-warning-text"
            />
            <StatCard
              title="الأطباء"
              value={availableDoctors.length}
              icon={CalendarCheck}
              iconColor="bg-primary/10 text-primary"
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
        <DialogContent dir="rtl" className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>تعديل بيانات المريض</DialogTitle>
          </DialogHeader>
          <div className="grid max-h-[65vh] gap-3 overflow-y-auto px-1 sm:grid-cols-2">
            <div className="space-y-1">
              <Label htmlFor="edit-patient-code">كود المريض</Label>
              <Input id="edit-patient-code" value={editingPatient?.patientCode ?? ""} readOnly />
            </div>
            {editFields.map(([key, label]) => (
              <div key={key} className="space-y-1">
                <Label htmlFor={`edit-patient-${key}`}>{label}</Label>
                <Input id={`edit-patient-${key}`} type={key === "dateOfBirth" ? "date" : key === "age" ? "number" : key === "email" ? "email" : "text"}
                  min={key === "age" ? 0 : undefined}
                  value={editDraft[key] ?? ""} onChange={(event) => setEditDraft((draft) => ({ ...draft, [key]: event.target.value }))} />
              </div>
            ))}
            <div className="space-y-1">
              <Label htmlFor="edit-patient-gender">النوع</Label>
              <select id="edit-patient-gender" className="h-10 w-full rounded-md border border-input bg-background px-3" value={editDraft.gender ?? ""} onChange={(event) => setEditDraft((draft) => ({ ...draft, gender: event.target.value }))}>
                <option value="">غير محدد</option><option value="male">ذكر</option><option value="female">أنثى</option>
              </select>
            </div>
            <div className="space-y-1">
              <Label htmlFor="edit-patient-doctor">طبيب آخر إيصال</Label>
              <select id="edit-patient-doctor" className="h-10 w-full rounded-md border border-input bg-background px-3" value={editDraft.doctorCode ?? ""} disabled={doctorsLoading} onChange={(event) => setEditDraft((draft) => ({ ...draft, doctorCode: event.target.value }))}>
                <option value="">اختر الطبيب</option>
                {editDraft.doctorCode && !availableDoctors.some((doctor) => doctor.code === editDraft.doctorCode) && <option value={editDraft.doctorCode}>{editDraft.doctorCode}</option>}
                {availableDoctors.map((doctor) => <option key={doctor.code} value={doctor.code}>{doctor.name} ({doctor.code})</option>)}
              </select>
            </div>
          </div>
          <DialogFooter className="flex gap-2 mt-2">
            <Button variant="outline" onClick={() => setEditingPatient(null)}>إلغاء</Button>
            <Button disabled={updatePatientMutation.isPending} onClick={handleEditSave}>{updatePatientMutation.isPending ? "جاري الحفظ والمزامنة…" : "حفظ"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
