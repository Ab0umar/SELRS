/**
 * Single source for Admin Permissions + Admin Users checkbox lists.
 * Keep in sync with `App.tsx` routes and `ProtectedRoute` checks.
 */
type PagePermissionEntry = { readonly id: string; readonly label: string; readonly group: string };

export type PagePermissionDefinition = PagePermissionEntry;

export const PERMISSION_SECTIONS = [
  "لوحة التحكم",
  "مرضى اليوم",
  "الحسابات",
  "العمليات",
  "مركز المريض",
  "العيادات",
  "المرضى",
  "مركز الخدمات",
  "مركز الإدارة",
  "أخرى",
] as const;

export type PermissionSection = (typeof PERMISSION_SECTIONS)[number];

export const PAGE_PERMISSION_DEFINITIONS = [
  // ── لوحة التحكم ──
  { id: "/dashboard", label: "لوحة التحكم", group: "لوحة التحكم" },
  { id: "/patient-data/edit", label: "تعديل بيانات المريض (لوحة / فحص)", group: "لوحة التحكم" },

  // ── مرضى اليوم ──
  { id: "/today", label: "مرضى اليوم", group: "مرضى اليوم" },

  // ── الحسابات ──
  { id: "/accounting", label: "لوحة الحسابات", group: "الحسابات" },
  { id: "/accounting/daily-revenue", label: "الإيراد اليومي", group: "الحسابات" },
  { id: "/accounting/service-revenue", label: "إيراد الخدمات", group: "الحسابات" },
  { id: "/accounting/receipts", label: "الإيصالات", group: "الحسابات" },
  { id: "/accounting/services", label: "الخدمات", group: "الحسابات" },
  { id: "/accounting/patients", label: "استعلام المرضى", group: "الحسابات" },
  { id: "/accounting/patient", label: "حساب مريض", group: "الحسابات" },
  { id: "/accounting/doctor", label: "حساب طبيب", group: "الحسابات" },
  { id: "/accounting/print", label: "معاينة الطباعة", group: "الحسابات" },

  // ── العمليات ──
  { id: "/operations", label: "قائمة العمليات", group: "العمليات" },
  { id: "/operations/accounts", label: "العمليات — الحسابات", group: "العمليات" },

  // ── مركز المريض ──
  { id: "/patient-hub", label: "مركز المريض (Patient hub)", group: "مركز المريض" },

  // ── العيادات ──
  { id: "/examination", label: "الفحوصات", group: "العيادات" },
  { id: "/sheets/pentacam/dashboard", label: "نتائج البنتكام (لوحة)", group: "العيادات" },
  { id: "/sheets/pentacam/:id", label: "شيت البنتكام", group: "العيادات" },
  { id: "/sheets/consultant/:id", label: "شيت استشاري", group: "العيادات" },
  { id: "/sheets/specialist/:id", label: "شيت أخصائي", group: "العيادات" },
  { id: "/sheets/lasik/:id", label: "شيت ليزك", group: "العيادات" },
  { id: "/sheets/external/:id", label: "شيت خارجي", group: "العيادات" },
  { id: "/refraction/:id", label: "صفحة الانكسار / مقاس النظارة", group: "العيادات" },
  { id: "/prescription", label: "كتابة روشتة", group: "العيادات" },
  { id: "/prescriptions", label: "جدول الروشتات", group: "العيادات" },
  { id: "/request-tests", label: "طلب تحاليل وأشعة", group: "العيادات" },
  { id: "/medical-reports", label: "التقارير الطبية", group: "العيادات" },
  { id: "/patient-summary", label: "تقرير المريض المجمع", group: "العيادات" },
  { id: "/doctor/patient/:id", label: "عرض الطبيب للمريض", group: "العيادات" },

  // ── المرضى ──
  { id: "/patients", label: "المرضى", group: "المرضى" },
  { id: "/patients/:id", label: "تفاصيل المريض", group: "المرضى" },
  { id: "/patient-file", label: "الملف الطبي", group: "المرضى" },
  { id: "/quick-entry", label: "دخول سريع للمريض", group: "المرضى" },
  { id: "/new-cases", label: "حالات جديدة", group: "المرضى" },
  { id: "/followup/:id", label: "نموذج متابعة", group: "المرضى" },
  { id: "/followups", label: "قائمة المتابعات", group: "المرضى" },
  { id: "/visits", label: "زيارات المرضى", group: "المرضى" },
  { id: "/sheet-copies", label: "نسخ الشيتات", group: "المرضى" },

  // ── مركز الخدمات ──
  { id: "/medications", label: "كتالوج الأدوية", group: "مركز الخدمات" },
  { id: "/medications/registry", label: "سجل الأدوية (إدارة)", group: "مركز الخدمات" },
  { id: "/medications-tests", label: "الأدوية والفحوصات (مجمّع)", group: "مركز الخدمات" },
  { id: "/tests", label: "اختصار الفحوصات (/tests)", group: "مركز الخدمات" },
  { id: "/tests-management", label: "إدارة الاختبارات (إداري)", group: "مركز الخدمات" },
  { id: "/examinations/catalog", label: "كتالوج الفحوصات", group: "مركز الخدمات" },
  { id: "/txhub", label: "TXhub (تحاليل وأشعة)", group: "مركز الخدمات" },

  // ── مركز الإدارة ──
  { id: "/admin-hub", label: "مركز الإدارة (الرئيسية)", group: "مركز الإدارة" },
  { id: "/admin/users", label: "إدارة المستخدمين", group: "مركز الإدارة" },
  { id: "/admin/permissions", label: "صلاحيات الأدوار", group: "مركز الإدارة" },
  { id: "/admin/doctors", label: "الأطباء", group: "مركز الإدارة" },
  { id: "/admin/services", label: "الخدمات والأسعار", group: "مركز الإدارة" },
  { id: "/admin/patients", label: "مرضى الإدارة", group: "مركز الإدارة" },
  { id: "/admin/forms", label: "النماذج الإدارية", group: "مركز الإدارة" },
  { id: "/admin/settings", label: "إعدادات النظام", group: "مركز الإدارة" },
  { id: "/admin/notification-settings", label: "إعدادات الإشعارات", group: "مركز الإدارة" },
  { id: "/admin/settings/pricing-rules", label: "قواعد تسعير المواعيد (صفحة)", group: "مركز الإدارة" },
  { id: "appointments_pricing_v1", label: "قواعد تسعير المواعيد (مفتاح)", group: "مركز الإدارة" },
  { id: "/admin/sheets", label: "الشيتات الطبية", group: "مركز الإدارة" },
  { id: "/admin/sheet-designer", label: "مصمم الشيتات", group: "مركز الإدارة" },
  { id: "/admin/sheet-copies", label: "نسخ الشيتات (إداري)", group: "مركز الإدارة" },
  { id: "/admin/migrations", label: "الترحيلات", group: "مركز الإدارة" },
  { id: "/admin/status", label: "حالة النظام", group: "مركز الإدارة" },
  { id: "/admin/api-tools", label: "أدوات API", group: "مركز الإدارة" },
  { id: "/admin/card-visibility", label: "ظهور البطاقات", group: "مركز الإدارة" },
  { id: "/admin/tests", label: "إدارة الاختبارات (/admin/tests)", group: "مركز الإدارة" },
  { id: "/admin/data-source-audit", label: "مصدر البيانات — تدقيق", group: "مركز الإدارة" },
  { id: "/admin/pentacam-failed", label: "فشل البنتكام (إداري)", group: "مركز الإدارة" },
  { id: "/ops/mssql-add", label: "كتابة MSSQL (مزامنة)", group: "مركز الإدارة" },

  // ── أخرى ──
  { id: "/profile", label: "الملف الشخصي", group: "أخرى" },
] as const satisfies readonly PagePermissionEntry[];

export type PagePermissionId = (typeof PAGE_PERMISSION_DEFINITIONS)[number]["id"];

/** Section heading for permission UIs. */
export function getPagePermissionGroup(entry: PagePermissionDefinition): string {
  return entry.group;
}
