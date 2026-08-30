import { useMemo, useState } from "react";
import { useLocation } from "wouter";
import PatientPicker from "@/components/PatientPicker";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Copy,
  ExternalLink,
  FileText,
  Layers,
  Plus,
  Search,
  User,
  X,
} from "lucide-react";
import { PageHeader } from "@/components/shared/PageHeader";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

type PickedPatient = { id: number; fullName: string };
type WorkspaceMode = "patient-forms" | "blank-copies";

const SHEET_LINKS = [
  {
    key: "consultant",
    title: "شيت كشف",
    description: "استمارة الكشف الشامل وفحص قاع العين للعيادات.",
    path: (id: number) => `/sheets/consultant/${id}`,
    label: "كشف استشاري",
  },
  {
    key: "followup",
    title: "متابعة استشاري",
    description: "استمارة المتابعة الدورية وفحص الحالات المعالجة.",
    path: (id: number) => `/sheets/consultant/${id}?tab=followup`,
    label: "متابعة",
  },
  {
    key: "specialist",
    title: "شيت مقاس نظارة / أشعة خارجية",
    description: "فحص قياس النظر وطلب الأشعة والفحوصات الخارجية.",
    path: (id: number) => `/sheets/specialist/${id}`,
    label: "مقاس نظارة",
  },
  {
    key: "lasik",
    title: "شيت تصحيح إبصار",
    description: "استمارة الفحص الجراحي وتصحيح الإبصار بالليزر.",
    path: (id: number) => `/sheets/lasik/${id}`,
    label: "ليزك",
  },
  {
    key: "external",
    title: "شيت د. الصواف",
    description: "النموذج المخصص لحالات وعيادات د. الصواف.",
    path: (id: number) => `/sheets/external/${id}`,
    label: "استشاري خارجي",
  },
] as const;

const BLANK_COPIES = [
  {
    key: "consultant",
    title: "نسخة كشف فارغة",
    description: "قالب الكشف الاستشاري الأصلي غير المخصص لمريض.",
    path: "/sheets/consultant/0?original=1",
    label: "كشف استشاري",
  },
  {
    key: "consultant-followup",
    title: "نسخة متابعة استشاري فارغة",
    description: "قالب متابعة الاستشاري الأصلي برقم 0.",
    path: "/sheets/consultant/0/followup?original=1",
    label: "متابعة",
  },
  {
    key: "specialist",
    title: "نسخة مقاس نظارة / أشعة فارغة",
    description: "قالب قياس النظارة والأشعة الخارجية غير المخصص.",
    path: "/sheets/specialist/0?original=1",
    label: "مقاس نظارة",
  },
  {
    key: "lasik",
    title: "نسخة تصحيح إبصار فارغة",
    description: "قالب تصحيح الإبصار والليزر برقم 0.",
    path: "/sheets/lasik/0?original=1",
    label: "ليزك",
  },
  {
    key: "lasik-followup",
    title: "نسخة متابعة ليزك فارغة",
    description: "قالب متابعة الليزك الأصلية.",
    path: "/sheets/lasik/0/followup?original=1",
    label: "متابعة ليزك",
  },
  {
    key: "external",
    title: "نسخة د. الصواف فارغة",
    description: "القالب المخصص لحالات د. الصواف غير المخصص.",
    path: "/sheets/external/0?original=1",
    label: "استشاري خارجي",
  },
] as const;

function withOriginalFlag(path: string) {
  return path.includes("?") ? `${path}&original=1` : `${path}?original=1`;
}

