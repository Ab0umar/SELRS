import { ArrowLeft, Glasses, RefreshCw, ShieldAlert, Printer } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import PatientLayout from "./PatientLayout";
import {
  PortalEmptyState,
  PortalLoadingRows,
  formatArabicDate,
} from "./portal-ui";

function v(value: unknown) {
  if (value === null || value === undefined || value === "") return "—";
  return String(value);
}

function EyeCard({ side, sph, cyl, axis, va, pd }: { side: "OS" | "OD"; sph: unknown; cyl: unknown; axis: unknown; va?: string; pd?: unknown }) {
  const isOS = side === "OS";
  const cols = isOS ? [{ l: "Sph. (كروي)", val: sph }, { l: "Cyl. (اسطواني)", val: cyl }, { l: "Axis (محور)", val: axis }, { l: "PD (المسافة)", val: pd }]
                    : [{ l: "Sph. (كروي)", val: sph }, { l: "Cyl. (اسطواني)", val: cyl }, { l: "Axis (محور)", val: axis }];
  return (
    <div className={`flex-1 rounded-xl border p-4.5 transition-all duration-200 ${isOS ? "border-blue-100 bg-blue-50/30" : "border-emerald-100 bg-emerald-50/30"}`}>
      <div className="mb-3 flex items-center justify-between">
        <span className={`rounded-lg px-2.5 py-0.5 text-xs font-bold ${isOS ? "bg-blue-100 text-blue-700" : "bg-emerald-100 text-emerald-700"}`} dir="ltr">{side}</span>
        <span className="text-xs font-bold text-muted-foreground">{isOS ? "العين اليسرى" : "العين اليمنى"}</span>
      </div>
      <div className={`grid gap-2 ${isOS ? "grid-cols-4" : "grid-cols-3"}`} dir="ltr">
        {cols.map(({ l, val }) => (
          <div key={l} className="rounded-xl border border-white bg-white/90 p-2 text-center shadow-xs">
            <div className="text-[10px] font-bold text-muted-foreground">{l.split(" ")[0]}</div>
            <div className="text-[9px] text-muted-foreground/60 leading-none">{l.includes("(") ? l.substring(l.indexOf("(")) : ""}</div>
            <div className="mt-1 text-base font-black text-foreground">{v(val)}</div>
          </div>
        ))}
      </div>
      {va && va !== "—" && (
        <div className="mt-3 rounded-xl border border-white bg-white/90 px-3 py-1.5 flex justify-between items-center" dir="ltr">
          <span className="text-[10px] font-bold text-muted-foreground">حدة الإبصار V/A</span>
          <span className="text-sm font-black text-foreground">{va}</span>
        </div>
      )}
    </div>
  );
}

function RefractionRecord({ row }: { row: any }) {
  const visitDate = formatArabicDate(row.visitDate ?? row.createdAt);

  const handlePrint = (e: React.MouseEvent) => {
    e.stopPropagation();
    window.print();
  };

  return (
    <div className="bg-white border border-[#dbe7f4] rounded-2xl p-5 shadow-xs space-y-4 print:border-0 print:shadow-none print:p-0">
      
      {/* Header with print button */}
      <div className="flex items-center justify-between border-b border-[#f0f5fa] pb-2">
        <div className="space-y-0.5">
          <h3 className="text-sm font-bold text-foreground">{visitDate}</h3>
          <p className="text-[10px] text-muted-foreground">قياسات بصرية مسجلة بالعيادة</p>
        </div>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={handlePrint}
          className="h-8 gap-1.5 border-[#dbe7f4] hover:bg-muted/40 rounded-lg text-xs cursor-pointer print:hidden animate-none"
        >
          <Printer className="size-3.5" />
          <span>طباعة</span>
        </Button>
      </div>

      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row gap-3.5" dir="rtl">
          <EyeCard side="OS" sph={row.sOS} cyl={row.cOS} axis={row.axisOS} va={v(row.bcvaOS)} pd={row.pdOS} />
          <EyeCard side="OD" sph={row.sOD} cyl={row.cOD} axis={row.axisOD} va={v(row.bcvaOD)} />
        </div>

        {row.notes && (
          <div className="rounded-xl border border-border bg-[#F4F8FB]/40 p-4" dir="rtl">
            <p className="text-xs font-bold text-foreground">ملاحظات الطبيب</p>
            <p className="mt-1 whitespace-pre-wrap text-xs leading-6 text-muted-foreground">{row.notes}</p>
          </div>
        )}
      </div>
    </div>
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
      <div className="space-y-6">
        
        {/* Title bar */}
        <div className="flex items-center justify-between gap-3">
          <div className="space-y-1">
            <h2 className="text-xl font-bold text-primary">قياسات نظارتي 👓</h2>
            <p className="text-xs text-muted-foreground">سجل تاريخي كامل بمقاسات النظارة الطبية الخاصة بك.</p>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="gap-2 border-[#d8e4f1] bg-white text-primary hover:bg-[#f7fbff] cursor-pointer"
            onClick={handleBack}
          >
            <ArrowLeft className="size-4" />
            رجوع
          </Button>
        </div>

        {isLoading && <PortalLoadingRows rows={3} />}

        {error && (
          <PortalEmptyState
            icon={<ShieldAlert className="size-5" />}
            title="تعذر تحميل سجل مقاس النظارة"
            description={error.message}
            action={
              <Button onClick={() => void refetch()} className="gap-2 cursor-pointer">
                <RefreshCw className="size-4" />
                إعادة المحاولة
              </Button>
            }
          />
        )}

        {!isLoading && !error && records.length === 0 && (
          <PortalEmptyState
            icon={<Glasses className="size-5" />}
            title="لا توجد مقاسات نظارة مسجلة"
            description="عند إدخال فحص أو مقاس نظارة جديد بالعيادة، سيظهر هنا مباشرة."
          />
        )}

        {!isLoading && !error && records.length > 0 && (
          <div className="space-y-6">
            
            {/* Summary details card */}
            <div className="rounded-2xl border border-[#dbe7f4] bg-white p-5 shadow-xs">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="space-y-1">
                  <p className="text-xs font-bold text-secondary">آخر مقاس مسجل</p>
                  <h3 className="text-lg font-bold text-foreground">{latestDate}</h3>
                  <p className="text-xs text-muted-foreground leading-normal">
                    لديك إجمالي <span className="font-bold text-primary">{records.length}</span> {records.length === 1 ? "فحص مسجل" : "فحوصات مسجلة"}
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="bg-[#F4F8FB] border border-[#e2edf7] rounded-xl px-4 py-2.5 text-center min-w-[100px]">
                    <p className="text-[10px] text-muted-foreground font-semibold">إجمالي القراءات</p>
                    <p className="text-sm font-bold text-foreground mt-0.5">{records.length}</p>
                  </div>
                  <div className="bg-[#F4F8FB] border border-[#e2edf7] rounded-xl px-4 py-2.5 text-center min-w-[100px]">
                    <p className="text-[10px] text-muted-foreground font-semibold">تاريخ الفحص الأخير</p>
                    <p className="text-xs font-bold text-foreground mt-1">{latestDate.split(" ").slice(1).join(" ")}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* List of measurements */}
            <div className="space-y-4">
              {records.map((row: any) => (
                <RefractionRecord key={row.id ?? `${row.createdAt}-${row.visitDate}`} row={row} />
              ))}
            </div>

          </div>
        )}
      </div>
    </PatientLayout>
  );
}
