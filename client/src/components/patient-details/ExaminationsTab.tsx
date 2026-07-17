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

const EmptyRow = ({ label }: { label: string }) => (
  <p className="text-sm text-muted-foreground">لا توجد بيانات {label} محفوظة</p>
);

export function ExaminationsTab({
  autorefractionRows,
  afterRows,
  glassesRows,
}: ExaminationsTabProps) {
  const iopRows = autorefractionRows.filter(
    (row) => row.iop && row.iop !== "-" && row.iop !== "—",
  );

  return (
    <div className="space-y-5" dir="ltr">
      <ReportSection title="Autoref / IOP" source="autorefractometrydata">
        {autorefractionRows.length ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[620px] border-collapse text-center text-sm">
              <thead className="bg-muted text-xs text-muted-foreground">
                <tr>
                  {["Eye", "UCVA", "BCVA", "S", "C", "Axis", "IOP"].map(
                    (header) => (
                      <th key={header} className="border px-3 py-2.5">
                        {header}
                      </th>
                    ),
                  )}
                </tr>
              </thead>
              <tbody>
                {autorefractionRows.map((row) => (
                  <tr key={row.eye}>
                    {[
                      row.eye,
                      row.ucva,
                      row.bcva,
                      row.s,
                      row.c,
                      row.axis,
                      row.iop,
                    ].map((value, index) => (
                      <td
                        key={index}
                        className="border px-3 py-2.5 tabular-nums"
                      >
                        {value || "—"}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyRow label="Autoref / IOP" />
        )}
      </ReportSection>

      <ReportSection title="After" source="afterrefractiondata">
        {afterRows.length ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[440px] border-collapse text-center text-sm">
              <thead className="bg-muted text-xs text-muted-foreground">
                <tr>
                  {["Eye", "S", "C", "Axis"].map((header) => (
                    <th key={header} className="border px-3 py-2.5">
                      {header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {afterRows.map((row) => (
                  <tr key={row.eye}>
                    {[row.eye, row.s, row.c, row.axis].map((value, index) => (
                      <td
                        key={index}
                        className="border px-3 py-2.5 tabular-nums"
                      >
                        {value || "—"}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyRow label="After" />
        )}
      </ReportSection>

      <ReportSection title="Clinical Refraction" source="glassesrecords">
        {glassesRows.length ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] border-collapse text-center text-sm">
              <thead className="bg-muted text-xs text-muted-foreground">
                <tr>
                  {[
                    "Date",
                    "OD S",
                    "OD C",
                    "OD Axis",
                    "OS S",
                    "OS C",
                    "OS Axis",
                    "OS PD",
                    "Add",
                  ].map((header) => (
                    <th key={header} className="border px-3 py-2.5">
                      {header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {glassesRows.map((row, index) => (
                  <tr key={`${row.visit}-${index}`}>
                    {[
                      row.visit,
                      row.odS,
                      row.odC,
                      row.odAx,
                      row.osS,
                      row.osC,
                      row.osAx,
                      row.osPd,
                      row.add,
                    ].map((value, cellIndex) => (
                      <td
                        key={cellIndex}
                        className="border px-3 py-2.5 tabular-nums"
                      >
                        {value || "—"}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyRow label="Clinical Refraction" />
        )}
      </ReportSection>

      <ReportSection
        title="Technical Trends: Refraction and IOP"
        source="Refraction: glassesrecords | IOP: autorefractometrydata"
      >
        {glassesRows.length || iopRows.length ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] border-collapse text-center text-sm">
              <thead className="bg-muted text-xs text-muted-foreground">
                <tr>
                  {[
                    "Date",
                    "Source",
                    "Eye",
                    "S",
                    "C",
                    "Axis",
                    "PD",
                    "Add",
                    "IOP",
                  ].map((header) => (
                    <th key={header} className="border px-3 py-2.5">
                      {header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {glassesRows.flatMap((row, index) => [
                  <tr key={`clinical-od-${index}`}>
                    {[
                      row.visit,
                      "glassesrecords",
                      "OD",
                      row.odS,
                      row.odC,
                      row.odAx,
                      "—",
                      row.add,
                      "—",
                    ].map((value, cellIndex) => (
                      <td
                        key={cellIndex}
                        className="border px-3 py-2.5 tabular-nums"
                      >
                        {value}
                      </td>
                    ))}
                  </tr>,
                  <tr key={`clinical-os-${index}`}>
                    {[
                      row.visit,
                      "glassesrecords",
                      "OS",
                      row.osS,
                      row.osC,
                      row.osAx,
                      row.osPd,
                      row.add,
                      "—",
                    ].map((value, cellIndex) => (
                      <td
                        key={cellIndex}
                        className="border px-3 py-2.5 tabular-nums"
                      >
                        {value}
                      </td>
                    ))}
                  </tr>,
                ])}
                {iopRows.map((row) => (
                  <tr key={`iop-${row.eye}`}>
                    {[
                      "آخر زيارة",
                      "autorefractometrydata",
                      row.eye,
                      "—",
                      "—",
                      "—",
                      "—",
                      "—",
                      row.iop,
                    ].map((value, index) => (
                      <td
                        key={index}
                        className="border px-3 py-2.5 tabular-nums"
                      >
                        {value || "—"}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyRow label="Technical Trends" />
        )}
      </ReportSection>
    </div>
  );
}
