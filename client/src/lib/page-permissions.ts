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
  "الحضور والانصراف",
  "مركز المريض",
  "العيادات",
  "المرضى",
  "مركز الخدمات",
  "المخزن",
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
  { id: "/accounting/prototypes", label: "نماذج الحسابات", group: "الحسابات" },
  { id: "/accounting/daily-revenue", label: "الإيراد اليومي", group: "الحسابات" },
  { id: "/accounting/service-revenue", label: "إيراد الخدمات", group: "الحسابات" },
  { id: "/accounting/receipts/:secCd/:trTy/:trNo", label: "تفاصيل الإيصال", group: "الحسابات" },
  { id: "/accounting/receipts", label: "الإيصالات", group: "الحسابات" },
  { id: "/accounting/services", label: "الخدمات", group: "الحسابات" },
  { id: "/accounting/patients-inquiry", label: "استعلام المرضى (جديد)", group: "الحسابات" },
  { id: "/accounting/patients", label: "استعلام المرضى", group: "الحسابات" },
  { id: "/accounting/patient/:patientCode", label: "حساب مريض (برمز)", group: "الحسابات" },
  { id: "/accounting/patient", label: "حساب مريض", group: "الحسابات" },
  { id: "/accounting/patient-account", label: "حساب مريض (مسار بديل)", group: "الحسابات" },
  { id: "/accounting/doctor/:doctorCode", label: "حساب طبيب (برمز)", group: "الحسابات" },
  { id: "/accounting/doctor", label: "حساب طبيب", group: "الحسابات" },
  { id: "/accounting/doctor-account", label: "حساب طبيب (مسار بديل)", group: "الحسابات" },
  { id: "/accounting/cashbook", label: "دفتر الخزينة", group: "الحسابات" },
  { id: "/accounting/ledger", label: "دفتر الأستاذ", group: "الحسابات" },
  { id: "/accounting/advances", label: "السلف", group: "الحسابات" },
  { id: "/accounting/loans", label: "القروض", group: "الحسابات" },
  { id: "/accounting/home-fund", label: "عهدة المنزل", group: "الحسابات" },
  { id: "/accounting/instapay", label: "Instapay", group: "الحسابات" },
  { id: "/accounting/dr-saadany", label: "حساب د. سعدني", group: "الحسابات" },
  { id: "/accounting/print", label: "معاينة الطباعة", group: "الحسابات" },

  // ── العمليات ──
  { id: "/operations", label: "قائمة العمليات", group: "العمليات" },
  { id: "/operations/accounts", label: "العمليات — الحسابات", group: "العمليات" },

  // ── الحضور والانصراف ──
  { id: "/attendance", label: "الحضور والانصراف (الرئيسية)", group: "الحضور والانصراف" },
  { id: "/attendance/live", label: "الحضور المباشر", group: "الحضور والانصراف" },
  { id: "/attendance/daily", label: "الحضور اليومي", group: "الحضور والانصراف" },
  { id: "/attendance/employees", label: "موظفو الحضور", group: "الحضور والانصراف" },
  { id: "/attendance/employees/:empCd", label: "ملف موظف الحضور", group: "الحضور والانصراف" },
  { id: "/attendance/logs", label: "سجلات الحضور", group: "الحضور والانصراف" },
  { id: "/attendance/reports", label: "تقارير الحضور", group: "الحضور والانصراف" },
  { id: "/attendance/settings", label: "إعدادات الحضور", group: "الحضور والانصراف" },
  { id: "/attendance/admin/sync", label: "مزامنة الحضور", group: "الحضور والانصراف" },
  { id: "/attendance/admin/device", label: "أجهزة الحضور", group: "الحضور والانصراف" },

  // ── مركز المريض ──
  { id: "/patient-hub", label: "مركز المريض (Patient hub)", group: "مركز المريض" },
  { id: "/workflow-hub", label: "مركز سير العمل", group: "مركز المريض" },

  // ── العيادات ──
  { id: "/clinics-hub", label: "مركز العيادات (Clinics hub)", group: "العيادات" },
  { id: "/examination", label: "الفحوصات", group: "العيادات" },
  { id: "/sheets/pentacam/dashboard", label: "نتائج البنتكام (لوحة)", group: "العيادات" },
  { id: "/sheets/refractions/dashboard", label: "لوحة الانكسارات", group: "العيادات" },
  { id: "/sheets/refractions", label: "سجل الانكسارات", group: "العيادات" },
  { id: "/sheets/autorefs/dashboard", label: "لوحة Autoref", group: "العيادات" },
  { id: "/sheets/autorefs", label: "سجل Autoref", group: "العيادات" },
  { id: "/sheets/prescriptions/dashboard", label: "لوحة الروشتات", group: "العيادات" },
  { id: "/sheets/prescriptions", label: "سجل الروشتات", group: "العيادات" },
  { id: "/sheets/pentacam/:id", label: "شيت البنتكام", group: "العيادات" },
  { id: "/sheets/pentacam", label: "شيت البنتكام (عرض مباشر)", group: "العيادات" },
  { id: "/sheets/consultant/:id", label: "شيت استشاري", group: "العيادات" },
  { id: "/sheets/consultant/:id/followup", label: "متابعة الشيت الاستشاري", group: "العيادات" },
  { id: "/sheets/specialist/:id", label: "شيت أخصائي", group: "العيادات" },
  { id: "/sheets/lasik/:id", label: "شيت ليزك", group: "العيادات" },
  { id: "/sheets/lasik/:id/followup", label: "متابعة شيت الليزك", group: "العيادات" },
  { id: "/sheets/external/:id", label: "شيت خارجي", group: "العيادات" },
  { id: "/sheets/operation/:id", label: "شيت العملية", group: "العيادات" },
  { id: "/refraction/:id", label: "صفحة الانكسار / مقاس النظارة", group: "العيادات" },
  { id: "/refraction", label: "صفحة الانكسار (بدون معرف)", group: "العيادات" },
  { id: "/prescription", label: "كتابة روشتة", group: "العيادات" },
  { id: "/prescription/:id", label: "كتابة روشتة (برقم مريض)", group: "العيادات" },
  { id: "/prescriptions/:id", label: "تحويل الروشتة (Deep link)", group: "العيادات" },
  { id: "/prescriptions", label: "جدول الروشتات", group: "العيادات" },
  { id: "/request-tests/:id", label: "طلب تحاليل وأشعة (برقم مريض)", group: "العيادات" },
  { id: "/request-tests", label: "طلب تحاليل وأشعة", group: "العيادات" },
  { id: "/medical-reports/:id", label: "التقارير الطبية (برقم مريض)", group: "العيادات" },
  { id: "/medical-reports", label: "التقارير الطبية", group: "العيادات" },
  { id: "/patient-summary/:id", label: "تقرير المريض المجمع (برقم مريض)", group: "العيادات" },
  { id: "/patient-summary", label: "تقرير المريض المجمع", group: "العيادات" },
  { id: "/doctor/patient/:id", label: "عرض الطبيب للمريض", group: "العيادات" },

  // ── المرضى ──
  { id: "/patients-hub", label: "مركز المرضى (Patients hub)", group: "المرضى" },
  { id: "/patients", label: "المرضى", group: "المرضى" },
  { id: "/patients/:id", label: "تفاصيل المريض", group: "المرضى" },
  { id: "/patient-file", label: "الملف الطبي", group: "المرضى" },
  { id: "/patient-file/:id", label: "الملف الطبي (برقم مريض)", group: "المرضى" },
  { id: "/medicalfile", label: "الملف الطبي (مسار بديل)", group: "المرضى" },
  { id: "/medicalfile/:id", label: "الملف الطبي (مسار بديل برقم مريض)", group: "المرضى" },
  { id: "/quick-entry", label: "دخول سريع للمريض", group: "المرضى" },
  { id: "/quick-entry/:id", label: "دخول سريع (برقم مريض)", group: "المرضى" },
  { id: "/new-cases", label: "حالات جديدة", group: "المرضى" },
  { id: "/new-cases/:id", label: "حالة جديدة (برقم مريض)", group: "المرضى" },
  { id: "/followup/:id", label: "نموذج متابعة", group: "المرضى" },
  { id: "/followups", label: "قائمة المتابعات", group: "المرضى" },
  { id: "/visits", label: "زيارات المرضى", group: "المرضى" },
  { id: "/visits/:id", label: "زيارة مريض (تفاصيل)", group: "المرضى" },
  { id: "/sheet-copies", label: "نسخ الشيتات", group: "المرضى" },

  // ── مركز الخدمات ──
  { id: "/services-hub", label: "مركز الخدمات (Services hub)", group: "مركز الخدمات" },
  { id: "/medications", label: "كتالوج الأدوية", group: "مركز الخدمات" },
  { id: "/medications/registry", label: "سجل الأدوية (إدارة)", group: "مركز الخدمات" },
  { id: "/medications-tests", label: "الأدوية والفحوصات (مجمّع)", group: "مركز الخدمات" },
  { id: "/tests", label: "اختصار الفحوصات (/tests)", group: "مركز الخدمات" },
  { id: "/tests-management", label: "إدارة الاختبارات (إداري)", group: "مركز الخدمات" },
  { id: "/examinations/catalog", label: "كتالوج الفحوصات", group: "مركز الخدمات" },
  { id: "/txhub", label: "TXhub (تحاليل وأشعة)", group: "مركز الخدمات" },

  // ── المخزن ──
  { id: "/stockroom", label: "المخزن (الرئيسية)", group: "المخزن" },
  { id: "/stockroom/reports", label: "تقارير المخزن", group: "المخزن" },
  { id: "/stockroom/:category", label: "تصنيف مخزن (عام)", group: "المخزن" },
  { id: "/stockroom/eye-drops", label: "مخزن: قطرات العين", group: "المخزن" },
  { id: "/stockroom/op-room", label: "مخزن: مستلزمات غرفة العمليات", group: "المخزن" },
  { id: "/stockroom/surgical", label: "مخزن: مستلزمات وأدوات جراحية", group: "المخزن" },
  { id: "/stockroom/office", label: "مخزن: مستلزمات مكتبية", group: "المخزن" },
  { id: "/stockroom/extra", label: "مخزن: متنوع / إضافي", group: "المخزن" },
  { id: "/stockroom/*", label: "المخزن (كافة المسارات الفرعية)", group: "المخزن" },

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
