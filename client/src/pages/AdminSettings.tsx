import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { cn, getTrpcErrorMessage } from "@/lib/utils";
import AdminStatus from "./AdminStatus";
import AdminApiTools from "./AdminApiTools";
import AdminMigrations from "./AdminMigrations";
import AdminPentacamFailed from "./AdminPentacamFailed";
import AdminCardVisibility from "./AdminCardVisibility";
import AdminNotificationSettings from "./AdminNotificationSettings";
import { DEFAULT_APPOINTMENTS_PRICING } from "@/lib/operationsPricing";
import { Activity } from "lucide-react";

const KEY = "selrs_preferred_url";
const PRICING_SETTING_KEY = "appointments_pricing_v1";
const MOBILE_SHEET_MODE_KEY = "mobile_sheet_mode_v1";
const APP_NOTIFICATION_SETTINGS_KEY = "app_notification_settings_v1";
const APP_NOTIFICATION_FEED_KEY = "app_notifications_feed_v1";
type PricingConfig = typeof DEFAULT_APPOINTMENTS_PRICING;
type AppNotificationSettings = {
  mssqlOwnerEnabled: boolean;
  mssqlInAppEnabled: boolean;
  manualPatientInAppEnabled: boolean;
  operationsPushEnabled?: boolean;
  operationsPushUserIds?: number[];
};
type AppNotificationItem = {
  id: string;
  title: string;
  message: string;
  createdAt: string;
  kind?: "info" | "success" | "warning" | "error";
  source?: string | null;
};
const DEFAULT_APP_NOTIFICATION_SETTINGS: AppNotificationSettings = {
  mssqlOwnerEnabled: true,
  mssqlInAppEnabled: true,
  manualPatientInAppEnabled: true,
};
const clonePricing = (value: PricingConfig): PricingConfig => JSON.parse(JSON.stringify(value));
const toSafeNumber = (value: unknown) => {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
};

