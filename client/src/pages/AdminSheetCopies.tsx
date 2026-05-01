import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileText, Copy, Layers, PackageOpen, Pencil, Trash2, Archive, Sparkles } from "lucide-react";
import { PageHeader } from "@/components/shared/PageHeader";
import { StatCard } from "@/components/shared/StatCard";
import { SearchBar } from "@/components/shared/SearchBar";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const SHEET_COPY_LINKS = [
  {
    key: "consultant",
    title: "نسخة استشاري",
    path: "/sheets/consultant/0?original=1",
    family: "consultant" as const,
    status: "active" as const,
    copies: 1,
  },
  {
    key: "consultant-followup",
    title: "نسخة متابعة استشاري",
    path: "/sheets/consultant/0/followup?original=1",
    family: "consultant",
    status: "active" as const,
    copies: 1,
  },
  {
    key: "specialist",
    title: "نسخة متخصص",
    path: "/sheets/specialist/0?original=1",
    family: "specialist",
    status: "active" as const,
    copies: 1,
  },
  {
    key: "lasik",
    title: "نسخة ليزك",
    path: "/sheets/lasik/0?original=1",
    family: "lasik",
    status: "active" as const,
    copies: 1,
  },
  {
    key: "lasik-followup",
    title: "نسخة متابعة ليزك",
    path: "/sheets/lasik/0/followup?original=1",
    family: "lasik",
    status: "active" as const,
    copies: 1,
  },
  {
    key: "external",
    title: "نسخة خارجي",
    path: "/sheets/external/0?original=1",
    family: "external",
    status: "active" as const,
    copies: 1,
  },
];

type CopyFilter = "all" | "active" | "archive";

export default function AdminSheetCopies() {
  const { user, isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();
  const [statusFilter, setStatusFilter] = useState<CopyFilter>("all");
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (!isAuthenticated) setLocation("/");
  }, [isAuthenticated, setLocation]);

  const visibleLinks = useMemo(() => {
    let rows = SHEET_COPY_LINKS;
    if (statusFilter === "archive") rows = [];
    if (statusFilter === "active") rows = SHEET_COPY_LINKS.filter((l) => l.status === "active");
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) => `${r.title} ${r.family}`.toLowerCase().includes(q));
  }, [statusFilter, search]);

  const totalCopies = SHEET_COPY_LINKS.length;
  const activeCount = SHEET_COPY_LINKS.filter((l) => l.status === "active").length;
  const archiveCount = 0;

  if (!isAuthenticated || user?.role !== "admin") return null;

  return (
    <div className="mx-auto w-full max-w-[1440px] space-y-5 pb-6 text-right" dir="rtl">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <PageHeader
          title="نسخ النماذج"
          subtitle="إدارة نسخ النماذج الطبية"
          icon={<Layers className="h-5 w-5" />}
        />
        <Button
          type="button"
          className="selrs-gradient-btn shrink-0 gap-2 self-start text-white sm:mt-1"
          onClick={() => window.open(SHEET_COPY_LINKS[0]?.path ?? "/sheets/consultant/0?original=1", "_blank", "noopener,noreferrer")}
        >
          <Sparkles className="h-4 w-4" />
          إنشاء نسخة
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 sm:gap-4">
        <StatCard
          title="إجمالي النسخ"
          value={totalCopies}
          icon={PackageOpen}
          iconColor="bg-amber-100 text-amber-800 dark:bg-amber-950/55 dark:text-amber-300"
        />
        <StatCard
          title="قيد الاستخدام"
          value={activeCount}
          icon={FileText}
          iconColor="bg-emerald-100 text-emerald-800 dark:bg-emerald-950/55 dark:text-emerald-300"
        />
        <StatCard
          title="أرشيف"
          value={archiveCount}
          icon={Archive}
          iconColor="bg-sky-100 text-sky-800 dark:bg-sky-950/55 dark:text-sky-300"
          description={archiveCount === 0 ? "لا يوجد أرشيف بعد" : undefined}
        />
      </div>

      <div className="space-y-3 rounded-xl border border-border bg-card p-4 shadow-sm">
        <SearchBar value={search} onChange={setSearch} placeholder="بحث عن نموذج…" className="w-full max-w-xl" />
        <div className="flex flex-wrap gap-2">
          {(
            [
              { value: "all" as const, label: "الكل" },
              { value: "active" as const, label: "قيد الاستخدام" },
              { value: "archive" as const, label: "أرشيف" },
            ] as const
          ).map((opt) => (
            <Button
              key={opt.value}
              type="button"
              size="sm"
              variant={statusFilter === opt.value ? "default" : "outline"}
              className={cn(
                "rounded-full px-4",
                statusFilter === opt.value ? "selrs-gradient-btn border-0 text-white" : "border-border/80",
              )}
              onClick={() => setStatusFilter(opt.value)}
            >
              {opt.label}
            </Button>
          ))}
        </div>
      </div>

      {visibleLinks.length === 0 ? (
        <p className="rounded-xl border border-dashed border-border bg-muted/20 py-12 text-center text-sm text-muted-foreground">
          {statusFilter === "archive"
            ? "لا توجد نسخ في الأرشيف حالياً."
            : search.trim()
              ? "لا توجد نتائج للبحث."
              : "لا توجد عناصر مطابقة."}
        </p>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {visibleLinks.map((sheet) => (
            <Card
              key={sheet.key}
              className="relative overflow-hidden rounded-xl border border-border/80 bg-card shadow-sm transition-all hover:-translate-y-0.5 hover:border-primary/20 hover:shadow-md"
            >
              <span className="absolute right-3 top-3 h-2 w-2 rounded-full bg-emerald-500 shadow-sm ring-2 ring-white" aria-hidden />
              <CardHeader className="flex flex-row items-start justify-between gap-3 border-b border-border/60 pb-3 pt-5">
                <div className="min-w-0 flex-1 space-y-2 text-right">
                  <div className="flex items-start justify-between gap-2">
                    <Copy className="h-5 w-5 shrink-0 text-primary" />
                    <div className="min-w-0">
                      <h3 className="text-base font-black leading-snug">{sheet.title}</h3>
                      <p className="mt-1 text-xs text-muted-foreground">طبيب مرجعي: قالب النظام</p>
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4 pt-4">
                <div className="text-xs text-muted-foreground">
                  <div>تاريخ: —</div>
                  <div>بواسطة: النظام</div>
                </div>
                <div className="flex items-center justify-between gap-2 border-t border-border/50 pt-3">
                  <div className="flex gap-1">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-9 w-9 text-destructive hover:bg-destructive/10"
                      title="حذف"
                      onClick={() => toast.message("النسخ المرجعية لا تُحذف من هنا.")}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-9 w-9 hover:bg-muted"
                      title="تعديل في المصمم"
                      onClick={() => setLocation("/sheet-designer")}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                  </div>
                  <Badge variant="secondary" className="tabular-nums font-semibold">
                    {sheet.copies} نسخة
                  </Badge>
                </div>
                <Button
                  className="w-full selrs-gradient-btn text-white"
                  type="button"
                  onClick={() => window.open(sheet.path, "_blank", "noopener,noreferrer")}
                >
                  فتح النسخة
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
