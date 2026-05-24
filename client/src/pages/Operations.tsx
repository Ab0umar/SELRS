import { History, Syringe, Trash2 } from "lucide-react";
import { Fragment, useMemo, useState } from "react";
import { toast } from "sonner";
import { OfflinePageState } from "@/components/OfflinePageState";
import { OperationDialog } from "@/components/operations/OperationDialog";
import { OperationsBookingInlinePanel } from "@/components/operations/OperationsBookingInlinePanel";
import { OperationsSettlementRail } from "@/components/operations/OperationsSettlementRail";
import { OperationsTabs } from "@/components/operations/OperationsTabs";
import { OperationsTable } from "@/components/operations/OperationsTable";
import { OperationsHistoryDrawer } from "@/components/operations/OperationsHistoryDrawer";
import { Button } from "@/components/ui/button";
import { TAB_OTHERS, operationTypeLabel } from "@/lib/operationsPricing";
import { formatDayDate } from "@/hooks/operations/operationsShared";
import { useOperations } from "@/hooks/operations/useOperations";
import { useOperationsActions } from "@/hooks/operations/useOperationsActions";
import { trpc } from "@/lib/trpc";
import { cn, getTrpcErrorMessage } from "@/lib/utils";

type SettlementFilter = "open" | "settled" | "all";

