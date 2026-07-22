import {
  RefreshCw,
  Stethoscope,
  ShieldAlert,
  BadgeInfo,
  Glasses,
  Pill,
  ScanLine,
  CalendarDays,
  UserRound,
  Phone,
  MapPin,
  Calendar,
} from "lucide-react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import PatientLayout from "./PatientLayout";
import { Link } from "wouter";
import {
  PortalEmptyState,
  PortalLoadingRows,
  PortalPanel,
  formatArabicDate,
} from "./portal-ui";

const GENDER_LABEL: Record<string, string> = { male: "ذكر", female: "أنثى" };
const STATUS_LABEL: Record<string, string> = {
  new: "جديد",
  followup: "متابعة",
  archived: "محفوظ",
};
const SERVICE_LABEL: Record<string, string> = {
  consultant: "استشاري",
  specialist: "أخصائي",
  lasik: "ليزك",
  surgery: "عملية",
  external: "خارجي",
};

function DetailItem({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value?: string | number | null;
  icon?: any;
}) {
  if (value === null || value === undefined || value === "") return null;
  return (
    <div className="flex items-center justify-between gap-4 border-b border-[#f0f5fa] py-3.5 last:border-0 last:pb-0">
      <div className="flex items-center gap-2">
        {Icon && <Icon className="size-4 text-muted-foreground" />}
        <span className="text-sm font-semibold text-muted-foreground">
          {label}
        </span>
      </div>
      <span className="text-sm font-bold text-foreground text-left">
        {String(value)}
      </span>
    </div>
  );
}

