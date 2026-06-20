import { useEffect, useState } from "react";
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

  const settings = settingsQuery.data;
  const fbStatus = fbStatusQuery.data;

  const [form, setForm] = useState({
    clinicName: "مركزك لطب العيون",
    autoPublish: false,
    saturdayEnabled: true,
    tuesdayEnabled: true,
    thursdayEnabled: true,
    publishHour: 9,
  });

  useEffect(() => {
    if (settings) {
      setForm({
        clinicName: settings.clinicName ?? "مركزك لطب العيون",
        autoPublish: settings.autoPublish,
        saturdayEnabled: settings.saturdayEnabled,
        tuesdayEnabled: settings.tuesdayEnabled,
        thursdayEnabled: settings.thursdayEnabled,
        publishHour: settings.publishHour,
      });
    }
  }, [settings]);

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
      <button
        type="button"
        onClick={() => onChange(!value)}
        className="shrink-0 focus:outline-none"
      >
        {value ? (
          <ToggleRight className="h-7 w-7 text-primary" />
        ) : (
          <ToggleLeft className="h-7 w-7 text-muted-foreground" />
        )}
      </button>
    </div>
  );

  const pendingPages = pendingPagesQuery.data ?? [];

  return (
    <div className="space-y-6">
      <h1 className="text-lg font-bold text-foreground">إعدادات التسويق</h1>

      {/* Page selection dialog */}
      {showPageSelect && pendingPages.length > 0 && (
        <PageSelectDialog
          pages={pendingPages}
          onSelect={(pageId) => selectPageMutation.mutate({ pageId })}
          onClose={() => {
            setShowPageSelect(false);
            window.history.replaceState(null, "", window.location.pathname);
          }}
          isPending={selectPageMutation.isPending}
        />
      )}

      {/* Facebook Connect */}
      <div
        className={`rounded-xl border bg-card p-4 ${fbStatus?.connected ? "border-[#1877F2]/30" : "border-border"}`}
      >
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex items-center gap-2">
            <Facebook className="h-4 w-4 text-[#1877F2]" />
            <h2 className="text-sm font-semibold text-foreground">
              ربط صفحة Facebook
            </h2>
          </div>
          {fbStatusQuery.isLoading ? (
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          ) : fbStatus?.connected ? (
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
                  {fbStatus.pageName}
                </p>
                <p className="text-xs text-muted-foreground">
                  معرف الصفحة: {fbStatus.pageId}
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
                  testMutation.mutate();
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
                onClick={() => disconnectMutation.mutate()}
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
              ربط صفحة Facebook الخاصة بالمركز لتفعيل النشر المباشر. تأكد من
              إعداد{" "}
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
                <Settings className="mt-0.5 h-4 w-4 shrink-0 text-warning" />
                <div className="text-xs text-warning">
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
              className="bg-[#1877F2] hover:bg-[#166FE5]"
              onClick={() => getOAuthUrlMutation.mutate()}
              disabled={
                getOAuthUrlMutation.isPending || !fbStatus?.appConfigured
              }
            >
              {getOAuthUrlMutation.isPending ? (
                <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
              ) : (
                <Facebook className="mr-1.5 h-4 w-4" />
              )}
              ربط صفحة Facebook
            </Button>
          </div>
        )}
      </div>

      {/* Clinic name */}
      <div className="rounded-xl border border-border bg-card p-4">
        <h2 className="mb-1 text-sm font-semibold text-foreground">
          اسم المركز
        </h2>
        <p className="mb-3 text-xs text-muted-foreground">
          يُستخدم في المحتوى المُولَّد تلقائياً
        </p>
        <input
          type="text"
          value={form.clinicName}
          onChange={(e) =>
            setForm((f) => ({ ...f, clinicName: e.target.value }))
          }
          placeholder="مثال: مركز عيون الشروق"
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
          تحكم في جدولة النشر التلقائي لكل يوم
        </p>

        {settingsQuery.isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="divide-y divide-border">
            <ToggleRow
              label="النشر التلقائي"
              description="تفعيل النشر التلقائي حسب الجدول"
              value={form.autoPublish}
              onChange={(v) => setForm((f) => ({ ...f, autoPublish: v }))}
            />
            <ToggleRow
              label="السبت"
              description="تصحيح الإبصار والبنتاكام"
              value={form.saturdayEnabled}
              onChange={(v) => setForm((f) => ({ ...f, saturdayEnabled: v }))}
            />
            <ToggleRow
              label="الثلاثاء"
              description="المياه البيضاء والقرنية"
              value={form.tuesdayEnabled}
              onChange={(v) => setForm((f) => ({ ...f, tuesdayEnabled: v }))}
            />
            <ToggleRow
              label="الخميس"
              description="صحة العيون العامة"
              value={form.thursdayEnabled}
              onChange={(v) => setForm((f) => ({ ...f, thursdayEnabled: v }))}
            />
            <div className="flex items-center justify-between gap-4 py-3">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <div>
                  <div className="text-sm font-medium text-foreground">
                    وقت النشر
                  </div>
                  <div className="text-xs text-muted-foreground">
                    الساعة المحلية لنشر المحتوى
                  </div>
                </div>
              </div>
              <select
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
            onClick={() => updateMutation.mutate(form)}
            disabled={updateMutation.isPending}
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
