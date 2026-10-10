import { useEffect, useMemo, useState } from "react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { getTrpcErrorMessage, cn } from "@/lib/utils";
import {
  Activity,
  Archive,
  Bell,
  BellOff,
  BookOpen,
  CalendarClock,
  MonitorSmartphone,
  Syringe,
  Users,
  Wifi,
  X,
} from "lucide-react";

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
  bookings: CategoryChannels & { userIds: number[] };
  opReminder: CategoryChannels & {
    sendHour: number;
    targetAll: boolean;
    userIds: number[];
  };
};

type UserRecord = {
  id: number;
  name: string;
  username?: string;
  role?: string;
};

// ─── Defaults & parser ───────────────────────────────────────────────────────

const DEFAULT: NotifSettings = {
  patients: { enabled: true, inApp: true, push: false, local: false },
  operations: {
    enabled: false,
    inApp: false,
    push: false,
    local: false,
    userIds: [],
  },
  attendance: {
    enabled: true,
    inApp: true,
    push: false,
    local: false,
    managerId: null,
  },
  stockroom: { enabled: false, inApp: false, push: false, local: false },
  bookings: {
    enabled: true,
    inApp: true,
    push: false,
    local: false,
    userIds: [],
  },
  opReminder: {
    enabled: false,
    inApp: true,
    push: true,
    local: false,
    sendHour: 20,
    targetAll: true,
    userIds: [],
  },
};

function parseCat(raw: unknown, def: CategoryChannels): CategoryChannels {
  if (!raw || typeof raw !== "object") return def;
  const r = raw as Record<string, unknown>;
  return {
    enabled: typeof r.enabled === "boolean" ? r.enabled : def.enabled,
    inApp: typeof r.inApp === "boolean" ? r.inApp : def.inApp,
    push: typeof r.push === "boolean" ? r.push : def.push,
    local: typeof r.local === "boolean" ? r.local : def.local,
  };
}

function parseSettings(raw: unknown): NotifSettings {
  if (!raw || typeof raw !== "object") return DEFAULT;
  const r = raw as Record<string, unknown>;

  if (r.patients && typeof r.patients === "object") {
    const opsRaw = r.operations as Record<string, unknown> | undefined;
    const userIds = Array.isArray(opsRaw?.userIds)
      ? (opsRaw!.userIds as unknown[])
          .map(Number)
          .filter((n) => Number.isFinite(n))
      : [];
    const attnRaw = r.attendance as Record<string, unknown> | undefined;
    const managerId =
      attnRaw?.managerId != null && Number.isFinite(Number(attnRaw.managerId))
        ? Number(attnRaw.managerId)
        : null;
    const bookingsRaw = r.bookings as Record<string, unknown> | undefined;
    const bookingUserIds = Array.isArray(bookingsRaw?.userIds)
      ? (bookingsRaw!.userIds as unknown[])
          .map(Number)
          .filter((n) => Number.isFinite(n))
      : [];
    const opReminderRaw = r.opReminder as Record<string, unknown> | undefined;
    const opReminderUserIds = Array.isArray(opReminderRaw?.userIds)
      ? (opReminderRaw!.userIds as unknown[])
          .map(Number)
          .filter((n) => Number.isFinite(n))
      : [];
    const opReminderSendHour =
      opReminderRaw?.sendHour != null &&
      Number.isFinite(Number(opReminderRaw.sendHour))
        ? Number(opReminderRaw.sendHour)
        : DEFAULT.opReminder.sendHour;
    const opReminderTargetAll =
      typeof opReminderRaw?.targetAll === "boolean"
        ? opReminderRaw.targetAll
        : DEFAULT.opReminder.targetAll;
    return {
      patients: parseCat(r.patients, DEFAULT.patients),
      operations: { ...parseCat(r.operations, DEFAULT.operations), userIds },
      attendance: { ...parseCat(r.attendance, DEFAULT.attendance), managerId },
      stockroom: parseCat(r.stockroom, DEFAULT.stockroom),
      bookings: {
        ...parseCat(r.bookings, DEFAULT.bookings),
        userIds: bookingUserIds,
      },
      opReminder: {
        ...parseCat(r.opReminder, DEFAULT.opReminder),
        sendHour: opReminderSendHour,
        targetAll: opReminderTargetAll,
        userIds: opReminderUserIds,
      },
    };
  }

  // v1 flat backward-compat
  const legacyUserIds = Array.isArray(r.operationsPushUserIds)
    ? (r.operationsPushUserIds as unknown[])
        .map(Number)
        .filter((n) => Number.isFinite(n))
    : [];
  const legacyOpsPush =
    typeof r.operationsPushEnabled === "boolean"
      ? r.operationsPushEnabled
      : false;
  return {
    patients: {
      ...DEFAULT.patients,
      inApp:
        typeof r.manualPatientInAppEnabled === "boolean"
          ? r.manualPatientInAppEnabled
          : DEFAULT.patients.inApp,
    },
    operations: {
      ...DEFAULT.operations,
      enabled: legacyOpsPush,
      push: legacyOpsPush,
      userIds: legacyUserIds,
    },
    attendance: DEFAULT.attendance,
    stockroom: DEFAULT.stockroom,
    bookings: DEFAULT.bookings,
    opReminder: DEFAULT.opReminder,
  };
}