export default function Operations() {
  const [historyOpen, setHistoryOpen] = useState(false);
  const [settlementFilter, setSettlementFilter] =
    useState<SettlementFilter>("open");
  const [settlementRailOpen, setSettlementRailOpen] = useState(true);
  const [delConfirm, setDelConfirm] = useState<number | null>(null);

  const operations = useOperations();
  const actions = useOperationsActions(operations);
  const utils = trpc.useUtils();

  const deleteBookingMutation = trpc.medical.deleteOperationBooking.useMutation(
    {
      onSuccess: async () => {
        await utils.medical.getOperationBookings.invalidate();
        await utils.medical.getTodayOperationLists.invalidate();
        toast.success("تم حذف الحجز بنجاح");
      },
      onError: (error) => {
        toast.error(getTrpcErrorMessage(error, "تعذر حذف الحجز"));
      },
    },
  );

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

  const openRows = decoratedRows
    .filter((entry) => !entry.isSettled)
    .map((entry) => entry.row);
  const settledRows = decoratedRows
    .filter((entry) => entry.isSettled)
    .map((entry) => entry.row);
  const visibleRows =
    settlementFilter === "open"
      ? openRows
      : settlementFilter === "settled"
        ? settledRows
        : operations.currentList;
  const emptyListMessage =
    settlementFilter === "open"
      ? "لا توجد حالات مفتوحة في القائمة الحالية."
      : settlementFilter === "settled"
        ? "لا توجد حالات مسددة في القائمة الحالية."
        : "لا توجد حالات في القائمة الحالية.";
  const settlementFilters: {
    key: SettlementFilter;
    label: string;
    count: number;
  }[] = [
    { key: "open", label: "مفتوحة", count: openRows.length },
    { key: "settled", label: "مسددة", count: settledRows.length },
    { key: "all", label: "الكل", count: operations.currentList.length },
  ];

  if (!operations.isAuthenticated) return null;

  return (
    <div className="mx-auto w-full max-w-[1600px] print:max-w-none" dir="rtl">
      <OperationsHistoryDrawer
        open={historyOpen}
        onClose={() => setHistoryOpen(false)}
        historySearch={operations.historySearch}
        onHistorySearchChange={operations.setHistorySearch}
        activeTab={operations.activeTab}
        listDate={String(operations.listDate)}
        historyQuery={operations.historyQuery}
        operationBookings={operations.operationBookingsQuery.data ?? []}
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
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <Syringe className="h-5 w-5" aria-hidden />
          </div>
          <div className="min-w-0">
            <div className="text-xs text-muted-foreground">العمليات</div>
            <h1 className="text-base font-semibold text-foreground">
              العمليات
            </h1>
            <div className="text-[11px] text-muted-foreground">
              {formatDayDate(String(operations.listDate))} |{" "}
              {operations.currentList.length} حالة
            </div>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <OperationsTabs
            activeTab={operations.activeTab}
            onActiveTabChange={operations.setActiveTab}
          />
          <Button
            variant="outline"
            size="sm"
            className="min-h-11 gap-1.5 text-sm sm:min-h-8 sm:text-xs"
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
            settlementRailOpen
              ? "xl:grid-cols-[minmax(0,1fr)_380px]"
              : "xl:grid-cols-[minmax(0,1fr)_56px]",
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

            {operations.activeTab === TAB_OTHERS && (
              <section className="rounded-lg border border-border/50 bg-background shadow-sm print:border-0 print:bg-transparent print:shadow-none">
                <div className="flex items-center justify-between border-b border-border/50 px-4 py-3">
                  <h2 className="text-sm font-semibold text-foreground">
                    حجوزات العمليات
                  </h2>
                  <span className="text-[11px] text-muted-foreground tabular-nums">
                    {formatDayDate(String(operations.listDate))}
                  </span>
                </div>
                <div className="px-4 py-3">
                  {operations.operationBookingsQuery.isLoading ? (
                    <p className="text-[11px] text-muted-foreground animate-pulse">
                      جاري تحميل الحجوزات...
                    </p>
                  ) : (operations.operationBookingsQuery.data ?? []).length ===
                    0 ? (
                    <p className="text-[11px] text-muted-foreground">
                      لا توجد حجوزات مسجلة لهذا التاريخ.
                    </p>
                  ) : (
                    <table className="w-full text-xs border-collapse" dir="rtl">
                      <thead>
                        <tr className="border-b border-border/50 text-muted-foreground">
                          <th className="py-1.5 text-right font-medium">
                            نوع العملية
                          </th>
                          <th className="py-1.5 text-center w-20 font-medium">
                            الوقت
                          </th>
                          <th className="py-1.5 text-center w-16 font-medium">
                            العدد
                          </th>
                          <th className="py-1.5 text-center w-10 font-medium"></th>
                        </tr>
                      </thead>
                      <tbody>
                        {(() => {
                          const bookings =
                            operations.operationBookingsQuery.data ?? [];
                          const grouped: Record<string, typeof bookings> = {};
                          for (const b of bookings) {
                            const d = b.doctorName || "طبيب غير محدد";
                            if (!grouped[d]) grouped[d] = [];
                            grouped[d].push(b);
                          }
                          return Object.entries(grouped).map(
                            ([doctor, list]) => (
                              <Fragment key={doctor}>
                                <tr>
                                  <td
                                    colSpan={4}
                                    className="pt-2 pb-0.5 font-semibold text-primary text-[11px]"
                                  >
                                    {doctor}
                                  </td>
                                </tr>
                                {list.map((booking) => (
                                  <tr
                                    key={booking.id}
                                    className="border-b border-border/30 last:border-0 hover:bg-muted/20"
                                  >
                                    <td className="py-1 pr-3 text-muted-foreground">
                                      {operationTypeLabel(
                                        booking.operationType,
                                      )}
                                    </td>
                                    <td
                                      className="py-1 text-center tabular-nums"
                                      dir="ltr"
                                    >
                                      {booking.bookingTime || "-"}
                                    </td>
                                    <td className="py-1 text-center font-semibold tabular-nums">
                                      {booking.casesCount}
                                    </td>
                                    <td className="py-1 text-center">
                                      {delConfirm === booking.id ? (
                                        <div className="flex items-center gap-1">
                                          <button
                                            type="button"
                                            aria-label="تأكيد الحذف"
                                            className="min-h-11 rounded bg-destructive px-2 text-xs text-destructive-foreground hover:bg-destructive/80 sm:min-h-8"
                                            onClick={() => {
                                              deleteBookingMutation.mutate({
                                                id: booking.id,
                                              });
                                              setDelConfirm(null);
                                            }}
                                          >
                                            تأكيد
                                          </button>
                                          <button
                                            type="button"
                                            aria-label="إلغاء الحذف"
                                            className="min-h-11 rounded bg-muted px-2 text-xs text-muted-foreground hover:bg-muted/80 sm:min-h-8"
                                            onClick={() => setDelConfirm(null)}
                                          >
                                            ✕
                                          </button>
                                        </div>
                                      ) : (
                                        <button
                                          type="button"
                                          aria-label="حذف الحجز"
                                          className="inline-flex h-11 w-11 items-center justify-center rounded bg-destructive/10 text-destructive transition-colors hover:bg-destructive hover:text-destructive-foreground sm:h-9 sm:w-9"
                                          disabled={
                                            deleteBookingMutation.isPending
                                          }
                                          onClick={() =>
                                            setDelConfirm(booking.id)
                                          }
                                        >
                                          <Trash2 className="h-3.5 w-3.5" />
                                        </button>
                                      )}
                                    </td>
                                  </tr>
                                ))}
                              </Fragment>
                            ),
                          );
                        })()}
                      </tbody>
                      <tfoot>
                        <tr className="border-t border-border/50">
                          <td className="pt-1.5 font-semibold text-foreground">
                            إجمالي الحالات
                          </td>
                          <td />
                          <td className="pt-1.5 text-center font-bold tabular-nums text-foreground">
                            {(
                              operations.operationBookingsQuery.data ?? []
                            ).reduce((acc, b) => acc + (b.casesCount || 0), 0)}
                          </td>
                          <td />
                        </tr>
                      </tfoot>
                    </table>
                  )}
                </div>
              </section>
            )}

            <section className="print:border-0 print:bg-transparent">
              <div className="border-b border-border/50 py-3">
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
                  onAutoSaveToggle={() =>
                    operations.setAutoSaveEnabled((prev) => !prev)
                  }
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

            <section className="print:border-0 print:bg-transparent">
              <div className="py-3">
                <div className="mb-3 flex flex-wrap items-center justify-between gap-2 print:hidden">
                  <div className="min-w-0">
                    <h2 className="text-sm font-semibold text-foreground">
                      قائمة العمليات
                    </h2>
                    <p className="text-[11px] text-muted-foreground">
                      اعرض الحالات المفتوحة أو المسددة مع بقاء التسوية ظاهرة.
                    </p>
                  </div>
                  <div
                    className="flex min-h-11 items-center gap-1 rounded-md bg-muted/40 p-1"
                    aria-label="تصفية حالات قائمة العمليات"
                    role="group"
                  >
                    {settlementFilters.map((filter) => {
                      const isActive = settlementFilter === filter.key;
                      return (
                        <button
                          key={filter.key}
                          type="button"
                          className={cn(
                            "min-h-9 rounded px-3 text-xs font-medium transition-colors",
                            isActive
                              ? "bg-background text-foreground shadow-sm"
                              : "text-muted-foreground hover:bg-background/70 hover:text-foreground",
                          )}
                          aria-pressed={isActive}
                          onClick={() => setSettlementFilter(filter.key)}
                        >
                          {filter.label}
                          <span className="ms-1 tabular-nums">
                            {filter.count}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
                <OperationsTable
                  canManageList={operations.canManageList}
                  currentList={visibleRows}
                  emptyMessage={emptyListMessage}
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
              accountsNetAfterAdjustments={
                operations.accountsNetAfterAdjustments
              }
              canManageList={operations.canManageList}
              computeAccounting={operations.computeAccounting}
              currentList={operations.currentList}
              exportDateLabel={operations.exportDateLabel}
              exportDoctorLabel={operations.exportDoctorLabel}
              exportOperationLabel={operations.exportOperationLabel}
              exportTimeLabel={operations.exportTimeLabel}
              filteredSavedSummaries={operations.filteredSavedSummaries}
              onAccountsAdjustmentBlur={
                actions.handleAccountsAdjustmentInputBlur
              }
              onAccountsAdjustmentChange={
                actions.handleAccountsAdjustmentInputChange
              }
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
