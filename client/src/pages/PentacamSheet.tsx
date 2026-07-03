import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useLocation, useRoute } from "wouter";
import { useAppNavigation } from "@/hooks/useAppNavigation";
import PatientPicker from "@/components/PatientPicker";
import PentacamFilesPanel from "@/components/PentacamFilesPanel";
import { FilterBar } from "@/components/shared/FilterBar";
import {
  ArrowRight,
  BookOpenText,
  FileSpreadsheet,
  Search,
  ShieldCheck,
  FolderCog,
} from "lucide-react";
import { Button } from "@/components/ui/button";

type PatientSummary = {
  id: number;
  fullName: string;
  patientCode?: string | null;
  locationType?: "center" | "external" | null;
  phone?: string | null;
  age?: number | null;
  dateOfBirth?: string | Date | null;
  address?: string | null;
};

const locationFilters = [
  { value: "all", label: "الكل" },
  { value: "center", label: "المركز" },
  { value: "external", label: "الخارجي" },
] as const;

function formatDate(value?: string | Date | null) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.valueOf())) return String(value);
  return date.toLocaleDateString();
}

function SummaryField({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-border bg-muted px-4 py-3">
      <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
        {label}
      </div>
      <div className="mt-1 text-sm font-medium text-foreground">{value}</div>
    </div>
  );
}

function EmptyPanel() {
  return (
    <div className="flex h-full min-h-[24rem] items-center justify-center rounded-[1.5rem] border border-dashed border-border bg-background px-6 py-10 text-center">
      <div className="max-w-sm space-y-3">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
          <Search className="h-6 w-6" />
        </div>
        <div className="space-y-1">
          <p className="text-lg font-semibold text-foreground">
            ابحث برمز المريض
          </p>
          <p className="text-sm leading-6 text-muted-foreground">
            اكتب كود المريض لعرض صور JPG المرتبطة ومراجعتها بسرعة.
          </p>
        </div>
      </div>
    </div>
  );
}

