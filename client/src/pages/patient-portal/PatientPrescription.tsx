import {
  RefreshCw,
  ShieldAlert,
  Pill,
  Printer,
  ArrowLeft,
  ClipboardList,
} from "lucide-react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import PatientLayout from "./PatientLayout";
import {
  PortalEmptyState,
  PortalLoadingRows,
  formatArabicDate,
} from "./portal-ui";

function valueText(value: unknown) {
  if (value === null || value === undefined || value === "") return "—";
  return String(value);
}

function PrescriptionCard({ row }: { row: any }) {
  const dateStr = formatArabicDate(row.prescriptionDate ?? row.createdAt);

  const handlePrint = (e: React.MouseEvent) => {
    e.stopPropagation();
    window.print();
  };

  return (
    <div className="bg-white border border-[#dbe7f4] rounded-2xl p-6 shadow-xs space-y-6 print:border-0 print:shadow-none print:p-0">
      {/* Clinic Header Stamp on Prescription */}
      <div className="flex items-center justify-between border-b border-[#f0f5fa] pb-4">
        <div className="space-y-1">
          <span className="bg-primary/10 text-primary text-[10px] font-bold px-2.5 py-0.5 rounded-lg uppercase">
            روشتة طبية
          </span>
          <h3 className="text-base font-bold text-foreground">{dateStr}</h3>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={handlePrint}
          className="h-9 gap-1.5 border-[#dbe7f4] hover:bg-muted/40 rounded-xl text-xs cursor-pointer print:hidden"
        >
          <Printer className="size-4" />
          <span>طباعة الروشتة</span>
        </Button>
      </div>

      {/* Medication items */}
      <div className="space-y-4">
        {Array.isArray(row.items) && row.items.length > 0 ? (
          <div className="grid gap-3.5 sm:grid-cols-2">
            {row.items.map((item: any, index: number) => (
              <div
                key={item.id ?? index}
                className="rounded-xl border border-[#e2edf7] bg-[#F4F8FB]/30 p-4 space-y-2"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <div className="size-8 rounded-lg bg-secondary/10 text-secondary flex items-center justify-center shrink-0">
                      <Pill className="size-4" />
                    </div>
                    <p className="text-sm font-bold text-foreground">
                      {valueText(item.medicationName)}
                    </p>
                  </div>
                  <span className="rounded-lg bg-secondary/10 px-2.5 py-0.5 text-[10px] font-bold text-secondary">
                    {valueText(item.duration)}
                  </span>
                </div>

                <div className="text-xs text-muted-foreground leading-normal pr-10">
                  <span className="font-semibold text-foreground">
                    الجرعة:{" "}
                  </span>
                  {valueText(item.dosage)}{" "}
                  {item.frequency ? `• ${item.frequency}` : ""}
                </div>

                {item.instructions && (
                  <div className="mt-2 pr-10">
                    <p className="rounded-lg bg-white border border-[#e2edf7]/60 px-3 py-2 text-xs leading-5 text-muted-foreground">
                      <span className="font-semibold text-foreground">
                        تعليمات:{" "}
                      </span>
                      {valueText(item.instructions)}
                    </p>
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <PortalEmptyState
            icon={<Pill className="size-5" />}
            title="لا توجد أدوية مضافة"
            description="تم تسجيل الروشتة في الاستقبال بدون قائمة علاجات تفصيلية."
          />
        )}
      </div>

      {/* Notes */}
      {row.notes && (
        <div className="rounded-xl border border-[#dbe7f4] bg-[#F4F8FB]/50 p-4 space-y-1">
          <p className="text-xs font-bold text-foreground">توجيهات الطبيب</p>
          <p className="text-xs leading-6 text-muted-foreground whitespace-pre-wrap">
            {row.notes}
          </p>
        </div>
      )}
    </div>
  );
}

export default function PatientPrescription() {
  const { data, isLoading, error, refetch } =
    trpc.patientPortal.getMyPrescriptions.useQuery();

  const records = data ?? [];
  const latest = records[0] as any | undefined;
  const latestDate = formatArabicDate(
    latest?.prescriptionDate ?? latest?.createdAt,
  );

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
        {/* Title Header */}
        <div className="flex items-center justify-between gap-3">
          <div className="space-y-1">
            <h2 className="text-xl font-bold text-primary">
              روشتاتي الدوائية 💊
            </h2>
            <p className="text-xs text-muted-foreground">
              قائمة بالوصفات الطبية والعلاجات الصادرة لك من الأطباء بالمركز.
            </p>
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
            title="تعذر تحميل الروشتات"
            description={error.message}
            action={
              <Button
                onClick={() => void refetch()}
                className="gap-2 cursor-pointer"
              >
                <RefreshCw className="size-4" />
                إعادة المحاولة
              </Button>
            }
          />
        )}

        {!isLoading && !error && records.length === 0 && (
          <PortalEmptyState
            icon={<ClipboardList className="size-5" />}
            title="لا توجد روشتات مسجلة"
            description="عند كتابة روشتة أو علاج جديد لك في المركز ستظهر هنا مباشرة."
          />
        )}

        {!isLoading && !error && records.length > 0 && (
          <div className="space-y-6">
            {/* Quick summary stats card */}
            <div className="rounded-2xl border border-[#dbe7f4] bg-white p-5 shadow-xs">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="space-y-1">
                  <p className="text-xs font-bold text-secondary">
                    آخر روشتة صادرة
                  </p>
                  <h3 className="text-lg font-bold text-foreground">
                    {latestDate}
                  </h3>
                  <p className="text-xs text-muted-foreground leading-normal">
                    لديك إجمالي{" "}
                    <span className="font-bold text-primary">
                      {records.length}
                    </span>{" "}
                    {records.length === 1 ? "روشتة مسجلة" : "روشتات مسجلة"}
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="bg-[#F4F8FB] border border-[#e2edf7] rounded-xl px-4 py-2.5 text-center min-w-[100px]">
                    <p className="text-[10px] text-muted-foreground font-semibold">
                      عدد الروشتات
                    </p>
                    <p className="text-sm font-bold text-foreground mt-0.5">
                      {records.length}
                    </p>
                  </div>
                  <div className="bg-[#F4F8FB] border border-[#e2edf7] rounded-xl px-4 py-2.5 text-center min-w-[100px]">
                    <p className="text-[10px] text-muted-foreground font-semibold">
                      تاريخ آخر روشتة
                    </p>
                    <p className="text-xs font-bold text-foreground mt-1">
                      {latestDate.split(" ").slice(1).join(" ")}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* List of prescription sheets */}
            <div className="space-y-6">
              {records.map((row: any) => (
                <PrescriptionCard key={row.id} row={row} />
              ))}
            </div>
          </div>
        )}
      </div>
    </PatientLayout>
  );
}
