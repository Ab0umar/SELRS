import { useEffect, useState } from "react";

// Pages that do not render their own <h1> still get one for screen readers
// (DESIGN.md: every screen identifies the current task). Pages with an <h1> are untouched.
const ROUTE_TITLES: Array<[string, string]> = [
  ["/medications/registry", "سجل الأدوية"],
  ["/new-cases", "حالات جديدة"],
  ["/admin-hub/settings", "إعدادات الإدارة"],
  ["/admin-hub/pentacam-failed", "ملفات البنتاكام الفاشلة"],
  ["/prescription", "الروشتة"],
  ["/profile", "الملف الشخصي"],
  ["/refraction", "الانكسار"],
  ["/archive", "الأرشيف"],
  ["/request-tests", "طلب التحاليل"],
  ["/attendance/admin/device", "أجهزة الحضور"],
  ["/attendance/admin/sync", "مزامنة الحضور"],
  ["/attendance/my", "حضوري"],
  ["/attendance/shift-schedule", "جدول الورديات"],
  ["/salary/funds", "الصندوق والعيدية"],
  ["/salary/pools", "العمولات"],
  ["/services-hub", "مرجع الأدوية"],
  ["/clinical-decision-support", "القرار الإكلينيكي"],
  ["/examinations/catalog", "القيم الطبيعية للفحوصات"],
  ["/examination", "الفحص"],
  ["/treatment", "العلاج"],
  ["/showcase", "معرض المكونات"],
];

export function RouteTitleFallback({ location }: { location: string }) {
  const [title, setTitle] = useState<string | null>(null);

  useEffect(() => {
    setTitle(null);
    const timer = window.setTimeout(() => {
      if (document.querySelector("h1")) return;
      const path = location.split("?")[0];
      const hit = ROUTE_TITLES.find(
        ([prefix]) => path === prefix || path.startsWith(prefix + "/"),
      );
      if (hit) setTitle(hit[1]);
    }, 600);
    return () => window.clearTimeout(timer);
  }, [location]);

  return title ? <h1 className="sr-only">{title}</h1> : null;
}
