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
