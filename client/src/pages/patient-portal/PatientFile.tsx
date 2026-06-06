import { RefreshCw, Stethoscope, ShieldAlert, BadgeInfo } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import PatientLayout from "./PatientLayout";
import {
  PortalEmptyState,
  PortalLoadingRows,
  PortalMetric,
  PortalPanel,
  PortalShell,
  formatArabicDate,
} from "./portal-ui";

const GENDER_LABEL: Record<string, string> = { male: "ذكر", female: "أنثى" };
const STATUS_LABEL: Record<string, string> = { new: "جديد", followup: "متابعة", archived: "محفوظ" };
const SERVICE_LABEL: Record<string, string> = {
  consultant: "استشاري",
  specialist: "أخصائي",
  lasik: "ليزك",
  surgery: "عملية",
  external: "خارجي",
};

function DetailItem({ label, value }: { label: string; value?: string | number | null }) {
  if (value === null || value === undefined || value === "") return null;
  return (
    <div className="flex items-start justify-between gap-4 border-b border-border py-3 last:border-0 last:pb-0">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="text-sm font-medium text-foreground text-left">{String(value)}</span>
    </div>
  );
}

export default function PatientFile() {
  const { data, isLoading, error, refetch } = trpc.patientPortal.getMyProfile.useQuery();

  return (
    <PatientLayout>
      <PortalShell
        title="ملفي الطبي"
        subtitle="ملخص واضح للبيانات الأساسية، ثم التاريخ المرضي والهوية الطبية في بطاقات منفصلة."
      >
        {isLoading && <PortalLoadingRows rows={3} />}

        {error && (
          <PortalEmptyState
            icon={<ShieldAlert className="size-5" />}
            title="تعذر تحميل الملف"
            description={error.message}
            action={
              <Button onClick={() => void refetch()} className="gap-2">
                <RefreshCw className="size-4" />
                إعادة المحاولة
              </Button>
            }
          />
        )}

        {data && (
          <div className="space-y-4">
            <div className="overflow-hidden rounded-[2rem] border border-[#dbe7f4] bg-white shadow-[0_12px_36px_rgba(28,64,104,0.06)]">
              <div className="bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.24),transparent_28%),radial-gradient(circle_at_top_right,rgba(255,255,255,0.24),transparent_28%),linear-gradient(180deg,#002A63_0%,#0F4E93_38%,#DDEAF7_79%,#F8FAFC_100%)] px-4 pb-6 pt-5 text-white sm:px-6 sm:pb-8 lg:px-10 lg:pb-10">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-xl font-semibold text-white">{data.fullName}</h2>
                      <Badge variant="outline" className="border-white/40 bg-white/12 text-white">
                        {data.patientCode}
                      </Badge>
                      {data.status && (
                        <Badge variant="secondary" className="bg-secondary text-secondary-foreground">
                          {STATUS_LABEL[data.status] ?? data.status}
                        </Badge>
                      )}
                    </div>
                    <p className="max-w-2xl text-sm leading-6 text-white/90">
                      {data.serviceType ? `الخدمة: ${SERVICE_LABEL[data.serviceType] ?? data.serviceType}` : "الملف الطبي الرئيسي للمريض."}
                    </p>
                  </div>
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                    <PortalMetric label="الجنس" value={data.gender ? GENDER_LABEL[data.gender] ?? data.gender : "غير محدد"} tone="neutral" />
                    <PortalMetric label="العمر" value={data.age ? `${data.age} سنة` : "غير محدد"} tone="blue" />
                    <PortalMetric label="الزيارة الأخيرة" value={formatArabicDate(data.lastVisit)} tone="orange" />
                    <PortalMetric label="الحالة" value={data.status ? STATUS_LABEL[data.status] ?? data.status : "غير محدد"} tone="neutral" />
                  </div>
                </div>
              </div>
            </div>

            <div className="grid gap-4 lg:grid-cols-[1fr]">
              <PortalPanel
                title="البيانات الأساسية"
                description="معلومات الاتصال والهوية في موضع واحد، مع أولوية للقراءة السريعة."
              >
                <div className="space-y-0.5">
                  <DetailItem label="تاريخ الميلاد" value={formatArabicDate(data.dateOfBirth)} />
                  <DetailItem label="رقم الموبايل" value={data.phone} />
                  <DetailItem label="العنوان" value={data.address} />
                  <DetailItem label="آخر زيارة" value={formatArabicDate(data.lastVisit)} />
                </div>
              </PortalPanel>
            </div>

            {(data.medicalHistory || data.allergies) ? (
              <PortalPanel
                title="التاريخ المرضي"
                description="المعلومات التي يحتاجها المريض ومقدم الخدمة عند الرجوع للملف."
              >
                <div className="grid gap-4 lg:grid-cols-2">
                  <div className="rounded-xl border border-border bg-background p-4">
                    <div className="mb-2 flex items-center gap-2">
                      <Stethoscope className="size-4 text-primary" />
                      <p className="text-sm font-semibold text-foreground">الأمراض السابقة</p>
                    </div>
                    <p className="whitespace-pre-wrap text-sm leading-7 text-muted-foreground">
                      {data.medicalHistory || "لا توجد بيانات مسجلة"}
                    </p>
                  </div>
                  <div className="rounded-xl border border-border bg-background p-4">
                    <div className="mb-2 flex items-center gap-2">
                      <ShieldAlert className="size-4 text-secondary" />
                      <p className="text-sm font-semibold text-foreground">الحساسية</p>
                    </div>
                    <p className="whitespace-pre-wrap text-sm leading-7 text-muted-foreground">
                      {data.allergies || "لا توجد حساسية مسجلة"}
                    </p>
                  </div>
                </div>
              </PortalPanel>
            ) : (
              <PortalEmptyState
                icon={<BadgeInfo className="size-5" />}
                title="لا توجد ملاحظات مرضية مسجلة"
                description="يمكنك متابعة الاستقبال إذا كانت هناك بيانات تحتاج إلى استكمال."
              />
            )}
          </div>
        )}
      </PortalShell>
    </PatientLayout>
  );
}
