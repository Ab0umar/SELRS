import { CalendarPlus, Syringe, Trash2 } from "lucide-react";
import { useState } from "react";
import { PageHeader } from "@/components/shared/PageHeader";
import { OfflinePageState } from "@/components/OfflinePageState";
import { OperationDialog } from "@/components/operations/OperationDialog";
import { OperationsBookingQuickDialog } from "@/components/operations/OperationsBookingQuickDialog";
import { OperationsTabs } from "@/components/operations/OperationsTabs";
import { OperationsTable } from "@/components/operations/OperationsTable";
import { OperationTotals } from "@/components/operations/OperationTotals";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { operationTypeLabel } from "@/lib/operationsPricing";
import { formatDayDate } from "@/hooks/operations/operationsShared";
import { useOperations } from "@/hooks/operations/useOperations";
import { useOperationsActions } from "@/hooks/operations/useOperationsActions";

export default function Operations() {
  const operations = useOperations();
  const actions = useOperationsActions(operations);
  const [bookingOpen, setBookingOpen] = useState(false);

  if (!operations.isAuthenticated) return null;

  return (
    <div className="mx-auto w-full max-w-[1600px] print:max-w-none" dir="rtl">
      <OperationsBookingQuickDialog
        open={bookingOpen}
        onOpenChange={setBookingOpen}
        onSaved={() => {
          void operations.historyQuery.refetch();
          void operations.listQuery.refetch();
        }}
        initialDate={String(operations.listDate)}
      />
      <PageHeader
        title="العمليات"
        subtitle="قوائم العمليات والحسابات والسجل المحفوظ"
        icon={<Syringe className="h-5 w-5" />}
        actions={
          <Button type="button" variant="outline" onClick={() => setBookingOpen(true)}>
            <CalendarPlus className="ml-2 h-4 w-4" />
            ةيلمع زجح
          </Button>
        }
      />

      <main className="mt-4 w-full space-y-4 print:p-0">
        {(operations.listQuery.isError ||
          operations.historyQuery.isError ||
          (operations.canOpenPricing && operations.pricingSettingQuery.isError) ||
          operations.permissionsQuery.isError) && (
          <div className="mb-4">
            <OfflinePageState
              title="تعذر مزامنة قوائم العمليات"
              body="قد لا تكون آخر القوائم أو التسعير أو الصلاحيات محدثة الآن. أعد المحاولة بعد استقرار الاتصال."
              onRetry={() => {
                void operations.listQuery.refetch();
                void operations.historyQuery.refetch();
                void operations.pricingSettingQuery.refetch();
                void operations.permissionsQuery.refetch();
              }}
            />
          </div>
        )}

        <OperationsTabs
          activeTab={operations.activeTab}
          canOpenAccounts={operations.canOpenAccounts}
          onActiveTabChange={operations.setActiveTab}
          onViewModeChange={operations.setViewMode}
          viewMode={operations.viewMode}
        />

        <div className="rounded-xl border border-border bg-card p-6 shadow-sm sm:p-8 print:border-0 print:bg-transparent print:p-0 print:shadow-none">
          {(operations.viewMode === "list" || operations.viewMode === "table" || operations.viewMode === "accounts") && (
            <>
              {/* القائمة (list) = table only | اللست (table) = form + table | الحسابات (accounts) = form + totals */}

              {operations.viewMode === "list" && (
                <OperationsTable
                  canManageList={operations.canManageList}
                  currentList={operations.currentList}
                  exportDateLabel={operations.exportDateLabel}
                  exportDoctorLabel={operations.exportDoctorLabel}
                  exportTimeLabel={operations.exportTimeLabel}
                  onDeleteRow={actions.handleDeleteRow}
                  onUpdateRow={actions.handleUpdateRow}
                  operationOptions={operations.operationOptions}
                  operationType={operations.operationType}
                />
              )}

              {(operations.viewMode === "table" || operations.viewMode === "accounts") && (
                <OperationDialog
                  activeTab={operations.activeTab}
                  compact={false}
                  autoSaveEnabled={operations.autoSaveEnabled}
                  canManageList={operations.canManageList}
                  debouncedPatientSearch={operations.debouncedPatientSearch}
                  doctorName={operations.doctorName}
                  exportDateLabel={operations.exportDateLabel}
                  exportDoctorLabel={operations.exportDoctorLabel}
                  exportOperationLabel={operations.exportOperationLabel}
                  exportTimeLabel={operations.exportTimeLabel}
                  listDate={String(operations.listDate)}
                  listTime={operations.listTime}
                  onAddPatientRow={actions.handleAddPatientRow}
                  onAutoSaveToggle={() => operations.setAutoSaveEnabled((prev) => !prev)}
                  onDoctorNameChange={operations.setDoctorName}
                  onListDateChange={operations.setListDate}
                  onListTimeChange={operations.setListTime}
                  onNewList={actions.handleNewList}
                  onOperationTypeChange={operations.setOperationType}
                  onOperationTypeOtherChange={operations.setOperationTypeOther}
                  onPatientSearchTermChange={operations.setPatientSearchTerm}
                  onPrint={actions.handlePrint}
                  onSaveJpg={actions.saveJpg}
                  onSaveList={actions.handleSaveList}
                  onShareJpg={actions.shareJpg}
                  operationOptions={operations.operationOptions}
                  operationType={operations.operationType}
                  operationTypeOther={operations.operationTypeOther}
                  patientSearchQuery={operations.patientSearchQuery}
                  patientSearchTerm={operations.patientSearchTerm}
                />
              )}

              {operations.viewMode === "table" && (
                <OperationsTable
                  canManageList={operations.canManageList}
                  currentList={operations.currentList}
                  exportDateLabel={operations.exportDateLabel}
                  exportDoctorLabel={operations.exportDoctorLabel}
                  exportTimeLabel={operations.exportTimeLabel}
                  onDeleteRow={actions.handleDeleteRow}
                  onUpdateRow={actions.handleUpdateRow}
                  operationOptions={operations.operationOptions}
                  operationType={operations.operationType}
                />
              )}

              {operations.viewMode === "accounts" && (
                <OperationTotals
                  accountingTotals={operations.accountingTotals}
                  accountsAdjustmentInputs={operations.accountsAdjustmentInputs}
                  accountsAdjustmentsTotal={operations.accountsAdjustmentsTotal}
                  accountsNetAfterAdjustments={operations.accountsNetAfterAdjustments}
                  canManageList={operations.canManageList}
                  computeAccounting={operations.computeAccounting}
                  currentList={operations.currentList}
                  exportDateLabel={operations.exportDateLabel}
                  exportDoctorLabel={operations.exportDoctorLabel}
                  exportOperationLabel={operations.exportOperationLabel}
                  exportTimeLabel={operations.exportTimeLabel}
                  filteredSavedSummaries={operations.filteredSavedSummaries}
                  onAccountsAdjustmentBlur={actions.handleAccountsAdjustmentInputBlur}
                  onAccountsAdjustmentChange={actions.handleAccountsAdjustmentInputChange}
                  onDeleteSavedSummary={actions.handleDeleteSavedSummary}
                  onEditSavedSummary={actions.handleEditSavedSummary}
                  onUpdateRow={actions.handleUpdateRow}
                  operationType={operations.operationType}
                  showSawafAdjustments={operations.showSawafAdjustments}
                />
              )}
            </>
          )}

          {operations.viewMode === "history" && (
            <div className="mt-6 border-t pt-4 print:hidden">
              <h3 className="mb-3 text-sm font-bold">السجل السابق لقوائم العمليات</h3>
              <div className="mb-3 flex justify-end">
                <Input
                  value={operations.historySearch}
                  onChange={(event) => operations.setHistorySearch(event.target.value)}
                  placeholder="ابحث داخل السجل باسم المريض"
                  className="ml-auto w-full max-w-sm text-right"
                  dir="rtl"
                />
              </div>
              {operations.historyQuery.isLoading && <div className="text-sm text-muted-foreground">جاري تحميل السجل...</div>}
              {!operations.historyQuery.isLoading && (operations.historyQuery.data ?? []).length === 0 && (
                <div className="text-sm text-muted-foreground">لا يوجد سجل محفوظ حالياً.</div>
              )}
              {!operations.historyQuery.isLoading && (operations.historyQuery.data ?? []).length > 0 && (
                <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
                  {(() => {
                    const needle = operations.historySearch.trim().toLowerCase();
                    const normalized = (value: unknown) => String(value ?? "").toLowerCase();
                    const itemsWithMatches = (operations.historyQuery.data ?? []).map((item: any) => {
                      const names = (item.items ?? []).map((entry: any) => String(entry.name ?? ""));
                      const matches = needle ? names.filter((name: string) => normalized(name).includes(needle)) : names;
                      return { item, matches, hasMatch: needle ? matches.length > 0 : true };
                    });
                    if (needle && itemsWithMatches.every(({ item }) => (item.items ?? []).length === 0)) {
                      return <div className="text-sm text-muted-foreground">لا توجد نتائج مطابقة في السجل.</div>;
                    }
                    return [
                      { key: "PRK / ليزك", match: ["PRK", "Lasik"] },
                      { key: "مياه بيضاء", match: ["Cataract"] },
                      { key: "أخرى", match: [null, "", "Other"] },
                    ].map((group) => (
                      <div key={group.key} className="rounded-md border p-2">
                        <div className="mb-2 text-sm font-bold">{group.key}</div>
                        <div className="flex flex-col gap-1">
                          {itemsWithMatches
                            .filter(({ item, hasMatch }) => hasMatch && group.match.includes(item.operationType ?? "Other"))
                            .map(({ item, matches }) => (
                              <div key={`${item.id}`} className="flex items-center justify-between gap-2 rounded px-2 py-1 hover:bg-muted/40">
                                <button type="button" className="flex-1 text-right" onClick={() => actions.handleLoadListById(item.id)}>
                                  <div className="text-sm font-medium">{item.doctorName ?? operations.tabLabelByKey(item.doctorTab)}</div>
                                  <div className="text-xs text-muted-foreground" dir="ltr">
                                    {formatDayDate(item.listDate)} {operationTypeLabel(item.operationType ?? "Other")} {matches[0] ?? item.items?.[0]?.name ?? " "}
                                  </div>
                                </button>
                                <Button variant="outline" size="sm" onClick={() => actions.handleLoadListById(item.id)}>
                                  تحميل
                                </Button>
                                <Button variant="destructive" size="sm" onClick={() => actions.deleteListByIdMutation.mutate({ listId: item.id })} disabled={!operations.canManageList}>
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            ))}
                          {itemsWithMatches.filter(({ item, hasMatch }) => hasMatch && group.match.includes(item.operationType ?? "Other")).length === 0 && (
                            <div className="text-xs text-muted-foreground">لا توجد نتائج في هذا القسم</div>
                          )}
                        </div>
                      </div>
                    ));
                  })()}
                </div>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
