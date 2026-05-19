import { useEffect, useMemo } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { useTodayQueuePatientsMerged } from "@/hooks/useTodayQueuePatientsMerged";
import { PageHeader } from "@/components/shared/PageHeader";
import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";
import { CalendarCheck, ClipboardCheck, Footprints, LayoutGrid, Syringe } from "lucide-react";

function parseRowDate(value: unknown): Date | null {
  if (value == null) return null;
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;
  const d = new Date(String(value));
  return Number.isNaN(d.getTime()) ? null : d;
}

function startOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function isSameMonth(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth();
}

function isInRollingWeek(d: Date, now: Date): boolean {
  const t = startOfDay(now).getTime();
  const weekMs = 7 * 24 * 60 * 60 * 1000;
  const x = startOfDay(d).getTime();
  return x >= t - weekMs && x <= t + 24 * 60 * 60 * 1000;
}

type Accent = "blue" | "orange" | "emerald" | "rose";

const ACCENT: Record<
  Accent,
  { bar: string; iconWrap: string; icon: string }
> = {
  blue: {
    bar: "border-t-primary",
    iconWrap: "bg-primary text-primary-foreground",
    icon: "text-primary",
  },
  orange: {
    bar: "border-t-secondary",
    iconWrap: "bg-primary/15 text-primary",
    icon: "text-secondary",
  },
  emerald: {
    bar: "border-t-success",
    iconWrap: "bg-success/15 text-success",
    icon: "text-success",
  },
  rose: {
    bar: "border-t-destructive",
    iconWrap: "bg-destructive/10 text-destructive",
    icon: "text-destructive",
  },
};

type HubCard = {
  key: string;
  path: string;
  title: string;
  description: string;
  statMain: number | string;
  statSub: string;
  icon: LucideIcon;
  accent: Accent;
};

export default function WorkflowHub() {
  const { isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();

  const { merged, isLoading: todayLoading } = useTodayQueuePatientsMerged();
  const visitsQuery = trpc.medical.getVisits.useQuery(undefined, { refetchOnWindowFocus: false });
  const appointmentsQuery = trpc.medical.getOperations.useQuery(undefined, { refetchOnWindowFocus: false });

  useEffect(() => {
    if (!isAuthenticated) setLocation("/");
  }, [isAuthenticated, setLocation]);

  const now = useMemo(() => new Date(), []);

  const followUpCount = useMemo(() => {
    const rows = (visitsQuery.data ?? []) as Array<{ visitType?: string | null; visitDate?: unknown }>;
    return rows.filter((v) => {
      if (String(v.visitType ?? "") !== "followup") return false;
      const d = parseRowDate(v.visitDate);
      if (!d) return false;
      return isSameMonth(d, now);
    }).length;
  }, [visitsQuery.data, now]);

  const visitsWeekCount = useMemo(() => {
    const rows = (visitsQuery.data ?? []) as Array<{ visitDate?: unknown }>;
    return rows.filter((v) => {
      const d = parseRowDate(v.visitDate);
      if (!d) return false;
      return isInRollingWeek(d, now);
    }).length;
  }, [visitsQuery.data, now]);

  const surgeryMonthCount = useMemo(() => {
    const rows = (appointmentsQuery.data ?? []) as Array<{ appointmentType?: string | null; appointmentDate?: unknown }>;
    return rows.filter((a) => {
      if (String(a.appointmentType ?? "") !== "surgery") return false;
      const d = parseRowDate(a.appointmentDate);
      if (!d) return false;
      return isSameMonth(d, now);
    }).length;
  }, [appointmentsQuery.data, now]);

  const todayCount = merged.length;

  const cards: HubCard[] = useMemo(
    () => [
      {
        key: "followups",
        path: "/followups",
        title: "المتابعات",
        description: "إدارة مواعيد المتابعة والتذكيرات",
        statMain: visitsQuery.isLoading ? "…" : followUpCount,
        statSub: "متابعة مستحقة",
        icon: ClipboardCheck,
        accent: "blue",
      },
      {
        key: "visits",
        path: "/visits",
        title: "الزيارات",
        description: "تتبع جميع الزيارات والمواعيد",
        statMain: visitsQuery.isLoading ? "…" : visitsWeekCount,
        statSub: "زيارة هذا الأسبوع",
        icon: Footprints,
        accent: "orange",
      },
      {
        key: "today",
        path: "/today",
        title: "مرضى اليوم",
        description: "عرض مرضى اليوم وحالتهم في الانتظار",
        statMain: todayLoading ? "…" : todayCount,
        statSub: "مريض اليوم",
        icon: CalendarCheck,
        accent: "emerald",
      },
      {
        key: "operations",
        path: "/operations",
        title: "العمليات",
        description: "إدارة جدول العمليات الجراحية والمتابعة",
        statMain: appointmentsQuery.isLoading ? "…" : surgeryMonthCount,
        statSub: "عملية هذا الشهر",
        icon: Syringe,
        accent: "rose",
      },
    ],
    [
      followUpCount,
      visitsWeekCount,
      todayCount,
      surgeryMonthCount,
      visitsQuery.isLoading,
      appointmentsQuery.isLoading,
      todayLoading,
    ],
  );

  if (!isAuthenticated) return null;

  return (
    <div className="min-h-screen bg-muted/40" dir="rtl">
      <div className="mx-auto max-w-6xl px-3 py-6 sm:px-4 sm:py-8">
        <PageHeader
          title="مركز سير العمل"
          description="الوصول السريع لجميع أقسام سير العمل"
          icon={<LayoutGrid className="h-6 w-6 text-primary" />}
          className="mb-6 sm:mb-8"
        />

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {cards.map((card) => {
            const Icon = card.icon;
            const a = ACCENT[card.accent];
            return (
              <button
                key={card.key}
                type="button"
                onClick={() => setLocation(card.path)}
                className={cn(
                  "group w-full rounded-2xl border border-border/70 bg-card text-right shadow-sm transition-all",
                  "hover:shadow-md hover:border-primary/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  a.bar,
                  "border-t-[3px]",
                )}
              >
                <div className="flex flex-col gap-4 p-4 sm:p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex flex-col items-end text-right">
                      <span className="text-3xl font-black tabular-nums tracking-tight text-foreground sm:text-[2rem] leading-none">
                        {card.statMain}
                      </span>
                      <span className="mt-1.5 text-[11px] font-medium text-muted-foreground">{card.statSub}</span>
                    </div>
                    <div
                      className={cn(
                        "flex h-12 w-12 shrink-0 items-center justify-center rounded-xl shadow-inner",
                        a.iconWrap,
                      )}
                      aria-hidden
                    >
                      <Icon className={cn("h-6 w-6", a.icon)} />
                    </div>
                  </div>
                  <div className="space-y-1 border-t border-border/60 pt-3">
                    <h2 className="text-base font-bold text-foreground group-hover:text-primary transition-colors">{card.title}</h2>
                    <p className="text-xs leading-relaxed text-muted-foreground">{card.description}</p>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
