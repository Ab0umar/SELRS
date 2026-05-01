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
  type SheetDesignerConfig } from "@/lib/sheetDesigner";

const FOLLOWUP_TEXT_FIELDS: Array<{ key: keyof FollowupTemplateConfig; label: string }> = [
  { key: "rtLabel", label: "RT Label" },
  { key: "ltLabel", label: "LT Label" },
  { key: "operationTypeLabel", label: "Operation Type Label" },
  { key: "operationDateLabel", label: "Operation Date Label" },
  { key: "nextFollowupLabel", label: "Next Follow-up Label" },
  { key: "followupDateLabel", label: "Follow-up Date Label" },
  { key: "vaLabel", label: "V.A Label" },
  { key: "refractionLabel", label: "Refraction Label" },
  { key: "flapLabel", label: "Flap Label" },
  { key: "edgesLabel", label: "Edges Label" },
  { key: "bedLabel", label: "Bed Label" },
  { key: "iopLabel", label: "IOP Label" },
  { key: "treatmentLabel", label: "Treatment Label" },
  { key: "receptionLabel", label: "Reception Signature Label" },
  { key: "nurseLabel", label: "Nurse Signature Label" },
  { key: "doctorLabel", label: "Doctor Signature Label" },
];

const SHEET_TEMPLATE_FIELDS: Array<{ key: keyof BaseSheetTemplateConfig; label: string }> = [
  { key: "sheetTitle", label: "Sheet Title" },
  { key: "patientInfoTitle", label: "Patient Info Title" },
  { key: "doctorLabel", label: "Doctor Label" },
  { key: "examinationDateLabel", label: "Examination Date Label" },
  { key: "notesLabel", label: "Notes Label" },
  { key: "signatureLabel", label: "Signature Label" },
];
type FollowupKey = "followupConsultant" | "followupLasik";

