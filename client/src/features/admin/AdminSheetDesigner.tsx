import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { Eye, FileText, Palette, Plus } from "lucide-react";
import { PageHeader } from "@/components/shared/PageHeader";
import {
  type BaseSheetTemplateConfig,
  coerceSheetDesignerConfig,
  DEFAULT_SHEET_DESIGNER_CONFIG,
  loadSheetDesignerConfig,
  saveSheetDesignerConfig,
  type FollowupTemplateConfig,
  type SheetLayoutConfig,
  type SheetCssKey,
  type SheetTemplateKey,
  type SheetDesignerConfig,
} from "@/lib/sheetDesigner";

const FOLLOWUP_TEXT_FIELDS: Array<{
  key: keyof FollowupTemplateConfig;
  label: string;
}> = [
  { key: "rtLabel", label: "تسمية RT" },
  { key: "ltLabel", label: "تسمية LT" },
  { key: "operationTypeLabel", label: "تسمية نوع العملية" },
  { key: "operationDateLabel", label: "تسمية تاريخ العملية" },
  { key: "nextFollowupLabel", label: "تسمية المتابعة القادمة" },
  { key: "followupDateLabel", label: "تسمية تاريخ المتابعة" },
  { key: "vaLabel", label: "تسمية V.A" },
  { key: "refractionLabel", label: "تسمية الانكسار" },
  { key: "flapLabel", label: "تسمية Flap" },
  { key: "edgesLabel", label: "تسمية الحواف" },
  { key: "bedLabel", label: "تسمية Bed" },
  { key: "iopLabel", label: "تسمية I.O.P" },
  { key: "treatmentLabel", label: "تسمية العلاج" },
  { key: "receptionLabel", label: "تسمية توقيع الاستقبال" },
  { key: "nurseLabel", label: "تسمية توقيع التمريض" },
  { key: "doctorLabel", label: "تسمية توقيع الطبيب" },
];

const SHEET_TEMPLATE_FIELDS: Array<{
  key: keyof BaseSheetTemplateConfig;
  label: string;
}> = [
  { key: "sheetTitle", label: "عنوان النموذج" },
  { key: "patientInfoTitle", label: "عنوان بيانات المريض" },
  { key: "doctorLabel", label: "تسمية الطبيب" },
  { key: "examinationDateLabel", label: "تسمية تاريخ الفحص" },
  { key: "notesLabel", label: "تسمية الملاحظات" },
  { key: "signatureLabel", label: "تسمية التوقيع" },
];
type FollowupKey = "followupConsultant" | "followupLasik";

function validateConfig(config: SheetDesignerConfig): string | null {
  const textFields = [
    ...Object.values(config.templates).flatMap((template) =>
      Object.values(template),
    ),
    ...[config.followupConsultant, config.followupLasik].flatMap((followup) =>
      FOLLOWUP_TEXT_FIELDS.map(({ key }) => followup[key]),
    ),
    ...config.followupConsultant.followupNames,
    ...config.followupLasik.followupNames,
  ];

  if (textFields.some((value) => !String(value).trim())) {
    return "أكمل الحقول النصية قبل الحفظ.";
  }

  const numericFields = [
    ...Object.entries(config.layout).flatMap(([sheet, layout]) => [
      { label: `إزاحة X — ${sheet}`, value: layout.offsetXmm },
      { label: `إزاحة Y — ${sheet}`, value: layout.offsetYmm },
      { label: `المقياس — ${sheet}`, value: layout.scale },
    ]),
    {
      label: "إزاحة X لمتابعة الاستشاري",
      value: config.followupConsultant.offsetXmm,
    },
    {
      label: "إزاحة Y لمتابعة الاستشاري",
      value: config.followupConsultant.offsetYmm,
    },
    { label: "مقياس متابعة الاستشاري", value: config.followupConsultant.scale },
    {
      label: "فاصل جداول متابعة الاستشاري",
      value: config.followupConsultant.tableGapMm,
    },
    { label: "إزاحة X لمتابعة الليزك", value: config.followupLasik.offsetXmm },
    { label: "إزاحة Y لمتابعة الليزك", value: config.followupLasik.offsetYmm },
    { label: "مقياس متابعة الليزك", value: config.followupLasik.scale },
    {
      label: "فاصل جداول متابعة الليزك",
      value: config.followupLasik.tableGapMm,
    },
  ];

  const invalidNumber = numericFields.find(
    ({ value }) => !Number.isFinite(value),
  );
  if (invalidNumber) return `تحقق من قيمة ${invalidNumber.label}.`;

  const invalidScale = numericFields.find(
    ({ label, value }) => label.includes("مقياس") && value <= 0,
  );
  if (invalidScale)
    return `يجب أن تكون قيمة ${invalidScale.label} أكبر من صفر.`;

  const invalidGap = numericFields.find(
    ({ label, value }) => label.includes("فاصل") && value < 0,
  );
  if (invalidGap) return `لا يمكن أن تكون قيمة ${invalidGap.label} سالبة.`;

  return null;
}

