import { TAB_CONFIG } from "@/lib/operationsPricing";
import { type ViewMode } from "@/hooks/operations/operationsShared";

type OperationsTabsProps = {
  activeTab: string;
  canOpenAccounts: boolean;
  onActiveTabChange: (value: string) => void;
  onViewModeChange: (value: ViewMode) => void;
  viewMode: ViewMode;
};

const tabBtn = (active: boolean) =>
  `shrink-0 rounded-lg px-4 py-2 text-sm font-semibold transition-all ${
    active
      ? "bg-background text-primary shadow-sm"
      : "text-muted-foreground hover:text-foreground"
  }`;

export function OperationsTabs({ activeTab, canOpenAccounts, onActiveTabChange, onViewModeChange, viewMode }: OperationsTabsProps) {
  return (
    <>
      {/* Doctor tabs */}
      <div className="mb-4 flex gap-1.5 rounded-xl bg-muted/60 p-1 print:hidden">
        {TAB_CONFIG.map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => onActiveTabChange(tab.key)}
            className={`flex-1 rounded-lg px-4 py-2.5 text-base font-bold transition-all ${
              activeTab === tab.key
                ? "bg-background text-primary shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* View mode tabs */}
      <div className="mb-4 flex gap-1 rounded-lg bg-muted/50 p-1 print:hidden">
        <button type="button" onClick={() => onViewModeChange("table")} className={tabBtn(viewMode === "table")}>
          اللست
        </button>
        {canOpenAccounts && (
          <button type="button" onClick={() => onViewModeChange("accounts")} className={tabBtn(viewMode === "accounts")}>
            الحسابات
          </button>
        )}
        <button type="button" onClick={() => onViewModeChange("history")} className={tabBtn(viewMode === "history")}>
          السجل
        </button>
      </div>
    </>
  );
}
