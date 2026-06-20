import React from "react";
import { FilterBar } from "@/components/shared/FilterBar";

interface PatientsTabsProps {
  activeTab: string;
  onSelect: (value: string) => void;
}

// Mirrors the admin patients serviceType filter set — plain "surgery" and
// "external" are legacy buckets superseded by the granular types below and
// are no longer surfaced as tabs.
const tabsConfig = [
  { value: "all", label: "الكل" },
  { value: "consultant", label: "استشاري" },
  { value: "specialist", label: "اخصائي" },
  { value: "lasik", label: "فحوصات الليزك" },
  { value: "surgery_center", label: "عمليات مركز" },
  { value: "surgery_external", label: "عمليات خارجي" },
  { value: "pentacam_c", label: "اشعة مركز" },
  { value: "pentacam_ex", label: "اشعه خارجي" },
  { value: "pentacam_ex_c", label: "اشعة خارجي م" },
];

export const PatientsTabs: React.FC<PatientsTabsProps> = ({
  activeTab,
  onSelect,
}) => {
  return (
    <FilterBar
      filters={tabsConfig}
      selected={activeTab}
      onSelect={onSelect}
      variant="pill"
    />
  );
};
