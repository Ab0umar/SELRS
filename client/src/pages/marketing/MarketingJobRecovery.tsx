import { useRef, useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

const reasons: Record<string, string> = {
  image_configuration:
    "فعّل مهمة صور التسويق وتحقق من مفتاح Gemini في إدارة AI، ثم حدّث الفحص.",
  original_model_missing:
    "موديل الصورة الأصلي غير محفوظ؛ راجع المهمة قبل اختيار توليد بديل.",
  saved_text_missing:
    "النص المولد غير محفوظ؛ يلزم مراجعة المهمة قبل إعادة توليده.",
  topic_retired: "الموضوع سبق نشره؛ لن نستكمل توليده مرة أخرى.",
  draft_changed: "المسودة تغيرت أو حُذفت؛ لن نستبدل تعديلاتها بصورة قديمة.",
  provider_uncertain:
    "نتيجة طلب الصورة عند المزوّد غير محسومة. راجع سجل AI؛ لن نرسل طلبًا جديدًا.",
  paid_image_missing:
    "المزوّد سجّل اكتمال الصورة، لكن الملف غير موجود محليًا. يلزم مراجعته قبل دفع تكلفة جديدة.",
  still_running: "المهمة ما زالت جارية؛ تابع حالتها قبل الاسترجاع.",
};
export default function MarketingJobRecovery({ jobId }: { jobId: string }) {
  const [confirm, setConfirm] = useState(false);
  const busy = useRef(false);
  const utils = trpc.useUtils();
  const capability = trpc.aiManagement.status.useQuery(undefined, {
    retry: false,
  });
  const available = Boolean(
    capability.data?.enabled && capability.data.marketingRecoveryAvailable,
  );
  const plan = trpc.marketing.centralRecoveryPlan.useQuery(
    { jobId },
    { enabled: available, retry: false, refetchOnWindowFocus: false },
  );
  const recover = trpc.marketing.recoverCentralJob.useMutation({
    retry: false,
    onSettled: () => {
      busy.current = false;
      void utils.marketing.centralRecoveryPlan.invalidate({ jobId });
      void utils.marketing.centralGenerationJobs.invalidate();
      void utils.marketing.centralGenerationJob.invalidate({
        requestId: jobId,
      });
      void utils.marketing.listPosts.invalidate();
      void utils.aiManagement.usage.invalidate();
    },
  });
  function run(allowImageGeneration: boolean) {
    if (busy.current) return;
    busy.current = true;
    setConfirm(false);
    recover.mutate({
      jobId,
      requestId: crypto.randomUUID(),
      allowImageGeneration,
    });
  }
  if (!available) return null;
  return (
    <div
      className="mt-2 min-w-0 space-y-2"
      aria-label={`استرجاع المهمة ${jobId}`}
    >
      {plan.isLoading && <p role="status">جارٍ فحص الملفات والاستهلاك...</p>}
      {plan.error && (
        <p role="alert">تعذر فحص المهمة. حدّث الفحص؛ لم نعد أي توليد.</p>
      )}
      {plan.data?.action === "attach" && (
        <>
          <p>الصورة والبيانات محفوظة. يمكن استكمال الحفظ بدون طلب AI جديد.</p>
          {plan.data.usageReview && <p>سجل الاستهلاك سيظل بحاجة إلى مراجعة.</p>}
          <Button
            className="min-h-11 h-auto whitespace-normal"
            disabled={recover.isPending}
            onClick={() => run(false)}
          >
            استكمال الحفظ بدون توليد
          </Button>
        </>
      )}
      {plan.data?.action === "image_retry" && (
        <>
          <p>
            يمكن إعادة محاولة الصورة فقط. النص المحفوظ سيُستخدم كما هو، وقد
            يستهلك طلب الصورة رصيدًا.
            {plan.data.imageModel && (
              <>
                {" "}
                الموديل: <bdi>{plan.data.imageModel}</bdi>.
              </>
            )}
          </p>
          <Button
            className="min-h-11 h-auto whitespace-normal"
            disabled={recover.isPending}
            onClick={() => setConfirm(true)}
          >
            تجربة الصورة فقط
          </Button>
        </>
      )}
      {plan.data && ["blocked", "wait"].includes(plan.data.action) && (
        <p role="status">
          {reasons[plan.data.reason] ||
            "تحتاج المهمة إلى مراجعة قبل الاسترجاع."}
        </p>
      )}
      {recover.error && (
        <p role="alert">
          تعذر التأكد من الاسترجاع. حدّث الفحص قبل أي محاولة أخرى.
        </p>
      )}
      {plan.data &&
        ["provider_uncertain", "paid_image_missing"].includes(
          plan.data.reason,
        ) && (
          <p className="break-all text-xs">
            معرف طلب الصورة في سجل AI: <bdi>{plan.data.imageUsageId}</bdi>
          </p>
        )}
      <Button
        variant="outline"
        className="min-h-11 h-auto whitespace-normal"
        disabled={plan.isFetching || recover.isPending}
        onClick={() => void plan.refetch()}
      >
        تحديث فحص المهمة
      </Button>
      <Dialog open={confirm} onOpenChange={setConfirm}>
        <DialogContent dir="rtl">
          <DialogHeader>
            <DialogTitle>تأكيد تجربة الصورة فقط</DialogTitle>
            <DialogDescription>
              سيُرسل طلب صورة جديد وقد يستهلك رصيدًا. لن نعيد كتابة النص، ولن
              ننشر المسودة.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-wrap gap-3">
            <Button
              className="min-h-11"
              variant="outline"
              onClick={() => setConfirm(false)}
            >
              إلغاء
            </Button>
            <Button
              className="min-h-11 h-auto whitespace-normal"
              disabled={recover.isPending}
              onClick={() => run(true)}
            >
              تأكيد طلب الصورة فقط
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
