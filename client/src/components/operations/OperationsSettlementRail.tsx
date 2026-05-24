import { PanelRightClose, PanelRightOpen, Calculator } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  type ListData,
  type SavedSummary,
} from "@/hooks/operations/operationsShared";
import { OperationTotals } from "./OperationTotals";

type OperationsSettlementRailProps = {
  open: boolean;
  accountingTotals: {
    centerAmount: number;
    paid: number;
    remainingAmount: number;
  };
  accountsAdjustmentInputs: {
    radiology: string;
    external: string;
    cashbox: string;
  };
  accountsAdjustmentsTotal: number;
  accountsNetAfterAdjustments: number;
  canManageList: boolean;
  computeAccounting: (row: ListData) => {
    centerAmount: number;
    paid: number;
    remainingAmount: number;
  };
  currentList: ListData[];
  exportDateLabel: string;
  exportDoctorLabel: string;
  exportOperationLabel: string;
  exportTimeLabel: string;
  filteredSavedSummaries: SavedSummary[];
  onAccountsAdjustmentBlur: (key: "radiology" | "external" | "cashbox") => void;
  onAccountsAdjustmentChange: (
    key: "radiology" | "external" | "cashbox",
    value: string,
  ) => void;
  onDeleteSavedSummary: (key: string, listId?: number) => void;
  onEditSavedSummary: (summary: SavedSummary) => void;
  onUpdateRow: (id: number, field: keyof ListData | string, value: any) => void;
  operationType: string;
  showSawafAdjustments: boolean;
  onOpenChange: (open: boolean) => void;
};

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
  onOpenChange,
}: OperationsSettlementRailProps) {
  const railOpen = open;

  return (
    <aside
      className={cn(
        "overflow-hidden rounded-lg border border-border/50 bg-background shadow-sm transition-[background-color,border-color,box-shadow] duration-200 ease-out",
        railOpen ? "xl:w-[380px]" : "xl:w-14",
        "w-full",
      )}
    >
      {railOpen ? (
        <div className="space-y-4 px-4 py-4">
          <div className="flex items-center justify-between gap-3 border-b border-border/50 pb-3">
            <div className="flex min-w-0 items-center gap-2 text-right">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-primary text-primary-foreground">
                <Calculator className="h-4 w-4" aria-hidden />
              </div>
              <div className="min-w-0">
                <h2 className="text-sm font-semibold">جدول الحسابات</h2>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                className="flex h-11 w-11 items-center justify-center rounded-md border border-border/50 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground sm:h-8 sm:w-8"
                onClick={() => onOpenChange(false)}
                aria-label="إخفاء تسوية اليوم"
                aria-expanded={railOpen}
              >
                <PanelRightClose className="h-4 w-4" />
              </button>
            </div>
          </div>

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
      ) : (
        <div className="flex h-full min-h-[220px] items-stretch justify-center xl:min-h-[calc(100vh-2rem)]">
          <button
            type="button"
            className="flex w-full flex-col items-center justify-center gap-2 border-r border-border/50 px-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
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