export default function PentacamSheet() {
  const { user, isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();
  const { goBack } = useAppNavigation();
  const [, params] = useRoute("/sheets/:type/:id");
  const initialPatientId = params?.id ? Number(params.id) : undefined;

  const [selectedPatient, setSelectedPatient] = useState<PatientSummary | null>(
    null,
  );
  const [locationType, setLocationType] = useState<
    "all" | "center" | "external"
  >("all");
  const selectedPatientId = selectedPatient?.id ?? null;

  useEffect(() => {
    if (!isAuthenticated) {
      setLocation("/");
    }
  }, [isAuthenticated, setLocation]);

  const handleSelectPatient = (patient: PatientSummary) => {
    if (
      locationType !== "all" &&
      patient.locationType &&
      patient.locationType !== locationType
    )
      return;
    setSelectedPatient(patient);
    setLocation(`/sheets/pentacam/${patient.id}`);
  };

  useEffect(() => {
    if (!selectedPatient) return;
    if (locationType === "all") return;
    if (selectedPatient.locationType === locationType) return;
    setSelectedPatient(null);
  }, [locationType, selectedPatient]);

  const summaryFields = useMemo(
    () =>
      selectedPatient
        ? [
            {
              label: "الكود",
              value: selectedPatient.patientCode ?? `#${selectedPatient.id}`,
            },
            {
              label: "العمر",
              value: selectedPatient.age ? `${selectedPatient.age} سنة` : "—",
            },
            { label: "الهاتف", value: selectedPatient.phone ?? "—" },
            {
              label: "تاريخ الميلاد",
              value: formatDate(selectedPatient.dateOfBirth),
            },
            { label: "العنوان", value: selectedPatient.address ?? "—" },
          ]
        : [],
    [selectedPatient],
  );

  if (!isAuthenticated) return null;

  return (
    <div
      dir="rtl"
      className="relative min-h-screen bg-background text-foreground"
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-24 border-b border-border/40 bg-muted/20"
      />

      <main className="relative z-10 flex min-h-screen w-full flex-col px-4 py-5 sm:px-6 lg:px-8 lg:py-6">
        <header className="mb-5 rounded-[1.5rem] border border-border bg-background/95 px-4 py-4 shadow-xl shadow-primary/5">
          {/* Top row: back + badge */}
          <div className="mb-4 flex items-center justify-between gap-4">
            <button
              onClick={() => goBack()}
              className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              <ArrowRight className="h-4 w-4" />
              رجوع
            </button>
            <div className="hidden items-center gap-2 rounded-full border border-success/30 bg-success/10 px-3 py-1 text-[11px] font-semibold text-success sm:inline-flex">
              <ShieldCheck className="h-3.5 w-3.5" />
              عرض JPG فقط
            </div>
          </div>

          {/* Main header row: title + search + summary */}
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem] xl:grid-cols-[minmax(0,1fr)_26rem]">
            <div className="space-y-1">
              <div className="inline-flex items-center gap-2 rounded-full border border-ring/30 bg-primary px-2.5 py-1 text-xs font-semibold text-primary-foreground">
                <FileSpreadsheet className="h-3.5 w-3.5" />
                عرض JPG
              </div>
              <h1 className="text-3xl font-black tracking-tight text-foreground sm:text-4xl">
                البنتاكام
              </h1>
              <p className="text-sm leading-6 text-muted-foreground">
                افتح المريض الصحيح، وراجع صور JPG المرتبطة بسرعة.
              </p>
            </div>

            <div className="space-y-3">
              {/* Search */}
              <div>
                <div className="mb-2 flex items-center gap-2">
                  <Search className="h-4 w-4 text-primary" />
                  <span className="text-sm font-semibold text-foreground">البحث بالكود</span>
                </div>
                <div className="mb-2">
                  <FilterBar
                    filters={locationFilters.map((item) => ({
                      value: item.value,
                      label: item.label,
                    }))}
                    selected={locationType}
                    onSelect={(value) =>
                      setLocationType(value as typeof locationType)
                    }
                    className="w-full flex-wrap"
                  />
                </div>
                <PatientPicker
                  initialPatientId={selectedPatientId ?? initialPatientId}
                  onSelect={handleSelectPatient}
                  placeholder="ابحث برمز المريض"
                  wrapperClassName="max-w-none ml-0"
                  locationType={locationType === "all" ? undefined : locationType}
                  allowPatient={(patient) =>
                    locationType === "all" ||
                    patient.locationType === locationType ||
                    !patient.locationType ||
                    (initialPatientId != null && patient.id === initialPatientId)
                  }
                />
              </div>

              {/* Patient summary */}
              {selectedPatient ? (
                <div className="rounded-2xl border border-border bg-muted/50 p-3">
                  <div className="mb-2 flex items-center gap-2">
                    <BookOpenText className="h-4 w-4 text-primary" />
                    <span className="text-sm font-semibold text-foreground">ملخص المريض</span>
                    {user?.role === "admin" && selectedPatientId && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="mr-auto h-7 px-2 text-xs"
                        onClick={() =>
                          setLocation(`/admin/pentacam/${selectedPatientId}`)
                        }
                      >
                        <FolderCog className="ml-1 h-3.5 w-3.5" />
                        صفحة الربط
                      </Button>
                    )}
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <div className="font-bold text-foreground">{selectedPatient.fullName}</div>
                      <div className="text-xs text-muted-foreground">
                        {selectedPatient.patientCode ?? `#${selectedPatient.id}`}
                      </div>
                    </div>
                  </div>
                  <div className="mt-2 grid grid-cols-2 gap-2">
                    {summaryFields.map((field) => (
                      <SummaryField
                        key={field.label}
                        label={field.label}
                        value={field.value}
                      />
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        </header>

        <div className="flex-1">
          <section className="min-h-0">
            {selectedPatientId ? (
              <PentacamFilesPanel patientId={selectedPatientId} active />
            ) : (
              <EmptyPanel />
            )}
          </section>
        </div>
      </main>
    </div>
  );
}
