import { PanelRightClose, PanelRightOpen, Calculator, Layers3, ShieldCheck } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { type ListData, type SavedSummary } from "@/hooks/operations/operationsShared";
import { OperationTotals } from "./OperationTotals";

type OperationsSettlementRailProps = {
  open: boolean;
  accountingTotals: { centerAmount: number; paid: number; remainingAmount: number };
  accountsAdjustmentInputs: { radiology: string; external: string; cashbox: string };
  accountsAdjustmentsTotal: number;
  accountsNetAfterAdjustments: number;
  canManageList: boolean;
  computeAccounting: (row: ListData) => { centerAmount: number; paid: number; remainingAmount: number };
  currentList: ListData[];
  exportDateLabel: string;
  exportDoctorLabel: string;
  exportOperationLabel: string;
  exportTimeLabel: string;
  filteredSavedSummaries: SavedSummary[];
  onAccountsAdjustmentBlur: (key: "radiology" | "external" | "cashbox") => void;
  onAccountsAdjustmentChange: (key: "radiology" | "external" | "cashbox", value: string) => void;
  onDeleteSavedSummary: (key: string, listId?: number) => void;
  onEditSavedSummary: (summary: SavedSummary) => void;
  onUpdateRow: (id: number, field: keyof ListData | string, value: any) => void;
  operationType: string;
  showSawafAdjustments: boolean;
  openCount: number;
  settledCount: number;
  onOpenChange: (open: boolean) => void;
};

function SummaryTile({
  label,
  value,
  tone = "default",
}: {
  label: string;
  value: string;
  tone?: "default" | "accent" | "danger";
}) {
  return (
    <div
      className={cn(
        "rounded-md border px-3 py-2",
        tone === "accent" && "border-primary/20 bg-primary/5",
        tone === "danger" && "border-rose-200 bg-rose-50/80"
      )}
    >
      <div className="text-[11px] text-muted-foreground">{label}</div>
      <div className="mt-0.5 text-sm font-semibold tabular-nums" dir="ltr">
        {value}
      </div>
    </div>
  );
}

