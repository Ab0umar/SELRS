import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface MedicalHistoryTabProps {
  history?: string;
  symptoms: string[];
}

export const MedicalHistoryTab: React.FC<MedicalHistoryTabProps> = ({
  history,
  symptoms,
}) => {
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
      <Card className="border-slate-200/80 bg-white/92 shadow-sm md:col-span-2">
        <div className="border-b border-slate-100 px-6 py-3 font-semibold text-base">التاريخ المرضي</div>
        <CardContent className="pt-4">
          {history ? (
            <div className="rounded border border-slate-200 p-4 bg-slate-50/50 text-sm whitespace-pre-wrap">{history}</div>
          ) : (
            <p className="text-xs text-muted-foreground">لا يوجد تاريخ مرضي محفوظ</p>
          )}
        </CardContent>
      </Card>
      <Card className="border-slate-200/80 bg-white/92 shadow-sm">
        <div className="border-b border-slate-100 px-6 py-3 font-semibold text-base">الأعراض</div>
        <CardContent className="pt-4">
          {symptoms.length === 0 ? (
            <p className="text-xs text-muted-foreground">لا توجد أعراض مضافة</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {symptoms.map((symptom, index) => (
                <Badge key={`${symptom}-${index}`} variant="default" className="rounded-full">{symptom}</Badge>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
