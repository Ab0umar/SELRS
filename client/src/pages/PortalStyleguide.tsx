import { Link } from "wouter";
import { PageHeader } from "@/components/shared/PageHeader";

const swatches: Array<{ name: string; className: string; labelAr: string }> = [
  { name: "--primary / Navy", className: "bg-primary text-primary-foreground", labelAr: "الأساس — كحلي SELRS" },
  { name: "--secondary / Orange", className: "bg-secondary text-secondary-foreground", labelAr: "التمييز — برتقالي" },
  { name: "--muted", className: "bg-muted text-muted-foreground border border-border", labelAr: "خلفيات خافتة" },
  { name: "--accent", className: "bg-accent text-accent-foreground", labelAr: "تأكيد تفاعلي" },
  { name: "--destructive", className: "bg-destructive text-destructive-foreground", labelAr: "تحذير / حذف" },
];

export default function PortalStyleguide() {
  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-6 p-4 sm:p-6" dir="rtl">
      <PageHeader
        title="دليل الألوان (Styleguide)"
        description="مراجع سريعة لرموز SELRS داخل هذه الواجهة — مسارات إدارية فقط."
      />

      <p className="text-sm text-muted-foreground">
        الألوان المعرّفة في <span className="font-mono text-xs">client/src/index.css</span> (Navy&nbsp;#003D82، Orange&nbsp;#FF9500) تُحمَّل كـ Tailwind semantic:
        <span className="font-mono"> primary</span> و<span className="font-mono"> secondary</span> وما يرافقها.
      </p>

      <div className="grid gap-3 sm:grid-cols-2">
        {swatches.map((s) => (
          <div
            key={s.name}
            className={`flex min-h-[5.5rem] flex-col justify-center rounded-2xl border border-border px-4 py-3 shadow-sm ${s.className}`}
          >
            <div className="text-xs font-semibold uppercase tracking-wide opacity-90">{s.name}</div>
            <div className="mt-1 text-sm font-black">{s.labelAr}</div>
          </div>
        ))}
      </div>

      <div className="rounded-2xl border border-border bg-card p-4 text-sm">
        <div className="font-semibold text-foreground">روابط ذات صلة</div>
        <ul className="mt-2 space-y-1 text-primary">
          <li>
            <Link href="/showcase">معرض المكوّنات (shadcn) —</Link>{" "}
            <span className="text-muted-foreground">/showcase</span>
          </li>
          <li>
            <Link href="/components-gallery">مجمّع المكوّنات المخصّصة —</Link>{" "}
            <span className="text-muted-foreground">/components-gallery</span>
          </li>
        </ul>
      </div>
    </div>
  );
}
