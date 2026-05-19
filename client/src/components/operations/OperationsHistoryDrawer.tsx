import { X, Search, Loader, Trash2, CalendarClock } from "lucide-react";
import { useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { TAB_OTHERS, TAB_SAWAF, OPERATION_LABELS, operationTypeLabel } from "@/lib/operationsPricing";
import { formatDayDate } from "@/hooks/operations/operationsShared";

type OperationBooking = {
  id: number;
  bookingDate: string;
  bookingTime: string;
  doctorName: string;
  operationType: string;
  casesCount: number;
};

type OperationsHistoryDrawerProps = {
  open: boolean;
  onClose: () => void;
  historySearch: string;
  onHistorySearchChange: (value: string) => void;
  activeTab: string;
  listDate?: string;
  historyQuery: any;
  operationBookings?: OperationBooking[];
  onLoadListById: (id: number) => void;
  onDeleteListById: (args: { listId: number }) => void;
  canManageList: boolean;
  tabLabelByKey: (key: string) => string;
};

// For السعدني: group all known operation types + catch-all
const HISTORY_GROUPS_SAADANY = [
  { key: "PRK / ليزك", match: ["PRK", "Lasik", "Lasik Moria", "Lasik Moria N", "Lasik Moria D", "Lasik Moria 130", "Lasik Moria 90", "Lasik Metal", "Lasik Metal N", "Lasik Metal D", "Femto"] },
  { key: "مياه بيضاء", match: ["Cataract", "IOL"] },
  { key: "أخرى", match: [] as string[], catchAll: true },
] as const;

export function OperationsHistoryDrawer({
  open,
  onClose,
  historySearch,
  onHistorySearchChange,
  activeTab,
  listDate,
  historyQuery,
  operationBookings = [],
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
            className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:text-muted-foreground bg-muted/60 transition-colors"
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
              {/* ======= الصواف: flat list, no grouping ======= */}
              {activeTab === TAB_SAWAF && (
                <div className="flex flex-col gap-1">
                  {itemsWithMatches.filter(({ hasMatch }) => hasMatch).map(({ item, matches }) => (
                    <HistoryItem key={item.id} item={item} matches={matches} canManageList={canManageList} onLoadListById={onLoadListById} onClose={onClose} onDeleteListById={onDeleteListById} tabLabelByKey={tabLabelByKey} />
                  ))}
                </div>
              )}

              {/* ======= آخرون: grouped by doctor name (lists + bookings) ======= */}
              {activeTab === TAB_OTHERS && (() => {
                const drMap = new Map<string, { lists: typeof itemsWithMatches; bookings: OperationBooking[] }>();
                for (const entry of itemsWithMatches.filter(({ hasMatch }) => hasMatch)) {
                  const dr = String(entry.item.doctorName ?? "").trim() || "غير محدد";
                  if (!drMap.has(dr)) drMap.set(dr, { lists: [], bookings: [] });
                  drMap.get(dr)!.lists.push(entry);
                }
                for (const bk of operationBookings) {
                  const dr = String(bk.doctorName ?? "").trim() || "غير محدد";
                  if (!drMap.has(dr)) drMap.set(dr, { lists: [], bookings: [] });
                  drMap.get(dr)!.bookings.push(bk);
                }
                return Array.from(drMap.entries()).map(([dr, { lists, bookings }]) => (
                  <div key={dr}>
                    <div className="mb-2 text-xs font-semibold text-muted-foreground">{dr}</div>
                    <div className="flex flex-col gap-1">
                      {lists.map(({ item, matches }) => (
                        <HistoryItem key={`list-${item.id}`} item={item} matches={matches} canManageList={canManageList} onLoadListById={onLoadListById} onClose={onClose} onDeleteListById={onDeleteListById} tabLabelByKey={tabLabelByKey} />
                      ))}
                      {bookings.map((bk) => (
                        <div key={`bk-${bk.id}`} className="flex items-center gap-2 rounded-md px-2.5 py-2 bg-muted/20">
                          <CalendarClock className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                          <div className="flex-1 min-w-0 text-right">
                            <div className="text-xs font-medium">{operationTypeLabel(bk.operationType)} — {bk.casesCount} حالة</div>
                            <div className="text-[10px] text-muted-foreground" dir="ltr">{bk.bookingDate} {bk.bookingTime || ""}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ));
              })()}

              {/* ======= السعدني وغيره: grouped by operation type ======= */}
              {activeTab !== TAB_SAWAF && activeTab !== TAB_OTHERS && (() => {
                const matched = new Set<number>();
                return HISTORY_GROUPS_SAADANY.map((group) => {
                  const groupItems = itemsWithMatches.filter(({ item, hasMatch }) => {
                    if (!hasMatch) return false;
                    const op = item.operationType ?? "";
                    if ((group as any).catchAll) return !matched.has(item.id);
                    const isMatch = (group.match as readonly string[]).includes(op);
                    if (isMatch) matched.add(item.id);
                    return isMatch;
                  });
                  return (
                    <div key={group.key}>
                      <div className="mb-2 text-xs font-semibold text-muted-foreground">{group.key}</div>
                      {groupItems.length === 0 ? (
                        <p className="text-xs text-muted-foreground/60 pb-2">لا توجد نتائج</p>
                      ) : (
                        <div className="flex flex-col gap-1">
                          {groupItems.map(({ item, matches }) => (
                            <HistoryItem key={item.id} item={item} matches={matches} canManageList={canManageList} onLoadListById={onLoadListById} onClose={onClose} onDeleteListById={onDeleteListById} tabLabelByKey={tabLabelByKey} />
                          ))}
                        </div>
                      )}
                    </div>
                  );
                });
              })()}
            </div>
          )}
        </div>
      </aside>
    </>
  );
}

function HistoryItem({
  item,
  matches,
  canManageList,
  onLoadListById,
  onClose,
  onDeleteListById,
  tabLabelByKey,
}: {
  item: any;
  matches: string[];
  canManageList: boolean;
  onLoadListById: (id: number) => void;
  onClose: () => void;
  onDeleteListById: (args: { listId: number }) => void;
  tabLabelByKey: (key: string) => string;
}) {
  return (
    <div className="flex items-center gap-2 rounded-md px-2.5 py-2 hover:bg-muted/40 transition-colors">
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
  );
}
