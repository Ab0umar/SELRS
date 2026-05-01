import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { getTrpcErrorMessage } from "@/lib/utils";
import AdminStatus from "./AdminStatus";
import AdminApiTools from "./AdminApiTools";
import AdminMigrations from "./AdminMigrations";
import AdminPentacamFailed from "./AdminPentacamFailed";
import AdminCardVisibility from "./AdminCardVisibility";
import AdminNotificationSettings from "./AdminNotificationSettings";
import { DEFAULT_APPOINTMENTS_PRICING } from "@/lib/operationsPricing";

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
  const appNotificationFeedRaw = (appNotificationFeedQuery.data as any)?.value;
  const appNotificationFeed = Array.isArray(appNotificationFeedRaw)
    ? (appNotificationFeedRaw as AppNotificationItem[])
    : [];

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
  const handleClearNotificationFeed = async () => {
    try {
      await updateSettingMutation.mutateAsync({
        key: APP_NOTIFICATION_FEED_KEY,
        value: [],
      });
      await appNotificationFeedQuery.refetch();
      toast.success("Notification history cleared");
    } catch (error) {
      toast.error(getTrpcErrorMessage(error, "Failed to clear notification history"));
    }
  };

  const savePricingSetting = async (value: PricingConfig) => {
    await updateSettingMutation.mutateAsync({
      key: PRICING_SETTING_KEY,
      value,
    });
    await pricingSettingQuery.refetch();
  };

  const handleSavePricing = async () => {
    try {
      const parsed = JSON.parse(pricingJson) as PricingConfig;
      setPricingForm(clonePricing(parsed));
      await savePricingSetting(parsed);
      toast.success("Appointments pricing saved");
    } catch (error) {
      if (error instanceof SyntaxError) {
        toast.error("Invalid JSON format");
        return;
      }
      toast.error(getTrpcErrorMessage(error, "Failed to save appointments pricing"));
    }
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
  const handleApplyJsonToForm = () => {
    try {
      const parsed = JSON.parse(pricingJson) as PricingConfig;
      setPricingForm(clonePricing(parsed));
      toast.success("JSON applied to form");
    } catch {
      toast.error("Invalid JSON format");
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
    <label className="grid grid-cols-[1fr_150px] items-center gap-3 text-sm">
      <span className="text-gray-900 font-medium">{label}</span>
      <Input
        type="number"
        value={String(value)}
        onChange={(e) => onChange(toSafeNumber(e.target.value))}
      />
    </label>
  );

  return (
    <div className="mx-auto w-full max-w-[1440px] space-y-0 pb-6 text-right" dir="rtl">
      <Tabs defaultValue="settings" persistKey="admin-settings" className="w-full">
        <TabsList
          className="sticky top-0 z-[5] mb-6 flex w-full flex-wrap gap-1 rounded-lg bg-muted/50 p-1 sm:flex-nowrap sm:overflow-x-auto"
        >
          <TabsTrigger className="flex-none rounded-md px-3.5 py-1.5 text-sm font-semibold" value="settings">
            الإعدادات العامة
          </TabsTrigger>
          {!isPricingOnlyMode ? (
            <TabsTrigger className="flex-none rounded-md px-3.5 py-1.5 text-sm font-semibold" value="status">
              حالة النظام
            </TabsTrigger>
          ) : null}
          {!isPricingOnlyMode ? (
            <TabsTrigger className="flex-none rounded-md px-3.5 py-1.5 text-sm font-semibold" value="api">
              أدوات API
            </TabsTrigger>
          ) : null}
          {!isPricingOnlyMode ? (
            <TabsTrigger className="flex-none rounded-md px-3.5 py-1.5 text-sm font-semibold" value="migrations">
              الهجرات
            </TabsTrigger>
          ) : null}
          {!isPricingOnlyMode ? (
            <TabsTrigger className="flex-none rounded-md px-3.5 py-1.5 text-sm font-semibold" value="pentacam">
              بنتاكام الفاشل
            </TabsTrigger>
          ) : null}
          {!isPricingOnlyMode ? (
            <TabsTrigger className="flex-none rounded-md px-3.5 py-1.5 text-sm font-semibold" value="cards">
              ظهور الكروت
            </TabsTrigger>
          ) : null}
          {!isPricingOnlyMode ? (
            <TabsTrigger className="flex-none rounded-md px-3.5 py-1.5 text-sm font-semibold" value="notifications">
              إخطارات التطبيق
            </TabsTrigger>
          ) : null}
        </TabsList>

      <TabsContent value="settings">
      {!isPricingOnlyMode ? (
      <>
      <Card className="max-w-3xl mb-6 border-slate-200/80 bg-white/95 shadow-sm">
        <CardHeader>
          <CardTitle>Preferred Server URL</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="text-sm text-muted-foreground">Current URL: {window.location.origin}</div>
          <Input
            value={preferredUrl}
            onChange={(e) => setPreferredUrl(e.target.value)}
            placeholder="https://app.example.com"
            dir="ltr"
          />
          <Button onClick={handleSave} className="bg-primary">
            Save
          </Button>
        </CardContent>
      </Card>
      <Card className="max-w-3xl mb-6 border-slate-200/80 bg-white/95 shadow-sm">
        <CardHeader>
          <CardTitle>Notifications</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between gap-4">
            <div>
              <div className="font-medium">MSSQL owner notification</div>
              <div className="text-sm text-muted-foreground">Notify the owner when MSSQL sync adds new patients.</div>
            </div>
            <Switch
              checked={appNotificationSettings.mssqlOwnerEnabled}
              onCheckedChange={(checked) => void handleToggleAppNotificationSetting("mssqlOwnerEnabled", checked)}
            />
          </div>
          <div className="flex items-center justify-between gap-4">
            <div>
              <div className="font-medium">MSSQL in-app notification</div>
              <div className="text-sm text-muted-foreground">Show in-app notifications when MSSQL sync adds new patients.</div>
            </div>
            <Switch
              checked={appNotificationSettings.mssqlInAppEnabled}
              onCheckedChange={(checked) => void handleToggleAppNotificationSetting("mssqlInAppEnabled", checked)}
            />
          </div>
          <div className="flex items-center justify-between gap-4">
            <div>
              <div className="font-medium">Manual patient in-app notification</div>
              <div className="text-sm text-muted-foreground">Show in-app notifications when staff create patients manually.</div>
            </div>
            <Switch
              checked={appNotificationSettings.manualPatientInAppEnabled}
              onCheckedChange={(checked) => void handleToggleAppNotificationSetting("manualPatientInAppEnabled", checked)}
            />
          </div>
        </CardContent>
      </Card>
      <Card className="max-w-3xl mb-6 border-slate-200/80 bg-white/95 shadow-sm">
        <CardHeader>
          <div className="flex items-center justify-between gap-3">
            <CardTitle>Notification History</CardTitle>
            <Button
              type="button"
              variant="outline"
              onClick={() => void handleClearNotificationFeed()}
              disabled={updateSettingMutation.isPending}
            >
              Clear Feed
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {appNotificationFeed.length === 0 ? (
            <div className="text-sm text-muted-foreground">No notifications yet.</div>
          ) : (
            appNotificationFeed.slice(0, 30).map((item) => (
              <div key={item.id} className="rounded-md border p-3 space-y-1">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="font-medium">{item.title}</div>
                    <div className="text-sm text-muted-foreground">{item.message}</div>
                  </div>
                  <div className="text-right text-xs text-muted-foreground">
                    <div>{new Date(item.createdAt).toLocaleString()}</div>
                    <div className="mt-1 uppercase">{item.kind ?? "info"}</div>
                  </div>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>
      <Card className="max-w-3xl mb-6 border-slate-200/80 bg-white/95 shadow-sm">
        <CardHeader>
          <CardTitle>Mobile Sheet Mode</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between gap-3">
            <div className="text-sm">
              Enable mobile-safe sheet layout tweaks (sheets pages only).
            </div>
            <Switch
              checked={mobileSheetModeEnabled}
              onCheckedChange={handleToggleMobileSheetMode}
              disabled={updateSettingMutation.isPending}
            />
          </div>
          <div className="text-xs text-muted-foreground">
            DB-backed setting. Applies to Consultant, Specialist, Lasik, and External sheets.
          </div>
        </CardContent>
      </Card>
      </>
      ) : null}
      <Card className="max-w-3xl mb-6 border-slate-200/80 bg-white/95 shadow-sm">
        <CardHeader>
          <CardTitle>Appointments Pricing Rules</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="rounded border border-amber-300 bg-amber-50 px-3 py-2 text-sm font-semibold text-amber-900">
            Pricing UI Version: 2026-02-17-02
          </div>
          <div className="text-sm font-semibold">Form Editor</div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="rounded-md border p-3 space-y-2">
              <div className="text-sm font-semibold">Amount - PRK</div>
              <PriceField label="Dr. Saadany (Consultant Saadany)" value={pricingForm.amount.prk.saadanyConsultantSaadany} onChange={(v) => setField((d) => { d.amount.prk.saadanyConsultantSaadany = v; })} />
              <PriceField label="Consultant" value={pricingForm.amount.prk.saadanyConsultant} onChange={(v) => setField((d) => { d.amount.prk.saadanyConsultant = v; })} />
              <PriceField label="Specialist" value={pricingForm.amount.prk.saadanySpecialist} onChange={(v) => setField((d) => { d.amount.prk.saadanySpecialist = v; })} />
              <PriceField label="Fallback (other cases)" value={pricingForm.amount.prk.fallback} onChange={(v) => setField((d) => { d.amount.prk.fallback = v; })} />
            </div>
            <div className="rounded-md border p-3 space-y-2">
              <div className="text-sm font-semibold">Amount - Lasik</div>
              <PriceField label="Dr. Saadany (Consultant Saadany)" value={pricingForm.amount.lasik.saadanyConsultantSaadany} onChange={(v) => setField((d) => { d.amount.lasik.saadanyConsultantSaadany = v; })} />
              <PriceField label="Consultant" value={pricingForm.amount.lasik.saadanyConsultant} onChange={(v) => setField((d) => { d.amount.lasik.saadanyConsultant = v; })} />
              <PriceField label="Dr. Sawaf" value={pricingForm.amount.lasik.sawaf} onChange={(v) => setField((d) => { d.amount.lasik.sawaf = v; })} />
              <PriceField label="Fallback (other cases)" value={pricingForm.amount.lasik.fallback} onChange={(v) => setField((d) => { d.amount.lasik.fallback = v; })} />
            </div>
            <div className="rounded-md border p-3 space-y-2">
              <div className="text-sm font-semibold">Center Account (Paid by Doctor) - PRK</div>
              <PriceField label="Dr. Saadany" value={pricingForm.doctorAccount.prk.saadany} onChange={(v) => setField((d) => { d.doctorAccount.prk.saadany = v; })} />
              <PriceField label="Consultant" value={pricingForm.doctorAccount.prk.consultant} onChange={(v) => setField((d) => { d.doctorAccount.prk.consultant = v; })} />
              <PriceField label="Specialist" value={pricingForm.doctorAccount.prk.specialist} onChange={(v) => setField((d) => { d.doctorAccount.prk.specialist = v; })} />
              <PriceField label="Dr. Sawaf" value={pricingForm.doctorAccount.prk.sawaf} onChange={(v) => setField((d) => { d.doctorAccount.prk.sawaf = v; })} />
              <PriceField label="Others" value={pricingForm.doctorAccount.prk.others} onChange={(v) => setField((d) => { d.doctorAccount.prk.others = v; })} />
            </div>
            <div className="rounded-md border p-3 space-y-2">
              <div className="text-sm font-semibold">Center Account (Paid by Doctor) - Lasik</div>
              <PriceField label="Dr. Saadany" value={pricingForm.doctorAccount.lasik.saadany} onChange={(v) => setField((d) => { d.doctorAccount.lasik.saadany = v; })} />
              <PriceField label="Consultant" value={pricingForm.doctorAccount.lasik.consultant} onChange={(v) => setField((d) => { d.doctorAccount.lasik.consultant = v; })} />
              <PriceField label="Dr. Sawaf (Moria/Lasik)" value={pricingForm.doctorAccount.lasik.sawafMoria} onChange={(v) => setField((d) => { d.doctorAccount.lasik.sawafMoria = v; })} />
              <PriceField label="Dr. Sawaf (Metal)" value={pricingForm.doctorAccount.lasik.sawafMetal} onChange={(v) => setField((d) => { d.doctorAccount.lasik.sawafMetal = v; })} />
              <PriceField label="Others (Moria/Lasik)" value={pricingForm.doctorAccount.lasik.othersMoria} onChange={(v) => setField((d) => { d.doctorAccount.lasik.othersMoria = v; })} />
              <PriceField label="Others (Metal)" value={pricingForm.doctorAccount.lasik.othersMetal} onChange={(v) => setField((d) => { d.doctorAccount.lasik.othersMetal = v; })} />
            </div>
          </div>
          <div className="flex gap-2">
            <Button onClick={handleSavePricingForm} disabled={updateSettingMutation.isPending}>
              Save From Form
            </Button>
            <Button type="button" variant="outline" onClick={handleResetPricing}>
              Reset To Defaults
            </Button>
          </div>
        </CardContent>
      </Card>
      </TabsContent>

      {!isPricingOnlyMode ? <TabsContent value="status">
        <AdminStatus />
      </TabsContent> : null}

      {!isPricingOnlyMode ? <TabsContent value="api">
        <AdminApiTools />
      </TabsContent> : null}

      {!isPricingOnlyMode ? <TabsContent value="migrations">
        <AdminMigrations />
      </TabsContent> : null}

      {!isPricingOnlyMode ? (
        <TabsContent value="pentacam">
          <AdminPentacamFailed />
        </TabsContent>
      ) : null}

      {!isPricingOnlyMode ? (
        <TabsContent value="cards">
          <AdminCardVisibility />
        </TabsContent>
      ) : null}

      {!isPricingOnlyMode ? (
        <TabsContent value="notifications">
          <AdminNotificationSettings />
        </TabsContent>
      ) : null}
      </Tabs>
    </div>
  );
}
