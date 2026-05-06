/**
 * Typed navigation manifest for AppSidebar (web + mobile): collapsible groups, closed by default.
 */
import type { LucideIcon } from "lucide-react";
import {
  Activity,
  AlertTriangle,
  Banknote,
  Bell,
  CalendarCheck,
  CalendarDays,
  CircleDot,
  ClipboardList,
  Clock,
  Copy,
  Database,
  Eye,
  FileSpreadsheet,
  FileText,
  FlaskConical,
  HeartPulse,
  LayoutGrid,
  Network,
  Paintbrush,
  Pill,
  ReceiptText,
  Repeat,
  Settings,
  Shield,
  Stethoscope,
  Syringe,
  Terminal,
  TestTube2,
  UserRound,
  Users,
  Webhook,
  Wrench,
} from "lucide-react";

export type NavLeaf = { icon: LucideIcon; label: string; path: string; roles?: string[] };

/** Collapsible sidebar section (optional module home via groupPath). */
export type NavGroupSection = {
  label: string;
  items: NavLeaf[];
  /** Clicking the section title navigates here (e.g. `/accounting`). */
  groupPath?: string;
  /** Stable key for expand/collapse state (defaults to `g-${index}` in the sidebar). */
  navKey?: string;
};

export type NavGroup = NavGroupSection | NavLeaf;

const ACCOUNTING_NAV_ROLES = ["admin", "manager", "accountant"];

/** الحسابات — روابط متداخلة؛ عنوان القسم يفتح لوحة الحسابات */
export const accountingNavGroup: NavGroupSection = {
  label: "الحسابات",
  groupPath: "/accounting",
  navKey: "accounting",
  items: [
    {
      icon: CalendarDays,
      label: "الإيراد اليومي",
      path: "/accounting/daily-revenue",
      roles: ACCOUNTING_NAV_ROLES,
    },
    {
      icon: Banknote,
      label: "إيراد الخدمات",
      path: "/accounting/service-revenue",
      roles: ACCOUNTING_NAV_ROLES,
    },
    {
      icon: ReceiptText,
      label: "الإيصالات",
      path: "/accounting/receipts",
      roles: ACCOUNTING_NAV_ROLES,
    },
    {
      icon: ClipboardList,
      label: "الخدمات",
      path: "/accounting/services",
      roles: ACCOUNTING_NAV_ROLES,
    },
    {
      icon: Users,
      label: "استعلام المرضى",
      path: "/accounting/patients",
      roles: ACCOUNTING_NAV_ROLES,
    },
    {
      icon: UserRound,
      label: "حساب مريض",
      path: "/accounting/patient",
      roles: ACCOUNTING_NAV_ROLES,
    },
    {
      icon: Stethoscope,
      label: "حساب طبيب",
      path: "/accounting/doctor",
      roles: ACCOUNTING_NAV_ROLES,
    },
  ],
};

/** لوحة الإدارة + العيادات + المرضى + مركز الخدمات + مركز الإدارة */
export const adminNavGroups: NavGroup[] = [
  {
    label: "لوحة التحكم",
    navKey: "dashboard",
    items: [
      { icon: Activity, label: "لوحة التحكم", path: "/dashboard?tab=admin" },
      { icon: Clock, label: "مرضى اليوم", path: "/today" },
    ],
  },
  accountingNavGroup,
  {
    label: "العمليات",
    navKey: "operations",
    groupPath: "/operations",
    items: [
      { icon: Syringe, label: "العمليات", path: "/operations" },
    ],
  },
  {
    label: "مركز المريض",
    navKey: "patient-hub",
    groupPath: "/patient-hub",
    items: [
      { icon: Network, label: "مركز المريض", path: "/patient-hub" },
    ],
  },
  {
    label: "العيادات",
    navKey: "clinics",
    items: [
      { icon: Eye, label: "الفحوصات", path: "/examination" },
      { icon: CircleDot, label: "نتائج البنتكام", path: "/sheets/pentacam/dashboard" },
      { icon: Pill, label: "الروشتات", path: "/prescriptions" },
      { icon: TestTube2, label: "طلب تحاليل", path: "/request-tests" },
      { icon: FileSpreadsheet, label: "تقرير المريض", path: "/patient-summary" },
      { icon: ClipboardList, label: "التقارير الطبية", path: "/medical-reports" },
    ],
  },
  {
    label: "المرضى",
    navKey: "patients",
    items: [
      { icon: UserRound, label: "دخول سريع", path: "/quick-entry" },
      { icon: LayoutGrid, label: "حالات جديدة", path: "/new-cases" },
      { icon: FileText, label: "ملف المريض", path: "/patient-file" },
      { icon: Repeat, label: "المتابعات", path: "/followups" },
      { icon: CalendarCheck, label: "الزيارات", path: "/visits" },
    ],
  },
  {
    label: "مركز الخدمات",
    navKey: "services",
    items: [
      { icon: Pill, label: "الأدوية", path: "/medications" },
      { icon: FlaskConical, label: "تحاليل وأشعة", path: "/examinations/catalog" },
      { icon: Stethoscope, label: "أمراض", path: "/medications/registry?tab=diseases" },
      { icon: ClipboardList, label: "أعراض", path: "/medications/registry?tab=symptoms" },
      { icon: Network, label: "TXHUB", path: "/txhub" },
    ],
  },
  {
    label: "مركز الإدارة",
    navKey: "admin",
    items: [
      { icon: LayoutGrid, label: "الرئيسية (كروت)", path: "/admin-hub" },
      { icon: Users, label: "مرضى الإدارة", path: "/admin/patients" },
      { icon: Shield, label: "الصلاحيات", path: "/admin-hub/permissions" },
      { icon: Stethoscope, label: "الأطباء", path: "/admin-hub/doctors" },
      { icon: Users, label: "المستخدمين", path: "/admin-hub/users" },
      { icon: Terminal, label: "حالة النظام", path: "/admin-hub/status" },
      { icon: Database, label: "ترحيل البيانات", path: "/admin-hub/migrations" },
      { icon: HeartPulse, label: "الخدمات والأسعار", path: "/admin-hub/services" },
      { icon: Wrench, label: "التشخيص والإصلاح", path: "/admin-hub/diagnostics" },
      { icon: Settings, label: "الإعدادات العامة", path: "/admin-hub/settings" },
      { icon: Settings, label: "تسعير المواعيد", path: "/admin-hub/settings/pricing-rules" },
      { icon: Webhook, label: "أدوات API", path: "/admin-hub/api-tools" },
      { icon: FlaskConical, label: "التحاليل (إدارة)", path: "/admin-hub/tests" },
      { icon: LayoutGrid, label: "ظهور الكروت", path: "/admin-hub/card-visibility" },
      { icon: Bell, label: "إخطارات التطبيق", path: "/admin-hub/notifications" },
      { icon: FileText, label: "النماذج", path: "/admin-hub/forms" },
      { icon: FileSpreadsheet, label: "تثبيتات المرضى", path: "/admin-hub/sheets" },
      { icon: Paintbrush, label: "مصمم النماذج", path: "/admin-hub/sheet-designer" },
      { icon: Copy, label: "نسخ النماذج", path: "/admin-hub/sheet-copies" },
      { icon: AlertTriangle, label: "بنتكام الفاشل", path: "/admin-hub/pentacam-failed" },
    ],
  },
];

/** نفس هيكل الإدمن بدون «مركز الإدارة» */
export const staffNavGroups: NavGroup[] = adminNavGroups.slice(0, -1);