const CHANNEL_META = {
  inApp: { label: "داخل التطبيق", icon: MonitorSmartphone },
  push: { label: "إشعار خارجي (Push)", icon: Wifi },
  local: { label: "إشعار محلي", icon: Bell },
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
              <span
                tabIndex={0}
                aria-label={disabledReason}
                className="cursor-not-allowed rounded-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
              >
                {switchEl}
              </span>
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

function CategorySection({
  icon: Icon,
  title,
  description,
  channels,
  onChannelChange,
  fcmConfigured,
  fcmDisabledReason,
  audience,
}: {
  icon: React.ElementType;
  title: string;
  description: string;
  channels: CategoryChannels;
  onChannelChange: (patch: Partial<CategoryChannels>) => void;
  fcmConfigured: boolean;
  fcmDisabledReason: string;
  audience: React.ReactNode;
}) {
  const bodyDimmed = !channels.enabled;

  return (
    <div className="rounded-xl border border-border bg-card">
      <div className="flex items-start gap-3 p-4">
        <div
          className={cn(
            "mt-0.5 rounded-lg p-2 transition-colors",
            channels.enabled
              ? "bg-primary/10 text-primary"
              : "bg-muted text-muted-foreground",
          )}
        >
          <Icon className="size-4 shrink-0" strokeWidth={1.8} />
        </div>
        <div className="flex-1 min-w-0">
          <h2
            id="notification-category-title"
            className={cn(
              "text-sm font-semibold leading-tight",
              !channels.enabled && "text-muted-foreground",
            )}
          >
            {title}
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
            {description}
          </p>
        </div>
        <Switch
          checked={channels.enabled}
          aria-label={`تفعيل إشعارات ${title}`}
          aria-expanded={channels.enabled}
          onCheckedChange={(v) => onChannelChange({ enabled: v })}
        />
      </div>

      <div
        className={cn(
          "border-t border-border px-4 pb-4 pt-3 space-y-0 transition-opacity",
          bodyDimmed && "opacity-40 pointer-events-none select-none",
        )}
        inert={bodyDimmed}
      >
        <div className="space-y-0 divide-y divide-border/60">
          {(["inApp", "push", "local"] as ChannelKey[]).map((ch) => (
            <ChannelRow
              key={ch}
              ch={ch}
              value={channels[ch]}
              onChange={(v) => onChannelChange({ [ch]: v })}
              disabled={ch === "push" && !fcmConfigured}
              disabledReason={
                ch === "push" && !fcmConfigured ? fcmDisabledReason : undefined
              }
            />
          ))}
        </div>

        <div className="pt-3">
          <p className="text-xs font-medium text-muted-foreground mb-2">
            المستقبلون
          </p>
          {audience}
        </div>
      </div>
    </div>
  );
}

function UserMultiPicker({
  users,
  selected,
  onChange,
  isLoading = false,
  isError = false,
  onRetry,
}: {
  users: UserRecord[];
  selected: number[];
  onChange: (ids: number[]) => void;
  isLoading?: boolean;
  isError?: boolean;
  onRetry?: () => void;
}) {
  const [q, setQ] = useState("");
  const filtered = users.filter(
    (u) =>
      u.name.toLowerCase().includes(q.toLowerCase()) ||
      (u.username ?? "").toLowerCase().includes(q.toLowerCase()),
  );

  const toggle = (id: number) => {
    onChange(
      selected.includes(id)
        ? selected.filter((x) => x !== id)
        : [...selected, id],
    );
  };

  return (
    <div className="space-y-2">
      <Input
        id="notification-user-search"
        aria-label="البحث عن مستخدمين للتنبيهات"
        placeholder="ابحث…"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        className="min-h-11 text-sm"
        dir="rtl"
      />
      <div className="max-h-48 overflow-y-auto rounded-lg border border-border divide-y divide-border/60 bg-background">
        {isLoading ? (
          <p
            className="py-4 text-center text-xs text-muted-foreground"
            role="status"
          >
            جاري تحميل المستخدمين…
          </p>
        ) : isError ? (
          <div className="space-y-2 px-3 py-4 text-center text-xs" role="alert">
            <p className="text-destructive">تعذر تحميل قائمة المستخدمين.</p>
            {onRetry && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={onRetry}
              >
                إعادة المحاولة
              </Button>
            )}
          </div>
        ) : filtered.length === 0 ? (
          <p className="py-4 text-center text-xs text-muted-foreground">
            لا توجد نتائج
          </p>
        ) : (
          filtered.map((u) => {
            const active = selected.includes(u.id);
            return (
              <Button variant="bare"
                key={u.id}
                type="button"
                aria-pressed={active}
                aria-label={`${u.name}، ${active ? "محدد" : "غير محدد"}`}
                onClick={() => toggle(u.id)}
                className={cn(
                  "flex min-h-11 w-full items-center gap-2.5 px-3 py-2 text-start text-sm transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
                  active
                    ? "bg-primary/5 text-primary"
                    : "hover:bg-muted/60 text-foreground",
                )}
              >
                <span
                  className={cn(
                    "size-4 shrink-0 rounded-sm border transition-colors",
                    active
                      ? "border-primary bg-primary"
                      : "border-muted-foreground/40",
                  )}
                >
                  {active && (
                    <svg
                      viewBox="0 0 12 12"
                      className="size-full p-0.5 text-primary-foreground"
                      fill="none"
                    >
                      <polyline
                        points="2,6 5,9 10,3"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  )}
                </span>
                <span className="flex-1 truncate">{u.name}</span>
                {u.role && (
                  <span className="shrink-0 text-xs text-muted-foreground">
                    {u.role}
                  </span>
                )}
              </Button>
            );
          })
        )}
      </div>
      {selected.length > 0 && (
        <p className="text-xs text-muted-foreground">
          {selected.length} مستخدم مختار
        </p>
      )}
    </div>
  );
}

