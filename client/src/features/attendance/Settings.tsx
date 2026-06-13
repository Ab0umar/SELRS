import { Alert, AlertDescription } from "@/components/ui/alert";
import { InfoIcon } from "lucide-react";

const sections = [
  {
    title: "إعداد الجهاز",
    summary: "إعدادات البصمة والمزامنة.",
    items: [
      "عنوان IP والمنفذ",
      "مسار Access والتهيئة",
      "تواتر المزامنة",
      "إعدادات الاتصال والمهلة",
    ],
    action: "اذهب إلى إعدادات الجهاز",
    href: "/attendance/admin/device",
  },
  {
    title: "الورديات",
    summary: "تعريف الورديات وتوزيع الموظفين.",
    items: [
      "إنشاء الوردية وتعديلها",
      "ربط الوردية بالموظفين",
      "تحديد الوردية الافتراضية",
    ],
    note: "تخصيص الورديات سيكتمل في مرحلة لاحقة.",
  },
  {
    title: "قواعد الحضور",
    summary: "ضبط منطق الاحتساب والحدود الزمنية.",
    items: [
      "سماح التأخير",
      "الحد الأدنى للحضور",
      "حدود العمل الإضافي",
      "سماح الانصراف المبكر",
    ],
    note: "القواعد التفصيلية ستضاف لاحقًا.",
  },
  {
    title: "العطلات وأنواع الإجازات",
    summary: "إدارة الأعياد وأنواع الإجازة.",
    items: [
      "تعريف العطلات الرسمية",
      "إضافة أنواع إجازات",
      "تحديد السياسات والحدود",
    ],
    note: "الإجازات تُدار من صفحة إدارة الإجازات.",
  },
] as const;

export default function Settings() {
  return (
    <div className="space-y-6" dir="rtl">
      <div className="space-y-1">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
          Attendance settings / إعدادات الحضور
        </p>
        <h2 className="text-2xl font-bold text-foreground">الإعدادات</h2>
      </div>

      <Alert className="border-primary/20 bg-primary/5">
        <InfoIcon className="h-4 w-4" />
        <AlertDescription>
          الإعدادات الأساسية موجودة في صفحة الجهاز، وهذه الصفحة مخصصة لضبط ما
          يخص وحدة الحضور فقط.
        </AlertDescription>
      </Alert>

      <div className="grid gap-4">
        {sections.map((section) => (
          <section
            key={section.title}
            className="rounded-xl border border-border bg-background"
          >
            <div className="border-b border-border px-4 py-3">
              <h3 className="text-base font-semibold text-foreground">
                {section.title}
              </h3>
            </div>
            <div className="space-y-3 px-4 py-4 text-sm text-muted-foreground">
              <p>{section.summary}</p>
              <ul className="list-disc list-inside space-y-2">
                {section.items.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
              {"action" in section ? (
                <button
                  type="button"
                  className="text-sm font-medium text-primary hover:underline"
                  onClick={() => (window.location.href = section.href)}
                >
                  {section.action}
                </button>
              ) : null}
              {"note" in section ? (
                <p className="text-sm text-muted-foreground">{section.note}</p>
              ) : null}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
