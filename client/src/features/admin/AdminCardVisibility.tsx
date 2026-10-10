import { useAuth } from "@/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { useState, useEffect, useMemo } from "react";
import { toast } from "sonner";
import {
  AlertCircle,
  CheckCircle2,
  Settings,
  LayoutDashboard,
  Loader2,
  Users,
  FileHeart,
  Zap,
  Pill,
} from "lucide-react";
import { PageHeader } from "@/components/shared/PageHeader";
import { cn } from "@/lib/utils";

const VISIBILITY_GROUPS = [
  {
    title: "لوحات المعلومات العلوية",
    description: "الكروت الرئيسية التي تظهر أعلى الداشبورد الأساسي.",
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
    icon: Users,
    options: [
      { key: "showPatients", label: "المرضى" },
      { key: "showPatientFile", label: "ملف المريض في لوحة الإدارة" },
      { key: "showExaminations", label: "الفحوصات" },
      { key: "showAppointments", label: "العمليات" },
      { key: "showVisits", label: "الزيارات" },
      { key: "showFollowups", label: "المتابعات" },
    ],
  },
  {
    title: "كروت الفحوصات المتخصصة",
    description: "كروت الوصول إلى أنواع معينة من الفحوصات والتقارير.",
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
    icon: Settings,
    options: [
      { key: "showPricingRules", label: "تسعير العمليات" },
      { key: "showSheetCopies", label: "نسخة الشيتات" },
    ],
  },
] as const;

type VisibilityKey =
  (typeof VISIBILITY_GROUPS)[number]["options"][number]["key"];
type VisibilityState = Record<VisibilityKey, boolean>;

const defaultVisibilityState: VisibilityState = VISIBILITY_GROUPS.reduce(
  (state, group) => {
    group.options.forEach((option) => {
      state[option.key as VisibilityKey] = true;
    });
    return state;
  },
  {} as VisibilityState,
);

