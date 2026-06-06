import { ArrowLeft, Glasses, RefreshCw, ShieldAlert } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import PatientLayout from "./PatientLayout";
import {
  PortalEmptyState,
  PortalLoadingRows,
  PortalMetric,
  PortalPanel,
  PortalShell,
  formatArabicDate,
} from "./portal-ui";

function v(value: unknown) {
  if (value === null || value === undefined || value === "") return "—";
  return String(value);
}

function EyeCard({ side, sph, cyl, axis, va, pd }: { side: "OS" | "OD"; sph: unknown; cyl: unknown; axis: unknown; va?: string; pd?: unknown }) {
  const isOS = side === "OS";
  const cols = isOS ? [{ l: "Sph.", val: sph }, { l: "Cyl.", val: cyl }, { l: "Axis", val: axis }, { l: "PD", val: pd }]
                    : [{ l: "Sph.", val: sph }, { l: "Cyl.", val: cyl }, { l: "Axis", val: axis }];
  return (
    <div className={`flex-1 rounded-xl border p-3 ${isOS ? "border-blue-200 bg-blue-50/40" : "border-emerald-200 bg-emerald-50/40"}`}>
      <div className="mb-2 flex items-center justify-between">
        <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold ${isOS ? "bg-blue-100 text-blue-700" : "bg-emerald-100 text-emerald-700"}`} dir="ltr">{side}</span>
        <span className="text-[11px] text-muted-foreground">{isOS ? "اليسرى" : "اليمنى"}</span>
      </div>
      <div className={`grid gap-1.5 ${isOS ? "grid-cols-4" : "grid-cols-3"}`} dir="ltr">
        {cols.map(({ l, val }) => (
          <div key={l} className="rounded-lg border border-white bg-white/80 px-1 py-1.5 text-center shadow-sm">
            <div className="text-[10px] font-medium text-muted-foreground">{l}</div>
            <div className="mt-0.5 text-sm font-semibold text-foreground">{v(val)}</div>
          </div>
        ))}
      </div>
      {va && va !== "—" && (
        <div className="mt-2 rounded-lg border border-white bg-white/80 px-2 py-1 text-center">
          <span className="text-[10px] text-muted-foreground">V/A </span>
          <span className="text-sm font-semibold text-foreground" dir="ltr">{va}</span>
        </div>
      )}
    </div>
  );
}

function RefractionRecord({ row }: { row: any }) {
  const visitDate = formatArabicDate(row.visitDate ?? row.createdAt);

  return (
    <PortalPanel
      title={visitDate}
      description={row.notes ? "ملاحظات القياس مرفقة أسفل القراءة" : undefined}
    >
      <div className="space-y-3">
        <div className="flex gap-2" dir="rtl">
          <EyeCard side="OS" sph={row.sOS} cyl={row.cOS} axis={row.axisOS} va={v(row.bcvaOS)} pd={row.pdOS} />
          <EyeCard side="OD" sph={row.sOD} cyl={row.cOD} axis={row.axisOD} va={v(row.bcvaOD)} />
        </div>

        {row.notes && (
          <div className="rounded-[1.25rem] border border-border bg-muted/20 p-4" dir="rtl">
            <p className="text-sm font-semibold text-foreground">ملاحظات</p>
            <p className="mt-1 whitespace-pre-wrap text-sm leading-7 text-muted-foreground">{row.notes}</p>
          </div>
        )}
      </div>
    </PortalPanel>
  );
}

export default function PatientRefraction() {
  const { data, isLoading, error, refetch } = trpc.patientPortal.getMyRefractions.useQuery();

  const records = data ?? [];
  const latest = records[0] as any | undefined;
  const latestDate = formatArabicDate(latest?.visitDate ?? latest?.createdAt);

  const handleBack = () => {
    if (window.history.length > 1) {
      window.history.back();
      return;
    }
    window.location.href = "/my/file";
  };

  return (
    <PatientLayout>
      <PortalShell
        title="مقاس النظارة"
        subtitle="آخر قياسات النظارة مرتبة من الأحدث إلى الأقدم."
        actions={
          <Button
            variant="outline"
            size="sm"
            className="gap-2 border-[#d8e4f1] bg-white text-primary hover:bg-[#f7fbff]"
            onClick={handleBack}
          >
            <ArrowLeft className="size-4" />
            رجوع
          </Button>
        }
      >
        {isLoading && <PortalLoadingRows rows={3} />}

        {error && (
          <PortalEmptyState
            icon={<ShieldAlert className="size-5" />}
            title="تعذر تحميل سجل مقاس النظارة"
            description={error.message}
            action={
              <Button onClick={() => void refetch()} className="gap-2">
                <RefreshCw className="size-4" />
                إعادة المحاولة
              </Button>
            }
          />
        )}

        {!isLoading && !error && records.length === 0 && (
          <PortalEmptyState
            icon={<Glasses className="size-5" />}
            title="لا توجد قراءات مقاس نظارة مسجلة"
            description="عند إدخال قياس جديد في العيادة سيظهر هنا مباشرة."
          />
        )}

        {!isLoading && !error && records.length > 0 && (
          <div className="space-y-4">
            <PortalPanel>
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="space-y-2">
                  <p className="text-sm font-medium text-secondary">آخر قياس</p>
                  <h2 className="text-xl font-semibold text-foreground">{latestDate}</h2>
                  <p className="max-w-2xl text-sm leading-6 text-muted-foreground">
                    {records.length} {records.length === 1 ? "قراءة" : "قراءات"}
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                  <PortalMetric label="عدد القراءات" value={records.length} tone="blue" />
                  <PortalMetric label="آخر تاريخ" value={latestDate} tone="orange" />
                </div>
              </div>
            </PortalPanel>

            <div className="space-y-4">
              {records.map((row: any) => (
                <RefractionRecord key={row.id ?? `${row.createdAt}-${row.visitDate}`} row={row} />
              ))}
            </div>
          </div>
        )}
      </PortalShell>
    </PatientLayout>
  );
}
