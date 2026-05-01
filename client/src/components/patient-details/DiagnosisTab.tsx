import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDate } from "@/hooks/patient-details/usePatientDetails";

interface DiagnosisTabProps {
  latestReport: any;
  latestReportContent: any;
}

export function DiagnosisTab({ latestReport, latestReportContent }: DiagnosisTabProps) {
  return (
    <Card className="border-slate-200/80 bg-white/92 shadow-sm">
      <CardHeader className="border-b border-slate-100">
        <CardTitle>التشخيص الطبي</CardTitle>
        <CardDescription>{latestReport ? formatDate(latestReport.createdAt) : ""}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {latestReportContent ? (
          typeof latestReportContent === "string" ? (
            <p className="text-sm whitespace-pre-wrap">{latestReportContent}</p>
          ) : (
            <pre className="bg-muted/40 p-3 rounded-md text-xs overflow-x-auto">
              {JSON.stringify(latestReportContent, null, 2)}
            </pre>
          )
        ) : (
          <p className="text-sm text-muted-foreground">لا توجد تقارير طبية</p>
        )}
      </CardContent>
    </Card>
  );
}
