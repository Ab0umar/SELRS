/**
 * Typed navigation manifest for AppSidebar (plan: consumed by sidebar + optionally compact header strip).
 */
import type { LucideIcon } from "lucide-react";
import {
  Activity,
  CalendarCheck,
  CircleDot,
  Clock,
  Eye,
  FileText,
  FlaskConical,
  LayoutGrid,
  Pill,
  Repeat,
  Settings,
  Shield,
  Stethoscope,
  Syringe,
  UserRound,
  Users,
} from "lucide-react";

export type NavLeaf = { icon: LucideIcon; label: string; path: string };
export type NavGroup = { label: string; items: NavLeaf[] } | (NavLeaf & { items?: undefined });

/** لوحة الإدارة — بدون تكرار ما هو متاح كتابات داخل «الإعدادات» أو «النماذج». */
export const adminNavGroups: NavGroup[] = [
  { icon: Activity, label: "لوحة التحكم", path: "/dashboard?tab=admin" },
  { icon: Clock, label: "مرضى اليوم", path: "/today" },
  { icon: Syringe, label: "العمليات", path: "/operations" },
  { icon: Repeat, label: "المتابعات", path: "/followups" },
  { icon: CalendarCheck, label: "الزيارات", path: "/visits" },
  { icon: CircleDot, label: "نتائج البنتكام", path: "/sheets/pentacam/dashboard" },
  { icon: FlaskConical, label: "إدارة الأدوية والفحوصات", path: "/tests" },
  {
    label: "إدارة المستخدمين والخدمات",
    items: [
      { icon: Users, label: "الموظفين", path: "/admin/users" },
      { icon: Stethoscope, label: "الأطباء", path: "/admin/doctors" },
      { icon: Settings, label: "الخدمات", path: "/admin/services" },
      { icon: Shield, label: "الصلاحيات", path: "/admin/permissions" },
      { icon: UserRound, label: "المرضى", path: "/admin/patients" },
    ],
  },
  { icon: FileText, label: "النماذج", path: "/admin/forms" },
  { icon: Settings, label: "الإعدادات", path: "/admin/settings" },
];

/** Non-admin quick links. */
export const staffQuickNav: NavLeaf[] = [
  { icon: Activity, label: "لوحة التحكم", path: "/dashboard" },
  { icon: LayoutGrid, label: "مركز سير العمل", path: "/workflow-hub" },
  { icon: Clock, label: "مرضى اليوم", path: "/today" },
  { icon: Syringe, label: "العمليات", path: "/operations" },
  { icon: Repeat, label: "المتابعات", path: "/followups" },
  { icon: CalendarCheck, label: "الزيارات", path: "/visits" },
  { icon: CircleDot, label: "نتائج البنتكام", path: "/sheets/pentacam/dashboard" },
  { icon: Pill, label: "الروشتات", path: "/prescriptions" },
  { icon: Users, label: "المرضى", path: "/patients" },
  { icon: FileText, label: "ملف المريض", path: "/patient-file" },
  { icon: Eye, label: "الفحوصات", path: "/examination" },
];
