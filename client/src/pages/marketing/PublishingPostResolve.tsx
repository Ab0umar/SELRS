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

export default function PublishingPostResolve({ postId }: { postId: number }) {
  const utils = trpc.useUtils();
  const [unmatched, setUnmatched] = useState<string | null>(null);
  const refresh = () => {
    void utils.marketing.listPosts.invalidate();
    void utils.marketing.dashboardSummary.invalidate();
  };
  const reconcile = trpc.marketing.reconcilePublishingPost.useMutation({
    onSuccess: (result) => {
      if (result.state === "published") {
        toast.success("وجدنا المنشور على Facebook وسجلناه كمنشور");
        refresh();
      } else setUnmatched(result.reason);
    },
    onError: (error) => toast.error(error.message),
  });
  const resolve = trpc.marketing.resolvePublishingPost.useMutation({
    onSuccess: (_, input) => {
      setUnmatched(null);
      toast.success(
        input.outcome === "published"
          ? "سُجل المنشور كمنشور"
          : "أُعيد المنشور إلى المسودات وحُرر موضوعه",
      );
      refresh();
    },
    onError: (error) => toast.error(error.message),
  });
  const busy = reconcile.isPending || resolve.isPending;
  return (
    <>
      <Button
        size="sm"
        variant="outline"
        disabled={busy}
        onClick={() => reconcile.mutate({ id: postId })}
      >
        {reconcile.isPending ? "جارٍ البحث…" : "تحقق من Facebook"}
      </Button>
      <Dialog
        open={unmatched !== null}
        onOpenChange={(open) => !open && !busy && setUnmatched(null)}
      >
        <DialogContent dir="rtl">
          <DialogHeader>
            <DialogTitle>حدد نتيجة النشر</DialogTitle>
            <DialogDescription>
              {unmatched} افتح الصفحة على Facebook وتأكد بنفسك قبل الاختيار.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-wrap gap-3">
            <Button
              className="min-h-11 h-auto whitespace-normal"
              disabled={busy}
              onClick={() =>
                resolve.mutate({ id: postId, outcome: "published" })
              }
            >
              نُشر على الصفحة
            </Button>
            <Button
              className="min-h-11 h-auto whitespace-normal"
              variant="outline"
              disabled={busy}
              onClick={() =>
                resolve.mutate({ id: postId, outcome: "not_published" })
              }
            >
              لم يُنشر، أعده إلى المسودات
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
