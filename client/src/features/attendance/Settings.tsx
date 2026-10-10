import { ArrowLeft, Clock, Cpu, CalendarDays, Users } from "lucide-react";

const sections = [
  {
    title: "الأجهزة والمزامنة",
    icon: Cpu,
    href: "/attendance/settings?tab=device",
  },
  {
    title: "الورديات وقواعد الاحتساب",
    icon: Clock,
    href: "/attendance/settings?tab=shifts",
  },
  {
    title: "العطلات الرسمية",
    icon: CalendarDays,
    href: "/attendance/settings?tab=holidays",
  },
  {
    title: "طلبات الإجازة",
    icon: Users,
    href: "/attendance/employees?tab=leaves",
  },
] as const;

export default function Settings() {
  return (
    <nav
      aria-label="إدارة قواعد الحضور"
      className="attendance-panel divide-y divide-border"
      dir="rtl"
    >
      {sections.map(({ title, href, icon: Icon }) => (
        <a
          key={href}
          href={href}
          className="flex min-h-14 items-center justify-between gap-3 px-5 py-4 text-sm font-medium text-foreground hover:text-primary"
        >
          <span className="flex items-center gap-3">
            <Icon aria-hidden="true" className="h-4 w-4" />
            {title}
          </span>
          <ArrowLeft aria-hidden="true" className="h-4 w-4 shrink-0" />
        </a>
      ))}
    </nav>
  );
}
