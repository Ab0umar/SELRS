import { useEffect, useState } from "react";
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
import { Activity } from "lucide-react";

const KEY = "selrs_preferred_url";
const PRICING_SETTING_KEY = "appointments_pricing_v1";
const MOBILE_SHEET_MODE_KEY = "mobile_sheet_mode_v1";
type PricingConfig = typeof DEFAULT_APPOINTMENTS_PRICING;
const clonePricing = (value: PricingConfig): PricingConfig =>
  JSON.parse(JSON.stringify(value));
const toSafeNumber = (value: unknown) => {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
};

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
  const [pricingJson, setPricingJson] = useState("");
  const [pricingForm, setPricingForm] = useState<PricingConfig>(
    clonePricing(DEFAULT_APPOINTMENTS_PRICING),
  );
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
    const serverValue = (pricingSettingQuery.data as any)?.value;
    const payload =
      serverValue && typeof serverValue === "object"
        ? (serverValue as PricingConfig)
        : DEFAULT_APPOINTMENTS_PRICING;
    setPricingForm(clonePricing(payload));
    setPricingJson(JSON.stringify(payload, null, 2));
  }, [pricingSettingQuery.data]);

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
    return null;
  }

  if (isPricingOnlyMode && !canReadPricingRules) return null;
  if (!isPricingOnlyMode && user?.role !== "admin") return null;

  const handleSave = () => {
    localStorage.setItem(KEY, preferredUrl.trim());
    toast.success("Settings Saved");
  };

  const mobileSheetModeValueRaw = (mobileSheetModeSettingQuery.data as any)
    ?.value;
  const mobileSheetModeEnabled = Boolean(
    mobileSheetModeValueRaw && typeof mobileSheetModeValueRaw === "object"
      ? mobileSheetModeValueRaw.enabled
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
        enabled ? "Mobile sheet mode enabled" : "Mobile sheet mode disabled",
      );
    } catch (error) {
      toast.error(
        getTrpcErrorMessage(error, "Failed to update mobile sheet mode"),
      );
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
      toast.error(
        getTrpcErrorMessage(error, "Failed to save appointments pricing"),
      );
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
      <span className="text-[11px] text-muted-foreground font-medium group-hover/field:text-foreground transition-colors">
        {label}
      </span>
      <Input
        type="number"
        className="h-8 w-24 text-center tabular-nums text-xs font-bold border-muted-foreground/20 focus:border-primary/50 bg-background/50"
        value={String(value)}
        onChange={(e) => onChange(toSafeNumber(e.target.value))}
      />
    </div>
  );

  return (
    <div
      className="mx-auto w-full max-w-[1440px] space-y-0 pb-6 text-right"
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
                <div className="space-y-2">
                  <Label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                    عنوان السيرفر المفضل (Local Storage)
                  </Label>
                  <div className="flex gap-2">
                    <Input
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
                  <p className="text-[10px] text-muted-foreground italic px-1">
                    العنوان الحالي النشط: {window.location.origin}
                  </p>
                </div>

                <div className="pt-4 border-t border-dashed space-y-4">
                  <div className="flex items-center justify-between gap-4 group/toggle p-2 rounded-lg hover:bg-muted/30 transition-colors">
                    <div className="space-y-0.5">
                      <div className="text-xs font-bold">
                        وضع الشيت للموبايل
                      </div>
                      <div className="text-[10px] text-muted-foreground">
                        تحسين تخطيط النماذج الطبية للشاشات الصغيرة.
                      </div>
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
          </div>
        ) : null}

        {isPricingOnlyMode ? (
          <Card className="overflow-hidden rounded-lg border-border/60 bg-card shadow-none">
            <CardHeader className="pb-3 border-b border-border/40 mb-4 bg-primary/5">
              <div className="flex items-center justify-between gap-3">
                <CardTitle className="text-sm font-bold flex items-center gap-2">
                  <Activity className="h-4 w-4 text-primary" />
                  قواعد تسعير المواعيد
                </CardTitle>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-8 text-[10px] font-bold"
                    onClick={handleResetPricing}
                  >
                    إعادة ضبط
                  </Button>
                  <Button
                    onClick={handleSavePricingForm}
                    size="sm"
                    className="h-8 text-[10px] font-bold bg-primary text-primary-foreground"
                    disabled={updateSettingMutation.isPending}
                  >
                    حفظ القواعد
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 pt-2">
                <div className="space-y-6">
                  <div className="space-y-3">
                    <h4 className="text-[11px] font-black text-card-foreground uppercase tracking-widest bg-primary/5 px-2 py-1 rounded">
                      أسعار الكشوفات (Amount)
                    </h4>
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
                        label="د. صواف"
                        value={pricingForm.amount.lasik.sawaf}
                        onChange={(v) =>
                          setField((d) => {
                            d.amount.lasik.sawaf = v;
                          })
                        }
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-6">
                  <div className="space-y-3">
                    <h4 className="text-[11px] font-black text-success uppercase tracking-widest bg-success/10 px-2 py-1 rounded">
                      حساب المركز (Doctor Account)
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
                        label="د. صواف"
                        value={pricingForm.doctorAccount.prk.sawaf}
                        onChange={(v) =>
                          setField((d) => {
                            d.doctorAccount.prk.sawaf = v;
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
