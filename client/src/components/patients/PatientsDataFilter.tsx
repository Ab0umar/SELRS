import React from "react";
import { FilterBar } from "@/components/shared/FilterBar";

export type PatientsDataFilterValue = "all" | "full" | "empty";

interface PatientsDataFilterProps {
  value: PatientsDataFilterValue;
  onSelect: (value: PatientsDataFilterValue) => void;
}

const filtersConfig: { value: PatientsDataFilterValue; label: string }[] = [
  { value: "all", label: "الكل" },
  { value: "full", label: "به بيانات" },
  { value: "empty", label: "بدون بيانات" },
];

/** Sub-filter shown alongside the service-type tabs (except "الكل") to narrow
 *  patients by whether they have any medical data entered (autoref, refraction,
 *  glasses, pentacam, prescription, tests, reports) — same signal already used
 *  for the colored status dots in the table. */
export const PatientsDataFilter: React.FC<PatientsDataFilterProps> = ({
  value,
  onSelect,
}) => {
  return (
    <FilterBar
      filters={filtersConfig}
      selected={value}
      onSelect={(v) => onSelect(v as PatientsDataFilterValue)}
      variant="tab"
    />
  );
};
