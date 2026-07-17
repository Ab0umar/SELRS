import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";
import { cn } from "@/lib/utils";
import {
  evaluateMedicalReference,
  findMedicalReference,
  medicalReferenceClass,
  type MedicalReference,
} from "@/lib/medical-reference";

interface PentacamTabProps {
  pentacamRows: Array<{
    eye: string;
    k1: string;
    k2: string;
    thinnest: string;
    apex: string;
    residual: string;
    ttt: string;
    ablation: string;
  }>;
  pentacamFiles: Array<{
    id: number;
    sourceFileName?: string | null;
    storageUrl: string;
    capturedAt?: string | null;
    importedAt?: string | null;
  }>;
}

export function PentacamTab({ pentacamRows, pentacamFiles }: PentacamTabProps) {
  const refsQuery = trpc.medical.getAllTests.useQuery(undefined, {
    refetchOnWindowFocus: false,
  });
  const refs = (refsQuery.data ?? []) as Record<string, unknown>[];

  const k1Ref = findMedicalReference(refs, ["K1", "Pentacam K1", "بنتاكام K1"]);
  const k2Ref = findMedicalReference(refs, ["K2", "Pentacam K2", "بنتاكام K2"]);
  const thinnestRef = findMedicalReference(refs, [
    "Thinnest",
    "Thinnest Point",
    "CCT",
    "بنتاكام Thinnest",
  ]);
  const apexRef = findMedicalReference(refs, [
    "Apex",
    "Pentacam Apex",
    "بنتاكام Apex",
  ]);
  const residualRef = findMedicalReference(refs, [
    "Residual",
    "Residual Stroma",
    "RSB",
    "بنتاكام Residual",
  ]);
  const tttRef = findMedicalReference(refs, [
    "TTT",
    "Pentacam TTT",
    "بنتاكام TTT",
  ]);
  const ablationRef = findMedicalReference(refs, [
    "Ablation",
    "Pentacam Ablation",
    "بنتاكام Ablation",
  ]);

  const RefCell = ({
    value,
    reference,
  }: {
    value: string;
    reference: MedicalReference | null;
  }) => {
    const state = evaluateMedicalReference(value, reference);
    return (
      <td
        className={cn(
          "border px-3 py-3 tabular-nums",
          medicalReferenceClass(state),
        )}
        dir="auto"
        title={
          state === "low" || state === "high"
            ? `خارج الطبيعي: ${reference?.min} - ${reference?.max} ${reference?.unit}`
            : undefined
        }
      >
        {value || "-"}
      </td>
    );
  };

  return (
    <div className="space-y-6">
      <Card className="border-border/80 bg-background/92 shadow-sm" dir="ltr">
        <CardHeader className="border-b border-border">
          <div className="flex items-center justify-between">
            <CardTitle>Pentacam HR Analysis</CardTitle>
            <span className="font-mono text-[10px] text-muted-foreground">
              pentacamresults
            </span>
          </div>
        </CardHeader>
        <CardContent>
          {pentacamRows.length ? (
            <div className="overflow-x-auto rounded-[1.25rem] border border-border bg-background">
              <table className="w-full min-w-[720px] border-collapse text-center">
                <thead className="bg-muted text-xs uppercase tracking-[0.18em] text-muted-foreground">
                  <tr>
                    <th className="border px-3 py-3">Eye</th>
                    <th className="border px-3 py-3">K1</th>
                    <th className="border px-3 py-3">K2</th>
                    <th className="border px-3 py-3">Thinnest</th>
                    <th className="border px-3 py-3">Apex</th>
                    <th className="border px-3 py-3">Residual</th>
                    <th className="border px-3 py-3">TTT</th>
                    <th className="border px-3 py-3">Ablation</th>
                  </tr>
                </thead>
                <tbody>
                  {pentacamRows.map((row) => (
                    <tr
                      key={`pent-${row.eye}`}
                      className="bg-background text-sm font-medium text-foreground"
                    >
                      <td className="border px-3 py-3 font-bold">{row.eye}</td>
                      <RefCell value={row.k1} reference={k1Ref} />
                      <RefCell value={row.k2} reference={k2Ref} />
                      <RefCell value={row.thinnest} reference={thinnestRef} />
                      <RefCell value={row.apex} reference={apexRef} />
                      <RefCell value={row.residual} reference={residualRef} />
                      <RefCell value={row.ttt} reference={tttRef} />
                      <RefCell value={row.ablation} reference={ablationRef} />
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="pt-2 text-sm text-muted-foreground">
              لا توجد بيانات Pentacam محفوظة
            </p>
          )}
        </CardContent>
      </Card>

      <Card className="border-border/80 bg-background/92 shadow-sm" dir="ltr">
        <CardHeader className="border-b border-border">
          <div className="flex items-center justify-between">
            <CardTitle>Corneal Topography</CardTitle>
            <span className="font-mono text-[10px] text-muted-foreground">
              pentacamresults
            </span>
          </div>
        </CardHeader>
        <CardContent>
          {pentacamRows.length ? (
            <div className="overflow-x-auto rounded-lg border border-border">
              <table className="w-full min-w-[520px] border-collapse text-center text-sm">
                <thead className="bg-muted text-xs text-muted-foreground">
                  <tr>
                    <th className="border px-3 py-2.5">Eye</th>
                    <th className="border px-3 py-2.5">K1</th>
                    <th className="border px-3 py-2.5">K2</th>
                    <th className="border px-3 py-2.5">Thinnest</th>
                  </tr>
                </thead>
                <tbody>
                  {pentacamRows.map((row) => (
                    <tr key={`topography-${row.eye}`}>
                      <td className="border px-3 py-2.5 font-bold">
                        {row.eye}
                      </td>
                      <td className="border px-3 py-2.5">{row.k1 || "—"}</td>
                      <td className="border px-3 py-2.5">{row.k2 || "—"}</td>
                      <td className="border px-3 py-2.5">
                        {row.thinnest || "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              لا توجد بيانات Corneal Topography محفوظة
            </p>
          )}
        </CardContent>
      </Card>

      <Card className="border-border/80 bg-background/92 shadow-sm" dir="ltr">
        <CardHeader className="border-b border-border">
          <div className="flex items-center justify-between">
            <CardTitle>Diagnostic Imaging</CardTitle>
            <span className="font-mono text-[10px] text-muted-foreground">
              srv100_uploads / S3
            </span>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {pentacamFiles.length ? (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {pentacamFiles.map((file) => (
                <figure
                  key={file.id}
                  className="overflow-hidden rounded-lg border border-border bg-muted/20"
                >
                  <a
                    href={file.storageUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                  >
                    <img
                      src={file.storageUrl}
                      alt={file.sourceFileName || "صورة بنتاكام"}
                      className="aspect-[4/3] w-full object-contain bg-background"
                      loading="lazy"
                    />
                  </a>
                  <figcaption className="space-y-0.5 px-3 py-2" dir="rtl">
                    <p className="truncate text-xs font-medium" dir="auto">
                      {file.sourceFileName || "صورة بنتاكام"}
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      {file.capturedAt || file.importedAt
                        ? new Date(
                            file.capturedAt || file.importedAt || "",
                          ).toLocaleDateString("ar-EG")
                        : "—"}
                    </p>
                  </figcaption>
                </figure>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              لا توجد صور بنتاكام محفوظة لآخر زيارة
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
