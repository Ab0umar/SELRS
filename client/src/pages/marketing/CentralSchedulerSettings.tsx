import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";

export default function CentralSchedulerSettings() {
  const capability = trpc.aiManagement.status.useQuery(undefined, {
    retry: false,
  });
  const ready = Boolean(capability.data?.marketingWorkflowAvailable);
  const query = trpc.marketing.centralSchedulerProviders.useQuery(undefined, {
    enabled: ready,
    retry: false,
  });
  const [pageRole, setPageRole] = useState<"center" | "doctor">("center");
  const [draft, setDraft] = useState<"manus" | "central" | undefined>();
  const [message, setMessage] = useState("");
  const utils = trpc.useUtils();
  const save = trpc.marketing.setCentralSchedulerProvider.useMutation({
    retry: false,
  });
  const provider = query.data?.find(
    (setting) => setting.pageRole === pageRole,
  )?.provider;
  const selected = draft ?? provider ?? "manus";
  return (
    <section
      className="min-w-0 rounded-xl border border-border bg-card p-4 space-y-3"
      dir="rtl"
      aria-label="مزوّد جدولة التسويق"
    >
      <h2 className="font-semibold">مزوّد جدولة التسويق</h2>
      <p>
        الاختيار مستقل لكل صفحة. Gemini يستخدم الموديول المركزي للنص والصورة.
        إعدادات الأيام والساعة والنشر التلقائي لهذه الصفحة تظل سارية؛ الحفظ هنا
        لا يشغّل دورة الآن.
      </p>
      {query.error && (
        <p role="alert">تعذرت قراءة المزوّد. أعد تحميل الإعدادات قبل الحفظ.</p>
      )}
      <label className="grid gap-2">
        صفحة الجدولة
        <select
          aria-label="صفحة مزوّد الجدولة"
          className="min-h-11 rounded-md border border-input bg-background px-3"
          value={pageRole}
          disabled={save.isPending}
          onChange={(event) => {
            setPageRole(event.target.value as "center" | "doctor");
            setDraft(undefined);
            setMessage("");
          }}
        >
          <option value="center">المركز</option>
          <option value="doctor">العيادة</option>
        </select>
      </label>
      <label className="grid gap-2">
        المزوّد
        <select
          aria-label="مزوّد الجدولة"
          className="min-h-11 rounded-md border border-input bg-background px-3"
          value={selected}
          disabled={!ready || !provider || save.isPending}
          onChange={(event) =>
            setDraft(event.target.value as "manus" | "central")
          }
        >
          <option value="manus">Manus الحالي</option>
          <option value="central" disabled={!capability.data?.enabled}>
            Gemini المركزي
          </option>
        </select>
      </label>
      <Button
        className="min-h-11"
        disabled={!provider || selected === provider || save.isPending}
        onClick={async () => {
          try {
            await save.mutateAsync({ pageRole, provider: selected });
            await utils.marketing.centralSchedulerProviders.invalidate();
            setDraft(undefined);
            setMessage(
              "تم حفظ المزوّد لهذه الصفحة. لم تبدأ أي عملية توليد أو نشر الآن.",
            );
          } catch {
            setMessage(
              "تعذر الحفظ. لتفعيل Gemini راجع تمكين مهمتي نصوص وصور التسويق ومزوّدهما في إدارة AI.",
            );
          }
        }}
      >
        حفظ مزوّد الجدولة
      </Button>
      {message && <p role="status">{message}</p>}
    </section>
  );
}
