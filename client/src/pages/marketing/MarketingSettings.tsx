import { useEffect, useState } from "react";
import CentralSchedulerSettings from "./CentralSchedulerSettings";
import { useSearch } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  AlertCircle,
  CheckCircle2,
  Clock,
  Facebook,
  Loader2,
  LogOut,
  Save,
  Settings,
  TestTube2,
  ToggleLeft,
  ToggleRight,
  Wifi,
  WifiOff,
} from "lucide-react";
import { Input } from "@/components/ui/input";

type PageRole = "center" | "doctor";
type FacebookPageSettings = {
  pageRole: PageRole;
  pageId: string;
  pageName: string;
  contentName: string | null;
  connected: boolean;
  autoPublish: boolean;
  saturdayEnabled: boolean;
  tuesdayEnabled: boolean;
  thursdayEnabled: boolean;
  publishHour: number;
  topicDirection: "forward" | "reverse";
};

// ─── Page selection dialog ────────────────────────────────────────────────────

function PageSelectDialog({
  pages,
  onSelect,
  onClose,
  isPending,
}: {
  pages: Array<{ id: string; name: string; category?: string | null }>;
  onSelect: (pageId: string) => void;
  onClose: () => void;
  isPending: boolean;
}) {
  const [selected, setSelected] = useState<string>("");
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-xl border border-border bg-card p-5 shadow-lg">
        <h2 className="mb-1 text-base font-semibold text-foreground">
          اختر صفحة Facebook
        </h2>
        <p className="mb-4 text-xs text-muted-foreground">
          الحساب المرتبط يدير {pages.length} صفحة — اختر صفحة مركزك الطبي
        </p>
        <div className="space-y-2 max-h-64 overflow-y-auto">
          {pages.map((page) => (
            <label
              key={page.id}
              className={`flex cursor-pointer items-center gap-3 rounded-lg border px-3 py-2.5 transition-colors ${
                selected === page.id
                  ? "border-primary bg-primary/10"
                  : "border-border bg-muted/20 hover:bg-muted/40"
              }`}
            >
              <input
                type="radio"
                name="fb-page"
                value={page.id}
                checked={selected === page.id}
                onChange={() => setSelected(page.id)}
                className="accent-primary"
              />
              <div>
                <p className="text-sm font-medium text-foreground">
                  {page.name}
                </p>
                {page.category && (
                  <p className="text-xs text-muted-foreground">
                    {page.category}
                  </p>
                )}
              </div>
            </label>
          ))}
        </div>
        <div className="mt-4 flex justify-end gap-2">
          <Button
            size="sm"
            variant="ghost"
            onClick={onClose}
            disabled={isPending}
          >
            إلغاء
          </Button>
          <Button
            size="sm"
            onClick={() => selected && onSelect(selected)}
            disabled={!selected || isPending}
          >
            {isPending ? (
              <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
            ) : null}
            ربط الصفحة
          </Button>
        </div>
      </div>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function MarketingSettings() {
  const searchStr = useSearch();
  const utils = trpc.useUtils();
  const [pageRole, setPageRole] = useState<PageRole>("center");

  // Parse query params for OAuth callback feedback
  const searchParams = new URLSearchParams(searchStr);
  const fbParam = searchParams.get("fb");

  const [showPageSelect, setShowPageSelect] = useState(false);
  const [testResult, setTestResult] = useState<{
    ok: boolean;
    pageName?: string | null;
  } | null>(null);

  const settingsQuery = trpc.marketing.getSettings.useQuery();
  const logsQuery = trpc.marketing.getLogs.useQuery({ limit: 30 });
  const fbStatusQuery = trpc.marketing.getFacebookStatus.useQuery();
  const pendingPagesQuery = trpc.marketing.getPendingPages.useQuery(undefined, {
    enabled: fbParam === "select" || showPageSelect,
  });

  const updateMutation = trpc.marketing.updateSettings.useMutation({
    onSuccess: () => {
      toast.success("تم حفظ الإعدادات");
      void utils.marketing.getSettings.invalidate();
    },
    onError: (err: { message: string }) => toast.error(err.message),
  });

  const pageSettingsMutation =
    trpc.marketing.updateFacebookPageSettings.useMutation({
      onSuccess: () => {
        toast.success("تم حفظ إعدادات الصفحة");
        void utils.marketing.getFacebookStatus.invalidate();
      },
      onError: (err: { message: string }) => toast.error(err.message),
    });

  const getOAuthUrlMutation = trpc.marketing.getOAuthUrl.useMutation({
    onSuccess: (data) => {
      window.location.href = data.url;
    },
    onError: (err: { message: string }) => toast.error(err.message),
  });

  const selectPageMutation = trpc.marketing.selectFacebookPage.useMutation({
    onSuccess: (data) => {
      toast.success(`تم ربط صفحة "${data.pageName}" بنجاح`);
      setShowPageSelect(false);
      void utils.marketing.getFacebookStatus.invalidate();
      void utils.marketing.getSettings.invalidate();
      // Remove query param
      window.history.replaceState(null, "", window.location.pathname);
    },
    onError: (err: { message: string }) => toast.error(err.message),
  });

  const disconnectMutation = trpc.marketing.disconnectFacebook.useMutation({
    onSuccess: () => {
      toast.success("تم فصل صفحة Facebook");
      setTestResult(null);
      void utils.marketing.getFacebookStatus.invalidate();
      void utils.marketing.getSettings.invalidate();
    },
    onError: (err: { message: string }) => toast.error(err.message),
  });

  const testMutation = trpc.marketing.testFacebookConnection.useMutation({
    onSuccess: (data) => {
      setTestResult({ ok: true, pageName: data.pageName });
      toast.success("الاتصال يعمل بشكل صحيح");
    },
    onError: (err: { message: string }) => {
      setTestResult({ ok: false });
      toast.error(err.message);
    },
  });

  // Show feedback from OAuth callback
  useEffect(() => {
    if (!fbParam) return;
    if (fbParam === "connected") {
      toast.success("تم ربط صفحة Facebook بنجاح");
      void utils.marketing.getFacebookStatus.invalidate();
      window.history.replaceState(null, "", window.location.pathname);
    } else if (fbParam === "select") {
      setShowPageSelect(true);
    } else if (fbParam === "error") {
      const reason = searchParams.get("reason") ?? "unknown";
      const reasonMsg: Record<string, string> = {
        invalid_state: "انتهت صلاحية جلسة الربط — حاول مجدداً",
        no_pages: "الحساب لا يدير أي صفحة Facebook",
        missing_params: "طلب OAuth غير مكتمل",
        server_error: "خطأ في الخادم أثناء معالجة الربط",
      };
      toast.error(reasonMsg[reason] ?? `فشل الربط: ${reason}`);
      window.history.replaceState(null, "", window.location.pathname);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const pendingRole = fbStatusQuery.data?.pendingRole;
    if (pendingRole) setPageRole(pendingRole);
  }, [fbStatusQuery.data?.pendingRole]);

  const settings = settingsQuery.data;
  const fbStatus = fbStatusQuery.data;
  const selectedPage = (
    fbStatus?.pages as FacebookPageSettings[] | undefined
  )?.find((page) => page.pageRole === pageRole);
  const pageConnected = Boolean(
    selectedPage?.connected || (pageRole === "center" && fbStatus?.connected),
  );

  const [form, setForm] = useState({
    clinicName: "مركزك لطب العيون",
    contentName: "مركزك لطب العيون",
    autoPublish: false,
    saturdayEnabled: true,
    tuesdayEnabled: true,
    thursdayEnabled: true,
    publishHour: 9,
    topicDirection: "forward" as "forward" | "reverse",
  });

  useEffect(() => {
    if (settings) {
      setForm({
        clinicName: settings.clinicName ?? "مركزك لطب العيون",
        contentName: settings.clinicName ?? "مركزك لطب العيون",
        autoPublish: settings.autoPublish,
        saturdayEnabled: settings.saturdayEnabled,
        tuesdayEnabled: settings.tuesdayEnabled,
        thursdayEnabled: settings.thursdayEnabled,
        publishHour: settings.publishHour,
        topicDirection: "forward",
      });
    }
  }, [settings]);

  useEffect(() => {
    if (!selectedPage) return;
    setForm((current) => ({
      ...current,
      contentName: selectedPage.contentName ?? selectedPage.pageName,
      autoPublish: selectedPage.autoPublish,
      saturdayEnabled: selectedPage.saturdayEnabled,
      tuesdayEnabled: selectedPage.tuesdayEnabled,
      thursdayEnabled: selectedPage.thursdayEnabled,
      publishHour: selectedPage.publishHour,
      topicDirection: selectedPage.topicDirection,
    }));
  }, [selectedPage]);

  const ToggleRow = ({
    label,
    description,
    value,
    onChange,
  }: {
    label: string;
    description?: string;
    value: boolean;
    onChange: (v: boolean) => void;
  }) => (
    <div className="flex items-center justify-between gap-4 py-3">
      <div>
        <div className="text-sm font-medium text-foreground">{label}</div>
        {description && (
          <div className="text-xs text-muted-foreground">{description}</div>
        )}
      </div>
      <Button
        variant="bare"
        type="button"
        onClick={() => onChange(!value)}
        role="switch"
        aria-checked={value}
        aria-label={label}
        className="shrink-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
      >
        {value ? (
          <ToggleRight className="h-7 w-7 text-primary" />
        ) : (
          <ToggleLeft className="h-7 w-7 text-muted-foreground" />
        )}
      </Button>
    </div>
  );

  const pendingPages = pendingPagesQuery.data ?? [];

  return (
    <div className="space-y-6">
      <CentralSchedulerSettings />
      <h1 className="text-2xl font-bold text-foreground">إعدادات التسويق</h1>

      <div className="inline-flex rounded-lg border border-border bg-muted/20 p-1">
        {(
          [
            ["center", "صفحة المركز"],
            ["doctor", "صفحة الدكتور"],
          ] as const
        ).map(([role, label]) => (
          <Button
            variant="bare"
            key={role}
            type="button"
            className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${pageRole === role ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}
            onClick={() => setPageRole(role)}
            aria-pressed={pageRole === role}
          >
            {label}
          </Button>
        ))}
      </div>

      {/* Page selection dialog */}
      {showPageSelect && pendingPages.length > 0 && (
        <PageSelectDialog
          pages={pendingPages}
          onSelect={(pageId) => selectPageMutation.mutate({ pageId, pageRole })}
          onClose={() => {
            setShowPageSelect(false);
            window.history.replaceState(null, "", window.location.pathname);
          }}
          isPending={selectPageMutation.isPending}
        />
      )}

      {/* Facebook Connect */}
      <div
        className={`rounded-xl border bg-card p-4 ${pageConnected ? "border-[#1877F2]/30" : "border-border"}`}
      >
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex items-center gap-2">
            <Facebook className="h-4 w-4 text-[#1877F2]" />
            <h2 className="text-sm font-semibold text-foreground">
              ربط {pageRole === "doctor" ? "صفحة الدكتور" : "صفحة المركز"}
            </h2>
          </div>
          {fbStatusQuery.isLoading ? (
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          ) : pageConnected ? (
            <Badge className="bg-success/15 text-success text-xs">
              <Wifi className="mr-1 h-3 w-3" />
              متصل
            </Badge>
          ) : (
            <Badge className="bg-muted text-muted-foreground text-xs">
              <WifiOff className="mr-1 h-3 w-3" />
              غير متصل
            </Badge>
          )}
        </div>

        {fbStatus?.connected ? (
          /* Connected state */
          <div className="space-y-3">
            <div className="flex items-center gap-2 rounded-lg border border-success/20 bg-success/5 px-3 py-2.5">
              <CheckCircle2 className="h-4 w-4 shrink-0 text-success" />
              <div>
                <p className="text-sm font-medium text-foreground">
                  {selectedPage?.pageName ?? fbStatus?.pageName}
                </p>
                <p className="text-xs text-muted-foreground">
                  معرف الصفحة: {selectedPage?.pageId ?? fbStatus?.pageId}
                </p>
              </div>
            </div>

            {testResult && (
              <div
                className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-xs ${testResult.ok ? "border-success/20 bg-success/5 text-success" : "border-destructive/20 bg-destructive/5 text-destructive"}`}
              >
                {testResult.ok ? (
                  <>
                    <CheckCircle2 className="h-3.5 w-3.5" /> الاتصال يعمل بشكل
                    صحيح
                  </>
                ) : (
                  <>
                    <AlertCircle className="h-3.5 w-3.5" /> فشل الاتصال — قد
                    يكون التوكن منتهياً
                  </>
                )}
              </div>
            )}

            <div className="flex flex-wrap gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  setTestResult(null);
                  testMutation.mutate({ pageRole });
                }}
                disabled={testMutation.isPending}
              >
                {testMutation.isPending ? (
                  <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                ) : (
                  <TestTube2 className="mr-1.5 h-4 w-4" />
                )}
                اختبار الاتصال
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="text-destructive hover:text-destructive border-destructive/30 hover:border-destructive"
                onClick={() => disconnectMutation.mutate({ pageRole })}
                disabled={disconnectMutation.isPending}
              >
                {disconnectMutation.isPending ? (
                  <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                ) : (
                  <LogOut className="mr-1.5 h-4 w-4" />
                )}
                فصل الصفحة
              </Button>
            </div>
          </div>
        ) : (
          /* Disconnected state */
          <div className="space-y-3">
            <p className="text-xs text-muted-foreground">
              ربط {pageRole === "doctor" ? "صفحة الدكتور" : "صفحة المركز"}{" "}
              لتفعيل النشر المباشر. تأكد من إعداد{" "}
              <code className="rounded bg-muted px-1 py-0.5 font-mono text-[10px]">
                FB_APP_ID
              </code>{" "}
              و{" "}
              <code className="rounded bg-muted px-1 py-0.5 font-mono text-[10px]">
                FB_APP_SECRET
              </code>{" "}
              في إعدادات الخادم أولاً.
            </p>

            {!fbStatus?.appConfigured && !fbStatusQuery.isLoading && (
              <div className="flex items-start gap-2 rounded-lg border border-warning/30 bg-warning/5 px-3 py-2.5">
                <Settings className="mt-0.5 h-4 w-4 shrink-0 text-warning-text" />
                <div className="text-xs text-warning-text">
                  <span className="font-semibold">FB_APP_ID</span> أو{" "}
                  <span className="font-semibold">FB_APP_SECRET</span> غير
                  مهيأين في الخادم. أضفهما في ملف{" "}
                  <code className="rounded bg-warning/10 px-1 font-mono">
                    .env
                  </code>{" "}
                  وأعد تشغيل الخادم.
                </div>
              </div>
            )}

            <Button
              size="sm"
              variant="default"
              className="bg-[#1668d9] text-white hover:bg-[#1259bd]"
              onClick={() => getOAuthUrlMutation.mutate({ pageRole })}
              disabled={
                getOAuthUrlMutation.isPending || !fbStatus?.appConfigured
              }
            >
              {getOAuthUrlMutation.isPending ? (
                <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
              ) : (
                <Facebook className="mr-1.5 h-4 w-4" />
              )}
              ربط الصفحة
            </Button>
          </div>
        )}
      </div>

      {/* Page content name */}
      <div className="rounded-xl border border-border bg-card p-4">
        <h2 className="mb-1 text-sm font-semibold text-foreground">
          {pageRole === "center" ? "اسم المركز" : "اسم الدكتور"}
        </h2>
        <p className="mb-3 text-xs text-muted-foreground">
          الاسم ده خاص بالمحتوى المُولَّد للصفحة الحالية فقط
        </p>
        <Input
          bare
          type="text"
          value={form.contentName}
          onChange={(e) =>
            setForm((f) => ({ ...f, contentName: e.target.value }))
          }
          placeholder={
            pageRole === "center"
              ? "مثال: مركز عيون الشروق"
              : "مثال: د. أحمد علي"
          }
          dir="rtl"
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
        />
      </div>

      {/* Auto publish settings */}
      <div className="rounded-xl border border-border bg-card p-4">
        <h2 className="mb-1 text-sm font-semibold text-foreground">
          النشر التلقائي
        </h2>
        <p className="mb-3 text-xs text-muted-foreground">
          توليد النص والصورة ونشرهما تلقائيًا على Facebook بعد اكتمال التوليد
        </p>

        {settingsQuery.isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="divide-y divide-border">
            <ToggleRow
              label="النشر التلقائي"
              description="توليد النص والصورة ونشرهما حسب الجدول"
              value={form.autoPublish}
              onChange={(v) => setForm((f) => ({ ...f, autoPublish: v }))}
            />
            <ToggleRow
              label={pageRole === "center" ? "الأحد" : "السبت"}
              description="موضوع جديد من المجالات الاثني عشر"
              value={form.saturdayEnabled}
              onChange={(v) => setForm((f) => ({ ...f, saturdayEnabled: v }))}
            />
            <ToggleRow
              label={pageRole === "center" ? "الثلاثاء" : "الاثنين"}
              description="موضوع جديد من المجالات الاثني عشر"
              value={form.tuesdayEnabled}
              onChange={(v) => setForm((f) => ({ ...f, tuesdayEnabled: v }))}
            />
            <ToggleRow
              label={pageRole === "center" ? "الخميس" : "الأربعاء"}
              description="موضوع جديد من المجالات الاثني عشر"
              value={form.thursdayEnabled}
              onChange={(v) => setForm((f) => ({ ...f, thursdayEnabled: v }))}
            />
            <div className="flex items-center justify-between gap-4 py-3">
              <div>
                <div className="text-sm font-medium text-foreground">
                  ترتيب المواضيع
                </div>
                <div className="text-xs text-muted-foreground">
                  صفحة المركز تبدأ من أول القائمة، وصفحة الدكتور من آخرها
                </div>
              </div>
              <select
                aria-label="اتجاه الموضوعات"
                value={form.topicDirection}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    topicDirection: e.target.value as "forward" | "reverse",
                  }))
                }
                className="rounded-md border border-input bg-background px-2 py-1.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
              >
                <option value="forward">من البداية للنهاية</option>
                <option value="reverse">بالعكس</option>
              </select>
            </div>
            <div className="flex items-center justify-between gap-4 py-3">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <div>
                  <div className="text-sm font-medium text-foreground">
                    وقت النشر
                  </div>
                  <div className="text-xs text-muted-foreground">
                    الساعة المحلية لبدء التوليد والنشر
                  </div>
                </div>
              </div>
              <select
                aria-label="ساعة النشر"
                value={form.publishHour}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    publishHour: Number(e.target.value),
                  }))
                }
                className="rounded-md border border-input bg-background px-2 py-1.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
              >
                {Array.from({ length: 24 }, (_, i) => (
                  <option key={i} value={i}>
                    {String(i).padStart(2, "0")}:00
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}

        <div className="mt-4 flex justify-end">
          <Button
            size="sm"
            onClick={() => {
              if (pageRole === "center") {
                updateMutation.mutate({ clinicName: form.contentName });
              }
              if (selectedPage) {
                pageSettingsMutation.mutate({
                  pageRole,
                  contentName: form.contentName,
                  autoPublish: form.autoPublish,
                  saturdayEnabled: form.saturdayEnabled,
                  tuesdayEnabled: form.tuesdayEnabled,
                  thursdayEnabled: form.thursdayEnabled,
                  publishHour: form.publishHour,
                  topicDirection: form.topicDirection,
                });
              }
            }}
            disabled={
              updateMutation.isPending || pageSettingsMutation.isPending
            }
          >
            {updateMutation.isPending ? (
              <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
            ) : (
              <Save className="mr-1.5 h-4 w-4" />
            )}
            حفظ الإعدادات
          </Button>
        </div>
      </div>

      {/* Activity Logs */}
      <div className="rounded-xl border border-border bg-card">
        <div className="border-b border-border px-4 py-3">
          <h2 className="text-sm font-semibold text-foreground">سجل النشاط</h2>
        </div>
        {logsQuery.isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : (logsQuery.data ?? []).length === 0 ? (
          <div className="py-8 text-center text-sm text-muted-foreground">
            لا توجد سجلات
          </div>
        ) : (
          <div className="max-h-64 divide-y divide-border overflow-y-auto">
            {(logsQuery.data ?? []).map((log: any) => (
              <div key={log.id} className="flex items-start gap-3 px-4 py-2.5">
                <span
                  className={`mt-0.5 h-2 w-2 shrink-0 rounded-full ${log.status === "success" ? "bg-success" : log.status === "error" ? "bg-destructive" : "bg-muted-foreground"}`}
                />
                <div className="min-w-0 flex-1">
                  <div className="text-xs font-medium text-foreground">
                    {log.action}
                  </div>
                  {log.message && (
                    <div className="text-xs text-muted-foreground">
                      {log.message}
                    </div>
                  )}
                </div>
                <div className="shrink-0 text-xs text-muted-foreground">
                  {new Date(log.createdAt).toLocaleString("ar-EG")}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