export default function PatientFile() {
  const { data, isLoading, error, refetch } =
    trpc.patientPortal.getMyProfile.useQuery();
  const structuredHistory = (data as any)?.medicalHistoryChecklist;
  const structuredHistoryLabels = structuredHistory
    ? [
        structuredHistory.diabetes && "السكري",
        structuredHistory.hypertension && "ضغط الدم",
        structuredHistory.heartDisease && "أمراض القلب",
        structuredHistory.asthma && "الربو",
        structuredHistory.thyroid && "الغدة الدرقية",
        structuredHistory.autoimmune && "أمراض مناعية",
        structuredHistory.glaucoma && "المياه الزرقاء",
        structuredHistory.familyKeratoconus && "قرنية مخروطية بالعائلة",
        structuredHistory.previousSurgeries &&
          `عمليات سابقة: ${structuredHistory.previousSurgeries}`,
        structuredHistory.medications &&
          `أدوية حالية: ${structuredHistory.medications}`,
        structuredHistory.familyHistory &&
          `تاريخ عائلي: ${structuredHistory.familyHistory}`,
      ].filter(Boolean)
    : [];
  const displayedMedicalHistory =
    structuredHistoryLabels.join("، ") || data?.medicalHistory || "";
  const displayedAllergies = structuredHistory?.allergies
    ? "توجد حساسية عامة مسجلة"
    : data?.allergies || "";

  return (
    <PatientLayout>
      <div className="space-y-6">
        {isLoading && <PortalLoadingRows rows={3} />}

        {error && (
          <PortalEmptyState
            icon={<ShieldAlert className="size-5" />}
            title="تعذر تحميل الملف"
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

        {data && (
          <>
            {/* Friendly Top Welcome greeting */}
            <div className="space-y-1">
              <h2 className="text-xl font-bold text-primary">
                أهلاً بك، {data.fullName.split(" ")[0]} 👋
              </h2>
              <p className="text-xs text-muted-foreground">
                مرحباً بك في بوابتك الطبية الإلكترونية لمتابعة ملفك وحجوزاتك.
              </p>
            </div>

            {/* Premium Passport-Style Patient Profile Card */}
            <div className="rounded-2xl border border-[#dbe7f4] bg-white p-5 shadow-xs">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                {/* Profile Photo/Initial Badge and core status */}
                <div className="flex items-center gap-4">
                  <div className="size-16 shrink-0 bg-[#003D82] text-white font-bold text-xl rounded-2xl flex items-center justify-center shadow-xs">
                    {data.fullName.trim().charAt(0)}
                  </div>
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-lg font-bold text-foreground">
                        {data.fullName}
                      </h3>
                      {data.status && (
                        <Badge className="bg-secondary/15 text-secondary border-0 hover:bg-secondary/20 font-bold px-2.5 py-0.5 rounded-lg text-[10px]">
                          {STATUS_LABEL[data.status] ?? data.status}
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground leading-none">
                      كود المريض:{" "}
                      <span className="font-bold text-[#003D82] font-mono">
                        {data.patientCode}
                      </span>
                    </p>
                  </div>
                </div>

                {/* Info parameters stamps */}
                <div className="grid grid-cols-3 gap-2 w-full md:w-auto md:min-w-[360px]">
                  <div className="bg-[#F4F8FB] border border-[#e2edf7] rounded-xl p-2.5 text-center">
                    <p className="text-[10px] font-semibold text-muted-foreground">
                      الجنس
                    </p>
                    <p className="text-xs font-bold text-foreground mt-0.5">
                      {data.gender
                        ? (GENDER_LABEL[data.gender] ?? data.gender)
                        : "غير محدد"}
                    </p>
                  </div>
                  <div className="bg-[#F4F8FB] border border-[#e2edf7] rounded-xl p-2.5 text-center">
                    <p className="text-[10px] font-semibold text-muted-foreground">
                      العمر
                    </p>
                    <p className="text-xs font-bold text-foreground mt-0.5">
                      {data.age ? `${data.age} سنة` : "غير محدد"}
                    </p>
                  </div>
                  <div className="bg-[#F4F8FB] border border-[#e2edf7] rounded-xl p-2.5 text-center">
                    <p className="text-[10px] font-semibold text-muted-foreground">
                      آخر زيارة
                    </p>
                    <p className="text-xs font-bold text-foreground mt-0.5">
                      {formatArabicDate(data.lastVisit)}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Actions Grid for Patients */}
            <div className="space-y-2.5">
              <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                الوصول السريع للخدمات
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-3.5">
                <Link href="/my/refraction">
                  <div className="bg-white border border-[#dbe7f4] rounded-2xl p-4 text-center space-y-3 shadow-xs hover:border-primary/30 transition-all duration-200 cursor-pointer h-full flex flex-col justify-center items-center">
                    <div className="size-11 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                      <Glasses className="size-5" />
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs font-bold text-foreground">
                        مقاس النظارة
                      </p>
                      <p className="text-[10px] text-muted-foreground">
                        آخر قياسات البصر
                      </p>
                    </div>
                  </div>
                </Link>

                <Link href="/my/prescription">
                  <div className="bg-white border border-[#dbe7f4] rounded-2xl p-4 text-center space-y-3 shadow-xs hover:border-primary/30 transition-all duration-200 cursor-pointer h-full flex flex-col justify-center items-center">
                    <div className="size-11 rounded-xl bg-secondary/10 text-secondary flex items-center justify-center">
                      <Pill className="size-5" />
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs font-bold text-foreground">
                        روشتاتي الدوائية
                      </p>
                      <p className="text-[10px] text-muted-foreground">
                        العلاجات والجرعات
                      </p>
                    </div>
                  </div>
                </Link>

                <Link href="/my/scans">
                  <div className="bg-white border border-[#dbe7f4] rounded-2xl p-4 text-center space-y-3 shadow-xs hover:border-primary/30 transition-all duration-200 cursor-pointer h-full flex flex-col justify-center items-center">
                    <div className="size-11 rounded-xl bg-success/10 text-success flex items-center justify-center">
                      <ScanLine className="size-5" />
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs font-bold text-foreground">
                        الأشعة والفحوصات
                      </p>
                      <p className="text-[10px] text-muted-foreground">
                        تقارير وصور العين
                      </p>
                    </div>
                  </div>
                </Link>

                <Link href="/my/book">
                  <div className="bg-white border border-[#dbe7f4] rounded-2xl p-4 text-center space-y-3 shadow-xs hover:border-primary/30 transition-all duration-200 cursor-pointer h-full flex flex-col justify-center items-center">
                    <div className="size-11 rounded-xl bg-muted/40 text-muted-foreground flex items-center justify-center">
                      <CalendarDays className="size-5" />
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs font-bold text-foreground">
                        حجز موعد جديد
                      </p>
                      <p className="text-[10px] text-muted-foreground">
                        اختيار موعد بالعيادة
                      </p>
                    </div>
                  </div>
                </Link>

                <Link href="/my/bookings" className="col-span-2 md:col-span-1">
                  <div className="bg-white border border-[#dbe7f4] rounded-2xl p-4 text-center space-y-3 shadow-xs hover:border-primary/30 transition-all duration-200 cursor-pointer h-full flex flex-col justify-center items-center">
                    <div className="size-11 rounded-xl bg-primary/10 text-primary flex items-center justify-center mx-auto">
                      <UserRound className="size-5" />
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs font-bold text-foreground">
                        مواعيدي السابقة
                      </p>
                      <p className="text-[10px] text-muted-foreground">
                        قائمة الحجوزات وحالتها
                      </p>
                    </div>
                  </div>
                </Link>
              </div>
            </div>

            {/* Medical details page blocks */}
            <div className="grid gap-6 md:grid-cols-2">
              {/* Contact details */}
              <div className="bg-white border border-[#dbe7f4] rounded-2xl p-5 shadow-xs space-y-4">
                <div className="border-b border-[#f0f5fa] pb-2">
                  <h4 className="text-sm font-bold text-foreground">
                    البيانات الشخصية والاتصال
                  </h4>
                  <p className="text-[10px] text-muted-foreground">
                    المسجلة في استقبال المركز
                  </p>
                </div>
                <div className="space-y-0.5">
                  <DetailItem
                    label="تاريخ الميلاد"
                    value={formatArabicDate(data.dateOfBirth)}
                    icon={Calendar}
                  />
                  <DetailItem
                    label="رقم الموبايل"
                    value={data.phone}
                    icon={Phone}
                  />
                  <DetailItem
                    label="العنوان"
                    value={data.address}
                    icon={MapPin}
                  />
                  <DetailItem
                    label="فئة الخدمة"
                    value={
                      data.serviceType
                        ? (SERVICE_LABEL[data.serviceType] ?? data.serviceType)
                        : null
                    }
                    icon={BadgeInfo}
                  />
                </div>
              </div>

              {/* Medical History */}
              <div className="bg-white border border-[#dbe7f4] rounded-2xl p-5 shadow-xs space-y-4">
                <div className="border-b border-[#f0f5fa] pb-2">
                  <h4 className="text-sm font-bold text-foreground">
                    التاريخ المرضي والحساسية
                  </h4>
                  <p className="text-[10px] text-muted-foreground">
                    معلومات طبية هامة لسلامتك
                  </p>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="rounded-xl border border-[#dbe7f4] bg-[#F4F8FB]/40 p-4 space-y-2">
                    <div className="flex items-center gap-1.5 font-bold text-xs text-primary">
                      <Stethoscope className="size-4" />
                      <span>الأمراض السابقة</span>
                    </div>
                    <p className="text-xs leading-6 text-muted-foreground whitespace-pre-wrap">
                      {displayedMedicalHistory || "لا توجد أمراض مسجلة"}
                    </p>
                  </div>

                  <div className="rounded-xl border border-[#dbe7f4] bg-[#F4F8FB]/40 p-4 space-y-2">
                    <div className="flex items-center gap-1.5 font-bold text-xs text-secondary">
                      <ShieldAlert className="size-4" />
                      <span>حالات الحساسية</span>
                    </div>
                    <p className="text-xs leading-6 text-muted-foreground whitespace-pre-wrap">
                      {displayedAllergies || "لا توجد حساسية مسجلة"}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </PatientLayout>
  );
}
