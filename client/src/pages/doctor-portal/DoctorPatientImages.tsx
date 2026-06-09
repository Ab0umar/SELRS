import { useRoute, useLocation } from "wouter";
import { useState } from "react";
import {
  ArrowRight,
  Download,
  Eye,
  FileImage,
  FileText,
  RefreshCw,
  ShieldAlert,
  Glasses,
  Pill,
  Calendar,
  Phone,
  MapPin,
  BadgeInfo,
  Stethoscope,
  Printer,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { trpc } from "@/lib/trpc";
import { cn } from "@/lib/utils";
import DoctorLayout from "./DoctorLayout";
import {
  PortalEmptyState,
  PortalLoadingRows,
  formatArabicDate,
} from "../patient-portal/portal-ui";

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

function mimeIcon(mime: string) {
  if (mime.startsWith("image/")) return FileImage;
  return FileText;
}

function formatScanDate(value?: string) {
  if (!value) return "غير محدد";
  const date = new Date(value);
  return date.toLocaleDateString("ar-EG");
}

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

function v(value: unknown) {
  if (value === null || value === undefined || value === "") return "—";
  return String(value);
}

function EyeCard({
  side,
  sph,
  cyl,
  axis,
  va,
  pd,
}: {
  side: "OS" | "OD";
  sph: unknown;
  cyl: unknown;
  axis: unknown;
  va?: string;
  pd?: unknown;
}) {
  const isOS = side === "OS";
  const cols = isOS
    ? [
        { l: "SPH", val: sph },
        { l: "CYL", val: cyl },
        { l: "AXIS", val: axis },
        { l: "PD", val: pd },
      ]
    : [
        { l: "SPH", val: sph },
        { l: "CYL", val: cyl },
        { l: "AXIS", val: axis },
      ];
  return (
    <div
      className={`flex-1 rounded-xl border p-4.5 transition-all duration-200 ${isOS ? "border-blue-100 bg-blue-50/30" : "border-emerald-100 bg-emerald-50/30"}`}
    >
      <div className="mb-3 flex items-center justify-between">
        <span
          className={`rounded-lg px-2.5 py-0.5 text-xs font-bold ${isOS ? "bg-blue-100 text-blue-700" : "bg-emerald-100 text-emerald-700"}`}
          dir="ltr"
        >
          {side}
        </span>
        <span className="text-xs font-bold text-muted-foreground">
          {isOS ? "العين اليسرى" : "العين اليمنى"}
        </span>
      </div>
      <div
        className={`grid gap-2 ${isOS ? "grid-cols-4" : "grid-cols-3"}`}
        dir="ltr"
      >
        {cols.map(({ l, val }) => (
          <div
            key={l}
            className="rounded-xl border border-white bg-white/90 p-2 text-center shadow-xs"
          >
            <div className="text-[11px] font-bold text-muted-foreground">
              {l}
            </div>
            <div className="mt-1 text-base font-black text-foreground">
              {v(val)}
            </div>
          </div>
        ))}
      </div>
      {va && va !== "—" && (
        <div
          className="mt-3 rounded-xl border border-white bg-white/90 px-3 py-1.5 flex justify-between items-center"
          dir="ltr"
        >
          <span className="text-[10px] font-bold text-muted-foreground">
            V/A
          </span>
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
      <div className="flex items-center justify-between border-b border-[#f0f5fa] pb-2">
        <div className="space-y-0.5">
          <h3 className="text-sm font-bold text-foreground">{visitDate}</h3>
          <p className="text-[10px] text-muted-foreground">
            قياسات بصرية مسجلة بالعيادة
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={handlePrint}
          className="h-8 gap-1.5 border-[#dbe7f4] hover:bg-muted/40 rounded-lg text-xs cursor-pointer print:hidden"
        >
          <Printer className="size-3.5" />
          <span>طباعة</span>
        </Button>
      </div>

      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row gap-3.5" dir="rtl">
          <EyeCard
            side="OS"
            sph={row.sOS}
            cyl={row.cOS}
            axis={row.axisOS}
            va={v(row.bcvaOS)}
            pd={row.pdOS}
          />
          <EyeCard
            side="OD"
            sph={row.sOD}
            cyl={row.cOD}
            axis={row.axisOD}
            va={v(row.bcvaOD)}
          />
        </div>

        {row.notes && (
          <div
            className="rounded-xl border border-border bg-[#F4F8FB]/40 p-4"
            dir="rtl"
          >
            <p className="text-xs font-bold text-foreground">ملاحظات الطبيب</p>
            <p className="mt-1 whitespace-pre-wrap text-xs leading-6 text-muted-foreground">
              {row.notes}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

function PrescriptionCard({ row }: { row: any }) {
  const dateStr = formatArabicDate(row.prescriptionDate ?? row.createdAt);

  const handlePrint = (e: React.MouseEvent) => {
    e.stopPropagation();
    window.print();
  };

  return (
    <div className="bg-white border border-[#dbe7f4] rounded-2xl p-6 shadow-xs space-y-6 print:border-0 print:shadow-none print:p-0">
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
                    <div className="size-8 rounded-lg bg-orange-50 text-orange-600 flex items-center justify-center shrink-0">
                      <Pill className="size-4" />
                    </div>
                    <p className="text-sm font-bold text-foreground">
                      {v(item.medicationName)}
                    </p>
                  </div>
                  <span className="rounded-lg bg-secondary/10 px-2.5 py-0.5 text-[10px] font-bold text-secondary">
                    {v(item.duration)}
                  </span>
                </div>

                <div className="text-xs text-muted-foreground leading-normal pr-10">
                  <span className="font-semibold text-foreground">
                    الجرعة:{" "}
                  </span>
                  {v(item.dosage)} {item.frequency ? `• ${item.frequency}` : ""}
                </div>

                {item.instructions && (
                  <div className="mt-2 pr-10">
                    <p className="rounded-lg bg-white border border-[#e2edf7]/60 px-3 py-2 text-xs leading-5 text-muted-foreground">
                      <span className="font-semibold text-foreground">
                        تعليمات:{" "}
                      </span>
                      {v(item.instructions)}
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

export default function DoctorPatientImages() {
  const [, params] = useRoute("/doctor-portal/patient/:patientCode");
  const [, navigate] = useLocation();
  const patientCode = params?.patientCode ?? "";
  const [activeTab, setActiveTab] = useState<
    "profile" | "refractions" | "prescriptions" | "images"
  >("profile");

  const { data, isLoading, error, refetch } =
    trpc.doctorPortal.getPatientImages.useQuery(
      { patientCode },
      { enabled: Boolean(patientCode) },
    );

  return (
    <DoctorLayout>
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            className="gap-2 border-[#d8e4f1] bg-white text-primary hover:bg-[#f7fbff] cursor-pointer"
            onClick={() => navigate("/doctor-portal/dashboard")}
          >
            <ArrowRight className="size-4" />
            رجوع
          </Button>
          <div className="min-w-0 flex-1">
            <h2 className="text-xl font-bold text-primary">
              {data?.patientName
                ? `الملف الطبي للمريض: ${data.patientName}`
                : "ملف المريض"}
            </h2>
            <p className="text-xs text-muted-foreground font-mono">
              {patientCode}
            </p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => void refetch()}
            className="text-muted-foreground cursor-pointer"
          >
            <RefreshCw className="size-4" />
          </Button>
        </div>

        {isLoading && <PortalLoadingRows rows={4} />}

        {error && (
          <div className="flex flex-col items-center gap-3 rounded-xl border border-destructive/20 bg-destructive/5 px-4 py-8 text-center">
            <ShieldAlert className="size-8 text-destructive/60" />
            <p className="text-sm font-medium text-destructive">
              {error.message}
            </p>
            <Button
              size="sm"
              variant="outline"
              onClick={() => void refetch()}
              className="cursor-pointer"
            >
              إعادة المحاولة
            </Button>
          </div>
        )}

        {data && data.patient && (
          <>
            {/* Premium Passport-Style Patient Profile Card */}
            <div className="rounded-2xl border border-[#dbe7f4] bg-white p-5 shadow-xs">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                {/* Profile Photo/Initial Badge and status */}
                <div className="flex items-center gap-4">
                  <div className="size-16 shrink-0 bg-[#003D82] text-white font-bold text-xl rounded-2xl flex items-center justify-center shadow-xs">
                    {data.patient.fullName.trim().charAt(0)}
                  </div>
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-lg font-bold text-foreground">
                        {data.patient.fullName}
                      </h3>
                      {data.patient.status && (
                        <Badge className="bg-secondary/15 text-secondary border-0 hover:bg-secondary/20 font-bold px-2.5 py-0.5 rounded-lg text-[10px] pointer-events-none">
                          {STATUS_LABEL[data.patient.status] ??
                            data.patient.status}
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground leading-none">
                      كود المريض:{" "}
                      <span className="font-bold text-[#003D82] font-mono">
                        {data.patient.patientCode}
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
                      {data.patient.gender
                        ? (GENDER_LABEL[data.patient.gender] ??
                          data.patient.gender)
                        : "غير محدد"}
                    </p>
                  </div>
                  <div className="bg-[#F4F8FB] border border-[#e2edf7] rounded-xl p-2.5 text-center">
                    <p className="text-[10px] font-semibold text-muted-foreground">
                      العمر
                    </p>
                    <p className="text-xs font-bold text-foreground mt-0.5">
                      {data.patient.age
                        ? `${data.patient.age} سنة`
                        : "غير محدد"}
                    </p>
                  </div>
                  <div className="bg-[#F4F8FB] border border-[#e2edf7] rounded-xl p-2.5 text-center">
                    <p className="text-[10px] font-semibold text-muted-foreground">
                      آخر زيارة
                    </p>
                    <p className="text-xs font-bold text-foreground mt-0.5">
                      {formatArabicDate(data.patient.lastVisit)}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Navigation Tabs */}
            <div className="flex border-b border-[#e2edf7] overflow-x-auto gap-2 py-1 scrollbar-none">
              <button
                onClick={() => setActiveTab("profile")}
                className={cn(
                  "px-4 py-2 text-xs sm:text-sm font-bold rounded-xl transition-all cursor-pointer whitespace-nowrap",
                  activeTab === "profile"
                    ? "bg-[#003D82] text-white shadow-xs"
                    : "text-muted-foreground hover:bg-[#eef4fa] hover:text-primary",
                )}
              >
                الملف الشخصي والبيانات
              </button>
              <button
                onClick={() => setActiveTab("refractions")}
                className={cn(
                  "px-4 py-2 text-xs sm:text-sm font-bold rounded-xl transition-all cursor-pointer whitespace-nowrap",
                  activeTab === "refractions"
                    ? "bg-[#003D82] text-white shadow-xs"
                    : "text-muted-foreground hover:bg-[#eef4fa] hover:text-primary",
                )}
              >
                مقاس النظارة ({data.refractions.length})
              </button>
              <button
                onClick={() => setActiveTab("prescriptions")}
                className={cn(
                  "px-4 py-2 text-xs sm:text-sm font-bold rounded-xl transition-all cursor-pointer whitespace-nowrap",
                  activeTab === "prescriptions"
                    ? "bg-[#003D82] text-white shadow-xs"
                    : "text-muted-foreground hover:bg-[#eef4fa] hover:text-primary",
                )}
              >
                الروشتات الطبية ({data.prescriptions.length})
              </button>
              <button
                onClick={() => setActiveTab("images")}
                className={cn(
                  "px-4 py-2 text-xs sm:text-sm font-bold rounded-xl transition-all cursor-pointer whitespace-nowrap",
                  activeTab === "images"
                    ? "bg-[#003D82] text-white shadow-xs"
                    : "text-muted-foreground hover:bg-[#eef4fa] hover:text-primary",
                )}
              >
                صور الأشعة والملفات ({data.images.length})
              </button>
            </div>

            {/* Tab content panels */}
            <div className="mt-2">
              {activeTab === "profile" && (
                <div className="grid gap-6 md:grid-cols-2">
                  {/* Personal/Contact Info */}
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
                        value={formatArabicDate(data.patient.dateOfBirth)}
                        icon={Calendar}
                      />
                      <DetailItem
                        label="رقم الموبايل"
                        value={data.patient.phone}
                        icon={Phone}
                      />
                      <DetailItem
                        label="العنوان"
                        value={data.patient.address}
                        icon={MapPin}
                      />
                      <DetailItem
                        label="فئة الخدمة"
                        value={
                          data.patient.serviceType
                            ? (SERVICE_LABEL[data.patient.serviceType] ??
                              data.patient.serviceType)
                            : null
                        }
                        icon={BadgeInfo}
                      />
                    </div>
                  </div>

                  {/* Medical History & Allergies */}
                  <div className="bg-white border border-[#dbe7f4] rounded-2xl p-5 shadow-xs space-y-4">
                    <div className="border-b border-[#f0f5fa] pb-2">
                      <h4 className="text-sm font-bold text-foreground">
                        التاريخ المرضي والحساسية
                      </h4>
                      <p className="text-[10px] text-muted-foreground">
                        معلومات طبية هامة لسلامة المريض
                      </p>
                    </div>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="rounded-xl border border-[#dbe7f4] bg-[#F4F8FB]/40 p-4 space-y-2">
                        <div className="flex items-center gap-1.5 font-bold text-xs text-primary">
                          <Stethoscope className="size-4" />
                          <span>الأمراض السابقة</span>
                        </div>
                        <p className="text-xs leading-6 text-muted-foreground whitespace-pre-wrap">
                          {data.patient.medicalHistory || "لا توجد أمراض مسجلة"}
                        </p>
                      </div>

                      <div className="rounded-xl border border-[#dbe7f4] bg-[#F4F8FB]/40 p-4 space-y-2">
                        <div className="flex items-center gap-1.5 font-bold text-xs text-secondary">
                          <ShieldAlert className="size-4" />
                          <span>حالات الحساسية</span>
                        </div>
                        <p className="text-xs leading-6 text-muted-foreground whitespace-pre-wrap">
                          {data.patient.allergies || "لا توجد حساسية مسجلة"}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === "refractions" && (
                <div className="space-y-4">
                  {data.refractions.length === 0 ? (
                    <PortalEmptyState
                      icon={<Glasses className="size-5" />}
                      title="لا توجد مقاسات نظارة مسجلة"
                      description="لا توجد مقاسات نظارة مسجلة لهذا المريض بالعيادة."
                    />
                  ) : (
                    data.refractions.map((row: any) => (
                      <RefractionRecord
                        key={row.id ?? `${row.createdAt}-${row.visitDate}`}
                        row={row}
                      />
                    ))
                  )}
                </div>
              )}

              {activeTab === "prescriptions" && (
                <div className="space-y-6">
                  {data.prescriptions.length === 0 ? (
                    <PortalEmptyState
                      icon={<Pill className="size-5" />}
                      title="لا توجد روشتات مسجلة"
                      description="لا توجد روشتات أو وصفات طبية مسجلة لهذا المريض."
                    />
                  ) : (
                    data.prescriptions.map((row: any) => (
                      <PrescriptionCard key={row.id} row={row} />
                    ))
                  )}
                </div>
              )}

              {activeTab === "images" && (
                <div className="space-y-4">
                  {data.images.length === 0 ? (
                    <PortalEmptyState
                      icon={<FileImage className="size-5" />}
                      title="لا توجد صور أو أشعة"
                      description="لا توجد ملفات مرفوعة لهذا المريض."
                    />
                  ) : (
                    <div className="grid gap-3.5 sm:grid-cols-2">
                      {data.images.map((scan) => {
                        const Icon = mimeIcon(scan.mimeType);
                        return (
                          <div
                            key={scan.id}
                            className="flex flex-col justify-between rounded-2xl border border-[#dbe7f4] bg-white p-5 shadow-xs hover:border-primary/20 transition-all duration-200"
                          >
                            <div className="flex items-start gap-3.5 mb-4">
                              <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                                <Icon className="size-5" />
                              </div>
                              <div className="min-w-0 space-y-1">
                                <p className="truncate text-sm font-bold text-foreground">
                                  {scan.fileName || `أشعة وفحص #${scan.id}`}
                                </p>
                                <div className="flex flex-wrap items-center gap-2 text-[10px] text-muted-foreground">
                                  <span className="rounded-lg bg-[#F4F8FB] border border-[#e2edf7] px-2 py-0.5">
                                    {scan.mimeType.split("/")[1].toUpperCase()}
                                  </span>
                                  <span>
                                    تاريخ الرفع:{" "}
                                    {formatScanDate(scan.createdAt)}
                                  </span>
                                </div>
                              </div>
                            </div>

                            <div className="flex items-center gap-2 pt-2 border-t border-[#f0f5fa]">
                              <a
                                href={scan.viewUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex-1"
                              >
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="w-full h-9 text-xs rounded-xl gap-1.5 border-[#dbe7f4] hover:bg-muted/40 cursor-pointer"
                                >
                                  <Eye className="size-3.5" />
                                  <span>عرض الملف</span>
                                </Button>
                              </a>
                              <a
                                href={`${scan.viewUrl}?download=1`}
                                download
                                className="flex-1"
                              >
                                <Button
                                  variant="secondary"
                                  size="sm"
                                  className="w-full h-9 text-xs rounded-xl gap-1.5 bg-secondary text-secondary-foreground hover:bg-secondary/90 cursor-pointer"
                                >
                                  <Download className="size-3.5" />
                                  <span>تنزيل</span>
                                </Button>
                              </a>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </DoctorLayout>
  );
}
