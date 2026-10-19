import { useEffect, useId, useRef, useState } from "react";
import { Input } from "@/components/ui/input";
import { trpc } from "@/lib/trpc";
import { Search } from "lucide-react";
import PatientPickerResults, {
  type PatientOption,
} from "./PatientPickerResults";
import { getPatientOptionId, getNextActiveIndex } from "./patient-picker-utils";

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
  const baseId = useId();
  const inputId = `${baseId}-input`;
  const labelId = `${baseId}-label`;
  const listboxId = `${baseId}-listbox`;

  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<PatientOption | null>(null);
  const [activeIndex, setActiveIndex] = useState(-1);
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

  const isEnglish = locale === "en";
  const listVisible = !readOnly && open && normalizedQuery.length >= 1;

  const selectPatient = (patient: PatientOption) => {
    if (allowPatient && !allowPatient(patient)) return;
    setSelected(patient);
    setQuery(patient.fullName ?? "");
    setOpen(false);
    setActiveIndex(-1);
    onSelect(patient);
  };

  // Results changed: drop any stale highlight so it never points at a
  // different patient than the one under it before (APG manual selection).
  useEffect(() => {
    setActiveIndex(-1);
  }, [normalizedQuery, searchQuery.data]);

  // Keep the highlighted option visible while arrowing through long lists.
  useEffect(() => {
    if (!listVisible) return;
    const patient = filteredResults[activeIndex];
    if (!patient) return;
    document
      .getElementById(getPatientOptionId(listboxId, patient.id))
      ?.scrollIntoView({ block: "nearest" });
  }, [activeIndex, listVisible]);

  // Input's useComposition wrapper already swallows Enter during IME
  // composition, so it is not re-checked here.
  const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (readOnly) return;
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      if (!listVisible && normalizedQuery.length >= 1) setOpen(true);
      if (filteredResults.length > 0) {
        setActiveIndex(
          getNextActiveIndex(activeIndex, e.key, filteredResults.length),
        );
      }
      return;
    }
    // Without a highlighted option the default stays, so pages wrapping the
    // picker in a <form> keep their Enter behaviour.
    if (e.key === "Enter") {
      if (listVisible && filteredResults[activeIndex]) {
        e.preventDefault();
        selectPatient(filteredResults[activeIndex]);
      }
      return;
    }
    if (e.key === "Escape" && listVisible) {
      e.preventDefault();
      setOpen(false);
      setActiveIndex(-1);
    }
  };

  return (
    <div dir={isEnglish ? "ltr" : "rtl"} className="space-y-2">
      <label id={labelId} htmlFor={inputId} className="sr-only">
        {label}
      </label>
      <div
        className={`relative w-full max-w-md ml-auto ${wrapperClassName ?? ""}`}
      >
        <div
          className={`pointer-events-none absolute inset-y-0 flex items-center gap-2 text-muted-foreground ${isEnglish ? "left-3" : "right-3"}`}
        >
          <Search className="h-4 w-4" />
        </div>
        <Input
          id={inputId}
          value={query}
          onChange={(e) => {
            if (readOnly) return;
            setQuery(e.target.value);
            setOpen(true);
            setActiveIndex(-1);
          }}
          onFocus={() => {
            if (readOnly) return;
            setOpen(true);
          }}
          onBlur={() => {
            if (readOnly) return;
            // The results popup's onMouseDown preventDefault keeps focus on
            // the input during pointer interaction, so no timeout race.
            setOpen(false);
            setActiveIndex(-1);
          }}
          onKeyDown={handleInputKeyDown}
          placeholder={placeholder}
          className={`h-11 rounded-2xl border-border bg-background shadow-sm transition-colors focus-visible:border-primary focus-visible:ring-primary/25 ${isEnglish ? "pl-10 text-left" : "pr-10 text-right"}`}
          dir={isEnglish ? "ltr" : "rtl"}
          readOnly={readOnly}
          role="combobox"
          aria-autocomplete="list"
          aria-expanded={listVisible}
          aria-controls={listVisible ? listboxId : undefined}
          aria-activedescendant={
            listVisible && filteredResults[activeIndex]
              ? getPatientOptionId(listboxId, filteredResults[activeIndex].id)
              : undefined
          }
          autoComplete="off"
        />
      </div>
      {listVisible && (
        <PatientPickerResults
          listboxId={listboxId}
          labelId={labelId}
          patients={filteredResults}
          activeIndex={activeIndex}
          isLoading={searchQuery.isLoading}
          isEnglish={isEnglish}
          onSelectPatient={selectPatient}
          onActiveIndexChange={setActiveIndex}
        />
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