export default function AdminCardVisibility() {
  const { user } = useAuth();
  const utils = trpc.useUtils();

  const cardVisibilityQuery = trpc.medical.getDashboardCardVisibility.useQuery(
    undefined,
    {
      refetchOnWindowFocus: false,
      staleTime: 5 * 60 * 1000,
    },
  );

  const updateCardVisibilityMutation =
    trpc.medical.setDashboardCardVisibility.useMutation({
      onSuccess: () => {
        utils.medical.getDashboardCardVisibility.invalidate();
        setSaveStatus("saved");
        toast.success("تم حفظ إعدادات العرض.");
      },
      onError: (error) => {
        console.error("Failed to update card visibility:", error);
        setSaveStatus("error");
        toast.error("تعذر حفظ إعدادات العرض. حاول مرة أخرى.");
      },
    });

  const [visibilityState, setVisibilityState] = useState<VisibilityState>(
    defaultVisibilityState,
  );

  const serverState = useMemo<VisibilityState | null>(() => {
    if (
      !cardVisibilityQuery.data ||
      typeof cardVisibilityQuery.data !== "object"
    ) {
      return null;
    }

    const rawState = cardVisibilityQuery.data as Record<string, unknown>;
    const state: Partial<VisibilityState> = {};
    for (const key in defaultVisibilityState) {
      if (typeof rawState[key] === "boolean") {
        state[key as VisibilityKey] = rawState[key] as boolean;
      } else {
        state[key as VisibilityKey] = true;
      }
    }
    return state as VisibilityState;
  }, [cardVisibilityQuery.data]);

  const [saveStatus, setSaveStatus] = useState<"idle" | "saved" | "error">(
    "idle",
  );

  useEffect(() => {
    if (serverState) {
      setVisibilityState(serverState);
    } else if (cardVisibilityQuery.isSuccess) {
      setVisibilityState(defaultVisibilityState);
    }
  }, [cardVisibilityQuery.isSuccess, serverState]);

  const isEmptyResponse =
    cardVisibilityQuery.isSuccess &&
    (!cardVisibilityQuery.data ||
      Object.keys(cardVisibilityQuery.data).length === 0);
  const hasUnsavedChanges = Object.keys(defaultVisibilityState).some(
    (key) =>
      visibilityState[key as VisibilityKey] !==
      (serverState?.[key as VisibilityKey] ??
        defaultVisibilityState[key as VisibilityKey]),
  );

  const handleToggle = (key: VisibilityKey, checked: boolean) => {
    setSaveStatus("idle");
    setVisibilityState((prev) => ({ ...prev, [key]: checked }));
  };

  const handleSave = () => {
    if (
      !hasUnsavedChanges ||
      updateCardVisibilityMutation.isPending ||
      cardVisibilityQuery.isFetching ||
      cardVisibilityQuery.isError
    ) {
      return;
    }
    setSaveStatus("idle");
    updateCardVisibilityMutation.mutate(visibilityState);
  };

  if (user?.role !== "admin") {
    return (
      <div className="container mx-auto px-4 py-6">
        <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-start">
          <p className="text-sm font-medium text-destructive">
            لا توجد صلاحية للوصول إلى هذه الصفحة
          </p>
        </div>
      </div>
    );
  }

  const pageHeader = (
    <PageHeader
      title="إعدادات عرض الكروت"
      subtitle="اختر الكروت التي تظهر في الداشبورد الرئيسي."
      icon={<Settings aria-hidden="true" className="h-5 w-5 text-primary" />}
      action={
        <Button
          type="button"
          onClick={handleSave}
          disabled={
            updateCardVisibilityMutation.isPending ||
            cardVisibilityQuery.isLoading ||
            cardVisibilityQuery.isFetching ||
            cardVisibilityQuery.isError ||
            !hasUnsavedChanges
          }
          size="sm"
          className="selrs-gradient-btn min-w-32 px-4 font-bold text-primary-foreground shadow-sm"
          aria-busy={updateCardVisibilityMutation.isPending}
        >
          {updateCardVisibilityMutation.isPending
            ? "جاري الحفظ…"
            : hasUnsavedChanges
              ? "حفظ التغييرات"
              : "لا توجد تغييرات"}
        </Button>
      }
    />
  );

  const pageClassName =
    "mx-auto w-full max-w-[1440px] space-y-4 px-3 pb-6 text-start sm:px-4";

  if (cardVisibilityQuery.isLoading) {
    return (
      <div className={pageClassName} dir="rtl" aria-busy="true">
        {pageHeader}
        <Card>
          <CardContent className="flex min-h-40 flex-col items-center justify-center gap-3 p-6 text-center">
            <Loader2
              aria-hidden="true"
              className="h-6 w-6 animate-spin text-primary"
            />
            <span
              role="status"
              aria-live="polite"
              className="text-sm text-muted-foreground"
            >
              جاري تحميل إعدادات عرض الكروت…
            </span>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (cardVisibilityQuery.isError && !cardVisibilityQuery.data) {
    return (
      <div className={pageClassName} dir="rtl">
        {pageHeader}
        <Card>
          <CardContent className="flex min-h-40 flex-col items-center justify-center gap-3 p-6 text-center">
            <AlertCircle
              aria-hidden="true"
              className="h-6 w-6 text-destructive"
            />
            <p role="alert" className="text-sm text-destructive">
              تعذر تحميل إعدادات عرض الكروت.
            </p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => void cardVisibilityQuery.refetch()}
              disabled={cardVisibilityQuery.isFetching}
            >
              {cardVisibilityQuery.isFetching
                ? "جاري إعادة المحاولة…"
                : "إعادة المحاولة"}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div
      className={pageClassName}
      dir="rtl"
      aria-busy={updateCardVisibilityMutation.isPending}
    >
      {pageHeader}

      <div className="space-y-3" aria-live="polite">
        {cardVisibilityQuery.isFetching && (
          <div className="flex items-center gap-2 rounded-md border border-border bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
            <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" />
            <span>جاري تحديث إعدادات العرض…</span>
          </div>
        )}
        {cardVisibilityQuery.isError && cardVisibilityQuery.data && (
          <div
            className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive"
            role="alert"
          >
            <span>تعذر تحديث الإعدادات. تُعرض آخر إعدادات متاحة.</span>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => void cardVisibilityQuery.refetch()}
              disabled={cardVisibilityQuery.isFetching}
              className="border-destructive/40 text-destructive hover:bg-destructive/10"
            >
              إعادة المحاولة
            </Button>
          </div>
        )}
        {isEmptyResponse && (
          <div
            className="rounded-md border border-border bg-muted/40 px-3 py-2 text-xs text-muted-foreground"
            role="status"
          >
            لا توجد إعدادات محفوظة بعد. ستُستخدم الإعدادات الافتراضية حتى تحفظ
            تغييراتك.
          </div>
        )}
        {hasUnsavedChanges && saveStatus === "idle" && (
          <div className="rounded-md border border-primary/30 bg-primary/5 px-3 py-2 text-xs text-foreground">
            لديك تغييرات غير محفوظة.
          </div>
        )}
        {saveStatus === "saved" && (
          <div
            className="flex items-center gap-2 rounded-md border border-success/30 bg-success/10 px-3 py-2 text-xs text-success-text"
            role="status"
          >
            <CheckCircle2 aria-hidden="true" className="h-4 w-4 shrink-0" />
            <span>تم حفظ إعدادات العرض.</span>
          </div>
        )}
        {saveStatus === "error" && (
          <div
            className="flex items-center gap-2 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive"
            role="alert"
          >
            <AlertCircle aria-hidden="true" className="h-4 w-4 shrink-0" />
            <span>تعذر حفظ إعدادات العرض. حاول مرة أخرى.</span>
          </div>
        )}
      </div>

      <div className="space-y-6">
        {VISIBILITY_GROUPS.map((group, groupIndex) => {
          const Icon = group.icon;
          const headingId = `visibility-group-${groupIndex}`;
          return (
            <section key={group.title} aria-labelledby={headingId}>
              <Card className="overflow-hidden border-border/60 bg-card shadow-sm">
                <CardHeader className="border-b bg-muted/50 py-4">
                  <div className="flex items-start gap-3">
                    <Icon
                      aria-hidden="true"
                      className="mt-0.5 h-5 w-5 shrink-0 text-primary"
                    />
                    <div className="min-w-0">
                      <CardTitle id={headingId} className="text-base font-bold">
                        {group.title}
                      </CardTitle>
                      <CardDescription className="mt-1 text-xs leading-relaxed">
                        {group.description}
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-3 sm:p-5">
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
                    {group.options.map((option) => {
                      const optionId = `card-visibility-${option.key}`;
                      const checked = visibilityState[option.key];
                      return (
                        <label
                          key={option.key}
                          htmlFor={optionId}
                          data-selected={checked}
                          className={cn(
                            "flex min-h-11 cursor-pointer items-center gap-3 rounded-lg border p-3 transition-colors focus-within:border-ring focus-within:ring-2 focus-within:ring-ring/30",
                            checked
                              ? "border-primary/60 bg-primary/5"
                              : "border-border bg-background hover:bg-muted/40",
                          )}
                        >
                          <Checkbox
                            id={optionId}
                            checked={checked}
                            aria-label={option.label}
                            onCheckedChange={(nextChecked) =>
                              handleToggle(option.key, Boolean(nextChecked))
                            }
                            disabled={
                              updateCardVisibilityMutation.isPending ||
                              cardVisibilityQuery.isFetching ||
                              cardVisibilityQuery.isError
                            }
                            className="h-5 w-5 border-2"
                          />
                          <span className="text-sm font-bold text-foreground">
                            {option.label}
                          </span>
                        </label>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            </section>
          );
        })}
      </div>
    </div>
  );
}
