/**
 * Typed navigation manifest for AppSidebar (plan: consumed by sidebar + optionally compact header strip).
 */
import type { LucideIcon } from "lucide-react";
import {
  Activity,
  CalendarCheck,
  CircleDot,
  ClipboardList,
  Clock,
  Eye,
  FileSpreadsheet,
  FileText,
  FlaskConical,
  LayoutGrid,
  Network,
  Pill,
  Repeat,
  Settings,
  Shield,
  Stethoscope,
  Syringe,
  TestTube2,
  UserRound,
  Users,
} from "lucide-react";

export type NavLeaf = { icon: LucideIcon; label: string; path: string };
export type NavGroup = { label: string; items: NavLeaf[] } | (NavLeaf & { items?: undefined });

/** لوحة الإدارة — محاذاة الويب: مجموعات + روابط العيادة والإعدادات */
export const adminNavGroups: NavGroup[] = [
  { icon: Activity, label: "لوحة التحكم", path: "/dashboard?tab=admin" },
  { icon: Clock, label: "مرضى اليوم", path: "/today" },
  { icon: Syringe, label: "العمليات", path: "/operations" },
  {
    label: "العيادة والمرضى",
    items: [
      { icon: Users, label: "المرضى", path: "/patients" },
      { icon: Network, label: "مركز المريض", path: "/patient-hub" },
      { icon: Repeat, label: "المتابعات", path: "/followups" },
      { icon: CalendarCheck, label: "الزيارات", path: "/visits" },
      { icon: CircleDot, label: "نتائج البنتكام", path: "/sheets/pentacam/dashboard" },
      { icon: FileText, label: "ملف المريض", path: "/patient-file" },
      { icon: Eye, label: "الفحوصات", path: "/examination" },
      { icon: ClipboardList, label: "التقارير الطبية", path: "/medical-reports" },
      { icon: FileSpreadsheet, label: "تقرير المريض", path: "/patient-summary" },
      { icon: Pill, label: "الروشتات", path: "/prescriptions" },
      { icon: UserRound, label: "دخول سريع", path: "/quick-entry" },
      { icon: LayoutGrid, label: "حالات جديدة", path: "/new-cases" },
      { icon: TestTube2, label: "طلب تحاليل", path: "/request-tests" },
    ],
  },
  {
    label: "إدارة المستخدمين والخدمات",
    items: [
      { icon: LayoutGrid, label: "مركز الإدارة", path: "/admin-hub" },
      { icon: Users, label: "الموظفين", path: "/admin/users" },
      { icon: Stethoscope, label: "الأطباء", path: "/admin/doctors" },
      { icon: Settings, label: "الخدمات", path: "/admin/services" },
      { icon: FlaskConical, label: "الأدوية والفحوصات", path: "/medications-tests" },
      { icon: Shield, label: "الصلاحيات", path: "/admin/permissions" },
      { icon: UserRound, label: "المرضى", path: "/admin/patients" },
    ],
  },
  { icon: FileText, label: "النماذج", path: "/admin/forms" },
  { icon: Settings, label: "الإعدادات", path: "/admin/settings" },
];

/** روابط الموظفين — بدون مركز سير العمل؛ مطابقة للويب قدر الإمكان */
export const staffQuickNav: NavLeaf[] = [
  { icon: Activity, label: "لوحة التحكم", path: "/dashboard" },
  { icon: Clock, label: "مرضى اليوم", path: "/today" },
  { icon: Syringe, label: "العمليات", path: "/operations" },
  { icon: Pill, label: "الروشتات", path: "/prescriptions" },
  { icon: Users, label: "المرضى", path: "/patients" },
  { icon: Network, label: "مركز المريض", path: "/patient-hub" },
  { icon: Repeat, label: "المتابعات", path: "/followups" },
  { icon: CalendarCheck, label: "الزيارات", path: "/visits" },
  { icon: CircleDot, label: "نتائج البنتكام", path: "/sheets/pentacam/dashboard" },
  { icon: FlaskConical, label: "الأدوية والفحوصات", path: "/medications-tests" },
  { icon: FileText, label: "ملف المريض", path: "/patient-file" },
  { icon: Eye, label: "الفحوصات", path: "/examination" },
  { icon: ClipboardList, label: "التقارير الطبية", path: "/medical-reports" },
  { icon: FileSpreadsheet, label: "تقرير المريض", path: "/patient-summary" },
  { icon: UserRound, label: "دخول سريع", path: "/quick-entry" },
  { icon: LayoutGrid, label: "حالات جديدة", path: "/new-cases" },
  { icon: TestTube2, label: "طلب تحاليل", path: "/request-tests" },
];
