import { History, Syringe } from "lucide-react";
import { useMemo, useState } from "react";
import { OfflinePageState } from "@/components/OfflinePageState";
import { OperationDialog } from "@/components/operations/OperationDialog";
import { OperationsBookingInlinePanel } from "@/components/operations/OperationsBookingInlinePanel";
import { OperationsSettlementRail } from "@/components/operations/OperationsSettlementRail";
import { OperationsTabs } from "@/components/operations/OperationsTabs";
import { OperationsTable } from "@/components/operations/OperationsTable";
import { OperationsHistoryDrawer } from "@/components/operations/OperationsHistoryDrawer";
import { Button } from "@/components/ui/button";
import { formatDayDate } from "@/hooks/operations/operationsShared";
import { useOperations } from "@/hooks/operations/useOperations";
import { useOperationsActions } from "@/hooks/operations/useOperationsActions";

type SettlementFilter = "open" | "settled" | "all";

export default function Operations() {
  const [historyOpen, setHistoryOpen] = useState(false);
  const [settlementFilter, setSettlementFilter] = useState<SettlementFilter>("open");
  const [settlementRailOpen, setSettlementRailOpen] = useState(false);

  const operations = useOperations();
  const actions = useOperationsActions(operations);

  const decoratedRows = useMemo(() => {
    return operations.currentList.map((row) => {
      const values = operations.computeAccounting(row);
      return {
        row,
        values,
        isSettled: Math.abs(values.remainingAmount) < 0.01,
      };
    });
  }, [operations.currentList, operations.computeAccounting]);

  const openRows = decoratedRows.filter((entry) => !entry.isSettled).map((entry) => entry.row);
  const settledRows = decoratedRows.filter((entry) => entry.isSettled).map((entry) => entry.row);
  const visibleRows =
    settlementFilter === "all" ? operations.currentList : settlementFilter === "open" ? openRows : settledRows;

  if (!operations.isAuthenticated) return null;

  return (
    <div className="mx-auto w-full max-w-[1600px] print:max-w-none" dir="rtl">
      <OperationsHistoryDrawer
        open={historyOpen}
        onClose={() => setHistoryOpen(false)}
        historySearch={operations.historySearch}
        onHistorySearchChange={operations.setHistorySearch}
        activeTab={operations.activeTab}
        historyQuery={operations.historyQuery}
        onLoadListById={actions.handleLoadListById}
      onDeleteListById={(args) => actions.deleteListByIdMutation.mutate(args)}
        canManageList={operations.canManageList}
        tabLabelByKey={operations.tabLabelByKey}
      />

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

      <div className="mb-4 flex flex-wrap items-start justify-between gap-3 print:hidden">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
            <Syringe className="h-5 w-5" aria-hidden />
          </div>
          <div className="min-w-0">
            <div className="text-xs text-muted-foreground">العمليات</div>
            <h1 className="text-base font-semibold text-foreground">العمليات</h1>
            <div className="text-[11px] text-muted-foreground">
              {formatDayDate(String(operations.listDate))} | {operations.currentList.length} حالة
            </div>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <OperationsTabs activeTab={operations.activeTab} onActiveTabChange={operations.setActiveTab} />
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5 text-xs h-8"
            onClick={() => setHistoryOpen(true)}
          >
            <History className="h-3.5 w-3.5" />
            السجل
          </Button>
        </div>
      </div>

      <main className="space-y-4 print:p-0 print:space-y-0">
        <div
          className={[
            "grid gap-4 xl:items-start xl:[direction:ltr]",
            settlementRailOpen ? "xl:grid-cols-[minmax(0,1fr)_380px]" : "xl:grid-cols-[minmax(0,1fr)_56px]",
          ].join(" ")}
        >
          <div className="space-y-4" dir="rtl">
            <OperationsBookingInlinePanel
              initialDate={String(operations.listDate)}
              initialDoctorName={operations.doctorName}
              onSaved={() => {
                void operations.historyQuery.refetch();
                void operations.listQuery.refetch();
                void operations.operationBookingsQuery.refetch();
              }}
            />

            <section className="rounded-lg border border-border/50 bg-background shadow-sm print:border-0 print:bg-transparent print:shadow-none">
              <div className="border-b border-border/50 px-4 py-3">
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
              </div>
            </section>

            <div className="flex flex-wrap items-center gap-2">
              {([
                ["open", "المفتوحة", openRows.length],
                ["settled", "المسددة", settledRows.length],
                ["all", "الكل", operations.currentList.length],
              ] as const).map(([key, label, count]) => {
                const isActive = settlementFilter === key;
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setSettlementFilter(key)}
                    className={[
                      "inline-flex items-center gap-2 rounded-md border px-3 py-1.5 text-xs font-medium transition-colors",
                      isActive
                        ? "border-primary/30 bg-primary/10 text-primary"
                        : "border-border/50 bg-background text-muted-foreground hover:text-foreground hover:bg-muted/40",
                    ].join(" ")}
                  >
                    <span>{label}</span>
                    <span className="rounded bg-background/80 px-1.5 py-0.5 text-[10px] tabular-nums">{count}</span>
                  </button>
                );
              })}
            </div>

            <section className="rounded-lg border border-border/50 bg-background shadow-sm print:border-0 print:bg-transparent print:shadow-none">
              <div className="border-b border-border/50 px-4 py-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <h2 className="text-sm font-semibold">قائمة العمليات</h2>
                    <p className="text-[11px] text-muted-foreground">
                      {settlementFilter === "open"
                        ? "تظهر العناصر المفتوحة فقط"
                        : settlementFilter === "settled"
                          ? "تظهر العناصر المسددة فقط"
                          : "تظهر كل العناصر"}
                    </p>
                  </div>
                  <div className="text-[11px] text-muted-foreground tabular-nums">
                    المعروض: {visibleRows.length} / {operations.currentList.length}
                  </div>
                </div>
              </div>
              <div className="px-4 py-3">
                <OperationsTable
                  canManageList={operations.canManageList}
                  currentList={visibleRows}
                  exportDateLabel={operations.exportDateLabel}
                  exportDoctorLabel={operations.exportDoctorLabel}
                  exportTimeLabel={operations.exportTimeLabel}
                  onDeleteRow={actions.handleDeleteRow}
                  onUpdateRow={actions.handleUpdateRow}
                  operationOptions={operations.operationOptions}
                  operationType={operations.operationType}
                />
              </div>
            </section>
          </div>

          <div className="xl:sticky xl:top-4" dir="rtl">
            <OperationsSettlementRail
              open={settlementRailOpen}
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
              openCount={openRows.length}
              settledCount={settledRows.length}
              onOpenChange={setSettlementRailOpen}
            />
          </div>
        </div>
      </main>
    </div>
  );
}
