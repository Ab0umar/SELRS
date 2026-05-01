import { Link } from "wouter";
import { LayoutGrid } from "lucide-react";
import { PageHeader } from "@/components/shared/PageHeader";

export default function PortalComponentsGallery() {
  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 p-4 sm:p-6" dir="rtl">
      <PageHeader
        icon={<LayoutGrid className="h-5 w-5" />}
        title="مجمّع المكوّنات"
        description="مكوّنات المنصة والعناصر المشتركة — للمراجعة أثناء تطوير الواجهة."
      />

      <div className="space-y-3 rounded-2xl border border-border bg-card p-4 text-sm leading-7">
        <p className="text-muted-foreground">
          المكوّنات المشتركة في المسار <span className="font-mono text-xs">client/src/components/shared/</span>:{" "}
          <span className="font-semibold text-foreground">PageHeader، SearchBar، FilterBar، StatCard، EmptyState، CollapsibleSection</span>.
        </p>
        <p>
          لمكتبة shadcn/ui الكاملة (أزرار، جداول، حوارات…)، افتح الصفحة الموجودة مسبقاً:{" "}
          <Link className="font-bold text-primary hover:underline" href="/showcase">
            معرض المكوّنات (/showcase)
          </Link>
          .
        </p>
      </div>
    </div>
  );
}
