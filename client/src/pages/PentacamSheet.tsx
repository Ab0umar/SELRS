import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useLocation, useRoute } from "wouter";
import { useAppNavigation } from "@/hooks/useAppNavigation";
import PatientPicker from "@/components/PatientPicker";
import LocalPentacamExportsPanel from "@/components/LocalPentacamExportsPanel";
import PentacamFilesPanel from "@/components/PentacamFilesPanel";
import { FilterBar } from "@/components/shared/FilterBar";
import { isPentacamEligiblePatient } from "@/shared/pentacam";
import { ArrowRight, BookOpenText, ChevronLeft, FileSpreadsheet, Search, ShieldCheck } from "lucide-react";

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

function SummaryField({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl border border-border bg-muted px-4 py-3">
      <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">{label}</div>
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
          <p className="text-lg font-semibold text-foreground">ابحث برمز المريض</p>
          <p className="text-sm leading-6 text-muted-foreground">
            اكتب كود المريض لعرض صوره المرتبطة وبدء الربط بسرعة.
          </p>
        </div>
      </div>
    </div>
  );
}

export default function PentacamSheet() {
  const { isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();
  const { goBack } = useAppNavigation();
  const [, params] = useRoute("/sheets/:type/:id");
  const initialPatientId = params?.id ? Number(params.id) : undefined;

  const [selectedPatient, setSelectedPatient] = useState<PatientSummary | null>(null);
  const [locationType, setLocationType] = useState<"all" | "center" | "external">("all");
  const selectedPatientId = selectedPatient?.id ?? null;

  useEffect(() => {
    if (!isAuthenticated) {
      setLocation("/");
    }
  }, [isAuthenticated, setLocation]);

  const handleSelectPatient = (patient: PatientSummary) => {
    if (!isPentacamEligiblePatient(patient)) return;
    if (locationType !== "all" && patient.locationType && patient.locationType !== locationType) return;
    setSelectedPatient(patient);
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
            { label: "الكود", value: selectedPatient.patientCode ?? `#${selectedPatient.id}` },
            { label: "العمر", value: selectedPatient.age ? `${selectedPatient.age} سنة` : "—" },
            { label: "الهاتف", value: selectedPatient.phone ?? "—" },
            { label: "تاريخ الميلاد", value: formatDate(selectedPatient.dateOfBirth) },
            { label: "العنوان", value: selectedPatient.address ?? "—" },
          ]
        : [],
    [selectedPatient],
  );

  if (!isAuthenticated) return null;

  return (
    <div
      dir="rtl"
      className="relative min-h-screen overflow-hidden bg-gradient-to-b from-background to-muted/50 text-foreground"
    >
      <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute left-[-6rem] top-[-5rem] h-72 w-72 rounded-full bg-[radial-gradient(circle,rgba(37,99,235,0.08)_0%,transparent_72%)] blur-3xl" />
        <div className="absolute right-[-5rem] bottom-[-6rem] h-80 w-80 rounded-full bg-[radial-gradient(circle,rgba(255,107,53,0.09)_0%,transparent_72%)] blur-3xl" />
        <div className="absolute inset-0 bg-[linear-gradient(rgba(15,23,42,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(15,23,42,0.02)_1px,transparent_1px)] bg-[size:88px_88px] opacity-60 [mask-image:linear-gradient(180deg,rgba(0,0,0,0.6),transparent_88%)]" />
      </div>

      <main className="relative z-10 mx-auto flex min-h-screen max-w-7xl flex-col px-4 py-5 sm:px-6 lg:px-8 lg:py-6">
        <header className="mb-5 flex items-start justify-between gap-4">
          <div className="space-y-3">
            <button
              onClick={() => goBack()}
              className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              <ArrowRight className="h-4 w-4" />
              رجوع
            </button>
            <div className="space-y-1">
              <div className="inline-flex items-center gap-2 rounded-full border border-ring/30 bg-primary text-primary-foreground">
                <FileSpreadsheet className="h-3.5 w-3.5" />
                Pentacam Sheet
              </div>
              <h1 className="text-3xl font-black tracking-tight text-foreground sm:text-4xl">البنتاكام</h1>
              <p className="max-w-2xl text-sm leading-6 text-muted-foreground">
                ابحث برمز المريض، افحص الصور المرتبطة، ثم اربط الملفات الصحيحة بسجل المريض.
              </p>
            </div>
          </div>

          <div className="hidden items-center gap-2 rounded-full border border-success/30 bg-success/10 px-3 py-1 text-[11px] font-semibold text-success sm:inline-flex">
            <ShieldCheck className="h-3.5 w-3.5" />
            بحث بالكود وربط مباشر
          </div>
        </header>

        <div className="grid flex-1 gap-5 lg:grid-cols-[20rem_minmax(0,1fr)] xl:grid-cols-[22rem_minmax(0,1fr)]">
          <aside className="space-y-5">
            <section className="rounded-[1.5rem] border border-border bg-background p-4 shadow-[0_12px_32px_rgba(15,23,42,0.05)]">
              <div className="mb-4 flex items-center gap-2">
                <Search className="h-4 w-4 text-primary" />
                <h2 className="text-sm font-semibold text-foreground">البحث بالكود</h2>
              </div>
              <div className="mb-3">
                <FilterBar
                  filters={locationFilters.map((item) => ({ value: item.value, label: item.label }))}
                  selected={locationType}
                  onSelect={(value) => setLocationType(value as typeof locationType)}
                  className="w-full flex-wrap"
                />
              </div>
              <PatientPicker
                initialPatientId={selectedPatientId ?? initialPatientId}
                onSelect={handleSelectPatient}
                placeholder="ابحث برمز المريض"
                wrapperClassName="max-w-none ml-0"
                sheetType="pentacam"
                locationType={locationType === "all" ? undefined : locationType}
                allowPatient={(patient) =>
                  isPentacamEligiblePatient(patient) &&
                  (locationType === "all" || patient.locationType === locationType || !patient.locationType)
                }
              />
              <p className="mt-3 text-[11px] leading-5 text-muted-foreground">
                قاعدة البيانات تكبر باستمرار, لذلك البحث يبدأ بالكود مباشرة.
              </p>
            </section>

            <section className="rounded-[1.5rem] border border-border bg-background p-4 shadow-[0_12px_32px_rgba(15,23,42,0.05)]">
              <div className="mb-4 flex items-center gap-2">
                <BookOpenText className="h-4 w-4 text-primary" />
                <h2 className="text-sm font-semibold text-foreground">ملخص المريض</h2>
              </div>
              {selectedPatient ? (
                <div className="space-y-4">
                  <div>
                    <div className="text-lg font-bold text-foreground">{selectedPatient.fullName}</div>
                    <div className="mt-1 text-sm text-muted-foreground">
                      {selectedPatient.patientCode ?? `#${selectedPatient.id}`}
                    </div>
                  </div>
                  <div className="grid gap-3">
                    {summaryFields.map((field) => (
                      <SummaryField key={field.label} label={field.label} value={field.value} />
                    ))}
                  </div>
                </div>
              ) : (
                <div className="rounded-2xl border border-dashed border-border bg-muted px-4 py-6 text-sm leading-6 text-muted-foreground">
                  اختر مريضًا لعرض الكود والبيانات السريعة هنا.
                </div>
              )}
            </section>

            <section>
              <LocalPentacamExportsPanel
                patientId={selectedPatientId}
                active={true}
              />
            </section>
          </aside>

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
