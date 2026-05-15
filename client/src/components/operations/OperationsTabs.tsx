import { TAB_CONFIG } from "@/lib/operationsPricing";
import { cn } from "@/lib/utils";

type OperationsTabsProps = {
  activeTab: string;
  onActiveTabChange: (value: string) => void;
};

export function OperationsTabs({ activeTab, onActiveTabChange }: OperationsTabsProps) {
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
              "rounded-md px-3 py-1.5 text-sm font-medium transition-all",
              isActive
                ? "bg-primary/10 text-primary"
                : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
            )}
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}
