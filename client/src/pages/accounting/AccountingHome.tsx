import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { trpc } from "@/lib/trpc";
import type { DashboardSummaryOutput } from "@shared/accounting/contracts";
import {
  ArrowRight,
  Banknote,
  CalendarDays,
  CircleAlert,
  ClipboardList,
  FileText,
  ReceiptText,
  RefreshCw,
  Stethoscope,
  UserRound,
  Users,
} from "lucide-react";
import { Link } from "wouter";
import AccountingShell from "./AccountingShell";

type SummaryCard = {
  label: string;
  value: number;
  description: string;
  kind: "count" | "money";
  icon: React.ComponentType<{ className?: string }>;
};

type DashboardSummaryQuery = {
  data?: DashboardSummaryOutput;
  error: { message?: string };
  isError: boolean;
  isFetching: boolean;
  isLoading: boolean;
  refetch: () => Promise<unknown>;
};

type AccountingTrpc = typeof trpc & {
  accounting: {
    dashboardSummary: {
      useQuery: (
        input: { sectionCode?: number },
        options?: { refetchOnWindowFocus?: boolean },
      ) => DashboardSummaryQuery;
    };
  };
};

const accountingTrpc = trpc as unknown as AccountingTrpc;

const quickLinks = [
  {
    label: "الإيراد اليومي",
    description: "مراجعة الإيرادات حسب اليوم",
    href: "/accounting/daily-revenue",
    icon: CalendarDays,
  },
  {
    label: "إيراد الخدمات",
    description: "إجماليات الطبيب والخدمة",
    href: "/accounting/service-revenue",
    icon: Banknote,
  },
  {
    label: "استعلام الإيصالات",
    description: "البحث عن رؤوس الإيصالات",
    href: "/accounting/receipts",
    icon: ReceiptText,
  },
  {
    label: "الخدمات",
    description: "حركة خدمات الليزك",
    href: "/accounting/services",
    icon: ClipboardList,
  },
  {
    label: "استعلام المرضى",
    description: "بحث المرضى والإيصالات",
    href: "/accounting/patients",
    icon: Users,
  },
  {
    label: "حساب مريض",
    description: "بحث حساب مريض",
    href: "/accounting/patient",
    icon: UserRound,
  },
  {
    label: "حساب طبيب",
    description: "بحث حساب طبيب",
    href: "/accounting/doctor",
    icon: Stethoscope,
  },
];

const numberFormat = new Intl.NumberFormat("ar-EG");
const moneyFormat = new Intl.NumberFormat("ar-EG", {
  maximumFractionDigits: 2,
  minimumFractionDigits: 0,
});

function formatValue(value: number, kind: SummaryCard["kind"]) {
  if (kind === "money") {
    return `${moneyFormat.format(value)} ج.م`;
  }

  return numberFormat.format(value);
}

