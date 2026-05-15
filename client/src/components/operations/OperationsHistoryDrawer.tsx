import { X, Search, Loader, Trash2 } from "lucide-react";
import { useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { operationTypeLabel } from "@/lib/operationsPricing";
import { formatDayDate } from "@/hooks/operations/operationsShared";

type OperationsHistoryDrawerProps = {
  open: boolean;
  onClose: () => void;
  historySearch: string;
  onHistorySearchChange: (value: string) => void;
  activeTab: string;
  historyQuery: any;
  onLoadListById: (id: number) => void;
  onDeleteListById: (args: { listId: number }) => void;
  canManageList: boolean;
  tabLabelByKey: (key: string) => string;
};

const HISTORY_GROUPS = [
  { key: "PRK / ليزك", match: ["PRK", "Lasik"] },
  { key: "مياه بيضاء", match: ["Cataract"] },
  { key: "أخرى", match: [null, "", "Other"] },
] as const;

export function OperationsHistoryDrawer({
  open,
  onClose,
  historySearch,
  onHistorySearchChange,
  activeTab,
  historyQuery,
  onLoadListById,
  onDeleteListById,
  canManageList,
  tabLabelByKey,
}: OperationsHistoryDrawerProps) {
  if (!open) return null;

  const itemsWithMatches = useMemo(() => {
    const needle = historySearch.trim().toLowerCase();
    const normalized = (value: unknown) => String(value ?? "").toLowerCase();
    return (historyQuery.data ?? [])
      .filter((item: any) => item.doctorTab === activeTab)
      .map((item: any) => {
        const names: string[] = (item.items ?? []).map((entry: any) => String(entry.name ?? ""));
        const matches = needle ? names.filter((name: string) => normalized(name).includes(needle)) : names;
        return { item: item as any, matches, hasMatch: needle ? matches.length > 0 : true };
      }) as { item: any; matches: string[]; hasMatch: boolean }[];
  }, [historyQuery.data, historySearch, activeTab]);

  const needle = historySearch.trim().toLowerCase();

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/20 print:hidden"
        onClick={onClose}
        aria-hidden
      />

      {/* Drawer panel */}
      <aside
        className="fixed inset-y-0 left-0 z-50 flex w-full max-w-md flex-col bg-background border-r border-border/50 shadow-lg print:hidden"
        dir="rtl"
        role="dialog"
        aria-label="سجل العمليات"
      >
        {/* Drawer header */}
        <div className="flex items-center justify-between border-b border-border/50 px-4 py-3">
          <h2 className="text-sm font-semibold">السجل</h2>
          <button
            type="button"
            onClick={onClose}
            className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors"
            aria-label="إغلاق"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Search */}
        <div className="px-4 py-2.5 border-b border-border/50">
          <div className="relative">
            <Search className="absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={historySearch}
              onChange={(e) => onHistorySearchChange(e.target.value)}
              placeholder="ابحث عن مريض"
              className="h-8 pr-8 text-right text-xs"
              dir="rtl"
            />
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {historyQuery.isLoading && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground py-8 justify-center">
              <Loader className="h-4 w-4 animate-spin" aria-hidden />
              جاري تحميل السجل...
            </div>
          )}

          {!historyQuery.isLoading && itemsWithMatches.length === 0 && (
            <div className="flex flex-col items-center justify-center gap-2 py-12 text-sm text-muted-foreground">
              <Search className="h-8 w-8 text-muted-foreground/40" aria-hidden />
              <span>لا يوجد سجل محفوظ حالياً.</span>
            </div>
          )}

          {!historyQuery.isLoading && needle && itemsWithMatches.every(({ item }) => (item.items ?? []).length === 0) && (
            <p className="text-sm text-muted-foreground text-center py-8">لا توجد نتائج مطابقة في السجل.</p>
          )}

          {!historyQuery.isLoading && itemsWithMatches.length > 0 && (
            <div className="space-y-4">
              {HISTORY_GROUPS.map((group) => {
                const groupItems = itemsWithMatches.filter(
                  ({ item, hasMatch }) => hasMatch && (group.match as readonly string[]).includes(item.operationType ?? "Other")
                );
                return (
                  <div key={group.key}>
                    <div className="mb-2 text-xs font-semibold text-muted-foreground">{group.key}</div>
                    {groupItems.length === 0 ? (
                      <p className="text-xs text-muted-foreground/60 pb-2">لا توجد نتائج</p>
                    ) : (
                      <div className="flex flex-col gap-1">
                        {groupItems.map(({ item, matches }) => (
                          <div
                            key={item.id}
                            className="flex items-center gap-2 rounded-md px-2.5 py-2 hover:bg-muted/40 transition-colors"
                          >
                            <button
                              type="button"
                              className="flex-1 text-right min-w-0"
                              onClick={() => { onLoadListById(item.id); onClose(); }}
                              aria-label={`تحميل قائمة ${item.doctorName ?? tabLabelByKey(item.doctorTab)}`}
                            >
                              <div className="text-xs font-medium truncate">
                                {item.doctorName ?? tabLabelByKey(item.doctorTab)}
                              </div>
                              <div className="text-[10px] text-muted-foreground" dir="ltr">
                                {formatDayDate(item.listDate)} {operationTypeLabel(item.operationType ?? "Other")} {matches[0] ?? item.items?.[0]?.name ?? " "}
                              </div>
                            </button>
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-7 text-[10px] shrink-0"
                              onClick={() => { onLoadListById(item.id); onClose(); }}
                            >
                              تحميل
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 w-7 p-0 text-muted-foreground hover:text-error shrink-0"
                              onClick={() => onDeleteListById({ listId: item.id })}
                              disabled={!canManageList}
                              aria-label="حذف"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </aside>
    </>
  );
}