export default function AdminSheetDesigner() {
  const { user, isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();
  const [config, setConfig] = useState<SheetDesignerConfig>(
    DEFAULT_SHEET_DESIGNER_CONFIG,
  );
  const [activeDesignerTab, setActiveDesignerTab] = useState(
    "consultant-followup",
  );
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [saveFeedback, setSaveFeedback] = useState<"saved" | "error" | "">("");
  const settingsQuery = trpc.medical.getSystemSetting.useQuery(
    { key: "sheet_designer_config" },
    { enabled: isAuthenticated, refetchOnWindowFocus: false },
  );
  const updateSettingMutation = trpc.medical.updateSystemSetting.useMutation();

  useEffect(() => {
    if (!isAuthenticated) setLocation("/");
  }, [isAuthenticated, setLocation]);

  useEffect(() => {
    setConfig(loadSheetDesignerConfig());
  }, []);

  useEffect(() => {
    if (!settingsQuery.data?.value || hasUnsavedChanges) return;
    const merged = coerceSheetDesignerConfig(settingsQuery.data.value);
    setConfig(merged);
    saveSheetDesignerConfig(merged);
    setHasUnsavedChanges(false);
    setSaveFeedback("");
  }, [settingsQuery.data]);

  if (!isAuthenticated || user?.role !== "admin") return null;

  if (settingsQuery.isLoading) {
    return (
      <div
        className="mx-auto flex min-h-48 w-full max-w-[1440px] items-center justify-center rounded-lg border border-border bg-card p-6 text-center text-sm text-muted-foreground"
        role="status"
        aria-live="polite"
      >
        جارٍ تحميل إعدادات مصمّم النماذج…
      </div>
    );
  }

  if (settingsQuery.isError) {
    return (
      <div
        className="mx-auto flex min-h-48 w-full max-w-[1440px] flex-col items-center justify-center gap-3 rounded-lg border border-destructive/40 bg-card p-6 text-center"
        role="alert"
      >
        <p className="text-sm text-destructive">
          تعذّر تحميل إعدادات مصمّم النماذج. لم يتم فتح المحرر لتجنب الكتابة فوق
          إعدادات محفوظة.
        </p>
        <Button
          type="button"
          variant="outline"
          onClick={() => settingsQuery.refetch()}
        >
          إعادة المحاولة
        </Button>
      </div>
    );
  }

  const updateCss = (key: SheetCssKey, value: string) => {
    setHasUnsavedChanges(true);
    setSaveFeedback("");
    setConfig((prev) => ({ ...prev, css: { ...prev.css, [key]: value } }));
  };

  const updateTemplate = <K extends keyof BaseSheetTemplateConfig>(
    sheet: SheetTemplateKey,
    key: K,
    value: BaseSheetTemplateConfig[K],
  ) => {
    setHasUnsavedChanges(true);
    setSaveFeedback("");
    setConfig((prev) => ({
      ...prev,
      templates: {
        ...prev.templates,
        [sheet]: { ...prev.templates[sheet], [key]: value },
      },
    }));
  };

  const updateLayout = <K extends keyof SheetLayoutConfig>(
    sheet: SheetCssKey,
    key: K,
    value: SheetLayoutConfig[K],
  ) => {
    setHasUnsavedChanges(true);
    setSaveFeedback("");
    setConfig((prev) => ({
      ...prev,
      layout: {
        ...prev.layout,
        [sheet]: { ...prev.layout[sheet], [key]: value },
      },
    }));
  };

  const updateFollowup = <K extends keyof FollowupTemplateConfig>(
    section: FollowupKey,
    key: K,
    value: FollowupTemplateConfig[K],
  ) => {
    setHasUnsavedChanges(true);
    setSaveFeedback("");
    setConfig((prev) => ({
      ...prev,
      [section]: { ...prev[section], [key]: value },
    }));
  };

  const renderFollowupTextFields = (section: FollowupKey) => (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      {FOLLOWUP_TEXT_FIELDS.map((field) => (
        <div key={String(field.key)}>
          <label
            htmlFor={`followup-${section}-${String(field.key)}`}
            className="text-sm font-medium"
          >
            {field.label}
          </label>
          <Input
            id={`followup-${section}-${String(field.key)}`}
            value={String(config[section][field.key])}
            onChange={(e) =>
              updateFollowup(section, field.key, e.target.value as any)
            }
          />
        </div>
      ))}
    </div>
  );

  const renderFollowupNameFields = (section: FollowupKey) => (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      <div>
        <label
          htmlFor={`followup-${section}-name-1`}
          className="text-sm font-medium"
        >
          اسم المتابعة 1
        </label>
        <Input
          id={`followup-${section}-name-1`}
          value={config[section].followupNames[0]}
          onChange={(e) =>
            updateFollowup(section, "followupNames", [
              e.target.value,
              config[section].followupNames[1],
              config[section].followupNames[2],
              config[section].followupNames[3],
            ])
          }
        />
      </div>
      <div>
        <label
          htmlFor={`followup-${section}-name-2`}
          className="text-sm font-medium"
        >
          اسم المتابعة 2
        </label>
        <Input
          id={`followup-${section}-name-2`}
          value={config[section].followupNames[1]}
          onChange={(e) =>
            updateFollowup(section, "followupNames", [
              config[section].followupNames[0],
              e.target.value,
              config[section].followupNames[2],
              config[section].followupNames[3],
            ])
          }
        />
      </div>
      <div>
        <label
          htmlFor={`followup-${section}-name-3`}
          className="text-sm font-medium"
        >
          اسم المتابعة 3
        </label>
        <Input
          id={`followup-${section}-name-3`}
          value={config[section].followupNames[2]}
          onChange={(e) =>
            updateFollowup(section, "followupNames", [
              config[section].followupNames[0],
              config[section].followupNames[1],
              e.target.value,
              config[section].followupNames[3],
            ])
          }
        />
      </div>
      <div>
        <label
          htmlFor={`followup-${section}-name-4`}
          className="text-sm font-medium"
        >
          اسم المتابعة 4
        </label>
        <Input
          id={`followup-${section}-name-4`}
          value={config[section].followupNames[3]}
          onChange={(e) =>
            updateFollowup(section, "followupNames", [
              config[section].followupNames[0],
              config[section].followupNames[1],
              config[section].followupNames[2],
              e.target.value,
            ])
          }
        />
      </div>
    </div>
  );

  const renderFollowupLayoutFields = (
    section: FollowupKey,
    labelPrefix = "",
  ) => (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      <div>
        <label
          htmlFor={`followup-${section}-offset-x`}
          className="text-sm font-medium"
        >
          {labelPrefix}الإزاحة الأفقية (مم)
        </label>
        <Input
          id={`followup-${section}-offset-x`}
          type="number"
          step="1"
          value={config[section].offsetXmm}
          onChange={(e) =>
            updateFollowup(section, "offsetXmm", Number(e.target.value) || 0)
          }
        />
      </div>
      <div>
        <label
          htmlFor={`followup-${section}-offset-y`}
          className="text-sm font-medium"
        >
          {labelPrefix}الإزاحة الرأسية (مم)
        </label>
        <Input
          id={`followup-${section}-offset-y`}
          type="number"
          step="1"
          value={config[section].offsetYmm}
          onChange={(e) =>
            updateFollowup(section, "offsetYmm", Number(e.target.value) || 0)
          }
        />
      </div>
      <div>
        <label
          htmlFor={`followup-${section}-scale`}
          className="text-sm font-medium"
        >
          {labelPrefix}المقياس
        </label>
        <Input
          id={`followup-${section}-scale`}
          type="number"
          step="0.01"
          min="0.01"
          value={config[section].scale}
          onChange={(e) =>
            updateFollowup(section, "scale", Number(e.target.value) || 1)
          }
        />
      </div>
      <div>
        <label
          htmlFor={`followup-${section}-table-gap`}
          className="text-sm font-medium"
        >
          {labelPrefix}الفاصل بين جداول المتابعة (مم)
        </label>
        <Input
          id={`followup-${section}-table-gap`}
          type="number"
          step="1"
          min="0"
          value={config[section].tableGapMm}
          onChange={(e) =>
            updateFollowup(section, "tableGapMm", Number(e.target.value) || 0)
          }
        />
      </div>
    </div>
  );

  const handleSave = async () => {
    const validationError = validateConfig(config);
    if (validationError) {
      setSaveFeedback("error");
      toast.error(validationError);
      return;
    }

    try {
      await updateSettingMutation.mutateAsync({
        key: "sheet_designer_config",
        value: config,
      });
      saveSheetDesignerConfig(config);
      setHasUnsavedChanges(false);
      setSaveFeedback("saved");
      toast.success("تم حفظ إعدادات مصمّم النماذج.");
    } catch {
      setSaveFeedback("error");
      toast.error("تعذّر حفظ إعدادات مصمّم النماذج.");
    }
  };

  const handleReset = async () => {
    if (
      !window.confirm(
        "سيؤدي هذا إلى استبدال التعديلات الحالية بالقيم الافتراضية. هل تريد المتابعة؟",
      )
    )
      return;

    try {
      await updateSettingMutation.mutateAsync({
        key: "sheet_designer_config",
        value: DEFAULT_SHEET_DESIGNER_CONFIG,
      });
      setConfig(DEFAULT_SHEET_DESIGNER_CONFIG);
      saveSheetDesignerConfig(DEFAULT_SHEET_DESIGNER_CONFIG);
      setHasUnsavedChanges(false);
      setSaveFeedback("saved");
      toast.success("تمت إعادة الإعدادات إلى الافتراضي.");
    } catch {
      setSaveFeedback("error");
      toast.error("تعذّرت إعادة الإعدادات إلى الافتراضي.");
    }
  };

  const designerNav: { id: string; label: string; sections: string }[] = [
    {
      id: "consultant-followup",
      label: "متابعة استشاري",
      sections: "جداول متابعة",
    },
    {
      id: "consultant-template",
      label: "قالب كشف",
      sections: "عناوين الشيت",
    },
    {
      id: "specialist-template",
      label: "قالب مقاس نظاره / اشعه خارجي",
      sections: "عناوين الشيت",
    },
    {
      id: "lasik-template",
      label: "قالب تصحيح ابصار",
      sections: "عناوين الشيت",
    },
    {
      id: "external-template",
      label: "قالب د.الصواف",
      sections: "عناوين الشيت",
    },
    {
      id: "pentacam-template",
      label: "قالب Pentacam",
      sections: "عناوين الشيت",
    },
    { id: "consultant-css", label: "CSS كشف", sections: "أنماط مخصصة" },
    {
      id: "specialist-css",
      label: "CSS مقاس نظاره / اشعه خارجي",
      sections: "أنماط مخصصة",
    },
    { id: "lasik-css", label: "CSS تصحيح ابصار", sections: "أنماط مخصصة" },
    { id: "external-css", label: "CSS د.الصواف", sections: "أنماط مخصصة" },
    { id: "pentacam-css", label: "CSS Pentacam", sections: "أنماط مخصصة" },
  ];

  const previewTitle =
    designerNav.find((n) => n.id === activeDesignerTab)?.label ?? "المعاينة";

  return (
    <div
      className="mx-auto w-full max-w-[1440px] space-y-5 pb-10 text-right"
      dir="rtl"
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <PageHeader
          title="مصمم النماذج"
          subtitle="تصميم وتخصيص النماذج الطبية"
          icon={<Palette className="h-5 w-5" />}
        />
        <Button
          type="button"
          className="selrs-gradient-btn shrink-0 gap-2 self-start text-primary-foreground sm:mt-1"
          onClick={() => setLocation("/admin-hub/sheets")}
        >
          <Plus className="h-4 w-4" />
          نموذج جديد
        </Button>
      </div>

      <div className="grid overflow-hidden rounded-lg border border-border lg:grid-cols-[320px_minmax(0,1fr)]">
        <Card className="overflow-hidden rounded-none border-0 border-l border-border bg-card shadow-none">
          <CardHeader className="border-b border-border/80 bg-muted/15 py-4">
            <CardTitle className="flex items-center gap-2 text-base">
              <FileText className="h-5 w-5 text-primary" />
              النماذج المتاحة
            </CardTitle>
            <p className="text-xs text-muted-foreground">
              اختر قالباً للتعديل في اللوحة أدناه
            </p>
          </CardHeader>
          <CardContent className="max-h-[min(520px,65vh)] space-y-2 overflow-y-auto pt-4">
            {designerNav.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setActiveDesignerTab(item.id)}
                aria-pressed={activeDesignerTab === item.id}
                className={`flex w-full items-center justify-between gap-3 rounded-md border p-3 text-right transition-colors ${
                  activeDesignerTab === item.id
                    ? "border-primary/40 bg-primary/[0.06] shadow-sm"
                    : "border-border/70 bg-card hover:bg-muted/30"
                }`}
              >
                <div className="min-w-0 flex-1">
                  <div className="font-bold leading-snug">{item.label}</div>
                  <div className="text-[11px] text-muted-foreground">
                    {item.sections}
                  </div>
                </div>
                <Eye
                  className="h-4 w-4 shrink-0 text-muted-foreground"
                  aria-hidden
                />
              </button>
            ))}
          </CardContent>
        </Card>

        <Card className="overflow-hidden rounded-none border-0 bg-card shadow-none">
          <CardHeader className="border-b border-border/80 py-4">
            <CardTitle className="text-base">معاينة النموذج</CardTitle>
            <p className="text-xs text-muted-foreground">
              نموذج: {previewTitle}
            </p>
          </CardHeader>
          <CardContent className="grid gap-3 pt-4 sm:grid-cols-2">
            {[
              "البيانات الشخصية",
              "الفحص البصري",
              "القياسات",
              "التشخيص والعلاج",
            ].map((section) => (
              <div
                key={section}
                className="rounded-xl border border-border/80 bg-muted/10 p-3 shadow-inner"
              >
                <p className="mb-2 text-[10px] font-semibold text-muted-foreground">
                  ٤ حقول
                </p>
                <p className="mb-3 text-center text-sm font-black">{section}</p>
                <div className="space-y-2">
                  <div className="h-8 rounded-md border border-dashed border-border/80 bg-background/80" />
                  <div className="h-8 rounded-md border border-dashed border-border/80 bg-background/80" />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <Card className="rounded-lg border-border/80 shadow-none">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">إجراءات</CardTitle>
          <p className="text-sm text-muted-foreground">
            بعد الحفظ تُحدَّث المعاينة لهذا الجهاز؛ راجع الطباعة قبل التوزيع.
          </p>
          <p
            className="text-xs text-muted-foreground"
            role="status"
            aria-live="polite"
          >
            {hasUnsavedChanges
              ? "توجد تعديلات غير محفوظة."
              : saveFeedback === "saved"
                ? "تم حفظ آخر تعديل."
                : saveFeedback === "error"
                  ? "لم يتم حفظ آخر تعديل."
                  : "كل التعديلات الحالية محفوظة."}
          </p>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          <Button
            type="button"
            className="selrs-gradient-btn text-primary-foreground hover:opacity-95"
            onClick={handleSave}
            disabled={updateSettingMutation.isPending}
            aria-busy={updateSettingMutation.isPending}
          >
            {updateSettingMutation.isPending ? "جاري الحفظ…" : "حفظ الكل"}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={handleReset}
            disabled={updateSettingMutation.isPending}
            aria-busy={updateSettingMutation.isPending}
          >
            {updateSettingMutation.isPending
              ? "جاري إعادة الضبط…"
              : "إعادة الضبط"}
          </Button>
        </CardContent>
      </Card>

      <Tabs
        value={activeDesignerTab}
        onValueChange={setActiveDesignerTab}
        persistKey="admin-sheet-designer"
        className="w-full"
      >
        <TabsList className="flex h-auto min-h-[2.75rem] w-full flex-nowrap gap-1 overflow-x-auto rounded-xl border border-border bg-muted/40 p-1.5 [scrollbar-width:none]">
          <TabsTrigger
            value="consultant-followup"
            className="shrink-0 rounded-lg text-xs sm:text-sm"
          >
            متابعة استشاري
          </TabsTrigger>
          <TabsTrigger
            value="consultant-template"
            className="shrink-0 rounded-lg text-xs sm:text-sm"
          >
            كشف
          </TabsTrigger>
          <TabsTrigger
            value="specialist-template"
            className="shrink-0 rounded-lg text-xs sm:text-sm"
          >
            مقاس نظاره / اشعه خارجي
          </TabsTrigger>
          <TabsTrigger
            value="lasik-template"
            className="shrink-0 rounded-lg text-xs sm:text-sm"
          >
            تصحيح ابصار
          </TabsTrigger>
          <TabsTrigger
            value="external-template"
            className="shrink-0 rounded-lg text-xs sm:text-sm"
          >
            د.الصواف
          </TabsTrigger>
          <TabsTrigger
            value="pentacam-template"
            className="shrink-0 rounded-lg text-xs sm:text-sm"
          >
            Pentacam
          </TabsTrigger>
          <TabsTrigger
            value="consultant-css"
            className="shrink-0 rounded-lg text-xs sm:text-sm"
          >
            CSS كشف
          </TabsTrigger>
          <TabsTrigger
            value="specialist-css"
            className="shrink-0 rounded-lg text-xs sm:text-sm"
          >
            CSS مقاس نظاره / اشعه خارجي
          </TabsTrigger>
          <TabsTrigger
            value="lasik-css"
            className="shrink-0 rounded-lg text-xs sm:text-sm"
          >
            CSS تصحيح ابصار
          </TabsTrigger>
          <TabsTrigger
            value="external-css"
            className="shrink-0 rounded-lg text-xs sm:text-sm"
          >
            CSS د.الصواف
          </TabsTrigger>
          <TabsTrigger
            value="pentacam-css"
            className="shrink-0 rounded-lg text-xs sm:text-sm"
          >
            CSS Pentacam
          </TabsTrigger>
        </TabsList>

        <TabsContent value="consultant-followup" className="mt-4">
          <Card dir="rtl" className="border-border/80">
            <CardHeader>
              <CardTitle>قالب متابعة الاستشاري</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {renderFollowupTextFields("followupConsultant")}
              {renderFollowupNameFields("followupConsultant")}
              {renderFollowupLayoutFields("followupConsultant")}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="consultant-template" className="mt-4">
          <Card dir="rtl" className="border-border/80">
            <CardHeader>
              <CardTitle>القالب — استشاري</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {SHEET_TEMPLATE_FIELDS.map((field) => (
                  <div key={`consultant-${String(field.key)}`}>
                    <label
                      htmlFor={`template-consultant-${String(field.key)}`}
                      className="text-sm font-medium"
                    >
                      {field.label}
                    </label>
                    <Input
                      id={`template-consultant-${String(field.key)}`}
                      aria-label={field.label}
                      value={String(config.templates.consultant[field.key])}
                      onChange={(e) =>
                        updateTemplate(
                          "consultant",
                          field.key,
                          e.target.value as any,
                        )
                      }
                    />
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
                <div>
                  <label className="text-sm font-medium">
                    الإزاحة الأفقية (مم)
                  </label>
                  <Input
                    type="number"
                    step="1"
                    aria-label="الإزاحة الأفقية (مم)"
                    value={config.layout.consultant.offsetXmm}
                    onChange={(e) =>
                      updateLayout(
                        "consultant",
                        "offsetXmm",
                        Number(e.target.value) || 0,
                      )
                    }
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">
                    الإزاحة الرأسية (مم)
                  </label>
                  <Input
                    type="number"
                    step="1"
                    aria-label="الإزاحة الرأسية (مم)"
                    value={config.layout.consultant.offsetYmm}
                    onChange={(e) =>
                      updateLayout(
                        "consultant",
                        "offsetYmm",
                        Number(e.target.value) || 0,
                      )
                    }
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">المقياس</label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0.01"
                    aria-label="المقياس"
                    value={config.layout.consultant.scale}
                    onChange={(e) =>
                      updateLayout(
                        "consultant",
                        "scale",
                        Number(e.target.value) || 1,
                      )
                    }
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="specialist-template" className="mt-4">
          <Card dir="rtl" className="border-border/80">
            <CardHeader>
              <CardTitle>القالب — متخصص</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {SHEET_TEMPLATE_FIELDS.map((field) => (
                  <div key={`specialist-${String(field.key)}`}>
                    <label className="text-sm font-medium">{field.label}</label>
                    <Input
                      aria-label={field.label}
                      value={String(config.templates.specialist[field.key])}
                      onChange={(e) =>
                        updateTemplate(
                          "specialist",
                          field.key,
                          e.target.value as any,
                        )
                      }
                    />
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
                <div>
                  <label className="text-sm font-medium">
                    الإزاحة الأفقية (مم)
                  </label>
                  <Input
                    type="number"
                    step="1"
                    aria-label="الإزاحة الأفقية (مم)"
                    value={config.layout.specialist.offsetXmm}
                    onChange={(e) =>
                      updateLayout(
                        "specialist",
                        "offsetXmm",
                        Number(e.target.value) || 0,
                      )
                    }
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">
                    الإزاحة الرأسية (مم)
                  </label>
                  <Input
                    type="number"
                    step="1"
                    aria-label="الإزاحة الرأسية (مم)"
                    value={config.layout.specialist.offsetYmm}
                    onChange={(e) =>
                      updateLayout(
                        "specialist",
                        "offsetYmm",
                        Number(e.target.value) || 0,
                      )
                    }
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">المقياس</label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0.01"
                    aria-label="المقياس"
                    value={config.layout.specialist.scale}
                    onChange={(e) =>
                      updateLayout(
                        "specialist",
                        "scale",
                        Number(e.target.value) || 1,
                      )
                    }
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="lasik-template" className="mt-4">
          <div className="space-y-4">
            <Card dir="rtl" className="border-border/80">
              <CardHeader>
                <CardTitle>القالب — ليزك</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {SHEET_TEMPLATE_FIELDS.map((field) => (
                    <div key={`lasik-${String(field.key)}`}>
                      <label className="text-sm font-medium">
                        {field.label}
                      </label>
                      <Input
                        aria-label={field.label}
                        value={String(config.templates.lasik[field.key])}
                        onChange={(e) =>
                          updateTemplate(
                            "lasik",
                            field.key,
                            e.target.value as any,
                          )
                        }
                      />
                    </div>
                  ))}
                </div>
                <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
                  <div>
                    <label className="text-sm font-medium">
                      الإزاحة الأفقية (مم)
                    </label>
                    <Input
                      type="number"
                      step="1"
                      aria-label="الإزاحة الأفقية (مم)"
                      value={config.layout.lasik.offsetXmm}
                      onChange={(e) =>
                        updateLayout(
                          "lasik",
                          "offsetXmm",
                          Number(e.target.value) || 0,
                        )
                      }
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">
                      الإزاحة الرأسية (مم)
                    </label>
                    <Input
                      type="number"
                      step="1"
                      aria-label="الإزاحة الرأسية (مم)"
                      value={config.layout.lasik.offsetYmm}
                      onChange={(e) =>
                        updateLayout(
                          "lasik",
                          "offsetYmm",
                          Number(e.target.value) || 0,
                        )
                      }
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">المقياس</label>
                    <Input
                      type="number"
                      step="0.01"
                      min="0.01"
                      aria-label="المقياس"
                      value={config.layout.lasik.scale}
                      onChange={(e) =>
                        updateLayout(
                          "lasik",
                          "scale",
                          Number(e.target.value) || 1,
                        )
                      }
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card dir="rtl" className="border-border/80">
              <CardHeader>
                <CardTitle>متابعة ليزك (طباعة)</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  تُستخدم هذه الحقول فقط لتخطيط طباعة متابعة الليزك.
                </p>
                {renderFollowupTextFields("followupLasik")}
                {renderFollowupNameFields("followupLasik")}
                {renderFollowupLayoutFields("followupLasik", "متابعة ")}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="external-template" className="mt-4">
          <Card dir="rtl" className="border-border/80">
            <CardHeader>
              <CardTitle>القالب — خارجي</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {SHEET_TEMPLATE_FIELDS.map((field) => (
                  <div key={`external-${String(field.key)}`}>
                    <label className="text-sm font-medium">{field.label}</label>
                    <Input
                      aria-label={field.label}
                      value={String(config.templates.external[field.key])}
                      onChange={(e) =>
                        updateTemplate(
                          "external",
                          field.key,
                          e.target.value as any,
                        )
                      }
                    />
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
                <div>
                  <label className="text-sm font-medium">
                    الإزاحة الأفقية (مم)
                  </label>
                  <Input
                    type="number"
                    step="1"
                    aria-label="الإزاحة الأفقية (مم)"
                    value={config.layout.external.offsetXmm}
                    onChange={(e) =>
                      updateLayout(
                        "external",
                        "offsetXmm",
                        Number(e.target.value) || 0,
                      )
                    }
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">
                    الإزاحة الرأسية (مم)
                  </label>
                  <Input
                    type="number"
                    step="1"
                    aria-label="الإزاحة الرأسية (مم)"
                    value={config.layout.external.offsetYmm}
                    onChange={(e) =>
                      updateLayout(
                        "external",
                        "offsetYmm",
                        Number(e.target.value) || 0,
                      )
                    }
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">المقياس</label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0.01"
                    aria-label="المقياس"
                    value={config.layout.external.scale}
                    onChange={(e) =>
                      updateLayout(
                        "external",
                        "scale",
                        Number(e.target.value) || 1,
                      )
                    }
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="pentacam-template" className="mt-4">
          <Card dir="rtl" className="border-border/80">
            <CardHeader>
              <CardTitle>القالب — Pentacam</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {SHEET_TEMPLATE_FIELDS.map((field) => (
                  <div key={`pentacam-${String(field.key)}`}>
                    <label className="text-sm font-medium">{field.label}</label>
                    <Input
                      aria-label={field.label}
                      value={String(config.templates.pentacam[field.key])}
                      onChange={(e) =>
                        updateTemplate(
                          "pentacam",
                          field.key,
                          e.target.value as any,
                        )
                      }
                    />
                  </div>
                ))}
                <div>
                  <label className="text-sm font-medium">
                    الإزاحة الأفقية (مم)
                  </label>
                  <Input
                    type="number"
                    step="1"
                    aria-label="الإزاحة الأفقية (مم)"
                    value={config.layout.pentacam.offsetXmm}
                    onChange={(e) =>
                      updateLayout(
                        "pentacam",
                        "offsetXmm",
                        Number(e.target.value) || 0,
                      )
                    }
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">
                    الإزاحة الرأسية (مم)
                  </label>
                  <Input
                    type="number"
                    step="1"
                    aria-label="الإزاحة الرأسية (مم)"
                    value={config.layout.pentacam.offsetYmm}
                    onChange={(e) =>
                      updateLayout(
                        "pentacam",
                        "offsetYmm",
                        Number(e.target.value) || 0,
                      )
                    }
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">المقياس</label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0.01"
                    aria-label="المقياس"
                    value={config.layout.pentacam.scale}
                    onChange={(e) =>
                      updateLayout(
                        "pentacam",
                        "scale",
                        Number(e.target.value) || 1,
                      )
                    }
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="consultant-css" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>CSS مخصّص — كشف استشاري</CardTitle>
            </CardHeader>
            <CardContent>
              <label
                htmlFor="css-consultant"
                className="mb-2 block text-sm font-medium"
              >
                أنماط CSS المخصّصة
              </label>
              <Textarea
                id="css-consultant"
                aria-label="CSS مخصّص — كشف استشاري"
                className="min-h-[240px] font-mono text-xs sm:min-h-[320px]"
                value={config.css.consultant}
                onChange={(e) => updateCss("consultant", e.target.value)}
                placeholder=".sheet-layout .some-class { font-size: 12px; }"
                dir="ltr"
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="specialist-css" className="mt-4">
          <Card dir="rtl" className="border-border/80">
            <CardHeader>
              <CardTitle>CSS مخصّص — متخصص</CardTitle>
            </CardHeader>
            <CardContent>
              <label
                htmlFor="css-specialist"
                className="mb-2 block text-sm font-medium"
              >
                أنماط CSS المخصّصة
              </label>
              <Textarea
                id="css-specialist"
                aria-label="CSS مخصّص — متخصص"
                className="min-h-[240px] font-mono text-xs sm:min-h-[320px]"
                value={config.css.specialist}
                onChange={(e) => updateCss("specialist", e.target.value)}
                placeholder=".sheet-layout .some-class { font-size: 12px; }"
                dir="ltr"
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="lasik-css" className="mt-4">
          <Card dir="rtl" className="border-border/80">
            <CardHeader>
              <CardTitle>CSS مخصّص — ليزك</CardTitle>
            </CardHeader>
            <CardContent>
              <label
                htmlFor="css-lasik"
                className="mb-2 block text-sm font-medium"
              >
                أنماط CSS المخصّصة
              </label>
              <Textarea
                id="css-lasik"
                aria-label="CSS مخصّص — ليزك"
                className="min-h-[240px] font-mono text-xs sm:min-h-[320px]"
                value={config.css.lasik}
                onChange={(e) => updateCss("lasik", e.target.value)}
                placeholder=".sheet-layout .some-class { font-size: 12px; }"
                dir="ltr"
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="external-css" className="mt-4">
          <Card dir="rtl" className="border-border/80">
            <CardHeader>
              <CardTitle>CSS مخصّص — خارجي</CardTitle>
            </CardHeader>
            <CardContent>
              <label
                htmlFor="css-external"
                className="mb-2 block text-sm font-medium"
              >
                أنماط CSS المخصّصة
              </label>
              <Textarea
                id="css-external"
                aria-label="CSS مخصّص — خارجي"
                className="min-h-[240px] font-mono text-xs sm:min-h-[320px]"
                value={config.css.external}
                onChange={(e) => updateCss("external", e.target.value)}
                placeholder=".sheet-layout .some-class { font-size: 12px; }"
                dir="ltr"
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="pentacam-css" className="mt-4">
          <Card dir="rtl" className="border-border/80">
            <CardHeader>
              <CardTitle>CSS مخصّص — Pentacam</CardTitle>
            </CardHeader>
            <CardContent>
              <label
                htmlFor="css-pentacam"
                className="mb-2 block text-sm font-medium"
              >
                أنماط CSS المخصّصة
              </label>
              <Textarea
                id="css-pentacam"
                aria-label="CSS مخصّص — Pentacam"
                className="min-h-[240px] font-mono text-xs sm:min-h-[320px]"
                value={config.css.pentacam}
                onChange={(e) => updateCss("pentacam", e.target.value)}
                placeholder=".pentacam-template-shell { transform: scale(0.98); }"
                dir="ltr"
              />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
