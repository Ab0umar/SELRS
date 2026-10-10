import { useEffect, useMemo, useState } from "react";
import { useLocation } from "wouter";
import PatientPicker from "@/components/PatientPicker";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertCircle,
  CheckCircle2,
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
  const [location, setLocation] = useLocation();
  const [selectedPatient, setSelectedPatient] = useState<PickedPatient | null>(
    null,
  );
  const [patientPickerOpen, setPatientPickerOpen] = useState(false);
  const routeMode: WorkspaceMode =
    location.replace(/\/$/, "") === "/admin-hub/sheet-copies"
      ? "blank-copies"
      : "patient-forms";
  const [mode, setMode] = useState<WorkspaceMode>(routeMode);
  const [searchQuery, setSearchQuery] = useState("");
  const [feedback, setFeedback] = useState<{
    kind: "error" | "success";
    message: string;
  } | null>(null);

  useEffect(() => {
    setMode(routeMode);
    setSearchQuery("");
  }, [routeMode]);

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
      setFeedback(null);
      setLocation((item as (typeof BLANK_COPIES)[number]).path);
      return;
    }
    if (!selectedPatient) {
      const message = "اختر مريضًا أولًا لفتح الشيت المخصص له.";
      setFeedback({ kind: "error", message });
      toast.error(message);
      setPatientPickerOpen(true);
      return;
    }
    const patientItem = item as (typeof SHEET_LINKS)[number];
    setFeedback(null);
    setLocation(withOriginalFlag(patientItem.path(selectedPatient.id)));
  };

  const changeMode = (nextMode: WorkspaceMode) => {
    setMode(nextMode);
    setSearchQuery("");
    const nextPath =
      nextMode === "blank-copies"
        ? "/admin-hub/sheet-copies"
        : location.replace(/\/$/, "") === "/admin-hub/sheets"
          ? "/admin-hub/sheets"
          : "/admin-hub/forms";
    if (location.replace(/\/$/, "") !== nextPath) {
      setLocation(nextPath);
    }
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

      {feedback ? (
        <div
          className={cn(
            "flex items-start gap-2 rounded-md border px-3 py-2 text-sm",
            feedback.kind === "error"
              ? "border-destructive/40 bg-destructive/5 text-foreground"
              : "border-success/40 bg-success/5 text-foreground",
          )}
          role={feedback.kind === "error" ? "alert" : "status"}
          aria-live={feedback.kind === "error" ? "assertive" : "polite"}
          aria-atomic="true"
        >
          {feedback.kind === "error" ? (
            <AlertCircle className="mt-0.5 size-4 shrink-0 text-destructive" />
          ) : (
            <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-success" />
          )}
          <span>{feedback.message}</span>
        </div>
      ) : null}

      <div className="grid min-h-[620px] rounded-lg border border-border bg-background lg:grid-cols-[280px_minmax(0,1fr)]">
        <aside className="border-b border-border bg-muted/20 p-4 lg:border-b-0 lg:border-l">
          <div className="text-xs font-black text-muted-foreground">
            طريقة العرض
          </div>
          <div
            className="mt-2 space-y-1"
            role="tablist"
            aria-label="طريقة عرض ملفات الفحص"
          >
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
                  role="tab"
                  aria-selected={active}
                  aria-controls="admin-sheets-panel"
                  id={`admin-sheets-tab-${option.id}`}
                  onClick={() => changeMode(option.id)}
                  className={cn(
                    "flex min-h-11 w-full items-center gap-3 rounded-md px-3 py-3 text-right transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
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
                        "mt-0.5 block text-xs",
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
                      <div className="break-words text-sm font-black">
                        {selectedPatient.fullName}
                      </div>
                      <div className="mt-1 text-xs text-muted-foreground">
                        رقم الملف: {selectedPatient.id}
                      </div>
                    </div>
                    <button
                      type="button"
                      aria-label="إلغاء اختيار المريض"
                      onClick={() => {
                        setSelectedPatient(null);
                        setFeedback(null);
                      }}
                      className="flex size-11 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-destructive focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
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
                  className="mt-2 flex min-h-11 w-full items-center gap-3 rounded-md border border-dashed border-border bg-background p-3 text-right hover:border-primary/50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                >
                  <span className="flex size-9 items-center justify-center rounded-md bg-primary/10 text-primary">
                    <User className="size-4" />
                  </span>
                  <span>
                    <span className="block text-xs font-black">
                      اختيار مريض
                    </span>
                    <span className="mt-0.5 block text-xs text-muted-foreground">
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
                <span aria-live="polite" aria-atomic="true">
                  {visibleItems.length} نموذج متاح
                </span>
              </p>
            </div>
            <label
              htmlFor="admin-sheet-search"
              className="relative block w-full sm:w-72"
            >
              <span className="sr-only">البحث في النماذج</span>
              <Search className="absolute right-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <input
                id="admin-sheet-search"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="ابحث عن نموذج"
                className="h-11 w-full rounded-md border border-input bg-background pr-9 pl-3 text-sm outline-none focus:border-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
              />
            </label>
          </div>
          <div
            id="admin-sheets-panel"
            role="tabpanel"
            aria-labelledby={`admin-sheets-tab-${mode}`}
            className="divide-y divide-border"
          >
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
                      <Badge variant="outline" className="rounded text-xs">
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
                  className="h-11 w-full shrink-0 gap-2 sm:w-auto"
                  onClick={() => openItem(item)}
                >
                  <ExternalLink className="size-3.5" />
                  {mode === "patient-forms" ? "فتح للمريض" : "معاينة القالب"}
                </Button>
              </div>
            ))}
            {visibleItems.length === 0 ? (
              <div
                className="flex flex-col items-center gap-3 p-12 text-center text-sm text-muted-foreground"
                role="status"
                aria-live="polite"
              >
                <p>
                  {searchQuery.trim()
                    ? "لا توجد نماذج مطابقة للبحث."
                    : "لا توجد نماذج متاحة حاليًا."}
                </p>
                {searchQuery.trim() ? (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setSearchQuery("")}
                  >
                    مسح البحث
                  </Button>
                ) : null}
              </div>
            ) : null}
          </div>
        </section>
      </div>

      <Dialog open={patientPickerOpen} onOpenChange={setPatientPickerOpen}>
        <DialogContent
          dir="rtl"
          className="max-h-[calc(100dvh-2rem)] overflow-y-auto"
        >
          <DialogHeader className="text-right sm:text-right">
            <DialogTitle>اختيار مريض</DialogTitle>
            <DialogDescription>
              ابحث بالاسم أو رقم الملف، ثم اختر المريض لفتح الاستمارة المناسبة.
            </DialogDescription>
          </DialogHeader>
          <PatientPicker
            wrapperClassName="max-w-none"
            onSelect={(patient) => {
              const patientName = patient.fullName || "مريض بدون اسم";
              setSelectedPatient({
                id: patient.id,
                fullName: patientName,
              });
              setPatientPickerOpen(false);
              setFeedback({
                kind: "success",
                message: `تم تحديد المريض: ${patientName}`,
              });
              toast.success(`تم تحديد المريض: ${patient.fullName || "مريض"}`);
            }}
          />
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setPatientPickerOpen(false)}
            >
              إلغاء
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
