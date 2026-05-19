import { useMemo, Fragment } from "react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { PlusCircle, Syringe } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { getLocalDateIso } from "@/hooks/operations/operationsShared";
import reportStyles from "@/pages/accounting/AccountingOpReport.module.css";
import { cn } from "@/lib/utils";

type BookingShortcutModuleProps = {
  onAddBooking: () => void;
};

export function BookingShortcutModule({ onAddBooking }: BookingShortcutModuleProps) {
  const today = getLocalDateIso();
  const bookingsQuery = trpc.medical.getTodayOperationLists.useQuery(
    { date: today },
    { staleTime: 30 * 1000 }
  );

  const grouped = useMemo(() => {
    const lists = (bookingsQuery.data ?? []) as any[];
    // Only show bookings (isBooking: true) in the shortcut module to keep it clean
    const bookingLists = lists.filter(l => l.isBooking);
    
    const groups: Record<string, { doctor: string; count: number }> = {};
    for (const list of bookingLists) {
      const d = list.doctorName || "طبيب غير محدد";
      const items = list.items ?? [];
      const total = items.reduce((acc: number, item: any) => acc + (item.casesCount || 1), 0);
      groups[d] = { 
        doctor: d, 
        count: (groups[d]?.count || 0) + total 
      };
    }
    return Object.values(groups);
  }, [bookingsQuery.data]);

  const totalCases = grouped.reduce((acc, g) => acc + g.count, 0);

  return (
    <div className={cn(reportStyles.reportBlock, "bg-card")}>
      <div className={cn(reportStyles.blockHeader, "flex items-center justify-between py-2")}>
        <div className="flex items-center gap-2">
          <Syringe className="h-4 w-4 text-primary" />
          <span className="font-bold text-sm">حجز عمليات الويب (اليوم)</span>
        </div>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={onAddBooking}
          className="h-7 gap-1.5 border-primary/30 bg-primary text-primary-foreground hover:bg-primary/90"
        >
          <PlusCircle className="h-3.5 w-3.5" />
          حجز جديد
        </Button>
      </div>

      <div className="overflow-x-auto">
        <table className={reportStyles.gridTable}>
          <thead>
            <tr>
              <th className="font-bold text-[11px] py-1 px-2">الطبيب</th>
              <th className="font-bold text-center w-16 text-[11px] py-1 px-2">العدد</th>
            </tr>
          </thead>
          <tbody>
            {bookingsQuery.isLoading ? (
              [1, 2].map(i => (
                <tr key={i}>
                  <td className="p-1 px-2"><Skeleton className="h-3 w-20" /></td>
                  <td className="p-1 px-2"><Skeleton className="h-3 w-6 mx-auto" /></td>
                </tr>
              ))
            ) : grouped.length === 0 ? (
              <tr>
                <td colSpan={2} className="text-center py-4 text-muted-foreground text-[10px] italic">
                  لا توجد حجوزات ويب مسجلة
                </td>
              </tr>
            ) : (
              grouped.map((group) => (
                <tr key={group.doctor} className="hover:bg-muted/5 transition-colors">
                  <td className="px-2 py-1 text-xs whitespace-nowrap">{group.doctor}</td>
                  <td className="text-center font-bold tabular-nums text-xs py-1 px-2">{group.count}</td>
                </tr>
              ))
            )}
          </tbody>
          {grouped.length > 0 && (
            <tfoot>
              <tr className={reportStyles.grandTotalRow}>
                <td className="font-bold text-[11px] py-1 px-2">الإجمالي</td>
                <td className="text-center font-bold text-[11px] py-1 px-2 tabular-nums">{totalCases}</td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </div>
  );
}
