import { Layers, PenSquare, Copy, FileText } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Link } from "wouter";
import { PageHeader } from "@/components/shared/PageHeader";
import { cn } from "@/lib/utils";

const FORM_MODULES = [
  {
    href: "/admin-hub/sheets",
    title: "النماذج",
    description: "إدارة وعرض جميع نماذج المرضى المسجلة.",
    icon: FileText,
    iconWrap: "bg-primary/10 text-primary",
  },
  {
    href: "/admin-hub/sheet-designer",
    title: "مصمم النماذج",
    description: "تخصيص وتصميم حقول وبيانات النماذج الطبية.",
    icon: PenSquare,
    iconWrap: "bg-warning/10 text-warning/90",
  },
  {
    href: "/admin-hub/sheet-copies",
    title: "نسخ النماذج",
    description: "أداة لنسخ بيانات النماذج بين المرضى.",
    icon: Copy,
    iconWrap: "bg-secondary/[0.07] text-secondary",
  },
];

export default function AdminFormsHub() {
  return (
    <div className="mx-auto w-full max-w-[1440px] space-y-6 pb-12 text-right" dir="rtl">
      <PageHeader
        title="مركز النماذج"
        subtitle="إدارة وتصميم وتخصيص جميع النماذج الطبية والشيتات في النظام."
        icon={<Layers className="h-5 w-5 text-primary" />}
      />

      <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
        {FORM_MODULES.map((mod) => {
          const Icon = mod.icon;
          return (
            <Link key={mod.href} href={mod.href}>
              <Card
                className={cn(
                  "group h-full border-border/60 bg-card transition-all hover:border-primary/40 hover:shadow-lg active:scale-[0.98]",
                )}
              >
                <CardContent className="flex h-full flex-col gap-5 p-6">
                  <div className="flex items-start justify-between gap-4">
                    <div
                      className={cn(
                        "flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl transition-colors group-hover:bg-primary/5",
                        mod.iconWrap,
                      )}
                    >
                      <Icon className="h-6 w-6" />
                    </div>
                    <div className="min-w-0 flex-1 space-y-1 text-right">
                      <h3 className="font-bold text-base tracking-tight text-foreground/90 transition-colors group-hover:text-primary">
                        {mod.title}
                      </h3>
                      <p className="text-xs leading-relaxed text-muted-foreground line-clamp-2">
                        {mod.description}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
