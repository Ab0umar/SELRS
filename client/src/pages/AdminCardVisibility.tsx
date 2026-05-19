import { useAuth } from "@/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { useState, useEffect, useMemo } from "react";
import { toast } from "sonner";
import { Settings, LayoutDashboard, Users, FileHeart, Zap, Pill } from "lucide-react";
import { PageHeader } from "@/components/shared/PageHeader";
import { cn } from "@/lib/utils";

const VISIBILITY_GROUPS = [
  {
    title: "لوحات المعلومات العلوية",
    description: "الكروت الرئيسية التي تظهر فوق الداشبورد الأساسي.",
    color: "bg-primary/10 text-primary",
    icon: LayoutDashboard,
    options: [
      { key: "showPatientDataPanel", label: "بيانات المريض" },
      { key: "showMedicalFileCard", label: "ملف المريض" },
      { key: "showTodayPatientsPanel", label: "مرضى اليوم" },
    ],
  },
  {
    title: "كروت الإدارة الأساسية",
    description: "كروت الوصول السريع للمرضى، الفحوصات، والعمليات.",
    color: "bg-primary text-primary-foreground",
    icon: Users,
    options: [
      { key: "showPatients", label: "المرضى" },
      { key: "showExaminations", label: "الفحوصات" },
      { key: "showAppointments", label: "العمليات" },
      { key: "showVisits", label: "الزيارات" },
      { key: "showFollowups", label: "المتابعات" },
    ],
  },
  {
    title: "كروت الفحوصات المتخصصة",
    description: "كروت الوصول إلى أنواع معينة من الفحوصات والتقارير.",
    color: "bg-success/10 text-success",
    icon: FileHeart,
    options: [
      { key: "showPentacam", label: "بنتاكام" },
      { key: "showRefraction", label: "مقاس النظارة" },
      { key: "showMedicalReports", label: "التقارير الطبية" },
      { key: "showPatientSummary", label: "التقرير المجمع" },
    ],
  },
  {
    title: "كروت مهام سير العمل",
    description: "أدوات الإدخال السريع والمهام التشغيلية اليومية.",
    color: "bg-warning/10 text-warning/90",
    icon: Zap,
    options: [
      { key: "showQuickEntry", label: "إدخال سريع" },
      { key: "showNewCases", label: "الحالات الجديدة" },
      { key: "showFollowupForm", label: "نموذج المتابعة" },
      { key: "showDoctorView", label: "رؤية الطبيب" },
    ],
  },
  {
    title: "كروت الأدوية والروشتات",
    description: "الوصول السريع إلى الروشتات، الأدوية، والتحاليل.",
    color: "bg-secondary/[0.07] text-secondary",
    icon: Pill,
    options: [
      { key: "showPrescription", label: "الروشتة" },
      { key: "showRequestTests", label: "طلب الفحوصات" },
      { key: "showMedicationsTests", label: "الأدوية والفحوصات" },
    ],
  },
  {
    title: "كروت إدارية متقدمة",
    description: "أدوات إدارية خاصة بالتسعير والنسخ.",
    color: "bg-muted text-muted-foreground",
    icon: Settings,
    options: [
      { key: "showPricingRules", label: "تسعير العمليات" },
      { key: "showSheetCopies", label: "نسخة الشيتات" },
    ],
  },
];

type VisibilityState = Record<(typeof VISIBILITY_GROUPS)[number]["options"][number]["key"], boolean>;

const defaultVisibilityState: VisibilityState = VISIBILITY_GROUPS.flatMap(g => g.options).reduce((acc, opt) => {
  acc[opt.key as keyof VisibilityState] = true;
  return acc;
}, {} as VisibilityState);


