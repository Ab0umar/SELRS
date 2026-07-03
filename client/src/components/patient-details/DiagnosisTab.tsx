import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { formatDate } from "@/hooks/patient-details/usePatientDetails";
import { DiagnosisImagesPanel } from "./DiagnosisImagesPanel";

interface DiagnosisTabProps {
  latestReport: any;
  latestReportContent: any;
  patientId?: number;
}

export function DiagnosisTab({
  latestReport,
  latestReportContent,
  patientId,
}: DiagnosisTabProps) {
  return (
    <div className="space-y-4">
      <Card className="border-border/80 bg-background/92 shadow-sm">
        <CardHeader className="border-b border-border">
          <CardTitle>التشخيص الطبي</CardTitle>
          <CardDescription dir="auto">
            {latestReport ? formatDate(latestReport.createdAt) : ""}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {latestReportContent ? (
            typeof latestReportContent === "string" ? (
              <p className="text-sm whitespace-pre-wrap" dir="auto">
                {latestReportContent}
              </p>
            ) : (
              <pre
                className="bg-muted/40 p-3 rounded-md text-xs overflow-x-auto"
                dir="auto"
              >
                {JSON.stringify(latestReportContent, null, 2)}
              </pre>
            )
          ) : (
            <p className="text-sm text-muted-foreground">لا توجد تقارير طبية</p>
          )}
        </CardContent>
      </Card>

      {patientId && (
        <Card className="border-border/80 bg-background/92 shadow-sm">
          <CardHeader className="border-b border-border">
            <CardTitle className="text-base">صور التشخيص</CardTitle>
            <CardDescription>صور مرفقة بالتشخيص (JPG / PNG)</CardDescription>
          </CardHeader>
          <CardContent className="pt-4">
            <DiagnosisImagesPanel patientId={patientId} />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
