import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useLocation, useRoute } from "wouter";
import { useAppNavigation } from "@/hooks/useAppNavigation";
import PatientPicker from "@/components/PatientPicker";
import LocalPentacamExportsPanel from "@/components/LocalPentacamExportsPanel";
import { FilterBar } from "@/components/shared/FilterBar";
import {
  ArrowRight,
  BookOpenText,
  FileSpreadsheet,
  FolderCog,
  Search,
  ShieldCheck,
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
  return date.toLocaleDateString("ar-EG");
}

function SummaryField({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-border bg-muted px-4 py-3">
      <div className="text-[13px] font-semibold uppercase text-muted-foreground">
        {label}
      </div>
      <div className="mt-1 text-sm font-medium text-foreground">{value}</div>
    </div>
  );
}

export type AdminPentacamLinkingProps = {
  embedded?: boolean;
  initialPatientId?: number;
  onSelectPatient?: (patient: PatientSummary | null) => void;
  onSwitchTab?: (tab: string) => void;
};

export default function AdminPentacamLinking({
  embedded = false,
  initialPatientId: propInitialPatientId,
  onSelectPatient,
  onSwitchTab,
}: AdminPentacamLinkingProps = {}) {
  const { isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();
  const { goBack } = useAppNavigation();
  const [, legacyParams] = useRoute("/admin/pentacam/:id");
  const [, hubParams] = useRoute("/admin-hub/pentacam-linking/:id");
  const rawInitialPatientId =
    propInitialPatientId ??
    (hubParams?.id
      ? Number(hubParams.id)
      : legacyParams?.id
        ? Number(legacyParams.id)
        : undefined);
  const initialPatientId =
    rawInitialPatientId != null &&
    Number.isFinite(rawInitialPatientId) &&
    rawInitialPatientId > 0
      ? rawInitialPatientId
      : undefined;

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
    onSelectPatient?.(patient);
    if (!embedded) {
      setLocation(`/admin-hub/pentacam-linking/${patient.id}`);
    }
  };

  useEffect(() => {
    if (!selectedPatient) return;
    if (locationType === "all") return;
    if (selectedPatient.locationType === locationType) return;
    setSelectedPatient(null);
    onSelectPatient?.(null);
  }, [locationType, selectedPatient, onSelectPatient]);

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
    <div dir="rtl" className="bg-background text-foreground">
      <main className="flex w-full flex-col">
        <header className="linking-header mb-5 border-b border-border pb-5">
          {/* Top row: back + badge */}
          {!embedded ? (
            <div className="mb-4 flex items-center justify-between gap-4">
              <Button variant="bare"
                type="button"
                onClick={() => goBack()}
                className="inline-flex min-h-11 items-center gap-2 rounded-md px-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
              >
                <ArrowRight className="h-4 w-4" />
                رجوع
              </Button>
              <div className="hidden min-h-11 items-center gap-2 rounded-full border border-success/30 bg-success/10 px-3 py-1 text-[13px] font-semibold text-success sm:inline-flex">
                <ShieldCheck className="h-3.5 w-3.5" />
                صفحة للإدارة فقط
              </div>
            </div>
          ) : null}

          {/* Main header row: title + search + summary */}
          <div className="linking-toolbar grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem] xl:grid-cols-[minmax(0,1fr)_26rem]">
            <div className="linking-introduction space-y-1">
              <div className="inline-flex items-center gap-2 rounded-full border border-ring/30 bg-primary px-2.5 py-1 text-xs font-semibold text-primary-foreground">
                <FolderCog className="h-3.5 w-3.5" />
                ربط إداري
              </div>
              <h1 className="text-2xl font-bold text-foreground sm:text-2xl">
                ربط صور البنتاكام
              </h1>
              <p className="text-sm leading-6 text-muted-foreground">
                اختر المريض، ثم استورد صور JPG المحلية أو أعد ربط الملفات غير
                المرتبطة.
              </p>
            </div>

            <div className="space-y-3">
              {/* Search */}
              <div className="linking-patient-search">
                <div className="mb-2 flex items-center gap-2">
                  <Search className="h-4 w-4 text-primary" />
                  <span className="text-sm font-semibold text-foreground">
                    البحث بالكود
                  </span>
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
                    className="w-full flex-wrap [&>button]:min-h-11"
                  />
                </div>
                <PatientPicker
                  initialPatientId={selectedPatientId ?? initialPatientId}
                  onSelect={handleSelectPatient}
                  placeholder="ابحث برمز المريض"
                  wrapperClassName="max-w-none me-0"
                  locationType={
                    locationType === "all" ? undefined : locationType
                  }
                  allowPatient={(patient) =>
                    locationType === "all" ||
                    patient.locationType === locationType ||
                    !patient.locationType ||
                    (initialPatientId != null &&
                      patient.id === initialPatientId)
                  }
                />
              </div>

              {/* Patient summary */}
              {selectedPatient ? (
                <div className="linking-patient-summary rounded-xl border border-border bg-muted/50 p-3">
                  <div className="mb-2 flex items-center gap-2">
                    <BookOpenText className="h-4 w-4 text-primary" />
                    <span className="text-sm font-semibold text-foreground">
                      ملخص المريض
                    </span>
                    {selectedPatientId && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="ms-auto h-7 px-2 text-xs"
                        onClick={() => {
                          if (onSwitchTab) {
                            onSwitchTab("sheet");
                          } else {
                            setLocation(
                              `/sheets/pentacam/${selectedPatientId}`,
                            );
                          }
                        }}
                      >
                        <FileSpreadsheet className="me-1 h-3.5 w-3.5" />
                        عرض JPG
                      </Button>
                    )}
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <div className="font-bold text-foreground">
                        {selectedPatient.fullName}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {selectedPatient.patientCode ??
                          `#${selectedPatient.id}`}
                      </div>
                    </div>
                  </div>
                  <div className="linking-summary-fields mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
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
            <LocalPentacamExportsPanel patientId={selectedPatientId} active />
          </section>
        </div>
      </main>
    </div>
  );
}
