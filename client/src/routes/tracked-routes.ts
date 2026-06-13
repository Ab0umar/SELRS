export const RECENT_KEY = (userId?: string | number | null) =>
  `selrs:recent:${userId ?? "anon"}`;

export const TRACKED_ROUTES: Array<{ pathPrefix: string; label: string }> = [
  { pathPrefix: "/dashboard", label: "لوحة التحكم" },
  { pathPrefix: "/patients", label: "المرضى" },
  { pathPrefix: "/patient-file", label: "ملف المريض" },
  { pathPrefix: "/patient-summary", label: "التقرير المجمع" },
  { pathPrefix: "/medical-reports", label: "التقارير الطبية" },
  { pathPrefix: "/examination", label: "الفحوصات" },
  { pathPrefix: "/quick-entry", label: "دخول سريع" },
  { pathPrefix: "/new-cases", label: "حالات جديدة" },
  { pathPrefix: "/followups", label: "المتابعات" },
  { pathPrefix: "/visits", label: "الزيارات" },
  { pathPrefix: "/sheets/pentacam/dashboard", label: "نتائج البنتكام" },
  { pathPrefix: "/admin/pentacam", label: "ربط البنتكام" },
  { pathPrefix: "/sheets/refractions/dashboard", label: "لوحة الانكسارات" },
  { pathPrefix: "/sheets/autorefs/dashboard", label: "لوحة Autoref" },
  { pathPrefix: "/sheets/prescriptions/dashboard", label: "لوحة الروشتات" },
  { pathPrefix: "/today", label: "مرضى اليوم" },
  { pathPrefix: "/operations", label: "العمليات" },
  { pathPrefix: "/prescriptions", label: "الروشتات" },
  { pathPrefix: "/medications", label: "الأدوية" },
  { pathPrefix: "/examinations/catalog", label: "إدارة الاختبارات" },
  { pathPrefix: "/txhub", label: "TXhub" },
  { pathPrefix: "/admin", label: "الإدارة" },
];
