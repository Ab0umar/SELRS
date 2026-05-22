import { useEffect, useMemo, useState } from "react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { getTrpcErrorMessage, cn } from "@/lib/utils";
import { Activity, Archive, Bell, BellOff, MonitorSmartphone, Syringe, Users, Wifi } from "lucide-react";

// ─── Types ───────────────────────────────────────────────────────────────────

type CategoryChannels = {
  enabled: boolean;
  inApp: boolean;
  push: boolean;
  local: boolean;
};

type NotifSettings = {
  patients: CategoryChannels;
  operations: CategoryChannels & { userIds: number[] };
  attendance: CategoryChannels & { managerId: number | null };
  stockroom: CategoryChannels;
};

type UserRecord = {
  id: number;
  name: string;
  username?: string;
  role?: string;
};

// ─── Defaults & parser ───────────────────────────────────────────────────────

const DEFAULT: NotifSettings = {
  patients:   { enabled: true,  inApp: true,  push: false, local: false },
  operations: { enabled: false, inApp: false, push: false, local: false, userIds: [] },
  attendance: { enabled: true,  inApp: true,  push: false, local: false, managerId: null },
  stockroom:  { enabled: false, inApp: false, push: false, local: false },
};

function parseCat(raw: unknown, def: CategoryChannels): CategoryChannels {
  if (!raw || typeof raw !== "object") return def;
  const r = raw as Record<string, unknown>;
  return {
    enabled: typeof r.enabled === "boolean" ? r.enabled : def.enabled,
    inApp:   typeof r.inApp   === "boolean" ? r.inApp   : def.inApp,
    push:    typeof r.push    === "boolean" ? r.push    : def.push,
    local:   typeof r.local   === "boolean" ? r.local   : def.local,
  };
}

function parseSettings(raw: unknown): NotifSettings {
  if (!raw || typeof raw !== "object") return DEFAULT;
  const r = raw as Record<string, unknown>;

  if (r.patients && typeof r.patients === "object") {
    const opsRaw = r.operations as Record<string, unknown> | undefined;
    const userIds = Array.isArray(opsRaw?.userIds)
      ? (opsRaw!.userIds as unknown[]).map(Number).filter((n) => Number.isFinite(n))
      : [];
    const attnRaw = r.attendance as Record<string, unknown> | undefined;
    const managerId =
      attnRaw?.managerId != null && Number.isFinite(Number(attnRaw.managerId))
        ? Number(attnRaw.managerId)
        : null;
    return {
      patients:   parseCat(r.patients, DEFAULT.patients),
      operations: { ...parseCat(r.operations, DEFAULT.operations), userIds },
      attendance: { ...parseCat(r.attendance, DEFAULT.attendance), managerId },
      stockroom:  parseCat(r.stockroom, DEFAULT.stockroom),
    };
  }

  // v1 flat backward-compat
  const legacyUserIds = Array.isArray(r.operationsPushUserIds)
    ? (r.operationsPushUserIds as unknown[]).map(Number).filter((n) => Number.isFinite(n))
    : [];
  const legacyOpsPush = typeof r.operationsPushEnabled === "boolean" ? r.operationsPushEnabled : false;
  return {
    patients: {
      ...DEFAULT.patients,
      inApp: typeof r.manualPatientInAppEnabled === "boolean"
        ? r.manualPatientInAppEnabled
        : DEFAULT.patients.inApp,
    },
    operations: { ...DEFAULT.operations, enabled: legacyOpsPush, push: legacyOpsPush, userIds: legacyUserIds },
    attendance: DEFAULT.attendance,
    stockroom:  DEFAULT.stockroom,
  };
}

// ─── Channel row ─────────────────────────────────────────────────────────────

const CHANNEL_META = {
  inApp: { label: "داخل التطبيق", icon: MonitorSmartphone },
  push:  { label: "إشعار خارجي (Push)",  icon: Wifi },
  local: { label: "إشعار محلي",  icon: Bell },
} as const;

type ChannelKey = keyof typeof CHANNEL_META;

