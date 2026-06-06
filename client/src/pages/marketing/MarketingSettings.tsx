import { useEffect, useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Clock, Facebook, Loader2, Save, ToggleLeft, ToggleRight } from "lucide-react";

export default function MarketingSettings() {
  const utils = trpc.useUtils();

  const settingsQuery = trpc.marketing.getSettings.useQuery();
  const logsQuery = trpc.marketing.getLogs.useQuery({ limit: 30 });

  const updateMutation = trpc.marketing.updateSettings.useMutation({
    onSuccess: () => {
      toast.success("تم حفظ الإعدادات");
      void utils.marketing.getSettings.invalidate();
    },
    onError: (err) => toast.error(err.message),
  });

  const settings = settingsQuery.data;

  const [form, setForm] = useState({
    autoPublish: false,
    saturdayEnabled: true,
    tuesdayEnabled: true,
    thursdayEnabled: true,
    publishHour: 9,
  });

  useEffect(() => {
    if (settings) {
      setForm({
        autoPublish: settings.autoPublish,
        saturdayEnabled: settings.saturdayEnabled,
        tuesdayEnabled: settings.tuesdayEnabled,
        thursdayEnabled: settings.thursdayEnabled,
        publishHour: settings.publishHour,
      });
    }
  }, [settings]);

  const handleSave = () => updateMutation.mutate(form);

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
        {description && <div className="text-xs text-muted-foreground">{description}</div>}
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

  return (
    <div className="space-y-6">
      <h1 className="text-lg font-bold text-foreground">إعدادات التسويق</h1>

      {/* Auto publish settings */}
      <div className="rounded-xl border border-border bg-card p-4">
        <h2 className="mb-1 text-sm font-semibold text-foreground">النشر التلقائي</h2>
        <p className="mb-3 text-xs text-muted-foreground">تحكم في جدولة النشر التلقائي لكل يوم</p>

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
                  <div className="text-sm font-medium text-foreground">وقت النشر</div>
                  <div className="text-xs text-muted-foreground">الساعة المحلية لنشر المحتوى</div>
                </div>
              </div>
              <select
                value={form.publishHour}
                onChange={(e) => setForm((f) => ({ ...f, publishHour: Number(e.target.value) }))}
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
          <Button size="sm" onClick={handleSave} disabled={updateMutation.isPending}>
            {updateMutation.isPending ? (
              <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
            ) : (
              <Save className="mr-1.5 h-4 w-4" />
            )}
            حفظ الإعدادات
          </Button>
        </div>
      </div>

      {/* Facebook placeholder */}
      <div className="rounded-xl border border-border bg-card p-4 opacity-60">
        <div className="flex items-center gap-2 mb-1">
          <Facebook className="h-4 w-4 text-[#1877F2]" />
          <h2 className="text-sm font-semibold text-foreground">ربط صفحة Facebook</h2>
          <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">قريباً</span>
        </div>
        <p className="text-xs text-muted-foreground mb-4">
          ربط صفحة Facebook الخاصة بالمركز لتفعيل النشر التلقائي. هذه الميزة ستكون متاحة قريباً.
        </p>
        <Button size="sm" disabled variant="outline">
          <Facebook className="mr-1.5 h-4 w-4 text-[#1877F2]" />
          ربط صفحة Facebook
        </Button>
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
          <div className="py-8 text-center text-sm text-muted-foreground">لا توجد سجلات</div>
        ) : (
          <div className="max-h-64 divide-y divide-border overflow-y-auto">
            {(logsQuery.data ?? []).map((log) => (
              <div key={log.id} className="flex items-start gap-3 px-4 py-2.5">
                <span
                  className={`mt-0.5 h-2 w-2 shrink-0 rounded-full ${
                    log.status === "success"
                      ? "bg-success"
                      : log.status === "error"
                        ? "bg-destructive"
                        : "bg-muted-foreground"
                  }`}
                />
                <div className="min-w-0 flex-1">
                  <div className="text-xs font-medium text-foreground">{log.action}</div>
                  {log.message && (
                    <div className="text-xs text-muted-foreground">{log.message}</div>
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