export default function AdminSheetDesigner() {
  const { user, isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();
  const [config, setConfig] = useState<SheetDesignerConfig>(DEFAULT_SHEET_DESIGNER_CONFIG);
  const [activeDesignerTab, setActiveDesignerTab] = useState("consultant-followup");
  const settingsQuery = trpc.medical.getSystemSetting.useQuery(
    { key: "sheet_designer_config" },
    { enabled: isAuthenticated, refetchOnWindowFocus: false }
  );
  const updateSettingMutation = trpc.medical.updateSystemSetting.useMutation();

  useEffect(() => {
    if (!isAuthenticated) setLocation("/");
  }, [isAuthenticated, setLocation]);

  useEffect(() => {
    setConfig(loadSheetDesignerConfig());
  }, []);

  useEffect(() => {
    if (!settingsQuery.data?.value) return;
    const merged = coerceSheetDesignerConfig(settingsQuery.data.value);
    setConfig(merged);
    saveSheetDesignerConfig(merged);
  }, [settingsQuery.data]);

  if (!isAuthenticated || user?.role !== "admin") return null;

  const updateCss = (key: SheetCssKey, value: string) => {
    setConfig((prev) => ({ ...prev, css: { ...prev.css, [key]: value } }));
  };

  const updateTemplate = <K extends keyof BaseSheetTemplateConfig>(
    sheet: SheetTemplateKey,
    key: K,
    value: BaseSheetTemplateConfig[K]
  ) => {
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
    value: SheetLayoutConfig[K]
  ) => {
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
    value: FollowupTemplateConfig[K]
  ) => {
    setConfig((prev) => ({ ...prev, [section]: { ...prev[section], [key]: value } }));
  };

  const renderFollowupTextFields = (section: FollowupKey) => (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
      {FOLLOWUP_TEXT_FIELDS.map((field) => (
        <div key={String(field.key)}>
          <label className="text-sm font-medium">{field.label}</label>
          <Input
            value={String(config[section][field.key])}
            onChange={(e) => updateFollowup(section, field.key, e.target.value as any)}
          />
        </div>
      ))}
    </div>
  );

  const renderFollowupNameFields = (section: FollowupKey) => (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
      <div>
        <label className="text-sm font-medium">Follow-up Name 1</label>
        <Input
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
        <label className="text-sm font-medium">Follow-up Name 2</label>
        <Input
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
        <label className="text-sm font-medium">Follow-up Name 3</label>
        <Input
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
        <label className="text-sm font-medium">Follow-up Name 4</label>
        <Input
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

  const renderFollowupLayoutFields = (section: FollowupKey, labelPrefix = "") => (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
      <div>
        <label className="text-sm font-medium">{labelPrefix}Offset X (mm)</label>
        <Input
          type="number"
          step="1"
          value={config[section].offsetXmm}
          onChange={(e) => updateFollowup(section, "offsetXmm", Number(e.target.value) || 0)}
        />
      </div>
      <div>
        <label className="text-sm font-medium">{labelPrefix}Offset Y (mm)</label>
        <Input
          type="number"
          step="1"
          value={config[section].offsetYmm}
          onChange={(e) => updateFollowup(section, "offsetYmm", Number(e.target.value) || 0)}
        />
      </div>
      <div>
        <label className="text-sm font-medium">{labelPrefix}Scale</label>
        <Input
          type="number"
          step="0.01"
          value={config[section].scale}
          onChange={(e) => updateFollowup(section, "scale", Number(e.target.value) || 1)}
        />
      </div>
      <div>
        <label className="text-sm font-medium">Gap Between Follow-up Tables (mm)</label>
        <Input
          type="number"
          step="1"
          value={config[section].tableGapMm}
          onChange={(e) => updateFollowup(section, "tableGapMm", Number(e.target.value) || 0)}
        />
      </div>
    </div>
  );

  const handleSave = async () => {
    try {
      await updateSettingMutation.mutateAsync({
        key: "sheet_designer_config",
        value: config,
      });
      saveSheetDesignerConfig(config);
      toast.success("تم حفظ إعدادات مصمّم النماذج.");
    } catch {
      toast.error("تعذّر حفظ إعدادات مصمّم النماذج.");
    }
  };

  const handleReset = async () => {
    try {
      setConfig(DEFAULT_SHEET_DESIGNER_CONFIG);
      await updateSettingMutation.mutateAsync({
        key: "sheet_designer_config",
        value: DEFAULT_SHEET_DESIGNER_CONFIG,
      });
      saveSheetDesignerConfig(DEFAULT_SHEET_DESIGNER_CONFIG);
      toast.success("تمت إعادة الإعدادات إلى الافتراضي.");
    } catch {
      toast.error("تعذّرت إعادة الإعدادات إلى الافتراضي.");
    }
  };

  const designerNav: { id: string; label: string; sections: string }[] = [
    { id: "consultant-followup", label: "متابعة استشاري", sections: "جداول متابعة" },
    { id: "consultant-template", label: "قالب استشاري", sections: "عناوين الشيت" },
    { id: "specialist-template", label: "قالب متخصص", sections: "عناوين الشيت" },
    { id: "lasik-template", label: "قالب ليزك", sections: "عناوين الشيت" },
    { id: "external-template", label: "قالب خارجي", sections: "عناوين الشيت" },
    { id: "pentacam-template", label: "قالب Pentacam", sections: "عناوين الشيت" },
    { id: "consultant-css", label: "CSS استشاري", sections: "أنماط مخصصة" },
    { id: "specialist-css", label: "CSS متخصص", sections: "أنماط مخصصة" },
    { id: "lasik-css", label: "CSS ليزك", sections: "أنماط مخصصة" },
    { id: "external-css", label: "CSS خارجي", sections: "أنماط مخصصة" },
    { id: "pentacam-css", label: "CSS Pentacam", sections: "أنماط مخصصة" },
  ];

  const previewTitle = designerNav.find((n) => n.id === activeDesignerTab)?.label ?? "المعاينة";

  return (
    <div className="mx-auto w-full max-w-[1440px] space-y-5 pb-10 text-right" dir="rtl">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <PageHeader
          title="مصمم النماذج"
          subtitle="تصميم وتخصيص النماذج الطبية"
          icon={<Palette className="h-5 w-5" />}
        />
        <Button
          type="button"
          className="selrs-gradient-btn shrink-0 gap-2 self-start text-white sm:mt-1"
          onClick={() => setLocation("/medical-sheets")}
        >
          <Plus className="h-4 w-4" />
          نموذج جديد
        </Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
          <CardHeader className="border-b border-border/80 bg-muted/15 py-4">
            <CardTitle className="flex items-center gap-2 text-base">
              <FileText className="h-5 w-5 text-primary" />
              النماذج المتاحة
            </CardTitle>
            <p className="text-xs text-muted-foreground">اختر قالباً للتعديل في اللوحة أدناه</p>
          </CardHeader>
          <CardContent className="max-h-[min(520px,65vh)] space-y-2 overflow-y-auto pt-4">
            {designerNav.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setActiveDesignerTab(item.id)}
                className={`flex w-full items-center justify-between gap-3 rounded-xl border p-3 text-right transition-colors ${
                  activeDesignerTab === item.id
                    ? "border-primary/40 bg-primary/[0.06] shadow-sm"
                    : "border-border/70 bg-card hover:bg-muted/30"
                }`}
              >
                <div className="min-w-0 flex-1">
                  <div className="font-bold leading-snug">{item.label}</div>
                  <div className="text-[11px] text-muted-foreground">{item.sections}</div>
                </div>
                <Eye className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
              </button>
            ))}
          </CardContent>
        </Card>

        <Card className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
          <CardHeader className="border-b border-border/80 py-4">
            <CardTitle className="text-base">معاينة النموذج</CardTitle>
            <p className="text-xs text-muted-foreground">نموذج: {previewTitle}</p>
          </CardHeader>
          <CardContent className="grid gap-3 pt-4 sm:grid-cols-2">
            {["البيانات الشخصية", "الفحص البصري", "القياسات", "التشخيص والعلاج"].map((section) => (
              <div key={section} className="rounded-xl border border-border/80 bg-muted/10 p-3 shadow-inner">
                <p className="mb-2 text-[10px] font-semibold text-muted-foreground">٤ حقول</p>
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

      <Card className="rounded-xl border-border/80 shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">إجراءات</CardTitle>
          <p className="text-sm text-muted-foreground">
            بعد الحفظ تُحدَّث المعاينة لهذا الجهاز؛ راجع الطباعة قبل التوزيع.
          </p>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          <Button className="selrs-gradient-btn text-white hover:opacity-95" onClick={handleSave} disabled={updateSettingMutation.isPending}>
            {updateSettingMutation.isPending ? "جاري الحفظ…" : "حفظ الكل"}
          </Button>
          <Button variant="outline" onClick={handleReset} disabled={updateSettingMutation.isPending}>
            إعادة افتراضي
          </Button>
        </CardContent>
      </Card>

      <Tabs
        value={activeDesignerTab}
        onValueChange={setActiveDesignerTab}
        persistKey="admin-sheet-designer"
        className="w-full"
      >
        <TabsList className="flex h-auto min-h-[2.75rem] w-full flex-wrap gap-1 overflow-x-auto rounded-xl border border-border bg-muted/40 p-1.5 [scrollbar-width:none]">
          <TabsTrigger value="consultant-followup" className="shrink-0 rounded-lg text-xs sm:text-sm">
            متابعة استشاري
          </TabsTrigger>
          <TabsTrigger value="consultant-template" className="shrink-0 rounded-lg text-xs sm:text-sm">
            استشاري
          </TabsTrigger>
          <TabsTrigger value="specialist-template" className="shrink-0 rounded-lg text-xs sm:text-sm">
            متخصص
          </TabsTrigger>
          <TabsTrigger value="lasik-template" className="shrink-0 rounded-lg text-xs sm:text-sm">
            ليزك
          </TabsTrigger>
          <TabsTrigger value="external-template" className="shrink-0 rounded-lg text-xs sm:text-sm">
            خارجي
          </TabsTrigger>
          <TabsTrigger value="pentacam-template" className="shrink-0 rounded-lg text-xs sm:text-sm">
            Pentacam
          </TabsTrigger>
          <TabsTrigger value="consultant-css" className="shrink-0 rounded-lg text-xs sm:text-sm">
            CSS استشاري
          </TabsTrigger>
          <TabsTrigger value="specialist-css" className="shrink-0 rounded-lg text-xs sm:text-sm">
            CSS متخصص
          </TabsTrigger>
          <TabsTrigger value="lasik-css" className="shrink-0 rounded-lg text-xs sm:text-sm">
            CSS ليزك
          </TabsTrigger>
          <TabsTrigger value="external-css" className="shrink-0 rounded-lg text-xs sm:text-sm">
            CSS خارجي
          </TabsTrigger>
          <TabsTrigger value="pentacam-css" className="shrink-0 rounded-lg text-xs sm:text-sm">
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
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {SHEET_TEMPLATE_FIELDS.map((field) => (
                <div key={`consultant-${String(field.key)}`}>
                  <label className="text-sm font-medium">{field.label}</label>
                  <Input
                    value={String(config.templates.consultant[field.key])}
                    onChange={(e) => updateTemplate("consultant", field.key, e.target.value as any)}
                  />
                </div>
              ))}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <label className="text-sm font-medium">Offset X (mm)</label>
                  <Input
                    type="number"
                    step="1"
                    value={config.layout.consultant.offsetXmm}
                    onChange={(e) => updateLayout("consultant", "offsetXmm", Number(e.target.value) || 0)}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Offset Y (mm)</label>
                  <Input
                    type="number"
                    step="1"
                    value={config.layout.consultant.offsetYmm}
                    onChange={(e) => updateLayout("consultant", "offsetYmm", Number(e.target.value) || 0)}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Scale</label>
                  <Input
                    type="number"
                    step="0.01"
                    value={config.layout.consultant.scale}
                    onChange={(e) => updateLayout("consultant", "scale", Number(e.target.value) || 1)}
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
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {SHEET_TEMPLATE_FIELDS.map((field) => (
                <div key={`specialist-${String(field.key)}`}>
                  <label className="text-sm font-medium">{field.label}</label>
                  <Input
                    value={String(config.templates.specialist[field.key])}
                    onChange={(e) => updateTemplate("specialist", field.key, e.target.value as any)}
                  />
                </div>
              ))}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <label className="text-sm font-medium">Offset X (mm)</label>
                  <Input
                    type="number"
                    step="1"
                    value={config.layout.specialist.offsetXmm}
                    onChange={(e) => updateLayout("specialist", "offsetXmm", Number(e.target.value) || 0)}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Offset Y (mm)</label>
                  <Input
                    type="number"
                    step="1"
                    value={config.layout.specialist.offsetYmm}
                    onChange={(e) => updateLayout("specialist", "offsetYmm", Number(e.target.value) || 0)}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Scale</label>
                  <Input
                    type="number"
                    step="0.01"
                    value={config.layout.specialist.scale}
                    onChange={(e) => updateLayout("specialist", "scale", Number(e.target.value) || 1)}
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
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {SHEET_TEMPLATE_FIELDS.map((field) => (
                <div key={`lasik-${String(field.key)}`}>
                  <label className="text-sm font-medium">{field.label}</label>
                  <Input
                    value={String(config.templates.lasik[field.key])}
                    onChange={(e) => updateTemplate("lasik", field.key, e.target.value as any)}
                  />
                </div>
              ))}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <label className="text-sm font-medium">Offset X (mm)</label>
                  <Input
                    type="number"
                    step="1"
                    value={config.layout.lasik.offsetXmm}
                    onChange={(e) => updateLayout("lasik", "offsetXmm", Number(e.target.value) || 0)}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Offset Y (mm)</label>
                  <Input
                    type="number"
                    step="1"
                    value={config.layout.lasik.offsetYmm}
                    onChange={(e) => updateLayout("lasik", "offsetYmm", Number(e.target.value) || 0)}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Scale</label>
                  <Input
                    type="number"
                    step="0.01"
                    value={config.layout.lasik.scale}
                    onChange={(e) => updateLayout("lasik", "scale", Number(e.target.value) || 1)}
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
              {renderFollowupLayoutFields("followupLasik", "Follow-up ")}
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
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {SHEET_TEMPLATE_FIELDS.map((field) => (
                <div key={`external-${String(field.key)}`}>
                  <label className="text-sm font-medium">{field.label}</label>
                  <Input
                    value={String(config.templates.external[field.key])}
                    onChange={(e) => updateTemplate("external", field.key, e.target.value as any)}
                  />
                </div>
              ))}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <label className="text-sm font-medium">Offset X (mm)</label>
                  <Input
                    type="number"
                    step="1"
                    value={config.layout.external.offsetXmm}
                    onChange={(e) => updateLayout("external", "offsetXmm", Number(e.target.value) || 0)}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Offset Y (mm)</label>
                  <Input
                    type="number"
                    step="1"
                    value={config.layout.external.offsetYmm}
                    onChange={(e) => updateLayout("external", "offsetYmm", Number(e.target.value) || 0)}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Scale</label>
                  <Input
                    type="number"
                    step="0.01"
                    value={config.layout.external.scale}
                    onChange={(e) => updateLayout("external", "scale", Number(e.target.value) || 1)}
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
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {SHEET_TEMPLATE_FIELDS.map((field) => (
                  <div key={`pentacam-${String(field.key)}`}>
                    <label className="text-sm font-medium">{field.label}</label>
                    <Input
                      value={String(config.templates.pentacam[field.key])}
                      onChange={(e) => updateTemplate("pentacam", field.key, e.target.value as any)}
                    />
                  </div>
                ))}
                <div>
                  <label className="text-sm font-medium">Offset X (mm)</label>
                  <Input
                    type="number"
                    step="1"
                    value={config.layout.pentacam.offsetXmm}
                    onChange={(e) => updateLayout("pentacam", "offsetXmm", Number(e.target.value) || 0)}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Offset Y (mm)</label>
                  <Input
                    type="number"
                    step="1"
                    value={config.layout.pentacam.offsetYmm}
                    onChange={(e) => updateLayout("pentacam", "offsetYmm", Number(e.target.value) || 0)}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Scale</label>
                  <Input
                    type="number"
                    step="0.01"
                    value={config.layout.pentacam.scale}
                    onChange={(e) => updateLayout("pentacam", "scale", Number(e.target.value) || 1)}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="consultant-css" className="mt-4">
          <Card>
            <CardHeader><CardTitle>Consultant Sheet Custom CSS</CardTitle></CardHeader>
            <CardContent>
              <Textarea
                className="min-h-[320px] font-mono text-xs"
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
              <Textarea
                className="min-h-[320px] font-mono text-xs"
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
              <Textarea
                className="min-h-[320px] font-mono text-xs"
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
              <Textarea
                className="min-h-[320px] font-mono text-xs"
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
              <Textarea
                className="min-h-[320px] font-mono text-xs"
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
