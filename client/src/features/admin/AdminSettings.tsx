import { useEffect, useId, useMemo, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { cn, getTrpcErrorMessage } from "@/lib/utils";
import { DEFAULT_APPOINTMENTS_PRICING } from "@/lib/operationsPricing";
import {
  Activity,
  AlertCircle,
  CheckCircle2,
  Loader2,
  RefreshCw,
} from "lucide-react";

const KEY = "selrs_preferred_url";
const PRICING_SETTING_KEY = "appointments_pricing_v1";
const MOBILE_SHEET_MODE_KEY = "mobile_sheet_mode_v1";
type PricingConfig = typeof DEFAULT_APPOINTMENTS_PRICING;
type PricingSettingResponse = { value?: unknown } | null | undefined;
const clonePricing = (value: PricingConfig): PricingConfig =>
  JSON.parse(JSON.stringify(value)) as PricingConfig;
const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;
const readPricingNumber = (
  source: Record<string, unknown>,
  key: string,
  fallback: number,
) => {
  const value = Number(source[key]);
  return Number.isFinite(value) && value >= 0 ? value : fallback;
};
const normalizePricingConfig = (value: unknown): PricingConfig => {
  const source = isRecord(value) ? value : {};
  const amount = isRecord(source.amount) ? source.amount : {};
  const amountPrk = isRecord(amount.prk) ? amount.prk : {};
  const amountLasik = isRecord(amount.lasik) ? amount.lasik : {};
  const doctorAccount = isRecord(source.doctorAccount)
    ? source.doctorAccount
    : {};
  const doctorPrk = isRecord(doctorAccount.prk) ? doctorAccount.prk : {};
  const doctorLasik = isRecord(doctorAccount.lasik) ? doctorAccount.lasik : {};
  const defaults = DEFAULT_APPOINTMENTS_PRICING;
  return {
    amount: {
      prk: {
        saadanyConsultantSaadany: readPricingNumber(
          amountPrk,
          "saadanyConsultantSaadany",
          defaults.amount.prk.saadanyConsultantSaadany,
        ),
        saadanyConsultant: readPricingNumber(
          amountPrk,
          "saadanyConsultant",
          defaults.amount.prk.saadanyConsultant,
        ),
        saadanySpecialist: readPricingNumber(
          amountPrk,
          "saadanySpecialist",
          defaults.amount.prk.saadanySpecialist,
        ),
        fallback: readPricingNumber(
          amountPrk,
          "fallback",
          defaults.amount.prk.fallback,
        ),
      },
      lasik: {
        saadanyConsultantSaadany: readPricingNumber(
          amountLasik,
          "saadanyConsultantSaadany",
          defaults.amount.lasik.saadanyConsultantSaadany,
        ),
        saadanyConsultant: readPricingNumber(
          amountLasik,
          "saadanyConsultant",
          defaults.amount.lasik.saadanyConsultant,
        ),
        sawaf: readPricingNumber(
          amountLasik,
          "sawaf",
          defaults.amount.lasik.sawaf,
        ),
        fallback: readPricingNumber(
          amountLasik,
          "fallback",
          defaults.amount.lasik.fallback,
        ),
      },
    },
    doctorAccount: {
      prk: {
        saadany: readPricingNumber(
          doctorPrk,
          "saadany",
          defaults.doctorAccount.prk.saadany,
        ),
        consultant: readPricingNumber(
          doctorPrk,
          "consultant",
          defaults.doctorAccount.prk.consultant,
        ),
        specialist: readPricingNumber(
          doctorPrk,
          "specialist",
          defaults.doctorAccount.prk.specialist,
        ),
        sawaf: readPricingNumber(
          doctorPrk,
          "sawaf",
          defaults.doctorAccount.prk.sawaf,
        ),
        others: readPricingNumber(
          doctorPrk,
          "others",
          defaults.doctorAccount.prk.others,
        ),
      },
      lasik: {
        saadany: readPricingNumber(
          doctorLasik,
          "saadany",
          defaults.doctorAccount.lasik.saadany,
        ),
        consultant: readPricingNumber(
          doctorLasik,
          "consultant",
          defaults.doctorAccount.lasik.consultant,
        ),
        sawafMoria: readPricingNumber(
          doctorLasik,
          "sawafMoria",
          defaults.doctorAccount.lasik.sawafMoria,
        ),
        sawafMetal: readPricingNumber(
          doctorLasik,
          "sawafMetal",
          defaults.doctorAccount.lasik.sawafMetal,
        ),
        sawafFallback: readPricingNumber(
          doctorLasik,
          "sawafFallback",
          defaults.doctorAccount.lasik.sawafFallback,
        ),
        othersMoria: readPricingNumber(
          doctorLasik,
          "othersMoria",
          defaults.doctorAccount.lasik.othersMoria,
        ),
        othersMetal: readPricingNumber(
          doctorLasik,
          "othersMetal",
          defaults.doctorAccount.lasik.othersMetal,
        ),
        othersFallback: readPricingNumber(
          doctorLasik,
          "othersFallback",
          defaults.doctorAccount.lasik.othersFallback,
        ),
      },
    },
  };
};
const toSafeNumber = (value: string) => {
  const number = Number(value);
  return Number.isFinite(number) ? Math.max(0, number) : 0;
};
const validatePricing = (config: PricingConfig) => {
  const values: Array<[string, number]> = [
    [
      "amount.prk.saadanyConsultantSaadany",
      config.amount.prk.saadanyConsultantSaadany,
    ],
    ["amount.prk.saadanyConsultant", config.amount.prk.saadanyConsultant],
    ["amount.prk.saadanySpecialist", config.amount.prk.saadanySpecialist],
    ["amount.prk.fallback", config.amount.prk.fallback],
    [
      "amount.lasik.saadanyConsultantSaadany",
      config.amount.lasik.saadanyConsultantSaadany,
    ],
    ["amount.lasik.saadanyConsultant", config.amount.lasik.saadanyConsultant],
    ["amount.lasik.sawaf", config.amount.lasik.sawaf],
    ["amount.lasik.fallback", config.amount.lasik.fallback],
    ["doctorAccount.prk.saadany", config.doctorAccount.prk.saadany],
    ["doctorAccount.prk.consultant", config.doctorAccount.prk.consultant],
    ["doctorAccount.prk.specialist", config.doctorAccount.prk.specialist],
    ["doctorAccount.prk.sawaf", config.doctorAccount.prk.sawaf],
    ["doctorAccount.prk.others", config.doctorAccount.prk.others],
    ["doctorAccount.lasik.saadany", config.doctorAccount.lasik.saadany],
    ["doctorAccount.lasik.consultant", config.doctorAccount.lasik.consultant],
    ["doctorAccount.lasik.sawafMoria", config.doctorAccount.lasik.sawafMoria],
    ["doctorAccount.lasik.sawafMetal", config.doctorAccount.lasik.sawafMetal],
    [
      "doctorAccount.lasik.sawafFallback",
      config.doctorAccount.lasik.sawafFallback,
    ],
    ["doctorAccount.lasik.othersMoria", config.doctorAccount.lasik.othersMoria],
    ["doctorAccount.lasik.othersMetal", config.doctorAccount.lasik.othersMetal],
    [
      "doctorAccount.lasik.othersFallback",
      config.doctorAccount.lasik.othersFallback,
    ],
  ];
  return Object.fromEntries(
    values
      .filter(([, value]) => !Number.isFinite(value) || value < 0)
      .map(([key]) => [key, "أدخل رقماً صحيحاً يساوي صفراً أو أكبر."]),
  ) as Record<string, string>;
};

function SettingsState({
  title,
  message,
  tone = "neutral",
  onRetry,
}: {
  title: string;
  message: string;
  tone?: "neutral" | "error";
  onRetry?: () => void;
}) {
  return (
    <Card
      className="rounded-lg border-border/60 bg-card shadow-none"
      role={tone === "error" ? "alert" : "status"}
      aria-live="polite"
    >
      <CardContent className="flex flex-col items-center gap-3 px-4 py-10 text-center sm:px-6">
        {tone === "error" ? (
          <AlertCircle
            className="h-5 w-5 text-destructive"
            aria-hidden="true"
          />
        ) : (
          <Loader2
            className="h-5 w-5 animate-spin text-primary"
            aria-hidden="true"
          />
        )}
        <div className="space-y-1">
          <p className="text-sm font-bold text-foreground">{title}</p>
          <p className="text-xs text-muted-foreground">{message}</p>
        </div>
        {onRetry ? (
          <Button type="button" variant="outline" onClick={onRetry}>
            <RefreshCw className="h-4 w-4" aria-hidden="true" />
            إعادة المحاولة
          </Button>
        ) : null}
      </CardContent>
    </Card>
  );
}

export default function AdminSettings({
  pricingOnly = false,
}: {
  pricingOnly?: boolean;
}) {
  const PRICING_RULES_PERMISSION = "/admin-hub/settings/pricing-rules";
  const PRICING_RULES_KEY_PERMISSION = "appointments_pricing_v1";
  const { user, isAuthenticated } = useAuth();
  const [location, setLocation] = useLocation();
  const [preferredUrl, setPreferredUrl] = useState("");
  const [pricingForm, setPricingForm] = useState<PricingConfig>(
    clonePricing(DEFAULT_APPOINTMENTS_PRICING),
  );
  const [savedPricingJson, setSavedPricingJson] = useState(
    JSON.stringify(DEFAULT_APPOINTMENTS_PRICING, null, 2),
  );
  const [pricingSaveError, setPricingSaveError] = useState("");
  const pricingSettingQuery = trpc.medical.getSystemSetting.useQuery(
    { key: PRICING_SETTING_KEY },
    { refetchOnWindowFocus: false },
  );
  const mobileSheetModeSettingQuery = trpc.medical.getSystemSetting.useQuery(
    { key: MOBILE_SHEET_MODE_KEY },
    { refetchOnWindowFocus: false },
  );
  const updateSettingMutation = trpc.medical.updateSystemSetting.useMutation();
  const permissionsQuery = trpc.medical.getMyPermissions.useQuery(undefined, {
    enabled: Boolean(isAuthenticated && user?.role !== "admin"),
    refetchOnWindowFocus: false,
  });

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
    const serverValue = (pricingSettingQuery.data as PricingSettingResponse)
      ?.value;
    const normalized = normalizePricingConfig(serverValue);
    setPricingForm(normalized);
    setSavedPricingJson(JSON.stringify(normalized, null, 2));
    setPricingSaveError("");
  }, [pricingSettingQuery.data]);

  const pricingErrors = useMemo(
    () => validatePricing(pricingForm),
    [pricingForm],
  );
  const serializedPricing = JSON.stringify(pricingForm, null, 2);
  const isPricingDirty = serializedPricing !== savedPricingJson;
  const pricingHasSavedValue =
    pricingSettingQuery.data != null &&
    (pricingSettingQuery.data as PricingSettingResponse)?.value != null;

  if (!isAuthenticated) return null;

  const isPricingOnlyMode =
    pricingOnly || location.startsWith("/admin-hub/settings/pricing-rules");
  const userRole = String(user?.role ?? "").toLowerCase();
  const myPermissions = (permissionsQuery.data ?? []) as string[];
  const canReadPricingRules =
    userRole === "admin" ||
    userRole === "accountant" ||
    myPermissions.includes(PRICING_RULES_PERMISSION) ||
    myPermissions.includes(PRICING_RULES_KEY_PERMISSION) ||
    myPermissions.includes("/appointments/accounts");

  if (
    isPricingOnlyMode &&
    user?.role !== "admin" &&
    permissionsQuery.isLoading
  ) {
    return (
      <div className="mx-auto w-full max-w-[1440px] pb-6 text-start" dir="rtl">
        <SettingsState
          title="جارٍ التحقق من الصلاحيات"
          message="انتظر لحظة قبل عرض قواعد التسعير."
        />
      </div>
    );
  }

  if (isPricingOnlyMode && user?.role !== "admin" && permissionsQuery.isError) {
    return (
      <div className="mx-auto w-full max-w-[1440px] pb-6 text-start" dir="rtl">
        <SettingsState
          title="تعذر التحقق من الصلاحيات"
          message="لم نتمكن من التحقق من صلاحية عرض قواعد التسعير."
          tone="error"
          onRetry={() => void permissionsQuery.refetch()}
        />
      </div>
    );
  }

  if (isPricingOnlyMode && !canReadPricingRules) return null;
  if (!isPricingOnlyMode && user?.role !== "admin") return null;

  const handleSave = () => {
    localStorage.setItem(KEY, preferredUrl.trim());
    toast.success("تم حفظ الإعدادات");
  };

  const mobileSheetModeValueRaw = (
    mobileSheetModeSettingQuery.data as PricingSettingResponse
  )?.value;
  const mobileSheetModeEnabled = Boolean(
    mobileSheetModeValueRaw && typeof mobileSheetModeValueRaw === "object"
      ? (mobileSheetModeValueRaw as { enabled?: unknown }).enabled
      : mobileSheetModeValueRaw,
  );

  const handleToggleMobileSheetMode = async (enabled: boolean) => {
    try {
      await updateSettingMutation.mutateAsync({
        key: MOBILE_SHEET_MODE_KEY,
        value: { enabled },
      });
      await mobileSheetModeSettingQuery.refetch();
      toast.success(
        enabled ? "تم تفعيل وضع الشيت للموبايل" : "تم إيقاف وضع الشيت للموبايل",
      );
    } catch (error) {
      toast.error(getTrpcErrorMessage(error, "تعذر تحديث وضع الشيت للموبايل"));
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
    if (Object.keys(pricingErrors).length > 0) {
      setPricingSaveError("راجع القيم المظللة قبل الحفظ.");
      toast.error("لا يمكن حفظ قواعد التسعير قبل تصحيح القيم.");
      return;
    }
    setPricingSaveError("");
    try {
      await savePricingSetting(pricingForm);
      setSavedPricingJson(JSON.stringify(pricingForm, null, 2));
      toast.success("تم حفظ قواعد تسعير المواعيد");
    } catch (error) {
      const message = getTrpcErrorMessage(
        error,
        "تعذر حفظ قواعد تسعير المواعيد",
      );
      setPricingSaveError(message);
      toast.error(message);
    }
  };

  const handleResetPricing = () => {
    const defaults = clonePricing(DEFAULT_APPOINTMENTS_PRICING);
    setPricingForm(defaults);
    setPricingSaveError("");
  };
  const setField = (setter: (draft: PricingConfig) => void) => {
    setPricingForm((previous: PricingConfig) => {
      const next = clonePricing(previous);
      setter(next);
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
  }) => {
    const id = useId();
    const error = undefined;
    const errorId = `${id}-error`;
    return (
      <div className="grid grid-cols-[minmax(0,1fr)_7rem] items-start gap-3 border-b border-border/40 py-2 last:border-0 sm:grid-cols-[minmax(0,1fr)_8rem]">
        <Label
          htmlFor={id}
          className="pt-2 text-xs font-medium text-foreground"
        >
          {label}
        </Label>
        <div className="space-y-1">
          <Input
            id={id}
            type="number"
            min={0}
            step={1}
            inputMode="numeric"
            dir="ltr"
            className={cn(
              "h-11 text-center tabular-nums text-sm font-bold",
              error && "border-destructive focus-visible:border-destructive",
            )}
            value={String(value)}
            onChange={(event) => onChange(toSafeNumber(event.target.value))}
            aria-invalid={Boolean(error)}
            aria-describedby={error ? errorId : undefined}
          />
          {error ? (
            <p id={errorId} className="text-[13px] leading-4 text-destructive">
              {error}
            </p>
          ) : null}
        </div>
      </div>
    );
  };

  if (isPricingOnlyMode && pricingSettingQuery.isLoading) {
    return (
      <div className="mx-auto w-full max-w-[1440px] pb-6 text-start" dir="rtl">
        <SettingsState
          title="جارٍ تحميل قواعد التسعير"
          message="نحضر القيم الحالية من إعدادات النظام."
        />
      </div>
    );
  }

  if (isPricingOnlyMode && pricingSettingQuery.isError) {
    return (
      <div className="mx-auto w-full max-w-[1440px] pb-6 text-start" dir="rtl">
        <SettingsState
          title="تعذر تحميل قواعد التسعير"
          message="لم نتمكن من قراءة القيم الحالية. يمكنك إعادة المحاولة دون تغيير الصلاحيات."
          tone="error"
          onRetry={() => void pricingSettingQuery.refetch()}
        />
      </div>
    );
  }

  return (
    <div
      className="mx-auto w-full max-w-[1440px] space-y-0 pb-6 text-start"
      dir="rtl"
    >
      <div className="space-y-6">
        {!isPricingOnlyMode ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="h-full rounded-lg border-border/60 bg-card shadow-none">
              <CardHeader className="pb-3 border-b border-border/40 mb-4 bg-muted/10">
                <CardTitle className="text-sm font-bold flex items-center gap-2">
                  <Activity className="h-4 w-4 text-primary" />
                  تكوين السيرفر والواجهة
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {mobileSheetModeSettingQuery.isLoading ? (
                  <p className="text-xs text-muted-foreground" role="status">
                    جارٍ تحميل إعداد وضع النماذج للموبايل…
                  </p>
                ) : mobileSheetModeSettingQuery.isError ? (
                  <div
                    className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-destructive/30 bg-destructive/5 p-2 text-xs"
                    role="alert"
                  >
                    <span>تعذر تحميل إعداد وضع النماذج للموبايل.</span>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => void mobileSheetModeSettingQuery.refetch()}
                    >
                      إعادة المحاولة
                    </Button>
                  </div>
                ) : null}
                <div className="space-y-2">
                  <Label
                    htmlFor="preferred-server-url"
                    className="text-[13px] font-bold uppercase text-muted-foreground"
                  >
                    عنوان الخادم المفضل (التخزين المحلي)
                  </Label>
                  <div className="flex gap-2">
                    <Input
                      id="preferred-server-url"
                      value={preferredUrl}
                      onChange={(e) => setPreferredUrl(e.target.value)}
                      placeholder="https://app.example.com"
                      className="h-9 text-xs font-mono"
                      dir="ltr"
                    />
                    <Button
                      onClick={handleSave}
                      size="sm"
                      className="bg-primary text-primary-foreground h-9 px-4"
                    >
                      حفظ
                    </Button>
                  </div>
                  <p className="text-[13px] text-muted-foreground italic px-1">
                    العنوان الحالي النشط: {window.location.origin}
                  </p>
                </div>

                <div className="pt-4 border-t border-dashed space-y-4">
                  <div className="flex items-center justify-between gap-4 group/toggle p-2 rounded-lg hover:bg-muted/30 transition-colors">
                    <div className="space-y-0.5">
                      <div className="text-xs font-bold">
                        وضع الشيت للموبايل
                      </div>
                      <div className="text-[13px] text-muted-foreground">
                        تحسين تخطيط النماذج الطبية للشاشات الصغيرة.
                      </div>
                    </div>
                    <Switch
                      checked={mobileSheetModeEnabled}
                      onCheckedChange={handleToggleMobileSheetMode}
                      disabled={
                        mobileSheetModeSettingQuery.isLoading ||
                        updateSettingMutation.isPending
                      }
                      aria-label="تشغيل وضع النماذج للموبايل"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        ) : null}

        {isPricingOnlyMode ? (
          <Card className="overflow-hidden rounded-lg border-border/60 bg-card shadow-none">
            <CardHeader className="mb-4 border-b border-border/40 bg-primary/5 pb-4">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-start gap-2">
                  <Activity
                    className="mt-0.5 h-4 w-4 shrink-0 text-primary"
                    aria-hidden="true"
                  />
                  <div className="space-y-1">
                    <CardTitle className="text-sm font-bold">
                      قواعد تسعير المواعيد
                    </CardTitle>
                    <p className="text-xs text-muted-foreground">
                      عدّل مبالغ الكشف وحسابات الأطباء، ثم احفظها لتطبيقها على
                      المواعيد الجديدة.
                    </p>
                  </div>
                </div>
                <div className="grid grid-cols-1 gap-2 sm:flex sm:flex-wrap sm:justify-end">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleResetPricing}
                    disabled={
                      updateSettingMutation.isPending || !isPricingDirty
                    }
                  >
                    إعادة القيم الافتراضية
                  </Button>
                  <Button
                    type="button"
                    onClick={handleSavePricingForm}
                    className="bg-primary text-primary-foreground"
                    disabled={
                      updateSettingMutation.isPending || !isPricingDirty
                    }
                  >
                    {updateSettingMutation.isPending ? (
                      <Loader2
                        className="h-4 w-4 animate-spin"
                        aria-hidden="true"
                      />
                    ) : null}
                    حفظ القواعد
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {!pricingHasSavedValue ? (
                <div
                  className="flex items-start gap-2 rounded-md border border-border bg-muted/30 px-3 py-3 text-xs text-foreground"
                  role="status"
                >
                  <AlertCircle
                    className="mt-0.5 h-4 w-4 shrink-0 text-primary"
                    aria-hidden="true"
                  />
                  <p>
                    لا توجد قواعد محفوظة حالياً؛ نعرض القيم الافتراضية ويمكنك
                    تعديلها قبل الحفظ.
                  </p>
                </div>
              ) : null}
              {pricingSaveError ? (
                <div
                  className="flex items-start gap-2 rounded-md border border-destructive/40 bg-destructive/5 px-3 py-3 text-xs text-destructive"
                  role="alert"
                  aria-live="assertive"
                >
                  <AlertCircle
                    className="mt-0.5 h-4 w-4 shrink-0"
                    aria-hidden="true"
                  />
                  <p>{pricingSaveError}</p>
                </div>
              ) : null}
              {!isPricingDirty && !pricingSaveError ? (
                <div
                  className="flex items-center gap-2 text-xs text-muted-foreground"
                  role="status"
                  aria-live="polite"
                >
                  <CheckCircle2
                    className="h-4 w-4 text-primary"
                    aria-hidden="true"
                  />
                  <span>لا توجد تغييرات غير محفوظة.</span>
                </div>
              ) : null}
              <div className="grid min-w-0 grid-cols-1 gap-8 pt-2 lg:grid-cols-2">
                <div className="space-y-6">
                  <div className="space-y-3">
                    <h2 className="rounded bg-primary/5 px-2 py-2 text-xs font-black text-card-foreground">
                      مبالغ الكشف
                    </h2>
                    <div className="space-y-1">
                      <div className="font-bold text-xs mb-2 text-muted-foreground/80 px-1">
                        — PRK —
                      </div>
                      <PriceField
                        label="د. السعدني"
                        value={pricingForm.amount.prk.saadanyConsultantSaadany}
                        onChange={(v) =>
                          setField((d) => {
                            d.amount.prk.saadanyConsultantSaadany = v;
                          })
                        }
                      />
                      <PriceField
                        label="استشاري"
                        value={pricingForm.amount.prk.saadanyConsultant}
                        onChange={(v) =>
                          setField((d) => {
                            d.amount.prk.saadanyConsultant = v;
                          })
                        }
                      />
                      <PriceField
                        label="أخصائي"
                        value={pricingForm.amount.prk.saadanySpecialist}
                        onChange={(v) =>
                          setField((d) => {
                            d.amount.prk.saadanySpecialist = v;
                          })
                        }
                      />
                      <PriceField
                        label="السعر الافتراضي"
                        value={pricingForm.amount.prk.fallback}
                        onChange={(v) =>
                          setField((d) => {
                            d.amount.prk.fallback = v;
                          })
                        }
                      />
                    </div>
                    <div className="space-y-1 pt-2">
                      <div className="font-bold text-xs mb-2 text-muted-foreground/80 px-1">
                        — LASIK —
                      </div>
                      <PriceField
                        label="د. السعدني"
                        value={
                          pricingForm.amount.lasik.saadanyConsultantSaadany
                        }
                        onChange={(v) =>
                          setField((d) => {
                            d.amount.lasik.saadanyConsultantSaadany = v;
                          })
                        }
                      />
                      <PriceField
                        label="استشاري"
                        value={pricingForm.amount.lasik.saadanyConsultant}
                        onChange={(v) =>
                          setField((d) => {
                            d.amount.lasik.saadanyConsultant = v;
                          })
                        }
                      />
                      <PriceField
                        label="د. صواف"
                        value={pricingForm.amount.lasik.sawaf}
                        onChange={(v) =>
                          setField((d) => {
                            d.amount.lasik.sawaf = v;
                          })
                        }
                      />
                      <PriceField
                        label="السعر الافتراضي"
                        value={pricingForm.amount.lasik.fallback}
                        onChange={(v) =>
                          setField((d) => {
                            d.amount.lasik.fallback = v;
                          })
                        }
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-6">
                  <div className="space-y-3">
                    <h4 className="rounded bg-success/10 px-2 py-1 text-[13px] font-black uppercase text-success">
                      حساب الطبيب
                    </h4>
                    <div className="space-y-1">
                      <div className="font-bold text-xs mb-2 text-muted-foreground/80 px-1">
                        — PRK —
                      </div>
                      <PriceField
                        label="د. السعدني"
                        value={pricingForm.doctorAccount.prk.saadany}
                        onChange={(v) =>
                          setField((d) => {
                            d.doctorAccount.prk.saadany = v;
                          })
                        }
                      />
                      <PriceField
                        label="استشاري"
                        value={pricingForm.doctorAccount.prk.consultant}
                        onChange={(v) =>
                          setField((d) => {
                            d.doctorAccount.prk.consultant = v;
                          })
                        }
                      />
                      <PriceField
                        label="أخصائي"
                        value={pricingForm.doctorAccount.prk.specialist}
                        onChange={(v) =>
                          setField((d) => {
                            d.doctorAccount.prk.specialist = v;
                          })
                        }
                      />
                      <PriceField
                        label="د. صواف"
                        value={pricingForm.doctorAccount.prk.sawaf}
                        onChange={(v) =>
                          setField((d) => {
                            d.doctorAccount.prk.sawaf = v;
                          })
                        }
                      />
                      <PriceField
                        label="أطباء آخرون"
                        value={pricingForm.doctorAccount.prk.others}
                        onChange={(v) =>
                          setField((d) => {
                            d.doctorAccount.prk.others = v;
                          })
                        }
                      />
                    </div>
                    <div className="space-y-1 pt-2">
                      <div className="font-bold text-xs mb-2 text-muted-foreground/80 px-1">
                        — LASIK —
                      </div>
                      <PriceField
                        label="د. السعدني"
                        value={pricingForm.doctorAccount.lasik.saadany}
                        onChange={(v) =>
                          setField((d) => {
                            d.doctorAccount.lasik.saadany = v;
                          })
                        }
                      />
                      <PriceField
                        label="استشاري"
                        value={pricingForm.doctorAccount.lasik.consultant}
                        onChange={(v) =>
                          setField((d) => {
                            d.doctorAccount.lasik.consultant = v;
                          })
                        }
                      />
                      <PriceField
                        label="د. صواف (Moria)"
                        value={pricingForm.doctorAccount.lasik.sawafMoria}
                        onChange={(v) =>
                          setField((d) => {
                            d.doctorAccount.lasik.sawafMoria = v;
                          })
                        }
                      />
                      <PriceField
                        label="د. صواف (Metal)"
                        value={pricingForm.doctorAccount.lasik.sawafMetal}
                        onChange={(v) =>
                          setField((d) => {
                            d.doctorAccount.lasik.sawafMetal = v;
                          })
                        }
                      />
                      <PriceField
                        label="د. صواف (افتراضي)"
                        value={pricingForm.doctorAccount.lasik.sawafFallback}
                        onChange={(v) =>
                          setField((d) => {
                            d.doctorAccount.lasik.sawafFallback = v;
                          })
                        }
                      />
                      <PriceField
                        label="أطباء آخرون (Moria)"
                        value={pricingForm.doctorAccount.lasik.othersMoria}
                        onChange={(v) =>
                          setField((d) => {
                            d.doctorAccount.lasik.othersMoria = v;
                          })
                        }
                      />
                      <PriceField
                        label="أطباء آخرون (Metal)"
                        value={pricingForm.doctorAccount.lasik.othersMetal}
                        onChange={(v) =>
                          setField((d) => {
                            d.doctorAccount.lasik.othersMetal = v;
                          })
                        }
                      />
                      <PriceField
                        label="أطباء آخرون (افتراضي)"
                        value={pricingForm.doctorAccount.lasik.othersFallback}
                        onChange={(v) =>
                          setField((d) => {
                            d.doctorAccount.lasik.othersFallback = v;
                          })
                        }
                      />
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ) : null}
      </div>
    </div>
  );
}
