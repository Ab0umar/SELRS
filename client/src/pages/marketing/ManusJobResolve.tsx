import { useState } from "react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

export default function ManusJobResolve({
  jobId,
  hasTask,
}: {
  jobId: string;
  hasTask: boolean;
}) {
  const utils = trpc.useUtils();
  const [confirm, setConfirm] = useState(false);
  const resolve = trpc.marketing.resolveGenerationJob.useMutation({
    onSuccess: (result, input) => {
      void utils.marketing.generationJobs.invalidate();
      if (input.action === "abandon")
        toast.success(
          "أُوقفت المهمة، ويمكنك الآن تعديل المسودة أو توليد صورة جديدة",
        );
      else if (result.state === "completed")
        toast.success("وصلت النتيجة وحُفظت المسودة");
      else toast.info(result.error || "المهمة ما زالت قيد التنفيذ في Manus");
    },
    onError: (error) => toast.error(error.message),
  });
  return (
    <div className="flex flex-wrap gap-2 pt-1">
      {hasTask && (
        <Button
          variant="outline"
          className="min-h-11 h-auto whitespace-normal"
          disabled={resolve.isPending}
          onClick={() => resolve.mutate({ jobId, action: "recheck" })}
        >
          إعادة فحص المهمة الآن
        </Button>
      )}
      <Button
        variant="outline"
        className="min-h-11 h-auto whitespace-normal"
        disabled={resolve.isPending}
        onClick={() => setConfirm(true)}
      >
        إيقاف المهمة
      </Button>
      <Dialog open={confirm} onOpenChange={setConfirm}>
        <DialogContent dir="rtl">
          <DialogHeader>
            <DialogTitle>إيقاف مهمة التوليد</DialogTitle>
            <DialogDescription>
              ستُسجَّل المهمة كفاشلة وتُفك المسودة المرتبطة بها. إن وصلت نتيجة
              من Manus بعد ذلك فلن تُحفظ. راجع المهمة في Manus أولًا إن أمكن.
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
              variant="destructive"
              disabled={resolve.isPending}
              onClick={() => {
                setConfirm(false);
                resolve.mutate({ jobId, action: "abandon" });
              }}
            >
              تأكيد الإيقاف
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
