import { ROUTES } from "@shared/routes";

export const aiPages = [
  {
    path: ROUTES.ai,
    label: "نظرة عامة",
    description: "حالة المزوّدين والوصول إلى أدوات الذكاء الاصطناعي",
  },
  {
    path: ROUTES.aiReplies,
    label: "الرد الآلي والتدريب",
    description: "المحادثات والمعرفة واختبار الردود وإعدادات القنوات",
  },
  {
    path: ROUTES.aiMedical,
    label: "المساعد الطبي",
    description: "الإملاء ومراجعة النص والاقتراحات الطبية",
  },
  {
    path: ROUTES.aiMarketing,
    label: "محتوى التسويق",
    description: "توليد النصوص والصور ومتابعة مهام التسويق",
  },
  {
    path: ROUTES.aiWhatsApp,
    label: "صياغة واتساب",
    description: "إعداد صيغ الرسائل ومراجعتها ونسخها",
  },
  {
    path: ROUTES.aiSettings,
    label: "المزوّدون والحدود",
    description: "اختيار المزوّد والموديل وحدود كل مهمة",
  },
  {
    path: ROUTES.aiExperiments,
    label: "تجارب الاتصال",
    description: "اختبار النص والصورة ببيانات اصطناعية",
  },
  {
    path: ROUTES.aiUsage,
    label: "سجل الاستخدام",
    description: "الطلبات وحالتها واستهلاك التوكنات ورصيد Manus",
  },
] as const;

export const legacyAiRoutes: Record<string, string> = {
  "/admin-hub/ai": ROUTES.ai,
  "/admin-hub/auto-reply": ROUTES.aiReplies,
  "/admin-hub/medical-assistant": ROUTES.aiMedical,
  "/admin/ai": ROUTES.ai,
  "/admin/auto-reply": ROUTES.aiReplies,
  "/admin/medical-assistant": ROUTES.aiMedical,
  "/booking-triage/ai": ROUTES.ai,
  "/booking-triage/auto-reply": ROUTES.aiReplies,
  "/booking-triage/medical-assistant": ROUTES.aiMedical,
  "/marketing": ROUTES.aiMarketing,
  "/marketing/drafts": "/ai/marketing/drafts",
  "/marketing/history": "/ai/marketing/history",
  "/marketing/brand": "/ai/marketing/brand",
  "/marketing/settings": "/ai/marketing/settings",
  "/marketing/whatsapp": "/ai/marketing/whatsapp",
};

export const aiMarketingPages = [
  { path: ROUTES.aiMarketing, label: "توليد المحتوى" },
  { path: "/ai/marketing/drafts", label: "المسودات" },
  { path: "/ai/marketing/history", label: "سجل المنشورات" },
  { path: "/ai/marketing/brand", label: "المراجع البصرية" },
  { path: "/ai/marketing/settings", label: "الجدولة وربط الصفحات" },
  { path: "/ai/marketing/whatsapp", label: "حملات واتساب" },
] as const;

export function aiPermissionPath(path: string): string {
  if (path.startsWith("/ai/marketing/")) return path.replace(/^\/ai/, "");
  if (path === ROUTES.aiReplies) return "/admin-hub/auto-reply";
  if (path === ROUTES.aiMedical) return "/admin-hub/medical-assistant";
  if (path === ROUTES.aiMarketing) return "/marketing";
  if (path === ROUTES.aiWhatsApp) return "/marketing/whatsapp";
  if (aiPages.some((page) => page.path === path)) return "/admin-hub/ai";
  return path;
}
