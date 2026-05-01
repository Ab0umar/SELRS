import React from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { UserRound, FileText, PrinterIcon, Download } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Demographics } from "./Demographics";

interface PatientDetailsHeaderProps {
  patientName: string;
  patientCode: string;
  phone?: string;
  age?: string;
  gender?: string;
  patientId?: number;
  setLocation: (url: string) => void;
}

export const PatientDetailsHeader: React.FC<PatientDetailsHeaderProps> = ({
  patientName,
  patientCode,
  phone,
  age,
  gender,
  patientId,
  setLocation,
}) => {
  return (
    <Card className="mb-6">
      <CardContent className="p-4 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
          <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-secondary">
            <UserRound className="h-8 w-8 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3">
              <h1 className="text-lg sm:text-xl font-black tracking-tight truncate">{patientName || "—"}</h1>
              <Badge variant="outline" className="w-fit text-xs font-mono">{patientCode || "—"}</Badge>
            </div>
            <Demographics phone={phone} age={age} gender={gender} />
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Button variant="outline" size="sm" className="gap-1.5" onClick={() => patientId && setLocation(`/patient-summary/${patientId}`)}><FileText className="h-3.5 w-3.5" />التقرير المجمع</Button>
            <Button variant="outline" size="sm" className="gap-1.5" onClick={() => window.print()}><PrinterIcon className="h-3.5 w-3.5" />طباعة</Button>
            <Button variant="outline" size="sm" className="gap-1.5" onClick={() => window.print()}><Download className="h-3.5 w-3.5" />تحميل PDF</Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