function SummarySkeleton() {
  return (
    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
      {Array.from({ length: 4 }).map((_, index) => (
        <Card key={index} className="border-border/80">
          <CardHeader className="flex flex-row items-center justify-between gap-3 pb-2">
            <div className="space-y-2">
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-3 w-20" />
            </div>
            <Skeleton className="h-9 w-9 rounded-lg" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-8 w-24" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export default function AccountingHome() {
  const summaryQuery = accountingTrpc.accounting.dashboardSummary.useQuery(
    { sectionCode: 15 },
    { refetchOnWindowFocus: false },
  );

  const data = summaryQuery.data;
  const hasZeroData = Boolean(
    data &&
      data.totalReceiptsToday === 0 &&
      data.totalRevenueToday === 0 &&
      data.totalReceiptsThisMonth === 0 &&
      data.totalRevenueThisMonth === 0,
  );

  const summaryCards: SummaryCard[] = data
    ? [
        {
          label: "إيصالات اليوم",
          value: data.totalReceiptsToday,
          description: "عدد الإيصالات لهذا اليوم",
          kind: "count",
          icon: ReceiptText,
        },
        {
          label: "إيراد اليوم",
          value: data.totalRevenueToday,
          description: "إجمالي إيراد الخدمات اليوم",
          kind: "money",
          icon: Banknote,
        },
        {
          label: "إيصالات الشهر",
          value: data.totalReceiptsThisMonth,
          description: "عدد الإيصالات لهذا الشهر",
          kind: "count",
          icon: FileText,
        },
        {
          label: "إيراد الشهر",
          value: data.totalRevenueThisMonth,
          description: "إجمالي إيراد الخدمات لهذا الشهر",
          kind: "money",
          icon: CalendarDays,
        },
      ]
    : [];

  return (
    <AccountingShell>
      <div className="space-y-4">
        <Card className="border-border/80 bg-card shadow-sm">
          <CardHeader className="gap-2">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <CardTitle className="text-xl tracking-tight">
                  لوحة الحسابات
                </CardTitle>
                <CardDescription className="mt-1 text-sm">
                  ملخص قسم الليزك من قاعدة بيانات الحسابات.
                </CardDescription>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => void summaryQuery.refetch()}
                disabled={summaryQuery.isFetching}
              >
                <RefreshCw className={summaryQuery.isFetching ? "animate-spin" : ""} />
                تحديث
              </Button>
            </div>
          </CardHeader>
        </Card>

        {summaryQuery.isLoading ? <SummarySkeleton /> : null}

        {summaryQuery.isError ? (
          <Card className="border-destructive/30 bg-destructive/5">
            <CardContent className="flex flex-col gap-3 py-5 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-start gap-3">
                <div className="rounded-lg bg-destructive/10 p-2 text-destructive">
                  <CircleAlert className="h-5 w-5" />
                </div>
                <div>
                  <p className="font-semibold text-foreground">
                    تعذر تحميل ملخص الحسابات
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {summaryQuery.error.message || "تأكد من الاتصال بقاعدة بيانات الحسابات."}
                  </p>
                </div>
              </div>
              <Button
                type="button"
                variant="outline"
                onClick={() => void summaryQuery.refetch()}
              >
                حاول مرة أخرى
              </Button>
            </CardContent>
          </Card>
        ) : null}

        {data && !summaryQuery.isError ? (
          <>
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              {summaryCards.map((item) => {
                const Icon = item.icon;

                return (
                  <Card key={item.label} className="border-border/80 shadow-sm">
                    <CardHeader className="flex flex-row items-center justify-between gap-3 pb-2">
                      <div className="min-w-0">
                        <CardTitle className="text-sm font-medium text-muted-foreground">
                          {item.label}
                        </CardTitle>
                        <CardDescription className="mt-1">
                          {item.description}
                        </CardDescription>
                      </div>
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                        <Icon className="h-4 w-4" />
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold tracking-tight tabular-nums text-foreground">
                        {formatValue(item.value, item.kind)}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            {hasZeroData ? (
              <Card className="border-amber-200 bg-amber-50">
                <CardContent className="py-4 text-sm text-amber-900">
                  لا يوجد نشاط محاسبي متاح لليوم أو الشهر الحالي.
                </CardContent>
              </Card>
            ) : null}
          </>
        ) : null}

        <Card className="border-border/80 shadow-sm">
          <CardHeader>
            <CardTitle className="text-base">التقارير</CardTitle>
            <CardDescription className="text-sm">
              فتح تقارير الحسابات الرئيسية (للقراءة فقط).
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            {quickLinks.map((item) => {
              const Icon = item.icon;

              return (
                <Button
                  key={item.href}
                  asChild
                  variant="outline"
                  className="h-auto justify-between whitespace-normal px-4 py-3 text-right"
                >
                  <Link href={item.href}>
                    <span className="flex min-w-0 items-center gap-3">
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted text-foreground">
                        <Icon className="h-4 w-4" />
                      </span>
                      <span className="min-w-0">
                        <span className="block font-semibold">{item.label}</span>
                        <span className="block text-xs font-normal text-muted-foreground">
                          {item.description}
                        </span>
                      </span>
                    </span>
                    <ArrowRight className="h-4 w-4 shrink-0 rotate-180" />
                  </Link>
                </Button>
              );
            })}
          </CardContent>
        </Card>
      </div>
    </AccountingShell>
  );
}
