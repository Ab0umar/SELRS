import { ReactNode } from "react";
import OperationalModuleShell from "@/components/layout/OperationalModuleShell";
import {
  BarChart3,
  LayoutDashboard,
  Users,
  Activity,
  Clock,
  Settings,
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

export default function AttendanceLayout({ children, fullWidth }: AttendanceLayoutProps) {
  return (
    <OperationalModuleShell
      moduleName="attendance"
      title="الحضور والانصراف"
      description="متابعة الحضور، الروستر، والتقارير اليومية"
      mark={<Activity className="h-5 w-5" />}
      navigation={navigationSections.flatMap((section) => section.items)}
      fullWidth={fullWidth}
    >
      {children}
    </OperationalModuleShell>
  );
}
