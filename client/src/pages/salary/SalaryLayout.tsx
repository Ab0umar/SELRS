import { ReactNode } from "react";
import { Link, useLocation } from "wouter";
import { BadgeDollarSign, BarChart3, Users, AlertCircle, Wallet } from "lucide-react";

interface SalaryLayoutProps {
  children: ReactNode;
}

const sections = [
  { href: "/salary", label: "الرواتب الأساسية", icon: Users },
  { href: "/salary/penalties", label: "الجزاءات", icon: AlertCircle },
  { href: "/salary/pools", label: "العمولات الشهرية", icon: Wallet },
  { href: "/salary/payroll", label: "كشف الرواتب", icon: BarChart3 },
];

function resolveTitle(pathname: string) {
  if (pathname.startsWith("/salary/penalties"))
    return { title: "الجزاءات", description: "إضافة وإدارة الجزاءات الشهرية لكل موظف." };
  if (pathname.startsWith("/salary/pools"))
    return { title: "العمولات الشهرية", description: "إدخال مبالغ عمولة الفحص والبنتاكام لكل شهر." };
  if (pathname.startsWith("/salary/payroll"))
    return { title: "كشف الرواتب", description: "احتساب وعرض كشف الرواتب الشهري بالتفصيل." };
  return { title: "الرواتب الأساسية", description: "إدارة الرواتب الأساسية لجميع الموظفين." };
}

export default function SalaryLayout({ children }: SalaryLayoutProps) {
  const [location] = useLocation();
  const title = resolveTitle(location);

  return (
    <div className="min-h-screen bg-background text-foreground" dir="rtl">
      <div className="border-b border-primary/15 bg-gradient-to-b from-primary/5 to-transparent">
        <div className="mx-auto w-full px-3 py-4 sm:px-4 lg:px-5">
          <div className="space-y-3">
            <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
              <BadgeDollarSign className="h-3.5 w-3.5" />
              إدارة الرواتب
            </div>
            <div className="space-y-1">
              <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
                {title.title}
              </h1>
              <p className="max-w-3xl text-sm leading-6 text-muted-foreground">
                {title.description}
              </p>
            </div>
            <nav className="flex flex-wrap gap-1.5">
              {sections.map(({ href, label, icon: Icon }) => {
                const active =
                  href === "/salary"
                    ? location === href
                    : location === href || location.startsWith(`${href}/`);
                return (
                  <Link
                    key={href}
                    href={href}
                    className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm transition-colors ${
                      active
                        ? "border-primary/30 bg-primary/10 font-medium text-primary"
                        : "border-border bg-card text-muted-foreground hover:border-primary/20 hover:text-foreground"
                    }`}
                  >
                    <Icon className="h-3.5 w-3.5" />
                    <span>{label}</span>
                  </Link>
                );
              })}
            </nav>
          </div>
        </div>
      </div>
      <div className="mx-auto w-full px-3 py-5 sm:px-4 lg:px-5">{children}</div>
    </div>
  );
}