export default function AdminCardVisibility() {
  const { user } = useAuth();
  const utils = trpc.useUtils();

  const cardVisibilityQuery = trpc.medical.getDashboardCardVisibility.useQuery(undefined, {
    refetchOnWindowFocus: false,
    staleTime: 5 * 60 * 1000,
  });

  const updateCardVisibilityMutation = trpc.medical.setDashboardCardVisibility.useMutation({
    onSuccess: () => {
      utils.medical.getDashboardCardVisibility.invalidate();
      toast.success("تم حفظ إعدادات العرض بنجاح");
    },
    onError: (error) => {
      console.error("Failed to update card visibility:", error);
      toast.error("فشل تحديث إعدادات العرض");
    },
  });

  const [visibilityState, setVisibilityState] = useState<VisibilityState>(defaultVisibilityState);
  
  const serverState = useMemo<VisibilityState | null>(() => {
    if(!cardVisibilityQuery.data) return null;
    const state: Partial<VisibilityState> = {};
    for (const key in defaultVisibilityState) {
      if (typeof (cardVisibilityQuery.data as any)[key] === 'boolean') {
        (state as any)[key] = (cardVisibilityQuery.data as any)[key];
      } else {
        (state as any)[key] = true; // Default to true if missing from server
      }
    }
    return state as VisibilityState;
  }, [cardVisibilityQuery.data]);
  
  useEffect(() => {
    if (serverState) {
      setVisibilityState(serverState);
    }
  }, [serverState]);

  const handleToggle = (key: keyof VisibilityState, checked: boolean) => {
    setVisibilityState(prev => ({ ...prev, [key]: checked }));
  };

  const handleSave = () => {
    const payload: Partial<Record<keyof VisibilityState, boolean>> = {};
    for (const key in visibilityState) {
      payload[key as keyof VisibilityState] = visibilityState[key as keyof VisibilityState];
    }
    updateCardVisibilityMutation.mutate(payload as any);
  };
  
  if (user?.role !== "admin") {
    return (
      <div className="container mx-auto px-4 py-6">
        <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-right">
          <p className="text-sm font-medium text-destructive">لا توجد صلاحية للوصول إلى هذه الصفحة</p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-[1440px] space-y-6 pb-12 text-right" dir="rtl">
      <PageHeader
        title="إعدادات عرض الكروت"
        subtitle="إدارة ظهور وإخفاء الكروت في الداشبورد الرئيسي لتحسين تركيز المستخدم."
        icon={<Settings className="h-5 w-5 text-primary" />}
        action={
          <Button
            onClick={handleSave}
            disabled={updateCardVisibilityMutation.isPending || cardVisibilityQuery.isLoading}
            size="sm"
            className="selrs-gradient-btn text-primary-foreground h-9 px-6 font-bold shadow-sm"
          >
            {updateCardVisibilityMutation.isPending ? "جاري الحفظ..." : "حفظ الإعدادات"}
          </Button>
        }
      />
      
      <div className="space-y-6">
        {VISIBILITY_GROUPS.map(group => {
          const Icon = group.icon;
          return (
            <Card key={group.title} className="border-border/60 bg-card shadow-sm overflow-hidden">
              <CardHeader className={cn("border-b py-4", group.color, "bg-opacity-20")}>
                <div className="flex items-center gap-3">
                  <Icon className="h-5 w-5" />
                  <CardTitle className="text-sm font-bold">{group.title}</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="p-5">
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                  {group.options.map(option => (
                    <label key={option.key} className="flex items-center gap-3 cursor-pointer rounded-lg border p-3 bg-background hover:bg-muted/40 transition-colors">
                      <Checkbox
                        checked={visibilityState[option.key as keyof VisibilityState]}
                        onCheckedChange={(checked) => handleToggle(option.key as keyof VisibilityState, Boolean(checked))}
                        disabled={updateCardVisibilityMutation.isPending}
                        className="h-5 w-5 border-2"
                      />
                      <span className="text-xs font-bold text-foreground/80">{option.label}</span>
                    </label>
                  ))}
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>
    </div>
  );
}