export default function AdminSheets() {
  const [, setLocation] = useLocation();
  const [selectedPatient, setSelectedPatient] = useState<PickedPatient | null>(
    null,
  );
  const [patientPickerOpen, setPatientPickerOpen] = useState(false);
  const [mode, setMode] = useState<WorkspaceMode>("patient-forms");
  const [searchQuery, setSearchQuery] = useState("");

  const visibleItems = useMemo(() => {
    const source = mode === "patient-forms" ? SHEET_LINKS : BLANK_COPIES;
    const query = searchQuery.trim().toLowerCase();
    if (!query) return source;
    return source.filter((item) =>
      [item.title, item.description, item.label].some((value) =>
        value.toLowerCase().includes(query),
      ),
    );
  }, [mode, searchQuery]);

  const openItem = (
    item: (typeof SHEET_LINKS)[number] | (typeof BLANK_COPIES)[number],
  ) => {
    if (mode === "blank-copies") {
      setLocation((item as (typeof BLANK_COPIES)[number]).path);
      return;
    }
    if (!selectedPatient) {
      toast.error("اختر مريضًا أولًا لفتح الشيت المخصص له.");
      setPatientPickerOpen(true);
      return;
    }
    const patientItem = item as (typeof SHEET_LINKS)[number];
    setLocation(withOriginalFlag(patientItem.path(selectedPatient.id)));
  };

  return (
    <div
      className="mx-auto w-full max-w-[1440px] space-y-4 pb-4 text-right"
      dir="rtl"
    >
      <PageHeader
        title="ملفات الفحص الإلكترونية"
        subtitle="فتح استمارات المرضى ومعاينة النسخ الأصلية من مساحة عمل واحدة."
        icon={<Layers className="size-5" />}
        action={
          <Button
            type="button"
            size="sm"
            className="h-9 gap-2"
            onClick={() => setLocation("/admin-hub/sheet-designer")}
          >
            <Plus className="size-4" />
            نموذج جديد
          </Button>
        }
      />

      <div className="grid min-h-[620px] overflow-hidden rounded-lg border border-border bg-background lg:grid-cols-[280px_minmax(0,1fr)]">
        <aside className="border-b border-border bg-muted/20 p-4 lg:border-b-0 lg:border-l">
          <div className="text-xs font-black text-muted-foreground">
            طريقة العرض
          </div>
          <div className="mt-2 space-y-1">
            {(
              [
                {
                  id: "patient-forms",
                  label: "استمارات المرضى",
                  helper: "فتح شيت مرتبط بمريض",
                  icon: User,
                },
                {
                  id: "blank-copies",
                  label: "القوالب الأصلية",
                  helper: "معاينة نسخة فارغة",
                  icon: Copy,
                },
              ] as const
            ).map((option) => {
              const Icon = option.icon;
              const active = mode === option.id;
              return (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => setMode(option.id)}
                  className={cn(
                    "flex w-full items-center gap-3 rounded-md px-3 py-3 text-right transition-colors",
                    active
                      ? "bg-primary text-primary-foreground"
                      : "hover:bg-background",
                  )}
                >
                  <Icon className="size-4 shrink-0" />
                  <span className="min-w-0">
                    <span className="block text-xs font-black">
                      {option.label}
                    </span>
                    <span
                      className={cn(
                        "mt-0.5 block text-[10px]",
                        active
                          ? "text-primary-foreground/70"
                          : "text-muted-foreground",
                      )}
                    >
                      {option.helper}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>

          {mode === "patient-forms" ? (
            <div className="mt-6 border-t border-border pt-4">
              <div className="text-xs font-black text-muted-foreground">
                المريض الحالي
              </div>
              {selectedPatient ? (
                <div className="mt-2 rounded-md border border-border bg-background p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="truncate text-sm font-black">
                        {selectedPatient.fullName}
                      </div>
                      <div className="mt-1 text-[10px] text-muted-foreground">
                        رقم الملف: {selectedPatient.id}
                      </div>
                    </div>
                    <button
                      type="button"
                      aria-label="إلغاء اختيار المريض"
                      onClick={() => setSelectedPatient(null)}
                      className="text-muted-foreground hover:text-destructive"
                    >
                      <X className="size-4" />
                    </button>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="mt-3 h-8 w-full text-xs"
                    onClick={() => setPatientPickerOpen(true)}
                  >
                    تغيير المريض
                  </Button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setPatientPickerOpen(true)}
                  className="mt-2 flex w-full items-center gap-3 rounded-md border border-dashed border-border bg-background p-3 text-right hover:border-primary/50"
                >
                  <span className="flex size-9 items-center justify-center rounded-md bg-primary/10 text-primary">
                    <User className="size-4" />
                  </span>
                  <span>
                    <span className="block text-xs font-black">
                      اختيار مريض
                    </span>
                    <span className="mt-0.5 block text-[10px] text-muted-foreground">
                      مطلوب لفتح أي استمارة
                    </span>
                  </span>
                </button>
              )}
            </div>
          ) : null}
        </aside>

        <section className="min-w-0">
          <div className="flex flex-col gap-3 border-b border-border p-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-base font-black">
                {mode === "patient-forms"
                  ? "استمارات الفحص"
                  : "القوالب الأصلية الفارغة"}
              </h2>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {visibleItems.length} نموذج متاح
              </p>
            </div>
            <label className="relative block w-full sm:w-72">
              <Search className="absolute right-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <input
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="ابحث عن نموذج"
                className="h-9 w-full rounded-md border border-input bg-background pr-9 pl-3 text-xs outline-none focus:border-primary"
              />
            </label>
          </div>
          <div className="divide-y divide-border">
            {visibleItems.map((item) => (
              <div
                key={item.key}
                className="flex flex-col gap-3 p-4 transition-colors hover:bg-muted/20 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="flex min-w-0 items-start gap-3">
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-md border border-border bg-muted/30 text-primary">
                    <FileText className="size-5" />
                  </span>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-sm font-black">{item.title}</h3>
                      <Badge variant="outline" className="rounded text-[10px]">
                        {item.label}
                      </Badge>
                    </div>
                    <p className="mt-1 text-xs leading-5 text-muted-foreground">
                      {item.description}
                    </p>
                  </div>
                </div>
                <Button
                  type="button"
                  variant={mode === "patient-forms" ? "default" : "outline"}
                  size="sm"
                  className="h-9 shrink-0 gap-2"
                  onClick={() => openItem(item)}
                >
                  <ExternalLink className="size-3.5" />
                  {mode === "patient-forms" ? "فتح للمريض" : "معاينة القالب"}
                </Button>
              </div>
            ))}
            {visibleItems.length === 0 ? (
              <div className="p-12 text-center text-sm text-muted-foreground">
                لا توجد نماذج مطابقة للبحث.
              </div>
            ) : null}
          </div>
        </section>
      </div>

      {patientPickerOpen ? (
        <PatientPicker
          onSelect={(patient) => {
            setSelectedPatient({
              id: patient.id,
              fullName: patient.fullName || "مريض بدون اسم",
            });
            setPatientPickerOpen(false);
            toast.success(`تم تحديد المريض: ${patient.fullName || "مريض"}`);
          }}
        />
      ) : null}
    </div>
  );
}
