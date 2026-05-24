import { TAB_CONFIG } from "@/lib/operationsPricing";
import { cn } from "@/lib/utils";

type OperationsTabsProps = {
  activeTab: string;
  onActiveTabChange: (value: string) => void;
};

export function OperationsTabs({
  activeTab,
  onActiveTabChange,
}: OperationsTabsProps) {
  return (
    <div className="flex items-center gap-1 print:hidden">
      {TAB_CONFIG.map((tab) => {
        const isActive = activeTab === tab.key;
        return (
          <button
            key={tab.key}
            type="button"
            onClick={() => onActiveTabChange(tab.key)}
            className={cn(
              "min-h-11 rounded-md px-3 py-2 text-sm font-medium transition-colors sm:min-h-8 sm:py-1.5",
              isActive
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-muted-foreground bg-muted/50",
            )}
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}
