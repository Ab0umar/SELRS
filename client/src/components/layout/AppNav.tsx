/**
 * Typed navigation manifest for AppSidebar (web + mobile): collapsible groups, closed by default.
 */
import type { LucideIcon } from "lucide-react";
import {
  Activity,
  AlertTriangle,
  Archive,
  Banknote,
  Bell,
  BookOpen,
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
  Glasses,
  HeartPulse,
  Home,
  LayoutGrid,
  Network,
  Paintbrush,
  Pill,
  ReceiptText,
  Repeat,
  Settings,
  Shield,
  Smartphone,
  Stethoscope,
  Syringe,
  Terminal,
  TestTube2,
  UserRound,
  Users,
  Wallet,
  Webhook,
  Wrench,
  LayoutDashboard,
  Calendar,
  BarChart3,
  Timer,
  UserCog,
  Star,
  DollarSign,
} from "lucide-react";

export type NavLeaf = { icon: LucideIcon; label: string; path: string; roles?: string[]; isMain?: boolean };

/** Collapsible sidebar section (optional module home via groupPath). */
export type NavGroupSection = {
  label: string;
  items: NavLeaf[];
  /** Clicking the section title navigates here (e.g. `/accounting`). */
  groupPath?: string;
  /** Stable key for expand/collapse state (defaults to `g-${index}` in the sidebar). */
  navKey?: string;
  isMain?: boolean;
};

export type NavGroup = NavGroupSection | NavLeaf;

/** Attendance — 5 items only */
export const attendanceNavGroup: NavGroupSection = {
  label: "الحضور",
  groupPath: "/attendance",
  navKey: "attendance",
  items: [
    { icon: LayoutDashboard, label: "لوحة التحكم",  path: "/attendance" },
    { icon: Activity,        label: "مباشر",         path: "/attendance/live" },
    { icon: Users,           label: "الموظفون",      path: "/attendance/employees" },
    { icon: BarChart3,       label: "التقارير",      path: "/attendance/reports" },
    { icon: Settings,        label: "الإعدادات",     path: "/attendance/settings" },
  ],
};

/** المرتبات */
export const salaryNavGroup: NavGroupSection = {
  label: "المرتبات",
  groupPath: "/salary",
  navKey: "salary",
  items: [
    { icon: DollarSign, label: "البيانات الأساسية", path: "/salary" },
    { icon: DollarSign, label: "العمولات",          path: "/salary/pools" },
    { icon: DollarSign, label: "الجزاءات",          path: "/salary/penalties" },
    { icon: DollarSign, label: "كشف المرتبات",      path: "/salary/payroll" },
  ],
};

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
    },
    {
      icon: Banknote,
      label: "إيراد الخدمات",
      path: "/accounting/service-revenue",
    },
    {
      icon: ReceiptText,
      label: "الإيصالات",
      path: "/accounting/receipts",
    },
    {
      icon: ClipboardList,
      label: "الخدمات",
      path: "/accounting/services",
    },
    {
      icon: Users,
      label: "استعلام المرضى",
      path: "/accounting/patients",
    },
    {
      icon: UserRound,
      label: "حساب مريض",
      path: "/accounting/patient",
    },
    {
      icon: Stethoscope,
      label: "حساب طبيب",
      path: "/accounting/doctor",
    },
    {
      icon: Wallet,
      label: "الخزنة",
      path: "/accounting/cashbook",
    },
    {
      icon: BookOpen,
      label: "قيود الخزنة",
      path: "/accounting/ledger",
    },
    {
      icon: FileText,
      label: "القروض",
      path: "/accounting/loans",
    },
    {
      icon: Banknote,
      label: "كشف السلف",
      path: "/accounting/advances",
    },
    {
      icon: Home,
      label: "حساب البيت",
      path: "/accounting/home-fund",
    },
    {
      icon: Smartphone,
      label: "انستاباي",
      path: "/accounting/instapay",
    },
    {
      icon: UserRound,
      label: "د. السعدني",
      path: "/accounting/dr-saadany",
    },
  ],
};

/** لوحة الإدارة + العيادات + المرضى + مركز الخدمات + مركز الإدارة */
export const adminNavGroups: NavGroup[] = [
  { icon: Activity, label: "لوحة التحكم", path: "/dashboard?tab=admin", isMain: true },
  attendanceNavGroup,
  salaryNavGroup,
  accountingNavGroup,
  { icon: Archive, label: "المخزن", path: "/stockroom", isMain: true },
  { icon: Syringe, label: "العمليات", path: "/operations", isMain: true },
  { icon: Network, label: "مركز المريض", path: "/patient-hub", isMain: true },
  {
    label: "العيادات",
    navKey: "clinics",
    groupPath: "/clinics-hub",
    items: [
      { icon: Eye, label: "الفحوصات", path: "/examination" },
      { icon: CircleDot, label: "نتائج البنتكام", path: "/sheets/pentacam/dashboard" },
      { icon: Glasses, label: "لوحة الانكسارات", path: "/clinics-hub/refractions-dashboard" },
      { icon: Activity, label: "لوحة Autoref", path: "/clinics-hub/autorefs-dashboard" },
      { icon: Pill, label: "لوحة الروشتات", path: "/clinics-hub/prescriptions-dashboard" },
      { icon: Pill, label: "الروشتات", path: "/prescriptions" },
      { icon: TestTube2, label: "طلب تحاليل", path: "/request-tests" },
      { icon: FileSpreadsheet, label: "تقرير المريض", path: "/patient-summary" },
      { icon: ClipboardList, label: "التقارير الطبية", path: "/medical-reports" },
    ],
  },
  {
    label: "المرضى",
    navKey: "patients",
    groupPath: "/patients-hub",
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
    groupPath: "/services-hub",
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
    groupPath: "/admin-hub",
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

/** نفس هيكل الإدمن بدون «مركز الإدارة»، مع إضافة «حضوري» للجميع */
export const staffNavGroups: NavGroup[] = [
  ...adminNavGroups.slice(0, -1),
  { icon: CalendarCheck, label: "حضوري", path: "/attendance/my", isMain: true },
  { icon: CalendarDays, label: "الروستر", path: "/attendance/shift-schedule", roles: ["doctor", "technician", "nurse"], isMain: true },
];
