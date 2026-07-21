/**
 * Typed navigation manifest for AppSidebar (web + mobile): collapsible groups, closed by default.
 */
import type { LucideIcon } from "lucide-react";
import {
  Activity,
  Archive,
  Banknote,
  BookOpen,
  CalendarCheck,
  CalendarDays,
  CalendarOff,
  CircleDot,
  ClipboardList,
  DollarSign,
  Eye,
  FileCheck2,
  FileSpreadsheet,
  FileText,
  FileWarning,
  FlaskConical,
  Glasses,
  History,
  Home,
  Hospital,
  LayoutDashboard,
  Network,
  Pill,
  ReceiptText,
  Repeat,
  ScrollText,
  Send,
  Settings,
  Smartphone,
  Stethoscope,
  Syringe,
  UserRound,
  Users,
  Wallet,
  BarChart3,
  Zap,
} from "lucide-react";

export type NavLeaf = {
  icon: LucideIcon;
  label: string;
  path: string;
  roles?: string[];
  isMain?: boolean;
};

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
    { icon: LayoutDashboard, label: "لوحة التحكم", path: "/attendance" },
    { icon: Activity, label: "مباشر", path: "/attendance/live" },
    { icon: Users, label: "الموظفون", path: "/attendance/employees" },
    { icon: BarChart3, label: "التقارير", path: "/attendance/reports" },
    { icon: Settings, label: "الإعدادات", path: "/attendance/settings" },
  ],
};

/** المرتبات */
export const salaryNavGroup: NavGroupSection = {
  label: "المرتبات",
  groupPath: "/salary",
  navKey: "salary",
  items: [
    { icon: DollarSign, label: "البيانات الأساسية", path: "/salary" },
    { icon: DollarSign, label: "العمولات", path: "/salary/pools" },
    { icon: DollarSign, label: "الجزاءات", path: "/salary/penalties" },
    { icon: DollarSign, label: "كشف المرتبات", path: "/salary/payroll" },
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
  {
    icon: Activity,
    label: "لوحة التحكم",
    path: "/dashboard?tab=admin",
    isMain: true,
  },
  attendanceNavGroup,
  salaryNavGroup,
  accountingNavGroup,
  { icon: Hospital, label: "كفرالشيخ", path: "/kf", isMain: true },
  { icon: Archive, label: "المخزن", path: "/stockroom", isMain: true },
  { icon: Syringe, label: "العمليات", path: "/operations", isMain: true },
  { icon: Network, label: "مركز المريض", path: "/patient-hub", isMain: true },
  {
    icon: History,
    label: "سجل المرضى",
    path: "/admin/legacy-patients",
    isMain: true,
  },
  {
    icon: ScrollText,
    label: "سجل العمليات",
    path: "/admin/op-history",
    isMain: true,
  },
  {
    label: "ملف المريض",
    navKey: "clinics-file",
    groupPath: "/medicalfile",
    items: [{ icon: FileText, label: "ملف المريض", path: "/medicalfile" }],
  },
  {
    label: "القياسات",
    navKey: "clinics-measurements",
    groupPath: "/sheets/refractions/dashboard",
    items: [
      {
        icon: Activity,
        label: "لوحة Autoref",
        path: "/sheets/autorefs/dashboard",
      },
      {
        icon: Glasses,
        label: "لوحة الانكسارات",
        path: "/sheets/refractions/dashboard",
      },
    ],
  },
  {
    label: "البنتاكام",
    navKey: "clinics-pentacam",
    groupPath: "/sheets/pentacam/dashboard",
    items: [
      {
        icon: CircleDot,
        label: "لوحة البنتاكام",
        path: "/sheets/pentacam/dashboard",
      },
      {
        icon: FileSpreadsheet,
        label: "شيتات البنتاكام",
        path: "/sheets/pentacam",
      },
      { icon: Eye, label: "البنتاكام (إداري)", path: "/admin/pentacam" },
    ],
  },
  {
    label: "روشتات و تقارير",
    navKey: "clinics-prescriptions",
    groupPath: "/prescription",
    items: [
      { icon: Pill, label: "الروشتات", path: "/prescription" },
      {
        icon: ClipboardList,
        label: "التقارير الطبية",
        path: "/medical-reports",
      },
    ],
  },
  {
    label: "الشيتات",
    navKey: "clinics-sheets",
    groupPath: "/sheets/consultant",
    items: [
      { icon: Stethoscope, label: "شيت كشف", path: "/sheets/consultant" },
      {
        icon: UserRound,
        label: "شيت مقاس نظاره / اشعه خارجي",
        path: "/sheets/specialist",
      },
      { icon: Zap, label: "شيت تصحيح ابصار", path: "/sheets/lasik" },
    ],
  },
  {
    label: "التقارير",
    navKey: "clinics-reports",
    groupPath: "/clinical-report",
    items: [
      { icon: FileText, label: "التقرير الشامل", path: "/clinical-report" },
      {
        icon: FileCheck2,
        label: "تقرير ما قبل وبعد العملية",
        path: "/pre-post-op-report",
      },
      {
        icon: CalendarOff,
        label: "إجازة ما بعد العملية",
        path: "/post-op-offdays",
      },
      {
        icon: FileWarning,
        label: "تقرير حالة طبية",
        path: "/medical-condition-report",
      },
      { icon: Send, label: "خطاب الإحالة", path: "/sheets/referral" },
    ],
  },
  {
    label: "أشعة و تحاليل",
    navKey: "clinics-tests",
    groupPath: "/request-tests",
    items: [
      { icon: FlaskConical, label: "أشعة و تحاليل", path: "/request-tests" },
    ],
  },
  {
    label: "المرضى",
    navKey: "patients",
    groupPath: "/patients-hub",
    items: [
      { icon: FileText, label: "ملف المريض", path: "/medicalfile" },
      { icon: Repeat, label: "المتابعات", path: "/followups" },
      { icon: CalendarCheck, label: "الزيارات", path: "/visits" },
      {
        icon: History,
        label: "سجل المرضى",
        path: "/admin/legacy-patients",
      },
      {
        icon: ScrollText,
        label: "سجل العمليات",
        path: "/admin/op-history",
      },
    ],
  },
  {
    label: "مركز الخدمات",
    navKey: "services",
    groupPath: "/services-hub",
    items: [
      { icon: Pill, label: "الأدوية", path: "/medications" },
      {
        icon: FlaskConical,
        label: "تحاليل وأشعة",
        path: "/examinations/catalog",
      },
      {
        icon: Stethoscope,
        label: "أمراض",
        path: "/medications/registry?tab=diseases",
      },
      {
        icon: ClipboardList,
        label: "أعراض",
        path: "/medications/registry?tab=symptoms",
      },
      { icon: Network, label: "TXHUB", path: "/txhub" },
    ],
  },
];

const FULL_ATTENDANCE_ROLES = ["manager", "reception", "accountant", "nurse"];

/** نفس هيكل الإدمن بدون «مركز الإدارة»، مع إضافة «حضوري» للجميع */
export const staffNavGroups: NavGroup[] = [
  ...adminNavGroups.map((g) =>
    g === attendanceNavGroup
      ? {
          ...attendanceNavGroup,
          items: attendanceNavGroup.items.map((item) => ({
            ...item,
            roles: FULL_ATTENDANCE_ROLES,
          })),
        }
      : g,
  ),
  { icon: CalendarCheck, label: "حضوري", path: "/attendance/my", isMain: true },
  {
    icon: CalendarDays,
    label: "الروستر",
    path: "/attendance/shift-schedule",
    roles: ["doctor", "technician"],
    isMain: true,
  },
];