export function OperationsSettlementRail({
  open,
  accountingTotals,
  accountsAdjustmentInputs,
  accountsAdjustmentsTotal,
  accountsNetAfterAdjustments,
  canManageList,
  computeAccounting,
  currentList,
  exportDateLabel,
  exportDoctorLabel,
  exportOperationLabel,
  exportTimeLabel,
  filteredSavedSummaries,
  onAccountsAdjustmentBlur,
  onAccountsAdjustmentChange,
  onDeleteSavedSummary,
  onEditSavedSummary,
  onUpdateRow,
  operationType,
  showSawafAdjustments,
  openCount,
  settledCount,
  onOpenChange,
}: OperationsSettlementRailProps) {
  const [detailsOpen, setDetailsOpen] = useState(false);
  const railOpen = open;

  return (
    <aside
      className={cn(
        "overflow-hidden rounded-lg border border-border/50 bg-background shadow-sm transition-[width] duration-300 ease-out",
        railOpen ? "xl:w-[380px]" : "xl:w-14",
        "w-full"
      )}
    >
      {railOpen ? (
        <div className="space-y-4 px-4 py-4">
          <div className="flex items-center justify-between gap-3 border-b border-border/50 pb-3">
            <div className="flex min-w-0 items-center gap-2 text-right">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
                <Calculator className="h-4 w-4" aria-hidden />
              </div>
              <div className="min-w-0">
                <h2 className="text-sm font-semibold">تسوية اليوم</h2>
                <p className="text-[11px] text-muted-foreground">الملخص المالي الحالي</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="rounded-md bg-muted/40 px-2 py-1 text-[11px] font-medium text-muted-foreground">
                {openCount} مفتوحة
              </div>
              <div className="rounded-md bg-emerald-50 px-2 py-1 text-[11px] font-medium text-emerald-700">
                {settledCount} مسددة
              </div>
              <button
                type="button"
                className="flex h-8 w-8 items-center justify-center rounded-md border border-border/50 text-muted-foreground hover:bg-muted/40 hover:text-foreground transition-colors"
                onClick={() => onOpenChange(false)}
                aria-label="إخفاء تسوية اليوم"
                aria-expanded={railOpen}
              >
                <PanelRightClose className="h-4 w-4" />
              </button>
            </div>
          </div>

          <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-1">
            <SummaryTile label="إجمالي التحصيل" value={accountingTotals.paid.toFixed(2)} tone="accent" />
            <SummaryTile label="حساب المركز" value={accountingTotals.centerAmount.toFixed(2)} />
            <SummaryTile label="المتبقي" value={accountingTotals.remainingAmount.toFixed(2)} tone={Math.abs(accountingTotals.remainingAmount) > 0.01 ? "danger" : "default"} />
            <SummaryTile label="بعد التعديلات" value={accountsNetAfterAdjustments.toFixed(2)} tone={Math.abs(accountsNetAfterAdjustments) > 0.01 ? "danger" : "default"} />
          </div>

          <div className="rounded-md border border-border/50 bg-muted/20 p-3">
            <div className="mb-3 flex items-center gap-2 text-xs font-semibold">
              <Layers3 className="h-3.5 w-3.5 text-primary" aria-hidden />
              التعديلات
            </div>
            <div className="space-y-2">
              {([
                ["radiology", "الأشعة"],
                ["external", "خارجي"],
                ["cashbox", "الصندوق"],
              ] as const).map(([key, label]) => (
                <div key={key} className="flex items-center gap-2">
                  <div className="w-16 shrink-0 text-[11px] text-muted-foreground">{label}</div>
                  <Input
                    type="text"
                    inputMode="decimal"
                    value={accountsAdjustmentInputs[key]}
                    onChange={(event) => onAccountsAdjustmentChange(key, event.target.value)}
                    onBlur={() => onAccountsAdjustmentBlur(key)}
                    disabled={!canManageList}
                    className="h-8 flex-1 text-center tabular-nums"
                  />
                </div>
              ))}
            </div>
            <div className="mt-3 flex items-center justify-between rounded-md bg-background px-3 py-2 text-xs">
              <span className="text-muted-foreground">إجمالي التعديلات</span>
              <span className="font-semibold tabular-nums" dir="ltr">
                {accountsAdjustmentsTotal.toFixed(2)}
              </span>
            </div>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="w-full justify-between gap-2"
            onClick={() => setDetailsOpen((prev) => !prev)}
            aria-expanded={detailsOpen}
          >
            <span className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4" />
              تفاصيل الحساب
            </span>
            {detailsOpen ? <PanelRightClose className="h-4 w-4" /> : <PanelRightOpen className="h-4 w-4" />}
          </Button>

          {detailsOpen && (
            <div className="rounded-md border border-border/50 bg-background p-3">
              <OperationTotals
                accountingTotals={accountingTotals}
                accountsAdjustmentInputs={accountsAdjustmentInputs}
                accountsAdjustmentsTotal={accountsAdjustmentsTotal}
                accountsNetAfterAdjustments={accountsNetAfterAdjustments}
                canManageList={canManageList}
                computeAccounting={computeAccounting}
                currentList={currentList}
                exportDateLabel={exportDateLabel}
                exportDoctorLabel={exportDoctorLabel}
                exportOperationLabel={exportOperationLabel}
                exportTimeLabel={exportTimeLabel}
                filteredSavedSummaries={filteredSavedSummaries}
                onAccountsAdjustmentBlur={onAccountsAdjustmentBlur}
                onAccountsAdjustmentChange={onAccountsAdjustmentChange}
                onDeleteSavedSummary={onDeleteSavedSummary}
                onEditSavedSummary={onEditSavedSummary}
                onUpdateRow={onUpdateRow}
                operationType={operationType}
                showSawafAdjustments={showSawafAdjustments}
              />
            </div>
          )}
        </div>
      ) : (
            <div className="flex h-full min-h-[220px] items-stretch justify-center xl:min-h-[calc(100vh-2rem)]">
              <button
                type="button"
                className="flex w-full flex-col items-center justify-center gap-2 border-r border-border/50 px-2 text-muted-foreground hover:bg-muted/30 hover:text-foreground transition-colors"
                onClick={() => onOpenChange(true)}
                aria-label="إظهار تسوية اليوم"
                aria-expanded={railOpen}
              >
            <PanelRightOpen className="h-5 w-5" />
            <span className="text-[10px] leading-none whitespace-nowrap [writing-mode:vertical-rl] rotate-180">
              تسوية اليوم
            </span>
          </button>
        </div>
      )}
    </aside>
  );
}
