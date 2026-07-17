import { UnifiedRefractionTable } from "@/components/medical/UnifiedRefractionTable";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface EyeMeasurement {
  eye: string;
  ucva: string;
  bcva: string;
  s: string;
  c: string;
  axis: string;
  iop: string;
}

interface AfterMeasurement {
  eye: string;
  s: string;
  c: string;
  axis: string;
}

interface ClinicalRefraction {
  visit: string;
  odS: string;
  odC: string;
  odAx: string;
  osS: string;
  osC: string;
  osAx: string;
  osPd: string;
  add: string;
}

interface ExaminationsTabProps {
  autorefractionRows: EyeMeasurement[];
  afterRows: AfterMeasurement[];
  glassesRows: ClinicalRefraction[];
}

function ReportSection({
  title,
  source,
  children,
}: {
  title: string;
  source: string;
  children: React.ReactNode;
}) {
  return (
    <Card className="border-border/80 bg-background shadow-none">
      <CardHeader className="flex-row items-center justify-between border-b border-border py-3">
        <CardTitle className="text-base">{title}</CardTitle>
        <span className="font-mono text-[10px] text-muted-foreground" dir="ltr">
          {source}
        </span>
      </CardHeader>
      <CardContent className="pt-4">{children}</CardContent>
    </Card>
  );
}

const getEye = <T extends { eye: string }>(rows: T[], eye: "OD" | "OS") =>
  rows.find((row) => row.eye.toUpperCase() === eye);

const opticalFields = [
  { key: "s", label: "S" },
  { key: "c", label: "C" },
  { key: "axis", label: "A" },
];

export function ExaminationsTab({
  autorefractionRows,
  afterRows,
  glassesRows,
}: ExaminationsTabProps) {
  const autorefOD = getEye(autorefractionRows, "OD");
  const autorefOS = getEye(autorefractionRows, "OS");
  const afterOD = getEye(afterRows, "OD");
  const afterOS = getEye(afterRows, "OS");

  return (
    <div className="space-y-5" dir="ltr">
      <ReportSection title="Autoref / IOP" source="autorefractometrydata">
        <UnifiedRefractionTable
          title="Autoref"
          fields={[
            ...opticalFields,
            { key: "ucva", label: "UCVA" },
            { key: "iop", label: "IOP" },
          ]}
          od={{
            s: autorefOD?.s,
            c: autorefOD?.c,
            axis: autorefOD?.axis,
            ucva: autorefOD?.ucva,
            iop: autorefOD?.iop,
          }}
          os={{
            s: autorefOS?.s,
            c: autorefOS?.c,
            axis: autorefOS?.axis,
            ucva: autorefOS?.ucva,
            iop: autorefOS?.iop,
          }}
          emptyText="لا توجد بيانات Autoref / IOP محفوظة"
        />
      </ReportSection>

      <ReportSection title="After" source="afterrefractiondata">
        <UnifiedRefractionTable
          title="After"
          fields={opticalFields}
          od={{ s: afterOD?.s, c: afterOD?.c, axis: afterOD?.axis }}
          os={{ s: afterOS?.s, c: afterOS?.c, axis: afterOS?.axis }}
          emptyText="لا توجد بيانات After محفوظة"
        />
      </ReportSection>

      <ReportSection title="Clinical Refraction" source="glassesrecords">
        {glassesRows.length ? (
          <div className="space-y-5">
            {glassesRows.map((row, index) => (
              <UnifiedRefractionTable
                key={`${row.visit}-${index}`}
                title="Refraction"
                fields={opticalFields}
                od={{ s: row.odS, c: row.odC, axis: row.odAx }}
                os={{ s: row.osS, c: row.osC, axis: row.osAx }}
                trailing={[{ label: "IPD", value: row.osPd }]}
                reading={row.add}
                date={row.visit}
              />
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            لا توجد بيانات Clinical Refraction محفوظة
          </p>
        )}
      </ReportSection>
    </div>
  );
}
