import React from "react";
import { Button } from "@/components/ui/button";
import { Users, Plus } from "lucide-react";
import { PageHeader } from "@/components/shared/PageHeader";

interface PatientsHeaderProps {
  canEditPatients: boolean;
  onAddNewPatient: () => void;
}

export const PatientsHeader: React.FC<PatientsHeaderProps> = ({
  canEditPatients,
  onAddNewPatient,
}) => {
  return (
    <PageHeader
      title="المرضى"
      subtitle="إدارة وعرض سجلات المرضى"
      icon={<Users className="h-5 w-5" />}
      action={
        canEditPatients && (
          <Button
            size="sm"
            className="selrs-gradient-btn text-white gap-2"
            onClick={onAddNewPatient}
          >
            <Plus className="h-4 w-4" />
            <span className="text-xs sm:text-sm">تسجيل مريض جديد</span>
          </Button>
        )
      }
    />
  );
};