function UserSinglePicker({
  users,
  value,
  onChange,
  placeholder,
  isLoading = false,
  isError = false,
  onRetry,
}: {
  users: UserRecord[];
  value: number | null;
  onChange: (id: number | null) => void;
  placeholder?: string;
  isLoading?: boolean;
  isError?: boolean;
  onRetry?: () => void;
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
            <Button variant="bare"
              type="button"
              onClick={() => onChange(null)}
              className="min-h-11 min-w-11 text-muted-foreground hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
              aria-label="إزالة المدير المحدد"
            >
              <X className="mx-auto size-4" aria-hidden="true" />
            </Button>
          </Badge>
        ) : (
          <Button variant="bare"
            type="button"
            onClick={() => setOpen(true)}
            className="min-h-11 px-2 text-xs text-primary hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
            aria-label={placeholder ?? "اختيار مدير"}
          >
            {placeholder ?? "+ اختر مستخدم"}
          </Button>
        )}
        {selected && (
          <Button variant="bare"
            type="button"
            onClick={() => {
              setOpen(true);
              setQ("");
            }}
            className="min-h-11 px-2 text-xs text-muted-foreground hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
            aria-label="تغيير المدير المحدد"
          >
            تغيير
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <Input
        id="notification-manager-search"
        aria-label="البحث عن مدير التنبيهات"
        placeholder="ابحث…"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        className="min-h-11 text-sm"
        dir="rtl"
        autoFocus
      />
      <div className="max-h-40 overflow-y-auto rounded-lg border border-border divide-y divide-border/60 bg-background">
        <Button variant="bare"
          type="button"
          aria-pressed={value === null}
          onClick={() => {
            onChange(null);
            setOpen(false);
            setQ("");
          }}
          className={cn(
            "flex min-h-11 w-full items-center gap-2 px-3 py-2 text-start text-xs transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
            value === null
              ? "bg-primary/5 text-primary"
              : "text-muted-foreground hover:bg-muted/60",
          )}
        >
          <BellOff className="size-3.5 shrink-0" />
          بدون مدير مخصص (إرسال للأدمن)
        </Button>
        {isLoading ? (
          <p
            className="py-4 text-center text-xs text-muted-foreground"
            role="status"
          >
            جاري تحميل المستخدمين…
          </p>
        ) : isError ? (
          <div className="space-y-2 px-3 py-4 text-center text-xs" role="alert">
            <p className="text-destructive">تعذر تحميل قائمة المستخدمين.</p>
            {onRetry && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={onRetry}
              >
                إعادة المحاولة
              </Button>
            )}
          </div>
        ) : filtered.length === 0 ? (
          <p className="py-4 text-center text-xs text-muted-foreground">
            لا توجد نتائج
          </p>
        ) : (
          filtered.map((u) => (
            <Button variant="bare"
              key={u.id}
              type="button"
              aria-pressed={u.id === value}
              aria-label={`${u.name}، ${u.id === value ? "محدد" : "غير محدد"}`}
              onClick={() => {
                onChange(u.id);
                setOpen(false);
                setQ("");
              }}
              className={cn(
                "flex min-h-11 w-full items-center gap-2.5 px-3 py-2 text-start text-sm transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
                u.id === value
                  ? "bg-primary/5 text-primary"
                  : "hover:bg-muted/60",
              )}
            >
              <span className="flex-1 truncate">{u.name}</span>
              {u.role && (
                <span className="shrink-0 text-xs text-muted-foreground">
                  {u.role}
                </span>
              )}
            </Button>
          ))
        )}
      </div>
    </div>
  );
}

