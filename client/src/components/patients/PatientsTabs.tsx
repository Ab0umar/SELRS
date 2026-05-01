import React from "react";
import { FilterBar } from "@/components/shared/FilterBar";

interface PatientsTabsProps {
  activeTab: string;
  onSelect: (value: string) => void;
}

const tabsConfig = [
  { value: "consultant", label: "استشاري" },
  { value: "specialist", label: "اخصائي" },
  { value: "lasik", label: "فحوصات الليزك" },
  { value: "external", label: "خارجي" },
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
