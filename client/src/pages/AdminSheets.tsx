import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import PatientPicker from "@/components/PatientPicker";
import { Calendar, Eye, FileText, LayoutTemplate, Plus, Trash2, User } from "lucide-react";
import { PageHeader } from "@/components/shared/PageHeader";
import { SearchBar } from "@/components/shared/SearchBar";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

type PickedPatient = {
  id: number;
  fullName: string;
};

type FormStatus = "approved" | "draft";

const SHEET_LINKS = [
  {
    key: "consultant",
    title: "شيت استشاري",
    path: (id: number) => `/sheets/consultant/${id}`,
    status: "approved" as FormStatus,
    doctorLabel: "قالب النظام",
  },
  {
    key: "followup",
    title: "متابعة استشاري",
    path: (id: number) => `/sheets/consultant/${id}?tab=followup`,
    status: "draft" as FormStatus,
    doctorLabel: "قالب النظام",
  },
  {
    key: "specialist",
    title: "شيت متخصص",
    path: (id: number) => `/sheets/specialist/${id}`,
    status: "approved" as FormStatus,
    doctorLabel: "قالب النظام",
  },
  {
    key: "lasik",
    title: "شيت ليزك",
    path: (id: number) => `/sheets/lasik/${id}`,
    status: "approved" as FormStatus,
    doctorLabel: "قالب النظام",
  },
  {
    key: "external",
    title: "شيت عملية خارجية",
    path: (id: number) => `/sheets/external/${id}`,
    status: "draft" as FormStatus,
    doctorLabel: "قالب النظام",
  },
] as const;

function withOriginalFlag(path: string) {
  return path.includes("?") ? `${path}&original=1` : `${path}?original=1`;
}

const STATUS_FILTER_OPTIONS: { value: "all" | FormStatus; label: string }[] = [
  { value: "all", label: "الكل" },
  { value: "approved", label: "معتمد" },
  { value: "draft", label: "مسودة" },
];

