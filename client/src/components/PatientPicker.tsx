import { useEffect, useId, useRef, useState } from "react";
import { Input } from "@/components/ui/input";
import { trpc } from "@/lib/trpc";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import {
  getPatientSearchGate,
  normalizePatientSearchTerm,
  PATIENT_SEARCH_DEBOUNCE_MS,
} from "@/lib/patientSearchGate";
import { Search, X } from "lucide-react";
import {
  getPatientOptionId,
  resolveComboboxKey,
} from "@/components/patientPickerCombobox";
import PatientPickerResults, {
  type PatientOption,
} from "@/components/PatientPickerResults";

type PatientPickerProps = {
  label?: string;
  placeholder?: string;
  initialPatientId?: number;
  onSelect: (patient: PatientOption) => void;
  /** Called after the clear button has reset the query and selection. */
  onClear?: () => void;
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
  onClear,
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
  const isEnglish = locale === "en";

  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<PatientOption | null>(null);
  const [activeIndex, setActiveIndex] = useState(-1);
  const hydratedPatientIdRef = useRef<number | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    hydratedPatientIdRef.current = null;
  }, [initialPatientId]);

  const patientQuery = trpc.patient.getPatient.useQuery(initialPatientId ?? 0, {
    enabled: Boolean(initialPatientId),
  });

  const normalizedQuery = normalizePatientSearchTerm(query);
  const debouncedQuery = useDebouncedValue(
    normalizedQuery,
    PATIENT_SEARCH_DEBOUNCE_MS,
  );
  const searchGate = getPatientSearchGate(normalizedQuery, debouncedQuery);

  const searchQuery = trpc.medical.searchPatients.useQuery(
    { searchTerm: debouncedQuery, sheetType, locationType },
    {
      enabled: searchGate.shouldFetch,
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

  // The popup opens from the first character (hint row); the listbox itself
  // needs the gate minimum and at least one result, so aria-controls never
  // points at a missing id.
  const isPopupVisible = open && !readOnly && normalizedQuery.length >= 1;
  const isListboxOpen =
    isPopupVisible && searchGate.showDropdown && filteredResults.length > 0;
  const activePatient =
    isListboxOpen && activeIndex >= 0 && activeIndex < filteredResults.length
      ? filteredResults[activeIndex]
      : undefined;
  const activeOptionId = activePatient
    ? getPatientOptionId(listboxId, activePatient.id)
    : undefined;

  // useId ids contain ':' so the option must be looked up by id, not by a CSS selector.
  useEffect(() => {
    if (!activeOptionId) return;
    document
      .getElementById(activeOptionId)
      ?.scrollIntoView({ block: "nearest" });
  }, [activeOptionId]);

  // Results changed: drop any stale highlight so it never points at a
  // different patient than the one under it before (APG manual selection).
  useEffect(() => {
    setActiveIndex(-1);
  }, [normalizedQuery, searchQuery.data]);

  const selectPatient = (patient: PatientOption) => {
    if (allowPatient && !allowPatient(patient)) return;
    setSelected(patient);
    setQuery(patient.fullName ?? "");
    setOpen(false);
    setActiveIndex(-1);
    onSelect(patient);
  };

  // The clear control only exists while there is something to clear. The
  // hydrated id ref stays set on purpose so initialPatientId does not
  // re-hydrate (and re-fire onSelect) after a manual clear.
  const showClear = !readOnly && (query.length > 0 || selected !== null);

  const clearSelection = () => {
    setSelected(null);
    setQuery("");
    setOpen(false);
    setActiveIndex(-1);
    inputRef.current?.focus();
    onClear?.();
  };

  return (
    <div dir={isEnglish ? "ltr" : "rtl"} className="space-y-2">
      {label?.trim() ? (
        <label id={labelId} htmlFor={inputId} className="sr-only">
          {label}
        </label>
      ) : null}
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
          ref={inputRef}
          role="combobox"
          aria-autocomplete="list"
          aria-expanded={isListboxOpen}
          aria-controls={isListboxOpen ? listboxId : undefined}
          aria-activedescendant={activeOptionId}
          aria-label={label?.trim() ? undefined : placeholder}
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
            setActiveIndex(-1);
          }}
          onBlur={() => {
            if (readOnly) return;
            setTimeout(() => {
              setOpen(false);
              setActiveIndex(-1);
            }, 150);
          }}
          // Input's useComposition wrapper already swallows Enter during IME
          // composition, so it is not re-checked here.
          onKeyDown={(e) => {
            if (readOnly) return;
            const action = resolveComboboxKey({
              key: e.key,
              isOpen: isPopupVisible,
              activeIndex,
              optionCount: filteredResults.length,
              canOpen: normalizedQuery.length >= 1,
            });
            switch (action.type) {
              case "open":
                e.preventDefault();
                setOpen(true);
                setActiveIndex(action.activeIndex);
                break;
              case "move":
                e.preventDefault();
                setActiveIndex(action.activeIndex);
                break;
              case "select": {
                const patient = filteredResults[action.activeIndex];
                if (!patient) return;
                e.preventDefault();
                selectPatient(patient);
                break;
              }
              case "close":
                e.preventDefault();
                // Radix Dialog closes on Escape too (document capture phase); known limitation.
                e.stopPropagation();
                setOpen(false);
                setActiveIndex(-1);
                break;
              default:
                break;
            }
          }}
          placeholder={placeholder}
          className={`h-11 rounded-2xl border-border bg-background shadow-sm transition-colors focus-visible:border-primary focus-visible:ring-primary/25 ${
            isEnglish
              ? `pl-10 text-left${showClear ? " pr-10" : ""}`
              : `pr-10 text-right${showClear ? " pl-10" : ""}`
          }`}
          dir={isEnglish ? "ltr" : "rtl"}
          readOnly={readOnly}
          autoComplete="off"
        />
        {showClear && (
          <button
            type="button"
            aria-label={
              selected
                ? isEnglish
                  ? "Clear selection"
                  : "مسح الاختيار"
                : isEnglish
                  ? "Clear search"
                  : "مسح البحث"
            }
            // Keep focus in the input; the click then runs clearSelection.
            onMouseDown={(e) => e.preventDefault()}
            onClick={clearSelection}
            className={`absolute inset-y-0 my-auto flex h-7 w-7 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-accent/50 hover:text-foreground outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring ${isEnglish ? "right-3" : "left-3"}`}
          >
            <X className="h-4 w-4" aria-hidden />
          </button>
        )}
      </div>
      {isPopupVisible && (
        <PatientPickerResults
          listboxId={listboxId}
          labelId={labelId}
          patients={filteredResults}
          activeIndex={activeIndex}
          isLoading={searchQuery.isLoading || searchGate.isDebouncing}
          isError={searchQuery.isError}
          onRetry={() => searchQuery.refetch()}
          showHint={
            open && normalizedQuery.length >= 1 && !searchGate.showDropdown
          }
          ariaLabel={label?.trim() ? undefined : placeholder}
          isEnglish={isEnglish}
          onSelectPatient={selectPatient}
          onActiveIndexChange={setActiveIndex}
        />
      )}
      {selected && (
        <div className="rounded-2xl border border-border bg-muted px-3 py-2 text-xs text-muted-foreground">
          {isEnglish ? "Selected patient:" : "المريض المحدد:"}{" "}
          <span dir="auto" className="font-medium">
            {selected.fullName}
          </span>
        </div>
      )}
    </div>
  );
}
