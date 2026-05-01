import React from "react";
import { Button } from "@/components/ui/button";
import { FileText, Printer, Edit, Trash2 } from "lucide-react";

interface PatientRowActionsProps {
  patientId: number;
  onOpenSheet: (serviceType: string, patientId: number) => void;
  onPrintSheet: (serviceType: string, patientId: number) => void;
  onDeletePatient: (patientId: number) => void;
  onEditPatient: (patient: any) => void;
  user: any;
  canEditPatients: boolean;
  serviceType: string;
}

export const PatientRowActions: React.FC<PatientRowActionsProps> = ({
  patientId,
  onOpenSheet,
  onPrintSheet,
  onDeletePatient,
  onEditPatient,
  user,
  canEditPatients,
  serviceType,
}) => {
  return (
    <div className="flex flex-wrap items-center justify-center gap-1.5">
      <Button
        size="sm"
        variant="outline"
        className="h-8 w-8 rounded-lg border-primary/25 bg-primary/5 p-0 text-primary shadow-sm hover:border-primary/40 hover:bg-primary/10"
        title="فتح الشيت"
        aria-label="فتح الشيت"
        onClick={(event) => {
          event.stopPropagation();
          onOpenSheet(serviceType, patientId);
        }}
      >
        <FileText className="h-4 w-4" />
      </Button>
      {canEditPatients && (
        <Button
          size="sm"
          variant="outline"
          className="h-8 w-8 rounded-lg border-amber-200 bg-amber-50 p-0 text-amber-700 shadow-sm hover:border-amber-300 hover:bg-amber-100"
          title="تعديل المريض"
          aria-label="تعديل المريض"
          onClick={(event) => {
            event.stopPropagation();
            onEditPatient({ id: patientId }); // Simplified, should pass full patient object
          }}
        >
          <Edit className="h-4 w-4" />
        </Button>
      )}
      <Button
        size="sm"
        variant="outline"
        className="h-8 w-8 rounded-lg border-slate-200 bg-white p-0 shadow-sm"
        title="طباعة الشيت"
        aria-label="طباعة الشيت"
        onClick={(event) => {
          event.stopPropagation();
          onPrintSheet(serviceType, patientId);
        }}
      >
        <Printer className="h-4 w-4" />
      </Button>
      {user?.role === "admin" && (
        <Button
          size="sm"
          variant="destructive"
          className="h-8 w-8 rounded-lg p-0 shadow-sm"
          title="حذف المريض"
          aria-label="حذف المريض"
          onClick={(event) => {
            event.stopPropagation();
            onDeletePatient(patientId);
          }}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      )}
    </div>
  );
};