function ChannelRow({
  ch,
  value,
  onChange,
  disabled,
  disabledReason,
}: {
  ch: ChannelKey;
  value: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
  disabledReason?: string;
}) {
  const { label, icon: Icon } = CHANNEL_META[ch];
  const id = `ch-${ch}`;

  const switchEl = (
    <Switch
      id={id}
      checked={value}
      onCheckedChange={onChange}
      disabled={disabled}
    />
  );

  return (
    <div className="flex items-center justify-between py-2">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Icon className="size-4 shrink-0" strokeWidth={1.6} />
        <Label htmlFor={id} className="cursor-pointer font-normal">
          {label}
        </Label>
      </div>
      {disabled && disabledReason ? (
        <TooltipProvider delayDuration={200}>
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="cursor-not-allowed">{switchEl}</span>
            </TooltipTrigger>
            <TooltipContent side="right" className="max-w-[200px] text-xs">
              {disabledReason}
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      ) : (
        switchEl
      )}
    </div>
  );
}

// ─── Category card ────────────────────────────────────────────────────────────

function CategorySection({
  icon: Icon,
  title,
  description,
  channels,
  onChannelChange,
  fcmConfigured,
  audience,
}: {
  icon: React.ElementType;
  title: string;
  description: string;
  channels: CategoryChannels;
  onChannelChange: (patch: Partial<CategoryChannels>) => void;
  fcmConfigured: boolean;
  audience: React.ReactNode;
}) {
  const bodyDimmed = !channels.enabled;

  return (
    <div className="rounded-xl border border-border bg-card">
      {/* Header */}
      <div className="flex items-start gap-3 p-4">
        <div className={cn(
          "mt-0.5 rounded-lg p-2 transition-colors",
          channels.enabled ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground",
        )}>
          <Icon className="size-4 shrink-0" strokeWidth={1.8} />
        </div>
        <div className="flex-1 min-w-0">
          <p className={cn("text-sm font-semibold leading-tight", !channels.enabled && "text-muted-foreground")}>
            {title}
          </p>
          <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{description}</p>
        </div>
        <Switch
          checked={channels.enabled}
          onCheckedChange={(v) => onChannelChange({ enabled: v })}
        />
      </div>

      {/* Body */}
      <div className={cn(
        "border-t border-border px-4 pb-4 pt-3 space-y-0 transition-opacity",
        bodyDimmed && "opacity-40 pointer-events-none select-none",
      )}>
        {/* Channels */}
        <div className="space-y-0 divide-y divide-border/60">
          {(["inApp", "push", "local"] as ChannelKey[]).map((ch) => (
            <ChannelRow
              key={ch}
              ch={ch}
              value={channels[ch]}
              onChange={(v) => onChannelChange({ [ch]: v })}
              disabled={ch === "push" && !fcmConfigured}
              disabledReason={ch === "push" && !fcmConfigured ? "خدمة FCM غير مُفعَّلة" : undefined}
            />
          ))}
        </div>

        {/* Audience */}
        <div className="pt-3">
          <p className="text-xs font-medium text-muted-foreground mb-2">المستقبلون</p>
          {audience}
        </div>
      </div>
    </div>
  );
}

// ─── User picker (multi-select) ───────────────────────────────────────────────

