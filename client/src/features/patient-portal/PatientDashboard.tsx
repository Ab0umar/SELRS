import { CalendarDays, FileText, Glasses, Pill, ScanLine, ArrowRight } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import PatientLayout from "./PatientLayout";
import {
  PortalLoadingRows,
  PortalPanel,
  PortalShell,
  formatArabicDate,
  PortalMetric,
} from "./portal-ui";

function QuickAction({ href, icon: Icon, label, description, color }: {
  href: string;
  icon: any;
  label: string;
  description: string;
  color: string;
}) {
  return (
    <Link href={href}>
      <a className="group flex flex-col gap-3 rounded-2xl border border-[#dbe7f4] bg-white p-5 transition-all hover:border-primary/20 hover:shadow-[0_12px_24px_rgba(28,64,104,0.08)]">
        <div className={`flex size-12 items-center justify-center rounded-xl ${color} shadow-sm transition-transform group-hover:scale-110`}>
          <Icon className="size-6" />
        </div>
        <div className="space-y-1">
          <h3 className="text-base font-bold text-foreground">{label}</h3>
          <p className="text-xs leading-5 text-muted-foreground">{description}</p>
        </div>
        <div className="mt-2 flex items-center gap-1.5 text-xs font-semibold text-primary">
          <span>عرض التفاصيل</span>
          <ArrowRight className="size-3.5" />
        </div>
      </a>
    </Link>
  );
}

export default function PatientDashboard() {
  const { data: profile, isLoading: profileLoading } = trpc.patientPortal.getMyProfile.useQuery();
  const { data: scans } = trpc.patientPortal.getMyScans.useQuery();
  const { data: prescriptions } = trpc.patientPortal.getMyPrescriptions.useQuery();
  const { data: refractions } = trpc.patientPortal.getMyRefractions.useQuery();

  const isLoading = profileLoading;

  return (
    <PatientLayout>
      <PortalShell
        title="مرحباً بك في ملفك الطبي"
        subtitle="إليك ملخص سريع لأحدث الفحوصات والبيانات الطبية الخاصة بك."
      >
        {isLoading ? (
          <PortalLoadingRows rows={3} />
        ) : (
          <div className="space-y-6">
            {/* Quick Stats */}
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              <PortalMetric label="الزيارات" value={profile?.visitCount ?? 0} tone="blue" />
              <PortalMetric label="الأشعة" value={scans?.length ?? 0} tone="orange" />
              <PortalMetric label="الروشتات" value={prescriptions?.length ?? 0} tone="blue" />
              <PortalMetric label="قياسات النظر" value={refractions?.length ?? 0} tone="orange" />
            </div>

            {/* Main Actions Grid */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <QuickAction
                href="/my/scans"
                icon={ScanLine}
                label="الأشعة والفحوصات"
                description="عرض صور الأشعة (Pentacam) وتحميل التقارير الطبية."
                color="bg-secondary/10 text-primary"
              />
              <QuickAction
                href="/my/refraction"
                icon={Glasses}
                label="مقاس النظارة"
                description="متابعة قياسات النظر وحفظ سجل الانكسارات."
                color="bg-primary/10 text-primary"
              />
              <QuickAction
                href="/my/prescription"
                icon={Pill}
                label="الروشتات"
                description="عرض الأدوية الموصوفة والتعليمات الطبية."
                color="bg-success/10 text-success"
              />
              <QuickAction
                href="/my/file"
                icon={FileText}
                label="الملف الشخصي"
                description="تحديث البيانات الأساسية والاطلاع على التاريخ المرضي."
                color="bg-muted/40 text-muted-foreground"
              />
              <QuickAction
                href="/my/book"
                icon={CalendarDays}
                label="حجز موعد"
                description="طلب موعد جديد أو متابعة حالة الحجوزات القادمة."
                color="bg-destructive/10 text-destructive"
              />
            </div>

            {/* Latest Update Panel */}
            <PortalPanel
              title="آخر زيارة"
              description={profile?.lastVisit ? formatArabicDate(profile.lastVisit) : "لا توجد زيارات مسجلة"}
            >
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="space-y-1">
                  <p className="text-sm font-medium text-foreground">
                    تم تسجيل آخر تحديث في ملفك بتاريخ {profile?.lastVisit ? formatArabicDate(profile.lastVisit) : "..."}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    يمكنك دائماً الرجوع لتفاصيل الزيارة من خلال قسم ملفي الطبي.
                  </p>
                </div>
                <Button asChild variant="outline" className="gap-2">
                  <Link href="/my/file">
                    <ArrowRight className="size-4" />
                    عرض الملف الكامل
                  </Link>
                </Button>
              </div>
            </PortalPanel>
          </div>
        )}
      </PortalShell>
    </PatientLayout>
  );
}
