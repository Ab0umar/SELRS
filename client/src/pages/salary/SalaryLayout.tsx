import { ReactNode } from "react";
import { Link, useLocation } from "wouter";
import {
  BadgeDollarSign, BarChart3, Users, AlertCircle, Wallet,
  Settings2, UserRound, FileText, ClipboardList,
} from "lucide-react";
import { trpc } from "@/lib/trpc";

interface SalaryLayoutProps { children: ReactNode; }

function fmt(n: number) {
  return Number(n).toLocaleString("en-EG", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

const salaryNav = [
  { href: "/salary",               label: "الرواتب الأساسية", icon: Users },
  { href: "/salary/penalties",     label: "الجزاءات",         icon: AlertCircle },
  { href: "/salary/pools",         label: "العمولات الشهرية", icon: Wallet },
  { href: "/salary/payroll",       label: "كشف الرواتب",      icon: BarChart3 },
  { href: "/salary/absent-report", label: "الغياب والتصاريح", icon: ClipboardList },
];

const shiftNav = [
  { href: "/salary/shift-staff",   label: "الشفتات",    icon: UserRound },
  { href: "/salary/shift-payroll", label: "قيمة الشفت", icon: FileText },
];

function resolveTitle(pathname: string) {
  if (pathname.startsWith("/salary/penalties"))
    return { title: "الجزاءات", description: "إضافة وإدارة الجزاءات الشهرية لكل موظف." };
  if (pathname.startsWith("/salary/pools"))
    return { title: "العمولات الشهرية", description: "إدخال مبالغ عمولة الفحص والبنتاكام لكل شهر." };
  if (pathname.startsWith("/salary/payroll"))
    return { title: "كشف الرواتب", description: "احتساب وعرض كشف الرواتب الشهري بالتفصيل." };
  if (pathname.startsWith("/salary/settings"))
    return { title: "إعدادات الرواتب", description: "تخصيص نسب عمولة الحضور والإعدادات العامة." };
  if (pathname.startsWith("/salary/shift-staff"))
    return { title: "الشفتات", description: "إدارة الأطباء والفنيين المعينين بنظام الشفتات وأسعارهم." };
  if (pathname.startsWith("/salary/shift-payroll"))
    return { title: "قيمة الشفت", description: "تقرير الرواتب الشهري للأطباء والفنيين بحسب الشفتات المنجزة." };
  if (pathname.startsWith("/salary/absent-report"))
    return { title: "الغياب والتصاريح", description: "تقرير أيام الإجازة والتصاريح الممنوحة للموظفين." };
  return { title: "الرواتب الأساسية", description: "إدارة الرواتب الأساسية لجميع الموظفين." };
}

export default function SalaryLayout({ children }: SalaryLayoutProps) {
  const [location] = useLocation();
  const title = resolveTitle(location);

  const now = new Date();
  const summaryQ = (trpc as any).salary.monthSummary.useQuery(
    { year: now.getFullYear(), month: now.getMonth() + 1 },
    { refetchInterval: 60_000, refetchIntervalInBackground: false },
  );
  const summary = summaryQ.data as any;

  const metrics = [
    {
      label: "إجمالي الرواتب",
      value: summary ? fmt(summary.totalPay) : "—",
      tone: "text-primary",
      accent: "bg-primary/10 border-primary/20",
    },
    {
      label: "عدد الموظفين",
      value: summary ? String(summary.staffCount) : "—",
      tone: "text-foreground",
      accent: "bg-muted border-border",
    },
    {
      label: "الجزاءات",
      value: summary ? fmt(summary.totalPenalties) : "—",
      tone: "text-destructive",
      accent: "bg-destructive/10 border-destructive/20",
    },
    {
      label: "العمولات",
      value: summary ? fmt(summary.totalCommissions) : "—",
      tone: "text-success",
      accent: "bg-success/10 border-success/20",
    },
  ];

  function navLink({ href, label, icon: Icon }: { href: string; label: string; icon: any }) {
    const active =
      href === "/salary"
        ? location === href
        : location === href || location.startsWith(`${href}/`);
    return (
      <Link
        key={href}
        href={href}
        className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 focus-visible:ring-offset-2 ${
          active
            ? "border-primary/30 bg-primary/10 font-medium text-primary"
            : "border-border bg-card text-muted-foreground hover:border-primary/20 hover:text-foreground"
        }`}
      >
        <Icon className="h-3.5 w-3.5" />
        <span>{label}</span>
      </Link>
    );
  }

  return (
    <div className="page-layout min-h-screen bg-background text-foreground" dir="rtl">
      <div className="border-b border-primary/15 bg-gradient-to-b from-primary/5 to-transparent">
        <div className="mx-auto w-full px-3 py-4 sm:px-4 lg:px-5">
          <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
                  <BadgeDollarSign className="h-3.5 w-3.5" />
                  إدارة الرواتب
                </div>
                <Link
                  href="/salary/settings"
                  className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-2.5 py-1 text-xs text-muted-foreground transition-colors hover:border-primary/20 hover:text-foreground"
                >
                  <Settings2 className="h-3 w-3" />
                  الإعدادات
                </Link>
              </div>
              <div className="space-y-1">
                <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
                  {title.title}
                </h1>
                <p className="max-w-3xl text-sm leading-6 text-muted-foreground">
                  {title.description}
                </p>
              </div>
              <nav className="flex flex-wrap items-center gap-1.5">
                {salaryNav.map(navLink)}
                <span className="mx-1 h-5 w-px self-center bg-border" aria-hidden="true" />
                {shiftNav.map(navLink)}
              </nav>
            </div>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 xl:min-w-[30rem]">
              {metrics.map((metric) => (
                <div key={metric.label} className={`rounded-xl border p-3 ${metric.accent}`}>
                  <div className="text-xs font-semibold text-foreground/70">{metric.label}</div>
                  <div className={`mt-1 text-xl font-bold tabular-nums ${metric.tone}`}>
                    {metric.value}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
      <div className="mx-auto w-full px-3 py-5 sm:px-4 lg:px-5">{children}</div>
    </div>
  );
}
