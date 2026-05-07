/**
 * Single source for Admin Permissions + Admin Users checkbox lists.
 * Keep in sync with `App.tsx` routes and `ProtectedRoute` checks.
 */
type PagePermissionEntry = { readonly id: string; readonly label: string; readonly group?: string };

export type PagePermissionDefinition = PagePermissionEntry;

export const PAGE_PERMISSION_DEFINITIONS = [
  { id: "/dashboard", label: "لوحة التحكم / Dashboard" },
  { id: "/patient-data/edit", label: "تعديل بيانات المريض (لوحة / فحص)" },
  { id: "/today", label: "مرضى اليوم" },
  { id: "/patients", label: "المرضى" },
  { id: "/patients/:id", label: "تفاصيل المريض" },
  { id: "/patient-file", label: "الملف الطبي" },
  { id: "/patient-hub", label: "مركز المريض (Patient hub)" },
  { id: "/accounting", label: "لوحة الحسابات", group: "الحسابات Acc." },
  { id: "/accounting/daily-revenue", label: "الإيراد اليومي", group: "الحسابات Acc." },
  { id: "/accounting/service-revenue", label: "إيراد الخدمات", group: "الحسابات Acc." },
  { id: "/accounting/receipts", label: "الإيصالات", group: "الحسابات Acc." },
  { id: "/accounting/services", label: "الخدمات", group: "الحسابات Acc." },
  { id: "/accounting/patients", label: "استعلام المرضى", group: "الحسابات Acc." },
  { id: "/accounting/patient", label: "حساب مريض", group: "الحسابات Acc." },
  { id: "/accounting/doctor", label: "حساب طبيب", group: "الحسابات Acc." },
  { id: "/accounting/print", label: "معاينة الطباعة", group: "الحسابات Acc." },
  { id: "/examination", label: "الفحوصات" },
  { id: "/quick-entry", label: "دخول سريع للمريض" },
  { id: "/new-cases", label: "حالات جديدة" },
  { id: "/followup/:id", label: "نموذج متابعة" },
  { id: "/followups", label: "قائمة المتابعات" },
  { id: "/visits", label: "زيارات المرضى" },
  { id: "/operations", label: "العمليات / قائمة العمليات" },
  { id: "/operations/accounts", label: "العمليات — الحسابات" },
  { id: "/medical-reports", label: "التقارير الطبية" },
  { id: "/patient-summary", label: "تقرير المريض المجمع" },
  { id: "/sheets/consultant/:id", label: "شيت استشاري" },
  { id: "/sheets/specialist/:id", label: "شيت أخصائي" },
  { id: "/sheets/lasik/:id", label: "شيت ليزك" },
  { id: "/sheets/external/:id", label: "شيت خارجي" },
  { id: "/sheets/pentacam/dashboard", label: "نتائج البنتكام (لوحة)" },
  { id: "/sheets/pentacam/:id", label: "شيت البنتكام" },
  { id: "/refraction/:id", label: "صفحة الانكسار / مقاس النظارة" },
  { id: "/medications", label: "كتالوج الأدوية" },
  { id: "/medications/registry", label: "سجل الأدوية (إدارة)" },
  { id: "/medications-tests", label: "الأدوية والفحوصات (مجمّع)" },
  { id: "/tests", label: "اختصار الفحوصات (/tests)" },
  { id: "/tests-management", label: "إدارة الاختبارات (إداري)" },
  { id: "/examinations/catalog", label: "كتالوج الفحوصات" },
  { id: "/txhub", label: "TXhub (تحاليل وأشعة)" },
  { id: "/prescription", label: "كتابة روشتة" },
  { id: "/prescriptions", label: "جدول الروشتات" },
  { id: "/request-tests", label: "طلب تحاليل وأشعة" },
  { id: "/doctor/patient/:id", label: "عرض الطبيب للمريض" },
  { id: "/sheet-copies", label: "نسخ الشيتات" },
  { id: "/profile", label: "الملف الشخصي" },
  { id: "/admin-hub", label: "مركز الإدارة (Admin hub)" },
  { id: "/admin/users", label: "إدارة المستخدمين" },
  { id: "/admin/permissions", label: "صلاحيات الأدوار" },
  { id: "/admin/doctors", label: "الأطباء" },
  { id: "/admin/services", label: "الخدمات" },
  { id: "/admin/patients", label: "مرضى الإدارة" },
  { id: "/admin/forms", label: "النماذج الإدارية" },
  { id: "/admin/settings", label: "إعدادات النظام" },
  { id: "/admin/notification-settings", label: "إعدادات الإشعارات" },
  { id: "/admin/settings/pricing-rules", label: "قواعد تسعير المواعيد (صفحة)" },
  { id: "appointments_pricing_v1", label: "قواعد تسعير المواعيد (مفتاح)" },
  { id: "/admin/sheets", label: "الشيتات الطبية" },
  { id: "/admin/sheet-designer", label: "مصمم الشيتات" },
  { id: "/admin/sheet-copies", label: "نسخ الشيتات (إداري)" },
  { id: "/admin/migrations", label: "الترحيلات" },
  { id: "/admin/status", label: "حالة النظام" },
  { id: "/admin/api-tools", label: "أدوات API" },
  { id: "/admin/card-visibility", label: "ظهور البطاقات" },
  { id: "/admin/tests", label: "إدارة الاختبارات (/admin/tests)" },
  { id: "/admin/data-source-audit", label: "مصدر البيانات — تدقيق" },
  { id: "/admin/pentacam-failed", label: "فشل البنتكام (إداري)" },
  { id: "/ops/mssql-add", label: "كتابة MSSQL (مزامنة)" },
] as const satisfies readonly PagePermissionEntry[];

export type PagePermissionId = (typeof PAGE_PERMISSION_DEFINITIONS)[number]["id"];

/** Section heading for permission UIs (`PAGE_PERMISSION_DEFINITIONS` rows may omit `group`). */
export function getPagePermissionGroup(entry: PagePermissionDefinition): string | undefined {
  return entry.group;
}
