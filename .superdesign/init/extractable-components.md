# Extractable report components / DraftComponents

## 1. `ClinicalReportFrame` — highest-confidence extraction

This existing component is the shared report chrome for most forms: title/description, optional patient search, action row, A4/print wrapper, and branded document header/footer slots. Keep it as the base DraftComponent.

### `client/src/components/reports/ClinicalReportFrame.tsx`

```tsx
import type { ReactNode } from "react";
import { displaySheetDate } from "@/lib/sheetDates";

type PatientDetails = {
  name?: ReactNode;
  code?: ReactNode;
  age?: ReactNode;
  birthDate?: string | null;
  phone?: ReactNode;
  occupation?: ReactNode;
};

interface ClinicalReportFrameProps {
  title: string;
  generatedDate?: string;
  patient: PatientDetails;
  sidePanel?: ReactNode;
  children: ReactNode;
  signatureLabel?: string;
  dir?: "rtl" | "ltr";
  className?: string;
}

function Detail({
  label,
  value,
  className = "",
}: {
  label: string;
  value: ReactNode;
  className?: string;
}) {
  return (
    <div className={`min-w-0 ${className}`}>
      <p className="mb-1 text-xs font-bold uppercase text-muted-foreground">
        {label}
      </p>
      <div className="min-w-0 truncate text-center text-base font-bold">
        {value || "—"}
      </div>
    </div>
  );
}

function ReportTitle({ title }: { title: string }) {
  const [englishTitle, arabicTitle] = title
    .split("|")
    .map((part) => part.trim());
  return (
    <h1 className="flex items-center gap-2 text-xl font-extrabold uppercase tracking-tight text-foreground">
      <span dir="ltr">{englishTitle}</span>
      {arabicTitle ? (
        <>
          <span aria-hidden>|</span>
          <span dir="rtl">{arabicTitle}</span>
        </>
      ) : null}
    </h1>
  );
}

export function ClinicalReportFrame({
  title,
  generatedDate = new Date().toISOString().split("T")[0],
  patient,
  sidePanel,
  children,
  signatureLabel = "توقيع الطبيب المعالج",
  dir = "rtl",
  className = "",
}: ClinicalReportFrameProps) {
  return (
    <main
      className={`clinical-report-frame medical-report-page mx-auto max-w-[210mm] bg-background p-4 text-foreground sm:p-8 ${className}`}
      dir={dir}
    >
      <style>{`
        @media print {
          /* Page margins + sheet structure come from medical-report-brand.css.
             Keep print layout = screen preview (no zoom/scale/width hacks). */
          html, body {
            min-height: 0 !important;
            height: auto !important;
            margin: 0 !important;
            padding: 0 !important;
            overflow: visible !important;
            background: white !important;
          }
          main.clinical-report-frame {
            box-sizing: border-box !important;
            display: block !important;
            width: auto !important;
            min-width: 0 !important;
            max-width: none !important;
            min-height: 0 !important;
            height: auto !important;
            margin: 0 !important;
            padding: 0 !important;
            border: 0 !important;
            border-radius: 0 !important;
            box-shadow: none !important;
            background: white !important;
          }
          main.clinical-report-frame > div {
            position: static !important;
            box-sizing: border-box !important;
            width: 100% !important;
            margin: 0 !important;
            /* Keep content padding similar to screen (sm:p-8); do not zoom */
            padding: 8mm !important;
            border: 0 !important;
            border-radius: 0 !important;
            box-shadow: none !important;
            zoom: 1 !important;
            transform: none !important;
          }
          /* Hide empty field chrome only — do not restyle typography/spacing */
          main.clinical-report-frame input::placeholder,
          main.clinical-report-frame textarea::placeholder {
            color: transparent !important;
            opacity: 0 !important;
          }
          main.clinical-report-frame [data-placeholder] {
            color: transparent !important;
          }
          main.clinical-report-frame input[type="date"][value=""]::-webkit-datetime-edit,
          main.clinical-report-frame input[type="date"]:not([value])::-webkit-datetime-edit {
            color: transparent !important;
          }
          main.clinical-report-frame input[type="date"][value=""]::-webkit-calendar-picker-indicator,
          main.clinical-report-frame input[type="date"]:not([value])::-webkit-calendar-picker-indicator {
            visibility: hidden !important;
          }
        }
      `}</style>
      <div className="rounded-xl border border-border/60 bg-card p-4 sm:p-8 print:rounded-none print:border-0 print:shadow-none">
        <header className="mb-6 flex items-start justify-between border-b-2 border-primary pb-4">
          <div />
          <div className="text-left" dir="ltr">
            <ReportTitle title={title} />
            <p className="text-xs text-muted-foreground">
              Generated: {displaySheetDate(generatedDate)}
            </p>
          </div>
        </header>

        <section className="mb-4 grid grid-cols-12 gap-3" dir="rtl">
          <div
            className={`${sidePanel ? "col-span-8" : "col-span-12"} grid grid-cols-12 content-center gap-x-3 gap-y-2 rounded-lg border border-border/60 bg-muted/40 px-3 py-2 text-center`}
          >
            <Detail
              label="اسم المريض:"
              value={patient.name}
              className="col-span-6"
            />
            <Detail
              label="الكود:"
              value={patient.code}
              className="col-span-3"
            />
            <Detail label="السن:" value={patient.age} className="col-span-3" />
            <Detail
              label="تاريخ الميلاد:"
              value={
                patient.birthDate ? displaySheetDate(patient.birthDate) : "—"
              }
              className="col-span-5"
            />
            <Detail
              label="موبايل:"
              value={patient.phone}
              className="col-span-4"
            />
            <Detail
              label="الوظيفة:"
              value={patient.occupation}
              className="col-span-3"
            />
          </div>
          {sidePanel ? (
            <aside className="col-span-4 flex flex-col gap-2">
              {sidePanel}
            </aside>
          ) : null}
        </section>

        <div className="clinical-report-content">{children}</div>

        <footer className="mt-8 flex items-end justify-between border-t border-border/60 pt-4">
          <div />
          <div className="w-48 text-center">
            <div className="mb-1 h-10 border-b border-border" />
            <p className="text-[10px] uppercase text-muted-foreground">
              {signatureLabel}
            </p>
          </div>
        </footer>
      </div>
    </main>
  );
}
```