export default function AdminSettings({ pricingOnly = false }: { pricingOnly?: boolean }) {
  const PRICING_RULES_PERMISSION = "/admin/settings/pricing-rules";
  const PRICING_RULES_KEY_PERMISSION = "appointments_pricing_v1";
  const { user, isAuthenticated } = useAuth();
  const [location, setLocation] = useLocation();
  const [preferredUrl, setPreferredUrl] = useState("");
  const [pricingJson, setPricingJson] = useState("");
  const [pricingForm, setPricingForm] = useState<PricingConfig>(clonePricing(DEFAULT_APPOINTMENTS_PRICING));
  const pricingSettingQuery = trpc.medical.getSystemSetting.useQuery(
    { key: PRICING_SETTING_KEY },
    { refetchOnWindowFocus: false }
  );
  const appNotificationSettingsQuery = trpc.medical.getSystemSetting.useQuery(
    { key: APP_NOTIFICATION_SETTINGS_KEY },
    { refetchOnWindowFocus: false }
  );
  const appNotificationFeedQuery = trpc.medical.getSystemSetting.useQuery(
    { key: APP_NOTIFICATION_FEED_KEY },
    { refetchOnWindowFocus: false }
  );
  const mobileSheetModeSettingQuery = trpc.medical.getSystemSetting.useQuery(
    { key: MOBILE_SHEET_MODE_KEY },
    { refetchOnWindowFocus: false }
  );
  const updateSettingMutation = trpc.medical.updateSystemSetting.useMutation();
  const permissionsQuery = trpc.medical.getMyPermissions.useQuery(undefined, {
    enabled: Boolean(isAuthenticated && user?.role !== "admin"),
    refetchOnWindowFocus: false,
  });
  const appNotificationSettingsValueRaw = (appNotificationSettingsQuery.data as any)?.value;
  const appNotificationSettings: AppNotificationSettings =
    appNotificationSettingsValueRaw && typeof appNotificationSettingsValueRaw === "object"
      ? {
          mssqlOwnerEnabled:
            typeof appNotificationSettingsValueRaw.mssqlOwnerEnabled === "boolean"
              ? appNotificationSettingsValueRaw.mssqlOwnerEnabled
              : DEFAULT_APP_NOTIFICATION_SETTINGS.mssqlOwnerEnabled,
          mssqlInAppEnabled:
            typeof appNotificationSettingsValueRaw.mssqlInAppEnabled === "boolean"
              ? appNotificationSettingsValueRaw.mssqlInAppEnabled
              : DEFAULT_APP_NOTIFICATION_SETTINGS.mssqlInAppEnabled,
          manualPatientInAppEnabled:
            typeof appNotificationSettingsValueRaw.manualPatientInAppEnabled === "boolean"
              ? appNotificationSettingsValueRaw.manualPatientInAppEnabled
              : DEFAULT_APP_NOTIFICATION_SETTINGS.manualPatientInAppEnabled,
          operationsPushEnabled:
            typeof appNotificationSettingsValueRaw.operationsPushEnabled === "boolean"
              ? appNotificationSettingsValueRaw.operationsPushEnabled
              : undefined,
          operationsPushUserIds: Array.isArray(appNotificationSettingsValueRaw.operationsPushUserIds)
            ? appNotificationSettingsValueRaw.operationsPushUserIds
                .map((v: unknown) => Number(v))
                .filter((v: number) => Number.isInteger(v) && v > 0)
            : undefined,
        }
      : DEFAULT_APP_NOTIFICATION_SETTINGS;

  useEffect(() => {
    if (!isAuthenticated) {
      setLocation("/");
    }
  }, [isAuthenticated, setLocation]);

  useEffect(() => {
    const saved = localStorage.getItem(KEY) || "";
    setPreferredUrl(saved);
  }, []);

  useEffect(() => {
    const serverValue = (pricingSettingQuery.data as any)?.value;
    const payload = serverValue && typeof serverValue === "object" ? (serverValue as PricingConfig) : DEFAULT_APPOINTMENTS_PRICING;
    setPricingForm(clonePricing(payload));
    setPricingJson(JSON.stringify(payload, null, 2));
  }, [pricingSettingQuery.data]);

  if (!isAuthenticated) return null;

  const isPricingOnlyMode = pricingOnly || location.startsWith("/admin/settings/pricing-rules");
  const userRole = String(user?.role ?? "").toLowerCase();
  const myPermissions = (permissionsQuery.data ?? []) as string[];
  const canReadPricingRules =
    userRole === "admin" ||
    userRole === "accountant" ||
    myPermissions.includes(PRICING_RULES_PERMISSION) ||
    myPermissions.includes(PRICING_RULES_KEY_PERMISSION) ||
    myPermissions.includes("/appointments/accounts");

  if (isPricingOnlyMode && user?.role !== "admin" && permissionsQuery.isLoading) {
    return null;
  }

  if (isPricingOnlyMode && !canReadPricingRules) return null;
  if (!isPricingOnlyMode && user?.role !== "admin") return null;

  const handleSave = () => {
    localStorage.setItem(KEY, preferredUrl.trim());
    toast.success("Settings Saved");
  };

  const mobileSheetModeValueRaw = (mobileSheetModeSettingQuery.data as any)?.value;
  const mobileSheetModeEnabled = Boolean(
    mobileSheetModeValueRaw && typeof mobileSheetModeValueRaw === "object"
      ? mobileSheetModeValueRaw.enabled
      : mobileSheetModeValueRaw
  );

  const handleToggleMobileSheetMode = async (enabled: boolean) => {
    try {
      await updateSettingMutation.mutateAsync({
        key: MOBILE_SHEET_MODE_KEY,
        value: { enabled },
      });
      await mobileSheetModeSettingQuery.refetch();
      toast.success(enabled ? "Mobile sheet mode enabled" : "Mobile sheet mode disabled");
    } catch (error) {
      toast.error(getTrpcErrorMessage(error, "Failed to update mobile sheet mode"));
    }
  };
  const saveAppNotificationSettings = async (value: AppNotificationSettings) => {
    const preservedRaw =
      appNotificationSettingsValueRaw && typeof appNotificationSettingsValueRaw === "object"
        ? appNotificationSettingsValueRaw
        : {};
    await updateSettingMutation.mutateAsync({
      key: APP_NOTIFICATION_SETTINGS_KEY,
      // Keep unknown fields so this page does not wipe settings managed elsewhere.
      value: {
        ...preservedRaw,
        ...value,
      },
    });
    await appNotificationSettingsQuery.refetch();
  };
  const handleToggleAppNotificationSetting = async (
    key: keyof AppNotificationSettings,
    enabled: boolean
  ) => {
    try {
      await saveAppNotificationSettings({
        ...appNotificationSettings,
        [key]: enabled,
      });
      toast.success("Notification settings saved");
    } catch (error) {
      toast.error(getTrpcErrorMessage(error, "Failed to update notification settings"));
    }
  };

  const savePricingSetting = async (value: PricingConfig) => {
    await updateSettingMutation.mutateAsync({
      key: PRICING_SETTING_KEY,
      value,
    });
    await pricingSettingQuery.refetch();
  };

  const handleSavePricingForm = async () => {
    try {
      await savePricingSetting(pricingForm);
      setPricingJson(JSON.stringify(pricingForm, null, 2));
      toast.success("Appointments pricing saved");
    } catch (error) {
      toast.error(getTrpcErrorMessage(error, "Failed to save appointments pricing"));
    }
  };

  const handleResetPricing = () => {
    const defaults = clonePricing(DEFAULT_APPOINTMENTS_PRICING);
    setPricingForm(defaults);
    setPricingJson(JSON.stringify(defaults, null, 2));
  };
  const setField = (setter: (draft: PricingConfig) => void) => {
    setPricingForm((prev: PricingConfig) => {
      const next = clonePricing(prev);
      setter(next);
      setPricingJson(JSON.stringify(next, null, 2));
      return next;
    });
  };
  const PriceField = ({
    label,
    value,
    onChange,
  }: {
    label: string;
    value: number;
    onChange: (value: number) => void;
  }) => (
    <div className="flex items-center justify-between gap-3 py-1.5 border-b border-border/40 last:border-0 group/field">
      <span className="text-[11px] text-muted-foreground font-medium group-hover/field:text-foreground transition-colors">{label}</span>
      <Input
        type="number"
        className="h-8 w-24 text-center tabular-nums text-xs font-bold border-muted-foreground/20 focus:border-primary/50 bg-background/50"
        value={String(value)}
        onChange={(e) => onChange(toSafeNumber(e.target.value))}
      />
    </div>
  );

  return (
    <div className="mx-auto w-full max-w-[1440px] space-y-0 pb-6 text-right" dir="rtl">
      <Tabs defaultValue="settings" persistKey="admin-settings" className="w-full">
        <div className="sticky top-0 z-20 bg-background/95 backdrop-blur-md pb-4 pt-1">
          <TabsList
            className="flex w-full flex-wrap gap-1 rounded-xl bg-muted/40 p-1 sm:flex-nowrap sm:overflow-x-auto border"
          >
            <TabsTrigger className="flex-1 sm:flex-none rounded-lg px-5 py-2 text-xs font-bold data-[state=active]:bg-background data-[state=active]:shadow-sm" value="settings">
              الإعدادات العامة
            </TabsTrigger>
            {!isPricingOnlyMode && (
              <>
                <TabsTrigger className="flex-1 sm:flex-none rounded-lg px-5 py-2 text-xs font-bold" value="status">حالة النظام</TabsTrigger>
                <TabsTrigger className="flex-1 sm:flex-none rounded-lg px-5 py-2 text-xs font-bold" value="api">أدوات API</TabsTrigger>
                <TabsTrigger className="flex-1 sm:flex-none rounded-lg px-5 py-2 text-xs font-bold" value="migrations">الهجرات</TabsTrigger>
                <TabsTrigger className="flex-1 sm:flex-none rounded-lg px-5 py-2 text-xs font-bold" value="pentacam">بنتاكام</TabsTrigger>
                <TabsTrigger className="flex-1 sm:flex-none rounded-lg px-5 py-2 text-xs font-bold" value="cards">الظهور</TabsTrigger>
                <TabsTrigger className="flex-1 sm:flex-none rounded-lg px-5 py-2 text-xs font-bold" value="notifications">الإخطارات</TabsTrigger>
              </>
            )}
          </TabsList>
        </div>

        <TabsContent value="settings" className="mt-2 space-y-6">
          {!isPricingOnlyMode ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card className="border-border/60 bg-card shadow-sm h-full">
                <CardHeader className="pb-3 border-b border-border/40 mb-4 bg-muted/10">
                  <CardTitle className="text-sm font-bold flex items-center gap-2">
                    <Activity className="h-4 w-4 text-primary" />
                    تكوين السيرفر والواجهة
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-2">
                    <Label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">عنوان السيرفر المفضل (Local Storage)</Label>
                    <div className="flex gap-2">
                      <Input
                        value={preferredUrl}
                        onChange={(e) => setPreferredUrl(e.target.value)}
                        placeholder="https://app.example.com"
                        className="h-9 text-xs font-mono"
                        dir="ltr"
                      />
                      <Button onClick={handleSave} size="sm" className="bg-primary text-white h-9 px-4">
                        حفظ
                      </Button>
                    </div>
                    <p className="text-[10px] text-muted-foreground italic px-1">العنوان الحالي النشط: {window.location.origin}</p>
                  </div>

                  <div className="pt-4 border-t border-dashed space-y-4">
                    <div className="flex items-center justify-between gap-4 group/toggle p-2 rounded-lg hover:bg-muted/30 transition-colors">
                      <div className="space-y-0.5">
                        <div className="text-xs font-bold">وضع الشيت للموبايل</div>
                        <div className="text-[10px] text-muted-foreground">تحسين تخطيط النماذج الطبية للشاشات الصغيرة.</div>
                      </div>
                      <Switch
                        checked={mobileSheetModeEnabled}
                        onCheckedChange={handleToggleMobileSheetMode}
                        disabled={updateSettingMutation.isPending}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-border/60 bg-card shadow-sm h-full">
                <CardHeader className="pb-3 border-b border-border/40 mb-4 bg-muted/10">
                  <CardTitle className="text-sm font-bold flex items-center gap-2">
                    <Activity className="h-4 w-4 text-emerald-600" />
                    إعدادات الإخطارات
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {[
                    { key: "mssqlOwnerEnabled", label: "إخطار المالك (MSSQL Sync)", desc: "إرسال إشعار عند إضافة مرضى عبر المزامنة." },
                    { key: "mssqlInAppEnabled", label: "إخطار داخل التطبيق (MSSQL)", desc: "إظهار تنبيه داخلي لعمليات المزامنة." },
                    { key: "manualPatientInAppEnabled", label: "إخطار الإضافة اليدوية", desc: "تنبيه الطاقم عند تسجيل مريض جديد يدوياً." }
                  ].map((s) => (
                    <div key={s.key} className="flex items-center justify-between gap-4 group/toggle p-2 rounded-lg hover:bg-muted/30 transition-colors">
                      <div className="space-y-0.5">
                        <div className="text-xs font-bold">{s.label}</div>
                        <div className="text-[10px] text-muted-foreground">{s.desc}</div>
                      </div>
                      <Switch
                        checked={(appNotificationSettings as any)[s.key]}
                        onCheckedChange={(checked) => void handleToggleAppNotificationSetting(s.key as any, checked)}
                      />
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>
          ) : null}

          <Card className="border-border/60 bg-card shadow-sm overflow-hidden">
            <CardHeader className="pb-3 border-b border-border/40 mb-4 bg-primary/5">
              <div className="flex items-center justify-between gap-3">
                <CardTitle className="text-sm font-bold flex items-center gap-2">
                  <Activity className="h-4 w-4 text-primary" />
                  قواعد تسعير المواعيد
                </CardTitle>
                <div className="flex gap-2">
                  <Button type="button" variant="outline" size="sm" className="h-8 text-[10px] font-bold" onClick={handleResetPricing}>
                    إعادة ضبط
                  </Button>
                  <Button onClick={handleSavePricingForm} size="sm" className="h-8 text-[10px] font-bold bg-primary text-white" disabled={updateSettingMutation.isPending}>
                    حفظ القواعد
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 pt-2">
                <div className="space-y-6">
                  <div className="space-y-3">
                    <h4 className="text-[11px] font-black text-primary uppercase tracking-widest bg-primary/5 px-2 py-1 rounded">أسعار الكشوفات (Amount)</h4>
                    <div className="space-y-1">
                      <div className="font-bold text-xs mb-2 text-muted-foreground/80 px-1">— PRK —</div>
                      <PriceField label="د. السعدني" value={pricingForm.amount.prk.saadanyConsultantSaadany} onChange={(v) => setField((d) => { d.amount.prk.saadanyConsultantSaadany = v; })} />
                      <PriceField label="استشاري" value={pricingForm.amount.prk.saadanyConsultant} onChange={(v) => setField((d) => { d.amount.prk.saadanyConsultant = v; })} />
                      <PriceField label="أخصائي" value={pricingForm.amount.prk.saadanySpecialist} onChange={(v) => setField((d) => { d.amount.prk.saadanySpecialist = v; })} />
                    </div>
                    <div className="space-y-1 pt-2">
                      <div className="font-bold text-xs mb-2 text-muted-foreground/80 px-1">— LASIK —</div>
                      <PriceField label="د. السعدني" value={pricingForm.amount.lasik.saadanyConsultantSaadany} onChange={(v) => setField((d) => { d.amount.lasik.saadanyConsultantSaadany = v; })} />
                      <PriceField label="د. صواف" value={pricingForm.amount.lasik.sawaf} onChange={(v) => setField((d) => { d.amount.lasik.sawaf = v; })} />
                    </div>
                  </div>
                </div>

                <div className="space-y-6">
                  <div className="space-y-3">
                    <h4 className="text-[11px] font-black text-emerald-700 uppercase tracking-widest bg-emerald-50 px-2 py-1 rounded">حساب المركز (Doctor Account)</h4>
                    <div className="space-y-1">
                      <div className="font-bold text-xs mb-2 text-muted-foreground/80 px-1">— PRK —</div>
                      <PriceField label="د. السعدني" value={pricingForm.doctorAccount.prk.saadany} onChange={(v) => setField((d) => { d.doctorAccount.prk.saadany = v; })} />
                      <PriceField label="استشاري" value={pricingForm.doctorAccount.prk.consultant} onChange={(v) => setField((d) => { d.doctorAccount.prk.consultant = v; })} />
                      <PriceField label="د. صواف" value={pricingForm.doctorAccount.prk.sawaf} onChange={(v) => setField((d) => { d.doctorAccount.prk.sawaf = v; })} />
                    </div>
                    <div className="space-y-1 pt-2">
                      <div className="font-bold text-xs mb-2 text-muted-foreground/80 px-1">— LASIK —</div>
                      <PriceField label="د. السعدني" value={pricingForm.doctorAccount.lasik.saadany} onChange={(v) => setField((d) => { d.doctorAccount.lasik.saadany = v; })} />
                      <PriceField label="د. صواف (Moria)" value={pricingForm.doctorAccount.lasik.sawafMoria} onChange={(v) => setField((d) => { d.doctorAccount.lasik.sawafMoria = v; })} />
                      <PriceField label="د. صواف (Metal)" value={pricingForm.doctorAccount.lasik.sawafMetal} onChange={(v) => setField((d) => { d.doctorAccount.lasik.sawafMetal = v; })} />
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {!isPricingOnlyMode && (
          <>
            <TabsContent value="status" className="mt-2"><AdminStatus /></TabsContent>
            <TabsContent value="api" className="mt-2"><AdminApiTools /></TabsContent>
            <TabsContent value="migrations" className="mt-2"><AdminMigrations /></TabsContent>
            <TabsContent value="pentacam" className="mt-2"><AdminPentacamFailed /></TabsContent>
            <TabsContent value="cards" className="mt-2"><AdminCardVisibility /></TabsContent>
            <TabsContent value="notifications" className="mt-2"><AdminNotificationSettings /></TabsContent>
          </>
        )}
      </Tabs>
    </div>
  );
}