export default function AdminSheets() {
  const { user, isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();
  const [selectedPatient, setSelectedPatient] = useState<PickedPatient | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | FormStatus>("all");

  useEffect(() => {
    if (!isAuthenticated) setLocation("/");
  }, [isAuthenticated, setLocation]);

  const patientId = selectedPatient?.id ?? null;

  const filteredSheets = useMemo(() => {
    const q = search.trim().toLowerCase();
    return SHEET_LINKS.filter((sheet) => {
      if (statusFilter !== "all" && sheet.status !== statusFilter) return false;
      if (!q) return true;
      return `${sheet.title} ${sheet.doctorLabel}`.toLowerCase().includes(q);
    });
  }, [search, statusFilter]);

  if (!isAuthenticated || user?.role !== "admin") return null;

  return (
    <div className="mx-auto w-full max-w-[1440px] space-y-5 pb-6 text-right" dir="rtl">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <PageHeader
          title="النماذج الطبية"
          subtitle="قوالب النماذج والسجلات الطبية"
          icon={<LayoutTemplate className="h-5 w-5" />}
        />
        <Button
          type="button"
          className="selrs-gradient-btn shrink-0 gap-2 self-start text-primary-foreground sm:mt-1"
          onClick={() => setLocation("/sheet-designer")}
        >
          <Plus className="h-4 w-4" />
          نموذج جديد
        </Button>
      </div>

      <div className="flex flex-col gap-3 rounded-xl border border-border bg-card p-4 shadow-sm">
        <PatientPicker
          initialPatientId={patientId ?? undefined}
          onSelect={(patient) => {
            setSelectedPatient({
              id: patient.id,
              fullName: patient.fullName,
            });
          }}
        />
        <SearchBar value={search} onChange={setSearch} placeholder="تصفية النماذج بالاسم…" className="w-full" />
        <div className="flex flex-wrap gap-2">
          {STATUS_FILTER_OPTIONS.map((opt) => (
            <Button
              key={opt.value}
              type="button"
              size="sm"
              variant={statusFilter === opt.value ? "default" : "outline"}
              className={cn(
                "rounded-full px-4",
                statusFilter === opt.value ? "selrs-gradient-btn border-0 text-primary-foreground" : "border-border/80",
              )}
              onClick={() => setStatusFilter(opt.value === "all" ? "all" : opt.value)}
            >
              {opt.label}
            </Button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {filteredSheets.map((sheet) => (
          <Card
            key={sheet.key}
            className="overflow-hidden rounded-xl border border-border/80 bg-card shadow-sm transition-all hover:-translate-y-0.5 hover:border-primary/20 hover:shadow-md"
          >
            <CardHeader className="flex flex-row items-start justify-between gap-3 space-y-0 border-b border-border/60 pb-3">
              <div className="min-w-0 flex-1 space-y-2 text-right">
                <Badge
                  className={cn(
                    "font-semibold",
                    sheet.status === "approved"
                      ? "border-success/30 bg-success/10 text-success"
                      : "border-border bg-muted text-muted-foreground",
                  )}
                  variant="outline"
                >
                  {sheet.status === "approved" ? "معتمد" : "مسودة"}
                </Badge>
                <div className="flex items-start justify-between gap-2">
                  <h3 className="text-base font-black leading-snug">{sheet.title}</h3>
                  <FileText className="h-5 w-5 shrink-0 text-primary" aria-hidden />
                </div>
                <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <User className="h-3.5 w-3.5 shrink-0 opacity-70" />
                  {sheet.doctorLabel}
                </p>
              </div>
            </CardHeader>
            <CardContent className="space-y-4 pt-4">
              <div className="space-y-1.5 text-xs text-muted-foreground">
                <div className="flex items-center gap-2">
                  <Calendar className="h-3.5 w-3.5 shrink-0 opacity-70" />
                  <span>تاريخ الإنشاء: —</span>
                </div>
                <div className="flex items-center gap-2">
                  <User className="h-3.5 w-3.5 shrink-0 opacity-70" />
                  <span>بواسطة: النظام</span>
                </div>
              </div>
              <div className="flex items-center justify-between gap-2 border-t border-border/50 pt-3">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-9 w-9 text-destructive-foreground bg-destructive text-destructive-foreground"
                  title="حذف غير متاح للقوالب"
                  aria-label="حذف غير متاح للقوالب"
                  onClick={() => toast.message("قوالب النظام ثابتة — لا يمكن حذفها من هنا.")}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  className="min-w-[7rem] flex-1 gap-2 rounded-lg border border-border bg-muted/40 font-semibold hover:bg-muted/70"
                  disabled={!patientId}
                  onClick={() => {
                    if (!patientId) {
                      toast.error("اختر مريضاً أولاً لعرض النموذج.");
                      return;
                    }
                    setLocation(sheet.path(patientId));
                  }}
                >
                  <Eye className="h-4 w-4" />
                  عرض
                </Button>
              </div>
              <div className="flex gap-2">
                <Button
                  type="button"
                  className="flex-1 selrs-gradient-btn text-sm text-primary-foreground"
                  disabled={!patientId}
                  onClick={() => {
                    if (!patientId) return;
                    setLocation(sheet.path(patientId));
                  }}
                >
                  فتح وتعديل
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1 rounded-lg border-warning/50 bg-warning/10 text-warning hover:border-warning hover:bg-warning/20"
                  disabled={!patientId}
                  onClick={() => {
                    if (!patientId) return;
                    setLocation(withOriginalFlag(sheet.path(patientId)));
                  }}
                >
                  النسخة الأصلية
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredSheets.length === 0 ? (
        <p className="rounded-xl border border-dashed border-border bg-muted/20 py-10 text-center text-sm text-muted-foreground">
          لا توجد نماذج مطابقة للتصفية.
        </p>
      ) : null}
    </div>
  );
}