## 2. Shared report chrome candidates

- Report header: navy brand strip, Arabic clinic identity, report title, date and patient metadata. Consolidate repeated markup across the five form tabs.
- Action cluster: save / print / download buttons with `print:hidden`; standardize icon order and Arabic labels.
- Patient context row: selected patient name/code, clear action, and optional picker. Keep route/query synchronization in the page controller.
- OD/OS grid: extract repeated right-eye/left-eye labels and bordered value cells.
- Signature/footer: print-only physician/signature/date blocks with A4-safe spacing.

## 3. Patient picker candidates

`PatientPicker` is shared by the hub and every form. Its search field, results, loading/empty/error states, and selected-patient callback can become a controlled `PatientPickerField` DraftComponent. Preserve `initialPatientId`, `onSelect`, label, and placeholder props; the hub owns patient id and URL updates.

### `client/src/components/PatientPicker.tsx`

```tsx
import { useEffect, useRef, useState } from "react";
import { Input } from "@/components/ui/input";
import { trpc } from "@/lib/trpc";
import { Search, UserRound } from "lucide-react";

type PatientOption = {
  id: number;
  fullName: string;
  patientCode?: string | null;
  locationType?: "center" | "external" | null;
  phone?: string | null;
  age?: number | null;
  dateOfBirth?: string | Date | null;
  address?: string | null;
};

type PatientPickerProps = {
  label?: string;
  placeholder?: string;
  initialPatientId?: number;
  onSelect: (patient: PatientOption) => void;
  /** When false, fetching `initialPatientId` still fills the picker UI but does not call `onSelect` (avoids duplicate navigation/sync with route-driven parents). Default true for backward compatibility. */
  fireOnInitialPatientLoad?: boolean;
  readOnly?: boolean;
  sheetType?: "consultant" | "specialist" | "lasik" | "external" | "pentacam";
  locationType?: "center" | "external";
  wrapperClassName?: string;
  allowPatient?: (patient: PatientOption) => boolean;
  locale?: "ar" | "en";
};

export default function PatientPicker({
  label = "اختر المريض",
  placeholder = "ابحث بالاسم أو الكود أو الموبايل…",
  initialPatientId,
  onSelect,
  fireOnInitialPatientLoad = true,
  readOnly = false,
  sheetType,
  locationType,
  wrapperClassName,
  allowPatient,
  locale = "ar",
}: PatientPickerProps) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<PatientOption | null>(null);
  const hydratedPatientIdRef = useRef<number | null>(null);

  useEffect(() => {
    hydratedPatientIdRef.current = null;
  }, [initialPatientId]);

  const patientQuery = trpc.patient.getPatient.useQuery(initialPatientId ?? 0, {
    enabled: Boolean(initialPatientId),
  });

  const normalizedQuery = query.replace(/\s+/g, " ").trim();

  const searchQuery = trpc.medical.searchPatients.useQuery(
    { searchTerm: normalizedQuery, sheetType, locationType },
    {
      enabled: normalizedQuery.length >= 1,
      refetchOnWindowFocus: false,
    },
  );

  useEffect(() => {
    if (!initialPatientId || !patientQuery.data) return;
    const patient = patientQuery.data as unknown as PatientOption;
    if (patient.id !== initialPatientId) return;
    if (hydratedPatientIdRef.current === patient.id) return;
    if (allowPatient && !allowPatient(patient)) {
      setSelected(null);
      setQuery("");
      setOpen(false);
      return;
    }
    hydratedPatientIdRef.current = patient.id;
    setSelected(patient);
    setQuery(patient.fullName ?? "");
    if (fireOnInitialPatientLoad) {
      onSelect(patient);
    }
  }, [
    patientQuery.data,
    initialPatientId,
    fireOnInitialPatientLoad,
    onSelect,
    allowPatient,
  ]);

  const results = (searchQuery.data ?? []) as PatientOption[];
  const filteredResults = allowPatient ? results.filter(allowPatient) : results;

  const formatPhone = (value?: string | null) => {
    if (!value) return "";
    const digits = value.replace(/\D+/g, "");
    if (digits.length === 11) {
      return `${digits.slice(0, 3)} ${digits.slice(3, 7)} ${digits.slice(7)}`;
    }
    return value;
  };

  const isEnglish = locale === "en";

  return (
    <div dir={isEnglish ? "ltr" : "rtl"} className="space-y-2">
      <label className="block text-sm font-medium hidden">{label}</label>
      <div
        className={`relative w-full max-w-md ml-auto ${wrapperClassName ?? ""}`}
      >
        <div
          className={`pointer-events-none absolute inset-y-0 flex items-center gap-2 text-muted-foreground ${isEnglish ? "left-3" : "right-3"}`}
        >
          <Search className="h-4 w-4" />
        </div>
        <Input
          value={query}
          onChange={(e) => {
            if (readOnly) return;
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => {
            if (readOnly) return;
            setOpen(true);
          }}
          onBlur={() => {
            if (readOnly) return;
            setTimeout(() => setOpen(false), 150);
          }}
          placeholder={placeholder}
          className={`h-11 rounded-2xl border-border bg-background shadow-sm transition-colors focus-visible:border-primary focus-visible:ring-primary/25 ${isEnglish ? "pl-10 text-left" : "pr-10 text-right"}`}
          dir={isEnglish ? "ltr" : "rtl"}
          readOnly={readOnly}
        />
      </div>
      {!readOnly && open && normalizedQuery.length >= 1 && (
        <div className="max-h-64 overflow-y-auto rounded-2xl border border-border bg-popover shadow-lg">
          {searchQuery.isLoading && (
            <div className="px-3 py-2 text-sm text-muted-foreground">
              {isEnglish ? "Searching..." : "جاري البحث..."}
            </div>
          )}
          {!searchQuery.isLoading && filteredResults.length === 0 && (
            <div className="px-3 py-2 text-sm text-muted-foreground">
              {isEnglish ? "No results found" : "لا توجد نتائج"}
            </div>
          )}
          {filteredResults.map((patient) => (
            <button
              key={patient.id}
              type="button"
              className={`w-full px-3 py-3 transition-colors hover:bg-accent ${isEnglish ? "text-left" : "text-right"}`}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => {
                if (allowPatient && !allowPatient(patient)) return;
                setSelected(patient);
                setQuery(patient.fullName ?? "");
                setOpen(false);
                onSelect(patient);
              }}
            >
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <span className="rounded-full border border-border bg-muted p-1.5 text-muted-foreground">
                    <UserRound className="h-3.5 w-3.5" />
                  </span>
                  <span dir="auto" className="font-medium">
                    {patient.fullName}
                  </span>
                </div>
                <span className="text-xs text-muted-foreground" dir="ltr">
                  {patient.patientCode ?? "—"}
                </span>
              </div>
              {patient.phone && (
                <div className="text-xs text-muted-foreground" dir="ltr">
                  {formatPhone(patient.phone)}
                </div>
              )}
            </button>
          ))}
        </div>
      )}
      {selected && (
        <div className="hidden rounded-2xl border border-border bg-muted px-3 py-2 text-xs text-muted-foreground">
          {isEnglish ? "Selected patient:" : "المريض المحدد:"}{" "}
          <span dir="auto" className="font-medium">
            {selected.fullName}
          </span>
        </div>
      )}
    </div>
  );
}
```

## 4. Extraction boundaries

Do not move tRPC calls, form mutation state, route parsing, or print/download side effects into presentational DraftComponents. Pass patient, report metadata, sections, and callbacks down while preserving Arabic RTL and A4 print behavior.