function UserMultiPicker({
  users,
  selected,
  onChange,
}: {
  users: UserRecord[];
  selected: number[];
  onChange: (ids: number[]) => void;
}) {
  const [q, setQ] = useState("");
  const filtered = users.filter(
    (u) =>
      u.name.toLowerCase().includes(q.toLowerCase()) ||
      (u.username ?? "").toLowerCase().includes(q.toLowerCase()),
  );

  const toggle = (id: number) => {
    onChange(selected.includes(id) ? selected.filter((x) => x !== id) : [...selected, id]);
  };

  return (
    <div className="space-y-2">
      <Input
        placeholder="ابحث..."
        value={q}
        onChange={(e) => setQ(e.target.value)}
        className="h-8 text-sm"
        dir="rtl"
      />
      <div className="max-h-48 overflow-y-auto rounded-lg border border-border divide-y divide-border/60 bg-background">
        {filtered.length === 0 ? (
          <p className="py-4 text-center text-xs text-muted-foreground">لا توجد نتائج</p>
        ) : (
          filtered.map((u) => {
            const active = selected.includes(u.id);
            return (
              <button
                key={u.id}
                type="button"
                onClick={() => toggle(u.id)}
                className={cn(
                  "flex w-full items-center gap-2.5 px-3 py-2 text-start text-sm transition-colors",
                  active ? "bg-primary/5 text-primary" : "hover:bg-muted/60 text-foreground",
                )}
              >
                <span className={cn(
                  "size-4 shrink-0 rounded-sm border transition-colors",
                  active ? "border-primary bg-primary" : "border-muted-foreground/40",
                )}>
                  {active && (
                    <svg viewBox="0 0 12 12" className="size-full p-0.5 text-primary-foreground" fill="none">
                      <polyline points="2,6 5,9 10,3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  )}
                </span>
                <span className="flex-1 truncate">{u.name}</span>
                {u.role && (
                  <span className="shrink-0 text-xs text-muted-foreground">{u.role}</span>
                )}
              </button>
            );
          })
        )}
      </div>
      {selected.length > 0 && (
        <p className="text-xs text-muted-foreground">{selected.length} مستخدم مختار</p>
      )}
    </div>
  );
}

// ─── User single picker ───────────────────────────────────────────────────────

function UserSinglePicker({
  users,
  value,
  onChange,
  placeholder,
}: {
  users: UserRecord[];
  value: number | null;
  onChange: (id: number | null) => void;
  placeholder?: string;
}) {
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);

  const selected = users.find((u) => u.id === value) ?? null;
  const filtered = users.filter(
    (u) =>
      u.name.toLowerCase().includes(q.toLowerCase()) ||
      (u.username ?? "").toLowerCase().includes(q.toLowerCase()),
  );

  if (!open) {
    return (
      <div className="flex items-center gap-2">
        {selected ? (
          <Badge variant="secondary" className="gap-1.5 text-xs font-normal">
            {selected.name}
            <button
              type="button"
              onClick={() => onChange(null)}
              className="text-muted-foreground hover:text-foreground"
              aria-label="إزالة"
            >
              ×
            </button>
          </Badge>
        ) : (
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="text-xs text-primary hover:underline"
          >
            {placeholder ?? "+ اختر مستخدم"}
          </button>
        )}
        {selected && (
          <button
            type="button"
            onClick={() => { setOpen(true); setQ(""); }}
            className="text-xs text-muted-foreground hover:text-foreground"
          >
            تغيير
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <Input
        placeholder="ابحث..."
        value={q}
        onChange={(e) => setQ(e.target.value)}
        className="h-8 text-sm"
        dir="rtl"
        autoFocus
      />
      <div className="max-h-40 overflow-y-auto rounded-lg border border-border divide-y divide-border/60 bg-background">
        <button
          type="button"
          onClick={() => { onChange(null); setOpen(false); setQ(""); }}
          className="flex w-full items-center gap-2 px-3 py-2 text-start text-xs text-muted-foreground hover:bg-muted/60"
        >
          <BellOff className="size-3.5 shrink-0" />
          بدون مدير مخصص (إرسال للأدمن)
        </button>
        {filtered.map((u) => (
          <button
            key={u.id}
            type="button"
            onClick={() => { onChange(u.id); setOpen(false); setQ(""); }}
            className={cn(
              "flex w-full items-center gap-2.5 px-3 py-2 text-start text-sm transition-colors",
              u.id === value ? "bg-primary/5 text-primary" : "hover:bg-muted/60",
            )}
          >
            <span className="flex-1 truncate">{u.name}</span>
            {u.role && <span className="shrink-0 text-xs text-muted-foreground">{u.role}</span>}
          </button>
        ))}
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AdminNotificationSettings() {
  const settingsQuery = trpc.medical.getSystemSetting.useQuery(
    { key: "app_notification_settings_v1" },
    { refetchOnWindowFocus: false },
  );
  const metaQuery = trpc.medical.getNotificationMeta.useQuery(undefined, {
    refetchOnWindowFocus: false,
  });
  const usersQuery = trpc.medical.getAllUsers.useQuery(undefined, {
    refetchOnWindowFocus: false,
  });
  const updateMutation = trpc.medical.updateSystemSetting.useMutation({
    onSuccess: () => {
      toast.success("تم حفظ إعدادات الإشعارات");
      setSavedSettings(settings);
    },
    onError: (error) => {
      toast.error(getTrpcErrorMessage(error, "فشل حفظ الإعدادات"));
    },
  });

  const [settings, setSettings] = useState<NotifSettings>(DEFAULT);
  const [savedSettings, setSavedSettings] = useState<NotifSettings>(DEFAULT);
  const [initialized, setInitialized] = useState(false);

  const fcmConfigured = metaQuery.data?.fcmConfigured ?? true;
  const users: UserRecord[] = (usersQuery.data as UserRecord[] | undefined) ?? [];

  useEffect(() => {
    if (settingsQuery.data !== undefined && !initialized) {
      const parsed = parseSettings(settingsQuery.data?.value);
      setSettings(parsed);
      setSavedSettings(parsed);
      setInitialized(true);
    }
  }, [settingsQuery.data, initialized]);

  const isDirty = useMemo(
    () => JSON.stringify(settings) !== JSON.stringify(savedSettings),
    [settings, savedSettings],
  );

  const patchCategory = <K extends keyof NotifSettings>(
    cat: K,
    patch: Partial<NotifSettings[K]>,
  ) => {
    setSettings((prev) => ({
      ...prev,
      [cat]: { ...prev[cat], ...patch },
    }));
  };

  const handleSave = async () => {
    try {
      await updateMutation.mutateAsync({
        key: "app_notification_settings_v1",
        value: settings,
      });
    } catch {
      // handled by onError
    }
  };

  if (!initialized && settingsQuery.isLoading) {
    return (
      <div className="flex h-40 items-center justify-center text-sm text-muted-foreground">
        جاري التحميل...
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6 py-6 px-1" dir="rtl">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">إعدادات الإشعارات</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          التحكم في كيفية إرسال الإشعارات لكل فئة عبر القنوات المختلفة.
        </p>
      </div>

      <Separator />

      {/* Patients */}
      <CategorySection
        icon={Users}
        title="المرضى"
        description="إشعارات تسجيل المرضى والفحوصات والبنتاكام"
        channels={settings.patients}
        onChannelChange={(patch) => patchCategory("patients", patch)}
        fcmConfigured={fcmConfigured}
        audience={
          <Badge variant="outline" className="text-xs font-normal gap-1">
            <Users className="size-3" />
            جميع المستخدمين
          </Badge>
        }
      />

      {/* Operations */}
      <CategorySection
        icon={Syringe}
        title="العمليات"
        description="إشعارات قوائم العمليات الجراحية والحجوزات"
        channels={settings.operations}
        onChannelChange={(patch) => patchCategory("operations", patch)}
        fcmConfigured={fcmConfigured}
        audience={
          <UserMultiPicker
            users={users}
            selected={settings.operations.userIds}
            onChange={(ids) => patchCategory("operations", { userIds: ids })}
          />
        }
      />

      {/* Attendance */}
      <CategorySection
        icon={Activity}
        title="الحضور"
        description="إشعارات طلبات الإجازة والأذونات والموافقات"
        channels={settings.attendance}
        onChannelChange={(patch) => patchCategory("attendance", patch)}
        fcmConfigured={fcmConfigured}
        audience={
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-xs font-normal gap-1">
                <Activity className="size-3" />
                {settings.attendance.managerId
                  ? (users.find((u) => u.id === settings.attendance.managerId)?.name ?? "مدير مخصص")
                  : "الأدمن / المديرون"}
              </Badge>
            </div>
            <UserSinglePicker
              users={users}
              value={settings.attendance.managerId}
              onChange={(id) => patchCategory("attendance", { managerId: id })}
              placeholder="+ تعيين مدير مخصص"
            />
          </div>
        }
      />

      {/* Stockroom */}
      <CategorySection
        icon={Archive}
        title="المخزن"
        description="إشعارات حركات المخزن والمخزون"
        channels={settings.stockroom}
        onChannelChange={(patch) => patchCategory("stockroom", patch)}
        fcmConfigured={fcmConfigured}
        audience={
          <Badge variant="outline" className="text-xs font-normal gap-1">
            <Archive className="size-3" />
            مستخدمو المخزن
          </Badge>
        }
      />

      <div className="flex justify-start gap-3 pt-2">
        <Button
          onClick={handleSave}
          disabled={!isDirty || updateMutation.isPending}
        >
          {updateMutation.isPending ? "جاري الحفظ..." : "حفظ"}
        </Button>
        {isDirty && (
          <Button
            variant="ghost"
            onClick={() => setSettings(savedSettings)}
            disabled={updateMutation.isPending}
          >
            إلغاء
          </Button>
        )}
      </div>
    </div>
  );
}
