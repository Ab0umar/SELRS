import { useRef, useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import WorkloadModelSelect from "@/features/ai/WorkloadModelSelect";
import { whatsappRequestContext } from "@shared/ai-request-context";
import {
  readPending,
  savePending,
  removePending,
} from "@/features/ai/pending-request";

const storageKey = "selrs.whatsapp.copy.request";
// "reminder", or "offer:<id>" for a saved offer. Older kinds only appear
// while a request started before offers became editable is still tracked.
type Choice = string;
const LEGACY_KIND: Record<string, string> = {
  lasik: "تصحيح الإبصار",
  cataract: "المياه البيضاء للتأمين الصحي",
  exam: "كشف الأخصائي",
};
const cairoToday = () =>
  new Intl.DateTimeFormat("en-CA", { timeZone: "Africa/Cairo" }).format(
    new Date(),
  );
function pendingId() {
  try {
    const id = sessionStorage.getItem(storageKey);
    return id && /^[a-f0-9-]{36}$/i.test(id) ? id : undefined;
  } catch {
    return undefined;
  }
}
export default function WhatsAppCopy() {
  const [restored] = useState(() =>
    readPending(`${storageKey}.context`, whatsappRequestContext),
  );
  const [modelReady, setModelReady] = useState(false);
  const status = trpc.aiManagement.status.useQuery(undefined, { retry: false });
  const profiles = trpc.aiManagement.profiles.useQuery(undefined, {
    enabled: status.data?.enabled,
    retry: false,
  });
  const enabled = profiles.data?.some(
    (profile) => profile.workload === "whatsapp.marketing" && profile.enabled,
  );
  const [choice, setChoice] = useState<Choice>(
    restored?.kind === "offer"
      ? `offer:${restored.offerId}`
      : (restored?.kind ?? "reminder"),
  );
  const offers = trpc.marketing.whatsappOffers.useQuery(undefined, {
    retry: false,
  });
  const today = cairoToday();
  const activeOffers = (offers.data ?? []).filter(
    (offer) => offer.enabled && (!offer.endsOn || offer.endsOn >= today),
  );
  const [requestId, setRequestId] = useState(
    () => restored?.requestId ?? pendingId(),
  );
  const [requestContext, setRequestContext] = useState(restored);
  const [message, setMessage] = useState("");
  const guard = useRef(false);
  const result = trpc.marketing.readWhatsAppCopy.useQuery(
    { requestId: requestId! },
    {
      enabled: Boolean(requestId),
      retry: false,
      refetchInterval: (query) =>
        query.state.error || query.state.data?.variants ? false : 4000,
    },
  );
  const generate = trpc.marketing.generateWhatsAppCopy.useMutation({
    retry: false,
  });
  async function submitCopy(
    input: ReturnType<typeof whatsappRequestContext.parse>,
  ) {
    if (guard.current) return;
    guard.current = true;
    setMessage("");
    setRequestContext(input);
    try {
      sessionStorage.setItem(storageKey, input.requestId);
    } catch {}
    savePending(`${storageKey}.context`, input);
    setRequestId(input.requestId);
    try {
      await generate.mutateAsync(input);
      await result.refetch();
    } catch {
      setMessage(
        "تعذر إكمال الصياغة. تابع حالة الطلب قبل تشغيل طلب جديد؛ قد يكون الاستهلاك غير محسوم.",
      );
    } finally {
      guard.current = false;
    }
  }
  if (status.isLoading) return <p role="status">جارٍ تحميل صياغة واتساب...</p>;
  if (status.isError)
    return (
      <div role="alert">
        <p>تعذر تحميل حالة صياغة واتساب.</p>
        <Button variant="outline" onClick={() => void status.refetch()}>
          إعادة المحاولة
        </Button>
      </div>
    );
  if (!status.data?.enabled || !status.data.whatsappCopyAvailable)
    return <p role="status">صياغة واتساب غير مفعّلة على الخادم حاليًا.</p>;
  return (
    <section className="space-y-4" aria-label="صياغة رسائل واتساب">
      <WorkloadModelSelect
        workload="whatsapp.marketing"
        disabled={Boolean(requestId) || generate.isPending}
        onReadyChange={setModelReady}
      />
      <label className="block space-y-2">
        نوع الرسالة
        <select
          className="block min-h-11 w-full rounded-md border bg-background px-3"
          value={choice}
          disabled={Boolean(requestId) || generate.isPending}
          onChange={(e) => setChoice(e.target.value)}
        >
          <option value="reminder">تذكير بالمركز والليزك</option>
          {activeOffers.map((offer) => (
            <option key={offer.id} value={`offer:${offer.id}`}>
              {offer.name}
            </option>
          ))}
          {LEGACY_KIND[choice] && (
            <option value={choice}>{LEGACY_KIND[choice]}</option>
          )}
        </select>
      </label>
      {offers.isError && (
        <p role="alert" className="text-sm text-destructive">
          تعذّر تحميل العروض، فالتذكير بس متاح دلوقتي.
        </p>
      )}
      {!enabled && (
        <p className="text-sm">
          فعّل مهمة «صياغة رسائل واتساب» من{" "}
          <a className="underline" href="/ai/settings">
            إدارة الذكاء الاصطناعي
          </a>{" "}
          لتجربتها.
        </p>
      )}
      {!requestId && (
        <Button
          type="button"
          disabled={
            !enabled ||
            !modelReady ||
            generate.isPending ||
            Boolean(LEGACY_KIND[choice])
          }
          onClick={() =>
            void submitCopy(
              whatsappRequestContext.parse({
                requestId: createRequestId(),
                ...(choice.startsWith("offer:")
                  ? { kind: "offer", offerId: choice.slice("offer:".length) }
                  : { kind: "reminder" }),
              }),
            )
          }
        >
          توليد ثلاث صيغ للمراجعة
        </Button>
      )}
      {requestId && !result.data?.variants && (
        <div role="status" className="space-y-2">
          <p>جارٍ تجهيز الصيغ…</p>
          <details className="text-xs text-muted-foreground">
            <summary className="inline-flex min-h-11 cursor-pointer items-center">
              تفاصيل للدعم الفني
            </summary>
            <p className="break-all">
              رقم الطلب: <bdi>{requestId}</bdi>
            </p>
          </details>
          <Button
            type="button"
            variant="outline"
            disabled={generate.isPending}
            onClick={() => void result.refetch()}
          >
            تحديث النتيجة
          </Button>
          {result.isSuccess &&
            (result.data === null || result.data.state === null) &&
            requestContext?.requestId === requestId && (
              <Button
                type="button"
                variant="outline"
                disabled={generate.isPending}
                onClick={() => void submitCopy(requestContext)}
              >
                إعادة إرسال نفس الطلب
              </Button>
            )}
        </div>
      )}
      {message && <p role="alert">{message}</p>}
      {result.isError && (
        <p role="alert">
          تعذرت متابعة نفس الطلب. رقمه محفوظ؛ حدّث النتيجة دون بدء طلب بديل.
        </p>
      )}
      {result.data?.variants?.map((text, index) => (
        <article key={index} className="space-y-2 rounded-md border p-3">
          <p className="whitespace-pre-wrap break-words">{text}</p>
          <Button
            type="button"
            variant="outline"
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(text);
                setMessage(`تم نسخ الصيغة ${index + 1}`);
              } catch {
                setMessage("تعذر النسخ؛ يمكنك تحديد النص ونسخه.");
              }
            }}
          >
            نسخ الصيغة {index + 1}
          </Button>
        </article>
      ))}
      {result.data &&
        (result.data.variants || result.data.state === "failed") && (
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              removePending(storageKey);
              removePending(`${storageKey}.context`);
              setRequestId(undefined);
              setRequestContext(undefined);
              setMessage("");
              if (LEGACY_KIND[choice]) setChoice("reminder");
            }}
          >
            صياغة رسالة أخرى
          </Button>
        )}
    </section>
  );
}
import { createRequestId } from "@/lib/request-id";
