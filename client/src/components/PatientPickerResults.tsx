import { UserRound } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatPatientPhone, getPatientOptionId } from "./patient-picker-utils";

export type PatientOption = {
  id: number;
  fullName: string;
  patientCode?: string | null;
  locationType?: "center" | "external" | null;
  phone?: string | null;
  age?: number | null;
  dateOfBirth?: string | Date | null;
  address?: string | null;
};

type PatientPickerResultsProps = {
  listboxId: string;
  labelId: string;
  patients: PatientOption[];
  activeIndex: number;
  isLoading: boolean;
  isEnglish: boolean;
  onSelectPatient: (patient: PatientOption) => void;
  onActiveIndexChange: (index: number) => void;
};

export default function PatientPickerResults({
  listboxId,
  labelId,
  patients,
  activeIndex,
  isLoading,
  isEnglish,
  onSelectPatient,
  onActiveIndexChange,
}: PatientPickerResultsProps) {
  return (
    // preventDefault keeps focus on the combobox input, even when clicking the
    // scrollbar or an option, so the popup never closes mid-interaction.
    <div
      className="max-h-64 overflow-y-auto rounded-2xl border border-border bg-popover shadow-lg"
      onMouseDown={(e) => e.preventDefault()}
    >
      {isLoading && (
        <div
          role="status"
          aria-live="polite"
          className="px-3 py-2 text-sm text-muted-foreground"
        >
          {isEnglish ? "Searching..." : "جاري البحث..."}
        </div>
      )}
      {!isLoading && patients.length === 0 && (
        <div
          role="status"
          aria-live="polite"
          className="px-3 py-2 text-sm text-muted-foreground"
        >
          {isEnglish ? "No results found" : "لا توجد نتائج"}
        </div>
      )}
      <ul id={listboxId} role="listbox" aria-labelledby={labelId}>
        {patients.map((patient, index) => {
          const active = index === activeIndex;
          return (
            <li
              key={patient.id}
              id={getPatientOptionId(listboxId, patient.id)}
              role="option"
              aria-selected={active}
              data-active={active || undefined}
              className={cn(
                "w-full cursor-pointer px-3 py-3 transition-colors hover:bg-accent",
                active && "bg-accent",
                isEnglish ? "text-left" : "text-right",
              )}
              onClick={() => onSelectPatient(patient)}
              onMouseMove={() => {
                if (index !== activeIndex) onActiveIndexChange(index);
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
                  {formatPatientPhone(patient.phone)}
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
