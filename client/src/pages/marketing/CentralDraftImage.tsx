import { useEffect, useRef, useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import MarketingJobRecovery from "./MarketingJobRecovery";

const storageKey = "selrs.central-marketing.image";
function pendingImage(postId: number) {
  try {
    const saved = JSON.parse(sessionStorage.getItem(storageKey) || "null");
    return saved?.postId === postId && /^[a-f0-9-]{36}$/i.test(saved.requestId)
      ? (saved.requestId as string)
      : "";
  } catch {
    return "";
  }
}
export default function CentralDraftImage({ postId }: { postId: number }) {
  const [requestId, setRequestId] = useState(() => pendingImage(postId));
  const busy = useRef(false);
  const utils = trpc.useUtils();
  const capability = trpc.aiManagement.status.useQuery(undefined, {
    retry: false,
  });
  const enabled =
    capability.data?.enabled && capability.data.marketingWorkflowAvailable;
  const tracking = trpc.marketing.centralGenerationJob.useQuery(
    { requestId: requestId || "00000000-0000-4000-8000-000000000000" },
    {
      enabled: Boolean(enabled && requestId),
      retry: false,
      refetchInterval: requestId ? 4000 : false,
    },
  );
  const generate = trpc.marketing.regenerateCentralImage.useMutation({
    retry: false,
    onSettled: () => {
      busy.current = false;
      void tracking.refetch();
      void utils.marketing.listPosts.invalidate();
    },
  });
  useEffect(() => {
    if (tracking.data?.state === "completed")
      void utils.marketing.listPosts.invalidate();
  }, [tracking.data?.state, utils]);
  const pending =
    generate.isPending ||
    Boolean(requestId && tracking.data?.state !== "completed");
  return (
    <div className="inline-flex flex-wrap items-center gap-2 max-w-full">
      <Button
        type="button"
        variant="outline"
        className="min-h-11 h-auto whitespace-normal text-xs"
        aria-label={`صورة Gemini للمسودة ${postId}`}
        disabled={!enabled || pending}
        onClick={() => {
          if (busy.current || pending) return;
          const id = crypto.randomUUID();
          sessionStorage.setItem(
            storageKey,
            JSON.stringify({ postId, requestId: id }),
          );
          busy.current = true;
          setRequestId(id);
          generate.mutate({ postId, requestId: id });
        }}
      >
        {pending ? "جارٍ متابعة الصورة..." : "صورة Gemini"}
      </Button>
      {requestId && (
        <span className="text-xs break-all" role="status">
          {tracking.data?.state === "completed"
            ? "تم تحديث الصورة فقط"
            : tracking.data?.state === "uncertain"
              ? "لم يُؤكد التحديث؛ راجع سجل AI"
              : "متابعة الطلب"}{" "}
          · <bdi>{requestId}</bdi>
        </span>
      )}
      {generate.error && (
        <span role="alert" className="text-xs">
          تعذرت العملية؛ لم نعد التوليد تلقائيًا.
        </span>
      )}
      {requestId && tracking.data?.state === "uncertain" && (
        <MarketingJobRecovery jobId={requestId} />
      )}
    </div>
  );
}
