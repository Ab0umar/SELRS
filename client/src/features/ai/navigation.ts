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
    path: "/ai/marketing/whatsapp",
    label: "دعاية واتساب",
    description: "الحملات وصياغة الرسائل ونتائج التسليم",
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
  [ROUTES.aiWhatsApp]: "/ai/marketing/whatsapp",
};

export const aiMarketingPages = [
  { path: ROUTES.aiMarketing, label: "التقويم" },
  { path: "/ai/marketing/drafts", label: "المسودات" },
  { path: "/ai/marketing/history", label: "سجل المنشورات" },
  { path: "/ai/marketing/brand", label: "المراجع البصرية" },
  { path: "/ai/marketing/settings", label: "الجدولة وربط الصفحات" },
] as const;

type AiNavPage = { readonly path: string; readonly label: string };

export type AiSubmodule = {
  key: "core" | "replies" | "medical" | "marketing" | "whatsapp";
  label: string;
  home: string;
  description: string;
  pages: readonly AiNavPage[];
};

const pageByPath = (path: string) =>
  aiPages.find((page) => page.path === path)!;

function submodule(
  key: AiSubmodule["key"],
  path: string,
  pages: readonly AiNavPage[] = [],
): AiSubmodule {
  const page = pageByPath(path);
  return {
    key,
    label: page.label,
    home: page.path,
    description: page.description,
    pages,
  };
}

/** "AI" holds the shared settings; every other entry is an independent submodule. */
export const aiSubmodules: readonly AiSubmodule[] = [
  {
    ...submodule(
      "core",
      ROUTES.ai,
      [ROUTES.ai, ROUTES.aiSettings, ROUTES.aiExperiments, ROUTES.aiUsage].map(
        pageByPath,
      ),
    ),
    label: "AI",
  },
  submodule("medical", ROUTES.aiMedical),
  submodule("replies", ROUTES.aiReplies),
  submodule("marketing", ROUTES.aiMarketing, aiMarketingPages),
  submodule("whatsapp", "/ai/marketing/whatsapp"),
];

export function aiSubmoduleFor(location: string): AiSubmodule {
  // Longest home wins so /ai/marketing/whatsapp is not claimed by marketing.
  const matches = aiSubmodules.filter(
    (entry) =>
      entry.key !== "core" &&
      (location === entry.home || location.startsWith(`${entry.home}/`)),
  );
  return (
    matches.sort((a, b) => b.home.length - a.home.length)[0] ?? aiSubmodules[0]
  );
}

export function aiPermissionPath(path: string): string {
  if (path.startsWith("/ai/marketing/")) return path.replace(/^\/ai/, "");
  if (path === ROUTES.aiReplies) return "/admin-hub/auto-reply";
  if (path === ROUTES.aiInbox) return "/admin-hub/auto-reply-inbox";
  if (path === ROUTES.aiMedical) return "/admin-hub/medical-assistant";
  if (path === ROUTES.aiMarketing) return "/marketing";
  if (path === ROUTES.aiWhatsApp) return "/marketing/whatsapp";
  if (aiPages.some((page) => page.path === path)) return "/admin-hub/ai";
  return path;
}
