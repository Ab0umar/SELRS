import { RefreshCw, ShieldAlert, Pill } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import PatientLayout from "./PatientLayout";
import {
  PortalEmptyState,
  PortalLoadingRows,
  PortalMetric,
  PortalPanel,
  PortalShell,
  PortalStatusBadge,
  formatArabicDate,
} from "./portal-ui";

function valueText(value: unknown) {
  if (value === null || value === undefined || value === "") return "—";
  return String(value);
}

export default function PatientPrescription() {
  const { data, isLoading, error, refetch } = trpc.patientPortal.getMyPrescriptions.useQuery();

  const records = data ?? [];
  const latest = records[0] as any | undefined;
  const latestDate = formatArabicDate(latest?.prescriptionDate ?? latest?.createdAt);

  return (
    <PatientLayout>
      <PortalShell
        title="الروشتة"
        subtitle="الروشتات السابقة مع الأدوية والتعليمات كما هي مسجلة في جدول الوصفات."
      >
        {isLoading && <PortalLoadingRows rows={3} />}

        {error && (
          <PortalEmptyState
            icon={<ShieldAlert className="size-5" />}
            title="تعذر تحميل الروشتات"
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
            icon={<Pill className="size-5" />}
            title="لا توجد روشتات مسجلة"
            description="عند إصدار روشتة جديدة ستظهر هنا مع الدواء والتعليمات."
          />
        )}

        {!isLoading && !error && records.length > 0 && (
          <div className="space-y-4">
            <PortalPanel>
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="space-y-2">
                  <p className="text-sm font-medium text-secondary">آخر وصفة</p>
                  <h2 className="text-xl font-semibold text-foreground">{latestDate}</h2>
                  <p className="max-w-2xl text-sm leading-6 text-muted-foreground">
                    {records.length} {records.length === 1 ? "وصفة" : "وصفات"} مسجلة في جدول prescriptions.
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                  <PortalMetric label="عدد الوصفات" value={records.length} tone="blue" />
                  <PortalMetric label="آخر تاريخ" value={latestDate} tone="orange" />
                </div>
              </div>
            </PortalPanel>

            <div className="space-y-4">
              {records.map((row: any) => (
                <PortalPanel
                  key={row.id}
                  title={formatArabicDate(row.prescriptionDate ?? row.createdAt)}
                  description={row.notes ? "ملاحظات الوصفة مرفقة أسفل العناصر" : "لا توجد ملاحظات إضافية لهذه الوصفة"}
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between gap-2">
                      <PortalStatusBadge status="confirmed" label={`${row.items?.length ?? 0} عناصر`} />
                      <span className="text-xs text-muted-foreground">ID {row.id}</span>
                    </div>

                    {Array.isArray(row.items) && row.items.length > 0 ? (
                      <div className="grid gap-3 lg:grid-cols-2">
                        {row.items.map((item: any, index: number) => (
                          <div key={item.id ?? index} className="rounded-[1.25rem] border border-[#dbe7f4] bg-[#fbfdff] p-4">
                            <div className="flex flex-wrap items-start justify-between gap-2">
                              <div className="min-w-0">
                                <p className="text-sm font-semibold text-foreground">{valueText(item.medicationName)}</p>
                                <p className="text-xs leading-5 text-muted-foreground">
                                  {valueText(item.dosage)} {item.frequency ? `• ${item.frequency}` : ""}
                                </p>
                              </div>
                              <span className="rounded-full bg-secondary/10 px-3 py-1 text-[11px] font-medium text-secondary">
                                {valueText(item.duration)}
                              </span>
                            </div>
                            {item.instructions && (
                              <p className="mt-3 rounded-xl bg-white px-3 py-2 text-sm leading-6 text-muted-foreground">
                                {valueText(item.instructions)}
                              </p>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <PortalEmptyState
                        icon={<Pill className="size-5" />}
                        title="لا توجد عناصر داخل هذه الروشتة"
                        description="تم حفظ الوصفة بدون قائمة أدوية مرتبطة."
                      />
                    )}

                    {row.notes && (
                      <div className="rounded-[1.25rem] border border-border bg-muted/20 p-4">
                        <p className="text-sm font-semibold text-foreground">ملاحظات</p>
                        <p className="mt-1 whitespace-pre-wrap text-sm leading-7 text-muted-foreground">{row.notes}</p>
                      </div>
                    )}
                  </div>
                </PortalPanel>
              ))}
            </div>
          </div>
        )}
      </PortalShell>
    </PatientLayout>
  );
}