export default function AdminNotificationSettings() {
  const [activeCategory, setActiveCategory] =
    useState<keyof NotifSettings>("patients");
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
      setSaveStatus("success");
    },
    onError: (error) => {
      toast.error(getTrpcErrorMessage(error, "فشل حفظ الإعدادات"));
      setSaveStatus("error");
    },
  });

  const [settings, setSettings] = useState<NotifSettings>(DEFAULT);
  const [savedSettings, setSavedSettings] = useState<NotifSettings>(DEFAULT);
  const [initialized, setInitialized] = useState(false);
  const [saveStatus, setSaveStatus] = useState<"success" | "error" | null>(
    null,
  );
  const [permissionRequestPending, setPermissionRequestPending] =
    useState(false);
  const [browserPermission, setBrowserPermission] = useState<
    NotificationPermission | "unsupported"
  >(() => {
    if (typeof window === "undefined" || !("Notification" in window))
      return "unsupported";
    return Notification.permission;
  });

  const anyLocalEnabled =
    settings.patients.local ||
    settings.operations.local ||
    settings.attendance.local ||
    settings.stockroom.local ||
    settings.bookings.local ||
    settings.opReminder.local;

  const requestBrowserPermission = async () => {
    if (typeof window === "undefined" || !("Notification" in window)) return;
    setPermissionRequestPending(true);
    try {
      const result = await Notification.requestPermission();
      setBrowserPermission(result);
    } catch {
      toast.error("تعذر طلب إذن الإشعارات من المتصفح");
    } finally {
      setPermissionRequestPending(false);
    }
  };

  const fcmConfigured = metaQuery.data?.fcmConfigured ?? false;
  const fcmDisabledReason = metaQuery.isError
    ? "تعذر التحقق من إعدادات خدمة FCM"
    : metaQuery.data === undefined
      ? "جاري التحقق من إعدادات خدمة FCM"
      : "خدمة FCM غير مُفعَّلة";
  const users: UserRecord[] =
    (usersQuery.data as UserRecord[] | undefined) ?? [];

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
    setSaveStatus(null);
    setSettings((prev) => ({
      ...prev,
      [cat]: { ...prev[cat], ...patch },
    }));
  };

  const handleSave = async () => {
    const settingsToSave = settings;
    try {
      await updateMutation.mutateAsync({
        key: "app_notification_settings_v1",
        value: settingsToSave,
      });
      setSavedSettings(settingsToSave);
    } catch {
      return;
    }
  };

  if (!initialized && settingsQuery.isLoading) {
    return (
      <div
        className="flex h-40 items-center justify-center text-sm text-muted-foreground"
        role="status"
        aria-live="polite"
      >
        جاري التحميل...
      </div>
    );
  }

  if (!initialized && settingsQuery.isError) {
    return (
      <div
        className="mx-auto flex max-w-xl flex-col items-center gap-3 px-4 py-12 text-center"
        dir="rtl"
        role="alert"
      >
        <p className="text-sm font-medium">تعذر تحميل إعدادات الإشعارات.</p>
        <p className="text-xs text-muted-foreground">
          لا يمكن تعديل الإعدادات قبل تحميلها بنجاح.
        </p>
        <Button
          type="button"
          variant="outline"
          onClick={() => void settingsQuery.refetch()}
          disabled={settingsQuery.isFetching}
        >
          {settingsQuery.isFetching ? "جاري المحاولة…" : "إعادة المحاولة"}
        </Button>
      </div>
    );
  }

  return (
    <div
      className="admin-detail mx-auto max-w-[1200px] space-y-4 px-1 pb-4"
      dir="rtl"
    >
      <div className="border-b border-border pb-4">
        <h1 className="text-2xl font-semibold">إعدادات الإشعارات</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          التحكم في كيفية إرسال الإشعارات لكل فئة عبر القنوات المختلفة.
        </p>
      </div>

      <Separator />

      {metaQuery.isLoading && (
        <p className="text-xs text-muted-foreground" role="status">
          جاري التحقق من إعدادات الإشعارات الخارجية…
        </p>
      )}

      {anyLocalEnabled &&
        browserPermission !== "unsupported" &&
        browserPermission !== "granted" && (
          <div
            className={cn(
              "flex items-start gap-3 rounded-xl border px-4 py-3",
              browserPermission === "denied"
                ? "border-destructive/30 bg-destructive/5"
                : "border-warning/30 bg-warning/5",
            )}
            role={browserPermission === "denied" ? "alert" : "status"}
            aria-live="polite"
          >
            <Bell className="mt-0.5 size-4 shrink-0 text-warning-text" />
            <div className="flex-1 min-w-0 space-y-1">
              <p className="text-sm font-medium text-foreground">
                {browserPermission === "denied"
                  ? "الإشعارات المحلية محجوبة من المتصفح"
                  : "الإشعارات المحلية تحتاج إذن المتصفح"}
              </p>
              <p className="text-xs text-muted-foreground">
                {browserPermission === "denied"
                  ? "افتح إعدادات المتصفح وأذن الإشعارات لهذا الموقع يدوياً."
                  : "اسمح للمتصفح بإظهار الإشعارات حتى تعمل قناة الإشعارات المحلية."}
              </p>
            </div>
            {browserPermission === "default" && (
              <Button
                size="sm"
                variant="outline"
                className="min-h-11"
                onClick={requestBrowserPermission}
                disabled={permissionRequestPending}
              >
                {permissionRequestPending ? "جاري الطلب…" : "اسمح"}
              </Button>
            )}
          </div>
        )}

      {(metaQuery.isError || usersQuery.isError) && (
        <div
          className="flex flex-col gap-3 rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
          role="alert"
        >
          <p className="text-sm text-foreground">
            تعذر تحميل بعض بيانات الإشعارات. قد لا تظهر خيارات القنوات أو
            المستقبلين بشكل كامل.
          </p>
          <div className="flex flex-wrap gap-2">
            {metaQuery.isError && (
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => void metaQuery.refetch()}
                disabled={metaQuery.isFetching}
              >
                {metaQuery.isFetching ? "جاري المحاولة…" : "إعادة إعدادات Push"}
              </Button>
            )}
            {usersQuery.isError && (
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => void usersQuery.refetch()}
                disabled={usersQuery.isFetching}
              >
                {usersQuery.isFetching
                  ? "جاري المحاولة…"
                  : "إعادة قائمة المستخدمين"}
              </Button>
            )}
          </div>
        </div>
      )}

      <div className="grid min-h-[560px] min-w-0 overflow-hidden rounded-lg border border-border lg:grid-cols-[260px_minmax(0,1fr)]">
        <aside className="min-w-0 border-b border-border bg-muted/15 p-2 lg:border-b-0 lg:border-e">
          <div role="tablist" aria-label="فئات الإشعارات">
            {(
              [
                { id: "patients", label: "المرضى", icon: Users },
                { id: "operations", label: "العمليات", icon: Syringe },
                { id: "attendance", label: "الحضور", icon: Activity },
                { id: "stockroom", label: "المخزن", icon: Archive },
                { id: "bookings", label: "الحجوزات", icon: BookOpen },
                {
                  id: "opReminder",
                  label: "تذكير العمليات",
                  icon: CalendarClock,
                },
              ] as const
            ).map((item) => {
              const Icon = item.icon;
              const active = activeCategory === item.id;
              return (
                <Button variant="bare"
                  key={item.id}
                  type="button"
                  id={`notification-tab-${item.id}`}
                  role="tab"
                  aria-selected={active}
                  aria-controls="notification-category-panel"
                  onClick={() => setActiveCategory(item.id)}
                  className={cn(
                    "mb-1 flex min-h-11 w-full items-center gap-3 rounded-md px-3 py-3 text-start text-xs font-black transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
                    active
                      ? "bg-primary text-primary-foreground"
                      : "hover:bg-background",
                  )}
                >
                  <Icon className="size-4" />
                  {item.label}
                </Button>
              );
            })}
          </div>
        </aside>
        <section
          id="notification-category-panel"
          role="tabpanel"
          aria-labelledby={`notification-tab-${activeCategory}`}
          className="min-w-0 p-4 sm:p-5"
        >
          {activeCategory === "patients" ? (
            <CategorySection
              icon={Users}
              title="المرضى"
              description="إشعارات مزامنة MSSQL والإضافة اليدوية والفحوصات والبنتاكام"
              channels={settings.patients}
              onChannelChange={(patch) => patchCategory("patients", patch)}
              fcmConfigured={fcmConfigured}
              fcmDisabledReason={fcmDisabledReason}
              audience={
                <Badge variant="outline" className="text-xs font-normal gap-1">
                  <Users className="size-3" />
                  جميع المستخدمين
                </Badge>
              }
            />
          ) : null}

          {/* Operations */}
          {activeCategory === "operations" ? (
            <CategorySection
              icon={Syringe}
              title="العمليات"
              description="إشعارات قوائم العمليات الجراحية والحجوزات"
              channels={settings.operations}
              onChannelChange={(patch) => patchCategory("operations", patch)}
              fcmConfigured={fcmConfigured}
              fcmDisabledReason={fcmDisabledReason}
              audience={
                <UserMultiPicker
                  users={users}
                  selected={settings.operations.userIds}
                  onChange={(ids) =>
                    patchCategory("operations", { userIds: ids })
                  }
                  isLoading={usersQuery.isLoading}
                  isError={usersQuery.isError}
                  onRetry={() => void usersQuery.refetch()}
                />
              }
            />
          ) : null}

          {/* Attendance */}
          {activeCategory === "attendance" ? (
            <CategorySection
              icon={Activity}
              title="الحضور"
              description="إشعارات طلبات الإجازة والأذونات والموافقات"
              channels={settings.attendance}
              onChannelChange={(patch) => patchCategory("attendance", patch)}
              fcmConfigured={fcmConfigured}
              fcmDisabledReason={fcmDisabledReason}
              audience={
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Badge
                      variant="outline"
                      className="text-xs font-normal gap-1"
                    >
                      <Activity className="size-3" />
                      {settings.attendance.managerId
                        ? (users.find(
                            (u) => u.id === settings.attendance.managerId,
                          )?.name ?? "مدير مخصص")
                        : "الأدمن / المديرون"}
                    </Badge>
                  </div>
                  <UserSinglePicker
                    users={users}
                    value={settings.attendance.managerId}
                    onChange={(id) =>
                      patchCategory("attendance", { managerId: id })
                    }
                    placeholder="+ تعيين مدير مخصص"
                    isLoading={usersQuery.isLoading}
                    isError={usersQuery.isError}
                    onRetry={() => void usersQuery.refetch()}
                  />
                </div>
              }
            />
          ) : null}

          {/* Stockroom */}
          {activeCategory === "stockroom" ? (
            <CategorySection
              icon={Archive}
              title="المخزن"
              description="إشعارات استلام وصرف وتعديل أصناف المخزن"
              channels={settings.stockroom}
              onChannelChange={(patch) => patchCategory("stockroom", patch)}
              fcmConfigured={fcmConfigured}
              fcmDisabledReason={fcmDisabledReason}
              audience={
                <Badge variant="outline" className="text-xs font-normal gap-1">
                  <Archive className="size-3" />
                  مستخدمو المخزن
                </Badge>
              }
            />
          ) : null}

          {/* Bookings */}
          {activeCategory === "bookings" ? (
            <CategorySection
              icon={BookOpen}
              title="الحجوزات"
              description="إشعارات طلبات الحجز الواردة من البوابة الإلكترونية للمرضى"
              channels={settings.bookings}
              onChannelChange={(patch) => patchCategory("bookings", patch)}
              fcmConfigured={fcmConfigured}
              fcmDisabledReason={fcmDisabledReason}
              audience={
                <div className="space-y-2">
                  <UserMultiPicker
                    users={users}
                    selected={settings.bookings.userIds}
                    onChange={(ids) =>
                      patchCategory("bookings", { userIds: ids })
                    }
                    isLoading={usersQuery.isLoading}
                    isError={usersQuery.isError}
                    onRetry={() => void usersQuery.refetch()}
                  />
                  {settings.bookings.userIds.length === 0 && (
                    <p className="text-xs text-muted-foreground">
                      بدون تحديد: يُرسَل للأدمن والاستقبال
                    </p>
                  )}
                </div>
              }
            />
          ) : null}

          {/* Op Reminder */}
          {activeCategory === "opReminder" ? (
            <CategorySection
              icon={CalendarClock}
              title="تذكير العمليات"
              description="إشعار يومي بقائمة عمليات الغد يُرسَل في الساعة المحددة"
              channels={settings.opReminder}
              onChannelChange={(patch) => patchCategory("opReminder", patch)}
              fcmConfigured={fcmConfigured}
              fcmDisabledReason={fcmDisabledReason}
              audience={
                <div className="space-y-3">
                  {/* Send hour picker */}
                  <div className="flex flex-wrap items-center gap-3">
                    <p className="text-xs text-muted-foreground shrink-0">
                      وقت الإرسال
                    </p>
                    <div className="flex items-center gap-1.5">
                      <Input bare
                        aria-label="ساعة إرسال تذكير العمليات"
                        type="number"
                        min={0}
                        max={23}
                        value={settings.opReminder.sendHour}
                        onChange={(e) => {
                          const v = Math.min(
                            23,
                            Math.max(0, Number(e.target.value)),
                          );
                          if (Number.isFinite(v))
                            patchCategory("opReminder", { sendHour: v });
                        }}
                        className="min-h-11 w-16 rounded-md border border-border bg-background px-2 text-center text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                      />
                      <span className="text-xs text-muted-foreground">:00</span>
                    </div>
                  </div>
                  {/* Audience toggle */}
                  <div
                    className="flex flex-wrap items-center gap-2"
                    aria-label="جمهور التذكير"
                  >
                    <Button variant="bare"
                      type="button"
                      aria-pressed={settings.opReminder.targetAll}
                      onClick={() =>
                        patchCategory("opReminder", {
                          targetAll: true,
                          userIds: [],
                        })
                      }
                      className={cn(
                        "min-h-11 rounded-full border px-3 py-0.5 text-xs transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
                        settings.opReminder.targetAll
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-border text-muted-foreground hover:border-primary/50",
                      )}
                    >
                      جميع المستخدمين
                    </Button>
                    <Button variant="bare"
                      type="button"
                      aria-pressed={!settings.opReminder.targetAll}
                      onClick={() =>
                        patchCategory("opReminder", { targetAll: false })
                      }
                      className={cn(
                        "min-h-11 rounded-full border px-3 py-0.5 text-xs transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
                        !settings.opReminder.targetAll
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-border text-muted-foreground hover:border-primary/50",
                      )}
                    >
                      مستخدمون محددون
                    </Button>
                  </div>
                  {!settings.opReminder.targetAll && (
                    <UserMultiPicker
                      users={users}
                      selected={settings.opReminder.userIds}
                      onChange={(ids) =>
                        patchCategory("opReminder", { userIds: ids })
                      }
                      isLoading={usersQuery.isLoading}
                      isError={usersQuery.isError}
                      onRetry={() => void usersQuery.refetch()}
                    />
                  )}
                </div>
              }
            />
          ) : null}
        </section>
      </div>

      <div className="flex flex-col gap-3 pt-2 sm:flex-row sm:items-center sm:justify-start">
        <Button
          className="min-h-11"
          onClick={handleSave}
          disabled={!isDirty || updateMutation.isPending}
          aria-busy={updateMutation.isPending}
        >
          {updateMutation.isPending ? "جاري الحفظ…" : "حفظ"}
        </Button>
        {isDirty && (
          <Button
            variant="ghost"
            className="min-h-11"
            onClick={() => {
              setSettings(savedSettings);
              setSaveStatus(null);
            }}
            disabled={updateMutation.isPending}
          >
            إلغاء
          </Button>
        )}
        {saveStatus === "success" && !isDirty && (
          <p className="text-sm text-success" role="status" aria-live="polite">
            تم حفظ إعدادات الإشعارات.
          </p>
        )}
        {saveStatus === "error" && (
          <div
            className="flex flex-col gap-2 rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm sm:flex-row sm:items-center"
            role="alert"
          >
            <span>تعذر حفظ الإعدادات. تحقق من الاتصال وحاول مرة أخرى.</span>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={handleSave}
              disabled={updateMutation.isPending || !isDirty}
            >
              إعادة المحاولة
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
