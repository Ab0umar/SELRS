import { ReactNode } from "react";
import { Link, useLocation } from "wouter";
import { useKeyboardScroll } from "@/hooks/useKeyboardScroll";
import { ConfirmHost } from "./askConfirm";
import "./attendance-workspace.css";
import "./attendance-studio.css";
import "./attendance-design.css";
import {
  BarChart3,
  LayoutDashboard,
  Users,
  Activity,
  Clock,
  Settings,
  UserRound,
} from "lucide-react";

interface AttendanceLayoutProps {
  children: ReactNode;
  fullWidth?: boolean;
}

const navigationSections = [
  {
    id: "monitoring",
    label: "المراقبة اليومية",
    items: [
      {
        href: "/attendance",
        label: "لوحة التحكم",
        icon: LayoutDashboard,
        activeFor: ["/attendance"],
      },
      {
        href: "/attendance/live",
        label: "الحضور الآن",
        icon: Activity,
        activeFor: ["/attendance/live"],
      },
    ],
  },
  {
    id: "employees",
    label: "الموظفون والطلبات",
    items: [
      {
        href: "/attendance/employees",
        label: "قائمة الموظفين",
        icon: Users,
        activeFor: ["/attendance/employees"],
      },
      {
        href: "/attendance/my",
        label: "ملف الحضور",
        icon: UserRound,
        activeFor: ["/attendance/my"],
      },
      {
        href: "/attendance/shift-schedule",
        label: "الروستر الشهري",
        icon: Clock,
        activeFor: ["/attendance/shift-schedule"],
      },
    ],
  },
  {
    id: "reports",
    label: "التقارير",
    items: [
      {
        href: "/attendance/reports",
        label: "التقارير",
        icon: BarChart3,
        activeFor: ["/attendance/reports"],
      },
    ],
  },
  {
    id: "settings",
    label: "الإعدادات والمزامنة",
    items: [
      {
        href: "/attendance/settings",
        label: "الإعدادات",
        icon: Settings,
        activeFor: ["/attendance/settings"],
      },
    ],
  },
];

export default function AttendanceLayout({
  children,
  fullWidth,
}: AttendanceLayoutProps) {
  const [location] = useLocation();
  useKeyboardScroll();
  const isActive = (href: string) => href === "/attendance"
    ? location === href
    : location === href || location.startsWith(`${href}/`);
  const activeItem = navigationSections.flatMap(section => section.items)
    .find(item => isActive(item.href));
  return (
    <div className="attendance-studio" data-operational-module="attendance" dir="rtl">
      <a className="attendance-skip" href="#module-content" onClick={event => {
        event.preventDefault();
        document.getElementById("module-content")?.focus();
      }}>تخطي إلى المحتوى</a>
      <div className={`attendance-studio-grid ${fullWidth ? "attendance-studio-wide" : ""}`}>
        <div className="attendance-stage">
          <nav className="attendance-topnav" aria-label="أقسام الوحدة">
            {navigationSections.flatMap(section => section.items).map(item => {
              const Icon = item.icon;
              return <Link key={item.href} href={item.href} aria-current={isActive(item.href) ? "page" : undefined}>
                <Icon aria-hidden="true" /><span>{item.label}</span>
              </Link>;
            })}
          </nav>
          <h2 className="sr-only">{activeItem?.label ?? "ملف الحضور"}</h2>
          <div id="module-content" tabIndex={-1}>
            <div className="attendance-touch attendance-workspace">{children}</div>
          </div>
        </div>
      </div>
      <ConfirmHost />
    </div>
  );
}
