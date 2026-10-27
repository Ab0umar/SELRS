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
type Kind = "reminder" | "lasik" | "cataract" | "exam";
type Day = "الأحد" | "الثلاثاء" | "الخميس";
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
  const [kind, setKind] = useState<Kind>(restored?.kind ?? "reminder");
  const [days, setDays] = useState<Day[]>(
    restored?.days ?? ["الأحد", "الثلاثاء", "الخميس"],
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
    <section
      className="rounded-xl border bg-card p-5 space-y-4"
      aria-label="صياغة رسائل واتساب"
    >
      <h3 className="font-bold">صياغة رسائل واتساب</h3>
      <WorkloadModelSelect
        workload="whatsapp.marketing"
        disabled={Boolean(requestId) || generate.isPending}
        onReadyChange={setModelReady}
      />
      <p className="text-sm text-muted-foreground">
        ثلاث صيغ للمراجعة والنسخ. لإرسال صيغة جديدة في حملة، سجّلها أولًا كقالب
        لدى Meta وانتظر اعتمادها.
      </p>
      <label className="block space-y-2">
        نوع الرسالة
        <select
          className="block min-h-11 w-full rounded-md border bg-background px-3"
          value={kind}
          disabled={Boolean(requestId) || generate.isPending}
          onChange={(e) => setKind(e.target.value as Kind)}
        >
          <option value="reminder">تذكير بالمركز والليزك</option>
          <option value="lasik">تصحيح الإبصار: خصم يصل إلى 15%</option>
          <option value="cataract">مياه بيضاء: خصم 1000ج للتأمين الصحي</option>
          <option value="exam">كشف الأخصائي: 200ج بدلًا من 260ج</option>
        </select>
      </label>
      {kind === "exam" && (
        <fieldset
          disabled={Boolean(requestId)}
          className="flex flex-wrap gap-3"
        >
          <legend>أيام العرض في المركز</legend>
          {(["الأحد", "الثلاثاء", "الخميس"] as const).map((day) => (
            <label key={day} className="flex min-h-11 items-center gap-2">
              <input
                type="checkbox"
                checked={days.includes(day)}
                onChange={(e) =>
                  setDays((current) =>
                    e.target.checked
                      ? [...current, day]
                      : current.filter((d) => d !== day),
                  )
                }
              />
              {day}
            </label>
          ))}
        </fieldset>
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
            (kind === "exam" && !days.length)
          }
          onClick={() =>
            void submitCopy(
              whatsappRequestContext.parse({
                requestId: crypto.randomUUID(),
                kind,
                ...(kind === "exam" ? { days } : {}),
              }),
            )
          }
        >
          توليد ثلاث صيغ للمراجعة
        </Button>
      )}
      {requestId && !result.data?.variants && (
        <div role="status" className="space-y-2">
          <p>
            متابعة طلب الصياغة: <bdi className="break-all">{requestId}</bdi>
          </p>
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
          تعذرت متابعة نفس الطلب. معرّفه محفوظ؛ حدّث النتيجة دون بدء طلب بديل.
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
            }}
          >
            صياغة رسالة أخرى
          </Button>
        )}
    </section>
  );
}
