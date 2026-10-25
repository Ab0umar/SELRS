import { useRef, useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";

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
  const status = trpc.aiManagement.status.useQuery(undefined, { retry: false });
  const profiles = trpc.aiManagement.profiles.useQuery(undefined, {
    enabled: status.data?.enabled,
    retry: false,
  });
  const enabled = profiles.data?.some(
    (profile) =>
      profile.workload === "whatsapp.marketing" &&
      profile.enabled &&
      profile.provider === "gemini",
  );
  const [kind, setKind] = useState<Kind>("reminder");
  const [days, setDays] = useState<Day[]>(["الأحد", "الثلاثاء", "الخميس"]);
  const [requestId, setRequestId] = useState(pendingId);
  const [message, setMessage] = useState("");
  const guard = useRef(false);
  const result = trpc.marketing.readWhatsAppCopy.useQuery(
    { requestId: requestId! },
    {
      enabled: Boolean(requestId),
      retry: false,
      refetchInterval: (query) => (query.state.data?.variants ? false : 4000),
    },
  );
  const generate = trpc.marketing.generateWhatsAppCopy.useMutation({
    retry: false,
  });
  if (!status.data?.enabled || !status.data.whatsappCopyAvailable) return null;
  return (
    <section
      className="rounded-xl border bg-card p-5 space-y-4"
      aria-label="صياغة رسائل واتساب"
    >
      <h3 className="font-bold">صياغة رسائل واتساب</h3>
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
          <a className="underline" href="/admin-hub/ai">
            إدارة الذكاء الاصطناعي
          </a>{" "}
          لتجربتها.
        </p>
      )}
      {!requestId && (
        <Button
          type="button"
          disabled={
            !enabled || generate.isPending || (kind === "exam" && !days.length)
          }
          onClick={async () => {
            if (guard.current) return;
            guard.current = true;
            setMessage("");
            const id = crypto.randomUUID();
            sessionStorage.setItem(storageKey, id);
            setRequestId(id);
            try {
              await generate.mutateAsync({
                requestId: id,
                kind,
                ...(kind === "exam" ? { days } : {}),
              });
              await result.refetch();
            } catch {
              setMessage(
                "تعذر إكمال الصياغة. تابع حالة الطلب قبل تشغيل طلب جديد؛ قد يكون الاستهلاك غير محسوم.",
              );
            } finally {
              guard.current = false;
            }
          }}
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
            onClick={() => void result.refetch()}
          >
            تحديث النتيجة
          </Button>
        </div>
      )}
      {message && <p role="alert">{message}</p>}
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
        (result.data.variants ||
          result.data.state === null ||
          result.data.state === "failed") && (
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              sessionStorage.removeItem(storageKey);
              setRequestId(undefined);
              setMessage("");
            }}
          >
            صياغة رسالة أخرى
          </Button>
        )}
    </section>
  );
}
