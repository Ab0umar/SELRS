import { X, Search, Loader, Trash2, CalendarClock, FolderOpen, User } from "lucide-react";
import { useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  TAB_OTHERS,
  TAB_SAWAF,
  OPERATION_LABELS,
  operationTypeLabel,
} from "@/lib/operationsPricing";
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
  {
    key: "PRK / ليزك",
    match: [
      "PRK",
      "Lasik",
      "Lasik Moria",
      "Lasik Moria N",
      "Lasik Moria D",
      "Lasik Moria 130",
      "Lasik Moria 90",
      "Lasik Metal",
      "Lasik Metal N",
      "Lasik Metal D",
      "Femto",
      "FL",
      "FS",
    ],
  },
  { key: "مياه بيضاء وزراعة عدسات", match: ["Cataract", "IOL", "ICL"] },
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
  const itemsWithMatches = useMemo(() => {
    const needle = historySearch.trim().toLowerCase();
    const normalized = (value: unknown) => String(value ?? "").toLowerCase();
    return (historyQuery.data ?? [])
      .filter((item: any) => item.doctorTab === activeTab)
      .map((item: any) => {
        const names: string[] = (item.items ?? []).map((entry: any) =>
          String(entry.name ?? ""),
        );
        const matches = needle
          ? names.filter((name: string) => normalized(name).includes(needle))
          : names;
        return {
          item: item as any,
          matches,
          hasMatch: needle ? matches.length > 0 : true,
        };
      }) as { item: any; matches: string[]; hasMatch: boolean }[];
  }, [historyQuery.data, historySearch, activeTab]);

  const needle = historySearch.trim().toLowerCase();

  if (!open) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/40 backdrop-blur-xs print:hidden transition-opacity"
        onClick={onClose}
        aria-hidden
      />

      {/* Drawer panel */}
      <aside
        className="fixed inset-y-0 left-0 z-50 flex w-full max-w-xl md:max-w-2xl flex-col bg-background border-r border-border/60 shadow-2xl print:hidden"
        dir="rtl"
        role="dialog"
        aria-modal="true"
        aria-label="سجل العمليات والقوائم المحفوظة"
      >
        {/* Drawer header */}
        <div className="flex items-center justify-between border-b border-border/60 bg-muted/50 px-5 py-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <FolderOpen className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-foreground">سجل القوائم المحفوظة</h2>
              <p className="text-xs text-muted-foreground">استعرض واسترجع القوائم السابقة المسجلة بسهولة</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-xl bg-muted/60 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            aria-label="إغلاق"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Search */}
        <div className="px-5 py-3 border-b border-border/60 bg-card">
          <div className="relative">
            <Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={historySearch}
              onChange={(e) => onHistorySearchChange(e.target.value)}
              placeholder="ابحث باسم المريض أو تاريخ القائمة…"
              className="h-10 pr-9 text-right text-sm bg-muted/30 border-border focus:bg-card rounded-xl"
              dir="rtl"
              aria-label="بحث في سجل العمليات"
            />
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {historyQuery.isLoading && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground py-12 justify-center">
              <Loader className="h-5 w-5 animate-spin text-primary" aria-hidden />
              جاري تحميل السجل والقوائم المحفوظة...
            </div>
          )}

          {!historyQuery.isLoading && itemsWithMatches.length === 0 && (
            <div className="flex flex-col items-center justify-center gap-2 py-16 text-sm text-muted-foreground bg-muted/30 rounded-2xl border border-dashed border-border">
              <FolderOpen
                className="h-10 w-10 text-muted-foreground/70"
                aria-hidden
              />
              <span className="font-semibold">لا توجد قوائم محفوظة في هذا التاب حتى الآن.</span>
            </div>
          )}

          {!historyQuery.isLoading &&
            needle &&
            itemsWithMatches.every(
              ({ item }) => (item.items ?? []).length === 0,
            ) && (
              <p className="text-sm text-muted-foreground text-center py-10">
                لا توجد نتائج مطابقة في السجل.
              </p>
            )}

          {!historyQuery.isLoading && itemsWithMatches.length > 0 && (
            <div className="space-y-4">
              {/* ======= الصواف: flat list ======= */}
              {activeTab === TAB_SAWAF && (
                <div className="flex flex-col gap-2.5">
                  {itemsWithMatches
                    .filter(({ hasMatch }) => hasMatch)
                    .map(({ item, matches }) => (
                      <HistoryItem
                        key={item.id}
                        item={item}
                        matches={matches}
                        canManageList={canManageList}
                        onLoadListById={onLoadListById}
                        onClose={onClose}
                        onDeleteListById={onDeleteListById}
                        tabLabelByKey={tabLabelByKey}
                      />
                    ))}
                </div>
              )}

              {/* ======= آخرون: grouped by doctor name (lists + bookings) ======= */}
              {activeTab === TAB_OTHERS &&
                (() => {
                  const drMap = new Map<
                    string,
                    {
                      lists: typeof itemsWithMatches;
                      bookings: OperationBooking[];
                    }
                  >();
                  for (const entry of itemsWithMatches.filter(
                    ({ hasMatch }) => hasMatch,
                  )) {
                    const dr =
                      String(entry.item.doctorName ?? "").trim() || "طبيب غير محدد";
                    if (!drMap.has(dr))
                      drMap.set(dr, { lists: [], bookings: [] });
                    drMap.get(dr)!.lists.push(entry);
                  }
                  for (const bk of operationBookings) {
                    const dr = String(bk.doctorName ?? "").trim() || "طبيب غير محدد";
                    if (!drMap.has(dr))
                      drMap.set(dr, { lists: [], bookings: [] });
                    drMap.get(dr)!.bookings.push(bk);
                  }
                  return Array.from(drMap.entries()).map(
                    ([dr, { lists, bookings }]) => (
                      <div key={dr} className="space-y-2">
                        <div className="flex items-center gap-2 text-xs font-bold text-foreground bg-muted/70 px-3 py-1.5 rounded-lg border border-border/60">
                          <User className="h-3.5 w-3.5 text-primary" />
                          <span>{dr}</span>
                        </div>
                        <div className="flex flex-col gap-2.5">
                          {lists.map(({ item, matches }) => (
                            <HistoryItem
                              key={`list-${item.id}`}
                              item={item}
                              matches={matches}
                              canManageList={canManageList}
                              onLoadListById={onLoadListById}
                              onClose={onClose}
                              onDeleteListById={onDeleteListById}
                              tabLabelByKey={tabLabelByKey}
                            />
                          ))}
                          {bookings.map((bk) => (
                            <div
                              key={`bk-${bk.id}`}
                              className="flex items-center justify-between gap-3 rounded-xl px-3.5 py-2.5 bg-amber-50/60 border border-amber-200/60 text-amber-900"
                            >
                              <div className="flex items-center gap-2">
                                <CalendarClock className="h-4 w-4 shrink-0 text-amber-600" />
                                <div className="text-xs font-bold">
                                  {operationTypeLabel(bk.operationType)} — {bk.casesCount} حالة
                                </div>
                              </div>
                              <div className="text-[11px] font-mono text-amber-700 bg-amber-100/80 px-2 py-0.5 rounded-md" dir="ltr">
                                {bk.bookingDate} {bk.bookingTime || ""}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ),
                  );
                })()}

              {/* ======= السعدني وغيره: grouped by operation type ======= */}
              {activeTab !== TAB_SAWAF &&
                activeTab !== TAB_OTHERS &&
                (() => {
                  const matched = new Set<number>();
                  return HISTORY_GROUPS_SAADANY.map((group) => {
                    const groupItems = itemsWithMatches.filter(
                      ({ item, hasMatch }) => {
                        if (!hasMatch) return false;
                        const op = item.operationType ?? "";
                        if ((group as any).catchAll)
                          return !matched.has(item.id);
                        const isMatch = (
                          group.match as readonly string[]
                        ).includes(op);
                        if (isMatch) matched.add(item.id);
                        return isMatch;
                      },
                    );
                    return (
                      <div key={group.key} className="space-y-2">
                        <div className="text-xs font-bold text-foreground bg-muted/70 px-3 py-1.5 rounded-lg border border-border/60">
                          {group.key}
                        </div>
                        {groupItems.length === 0 ? (
                          <p className="text-xs text-muted-foreground px-2 pb-1">
                            لا توجد نتائج محفوظة هنا.
                          </p>
                        ) : (
                          <div className="flex flex-col gap-2.5">
                            {groupItems.map(({ item, matches }) => (
                              <HistoryItem
                                key={item.id}
                                item={item}
                                matches={matches}
                                canManageList={canManageList}
                                onLoadListById={onLoadListById}
                                onClose={onClose}
                                onDeleteListById={onDeleteListById}
                                tabLabelByKey={tabLabelByKey}
                              />
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
    <div className="flex items-center justify-between gap-2.5 rounded-xl border border-border bg-card p-2.5 shadow-2xs hover:border-primary/50 hover:shadow-xs transition-all">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 mb-0.5">
          <span className="font-bold text-xs text-foreground truncate">
            {item.doctorName ?? tabLabelByKey(item.doctorTab)}
          </span>
          <span className="inline-flex items-center gap-1 rounded bg-primary/10 px-1.5 py-0.2 text-[10px] font-semibold text-primary">
            <CalendarClock className="h-2.5 w-2.5" />
            {formatDayDate(item.listDate)}
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-1 text-[11px] text-muted-foreground">
          <span className="inline-flex items-center rounded bg-muted px-1.5 py-0.2 font-medium text-foreground">
            {operationTypeLabel(item.operationType ?? "Other")}
          </span>
          {item.items?.length ? (
            <span className="text-[10px] font-bold text-primary bg-primary/10 px-1.5 py-0.2 rounded">
              {item.items.length} حالة
            </span>
          ) : null}
          {(matches[0] || item.items?.[0]?.name) && (
            <span className="text-muted-foreground font-medium text-[11px]">
              • {matches[0] ?? item.items?.[0]?.name}
            </span>
          )}
        </div>
      </div>
      <div className="flex items-center gap-1 shrink-0">
        <Button
          variant="default"
          size="sm"
          className="bg-primary text-primary-foreground hover:bg-primary/90 font-bold h-7 px-2.5 rounded-lg text-[11px] gap-1 shadow-2xs"
          onClick={() => {
            onLoadListById(item.id);
            onClose();
          }}
        >
          <FolderOpen className="h-3 w-3" />
          تحميل
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg"
          onClick={() => onDeleteListById({ listId: item.id })}
          disabled={!canManageList}
          aria-label="حذف"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
}
