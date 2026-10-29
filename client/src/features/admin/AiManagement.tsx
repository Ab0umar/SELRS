import { useEffect, useRef, useState } from "react";
import type { inferRouterOutputs } from "@trpc/server";
import type { AppRouter } from "../../../../server/routers";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import "./AiManagement.css";

type Output = inferRouterOutputs<AppRouter>["aiManagement"];
type Profile = Output["profiles"][number];
type Workload = Profile["workload"];
const labels: Record<Workload, string> = {
  "reply.preview": "معاينة الرد الآلي",
  "reply.live": "الرد الآلي المركزي",
  "marketing.text": "نصوص التسويق",
  "marketing.image": "صور التسويق",
  "medical.synthetic": "اختبار طبي اصطناعي فقط",
  "whatsapp.marketing": "صياغة رسائل واتساب",
  "medical.documentation": "توثيق المساعد الطبي",
};
const states = {
  reserved: "محجوز",
  running: "قيد التنفيذ",
  completed: "مكتمل",
  failed: "فشل",
  uncertain: "النتيجة غير محسومة",
  rejected: "رُفض الطلب قبل بدء التوليد",
};
const storageKey = "selrs.ai.pending-probe.v1";
function restoredRequest(): string | undefined {
  try {
    const requestId = sessionStorage.getItem(storageKey);
    return requestId && /^[a-f0-9-]{36}$/i.test(requestId)
      ? requestId
      : undefined;
  } catch {
    return undefined;
  }
}
function errorText(message: string) {
  if (message.includes("budget"))
    return "تم بلوغ الحد اليومي. راجع سجل الطلبات وحدود المهمة.";
  if (message.includes("capacity"))
    return "السعة مشغولة. تابع الطلبات الجارية أو غير المحسومة أولًا.";
  if (message.includes("duplicate"))
    return "الطلب مسجل بالفعل. تابع حالته بدل إعادة تشغيله.";
  return "تعذرت العملية. راجع حالة الخادم وسجل الطلبات قبل إعادة المحاولة.";
}

function ProfileEditor({ profile }: { profile: Profile }) {
  const [draft, setDraft] = useState(profile);
  useEffect(() => {
    setDraft(profile);
  }, [profile]);
  const [message, setMessage] = useState("");
  const utils = trpc.useUtils();
  const save = trpc.aiManagement.updateProfile.useMutation({ retry: false });
  const dirty = JSON.stringify(draft) !== JSON.stringify(profile);
  return (
    <form
      className="ai-panel ai-profile"
      aria-label="إعدادات المهمة"
      onSubmit={async (event) => {
        event.preventDefault();
        if (save.isPending) return;
        setMessage("");
        try {
          await save.mutateAsync(draft);
          await utils.aiManagement.profiles.invalidate();
          setMessage(
            "تم حفظ إعدادات المهمة. الحدود الجديدة تسري على الطلبات التالية، ولا تلغي حجوزات أو طلبات سابقة.",
          );
        } catch (error) {
          setMessage(errorText(error instanceof Error ? error.message : ""));
        }
      }}
    >
      <h2>{labels[profile.workload]}</h2>
      <div className="ai-fields">
        <label>
          المزوّد
          <select
            aria-label="المزوّد"
            value={draft.provider}
            disabled={save.isPending}
            onChange={(event) => {
              const provider = event.target.value as Profile["provider"];
              setDraft((current) => ({
                ...current,
                provider,
                model:
                  provider === "manus"
                    ? "lite"
                    : profile.workload === "marketing.image"
                      ? "gemini-nano-banana-2.1"
                      : "gemini-3.8-flash",
              }));
            }}
          >
            <option value="gemini">Gemini</option>
            <option value="manus">Manus</option>
          </select>
        </label>
        <label>
          الموديل
          <Input
            dir="ltr"
            value={draft.model}
            required
            maxLength={100}
            disabled={save.isPending}
            onChange={(event) =>
              setDraft((current) => ({ ...current, model: event.target.value }))
            }
          />
        </label>
        <label>
          الحد اليومي للطلبات
          <Input
            type="number"
            min={1}
            max={1000}
            required
            value={draft.dailyRequests}
            disabled={save.isPending}
            onChange={(event) =>
              setDraft((current) => ({
                ...current,
                dailyRequests: Number(event.target.value),
              }))
            }
          />
        </label>
        <label>
          الحد اليومي لتوكنات Gemini
          <Input
            type="number"
            min={16384}
            max={10000000}
            required
            value={draft.dailyTokens}
            disabled={save.isPending}
            onChange={(event) =>
              setDraft((current) => ({
                ...current,
                dailyTokens: Number(event.target.value),
              }))
            }
          />
        </label>
        <label>
          الطلبات المتزامنة
          <Input
            type="number"
            min={1}
            max={5}
            required
            value={draft.maxConcurrent}
            disabled={save.isPending}
            onChange={(event) =>
              setDraft((current) => ({
                ...current,
                maxConcurrent: Number(event.target.value),
              }))
            }
          />
        </label>
      </div>
      <label className="ai-check">
        <input
          type="checkbox"
          checked={draft.enabled}
          disabled={save.isPending}
          onChange={(event) =>
            setDraft((current) => ({
              ...current,
              enabled: event.target.checked,
            }))
          }
        />
        تفعيل هذه المهمة
      </label>
      <p className="ai-help">
        الحدود تخص الطلبات التي تمر عبر الموديول المركزي. توكنات Gemini وأرصدة
        Manus وحدتان مختلفتان وليستا ميزانية مالية.
      </p>
      <div className="ai-actions">
        <Button type="submit" disabled={!dirty || save.isPending}>
          {save.isPending ? "جارٍ الحفظ..." : "حفظ إعدادات المهمة"}
        </Button>
      </div>
      {message && (
        <p role="status" aria-live="polite">
          {message}
        </p>
      )}
    </form>
  );
}

export default function AiManagement({
  view = "overview",
}: {
  view?: "overview" | "settings" | "experiments" | "usage";
}) {
  const showProfiles = view === "settings" || view === "experiments";
  const status = trpc.aiManagement.status.useQuery(undefined, {
    retry: false,
    refetchOnWindowFocus: false,
  });
  const enabled = status.data?.enabled === true;
  const profiles = trpc.aiManagement.profiles.useQuery(undefined, {
    enabled: enabled && showProfiles,
    retry: false,
    refetchOnWindowFocus: false,
  });
  const usage = trpc.aiManagement.usage.useQuery(undefined, {
    enabled: enabled && view === "usage",
    retry: false,
    refetchInterval: 10000,
  });
  const [selected, setSelected] = useState<Workload>("reply.preview");
  const [confirm, setConfirm] = useState<Profile>();
  const [requestId, setRequestId] = useState(restoredRequest);
  const [message, setMessage] = useState("");
  const [image, setImage] = useState<string>();
  const sending = useRef(false);
  const utils = trpc.useUtils();
  const probe = trpc.aiManagement.runSyntheticProbe.useMutation({
    retry: false,
  });
  const tracking = trpc.aiManagement.readProbe.useQuery(
    { requestId: requestId ?? "00000000-0000-4000-8000-000000000000" },
    {
      enabled: enabled && Boolean(requestId) && !probe.isPending,
      retry: false,
      refetchInterval: requestId ? 4000 : false,
    },
  );
  const active = profiles.data?.find(
    (profile) => profile.workload === selected,
  );

  function clearPending() {
    setRequestId(undefined);
    try {
      sessionStorage.removeItem(storageKey);
    } catch {
      /* Request state is also recorded on the server. */
    }
  }
  useEffect(() => {
    const state = tracking.data?.state;
    const usageMissing =
      tracking.data &&
      "error_code" in tracking.data &&
      tracking.data.error_code === "usage_metadata_missing";
    if (
      probe.isPending ||
      !requestId ||
      (state !== "completed" &&
        state !== "failed" &&
        state !== "rejected" &&
        !usageMissing)
    )
      return;
    clearPending();
    setMessage(
      usageMissing
        ? "انتهى التوليد، لكن بيانات الاستهلاك غير متاحة. حجز التوكنات محفوظ للمراجعة."
        : state === "completed"
          ? "اكتملت مهمة المزوّد. راجع سجل الاستهلاك؛ اكتمال المهمة لا يثبت جودة ملف التسويق."
          : state === "rejected"
            ? "لم يبدأ التوليد. راجع الإعدادات ثم ابدأ تجربة جديدة."
            : "فشلت التجربة. لم نرسل طلبًا بديلًا تلقائيًا.",
    );
    void utils.aiManagement.usage.invalidate();
  }, [tracking.data?.state, requestId, probe.isPending, utils]);

  async function runProbe() {
    if (!confirm || sending.current || requestId) return;
    const profile = confirm;
    if (profile.workload === "medical.documentation") return;
    setConfirm(undefined);
    sending.current = true;
    const id = crypto.randomUUID();
    setRequestId(id);
    setImage(undefined);
    setMessage("");
    try {
      sessionStorage.setItem(storageKey, id);
    } catch {
      /* The server enforces duplicate request IDs. */
    }
    try {
      const result = await probe.mutateAsync({
        requestId: id,
        workload: profile.workload,
      });
      if (result.state === "completed") {
        clearPending();
        if (
          "imageDataUrl" in result.output &&
          typeof result.output.imageDataUrl === "string"
        )
          setImage(result.output.imageDataUrl);
        setMessage(
          profile.workload === "marketing.image"
            ? "imageDataUrl" in result.output && result.output.imageDataUrl
              ? "تم توليد الصورة واستلامها. هذه تجربة فقط، ولم تُنشر."
              : "اكتمل توليد الصورة، لكن حجمها أكبر من حد المعاينة. لم تُنشر."
            : "نجح اختبار النص ببيانات ثابتة. لم تُرسل رسائل للعملاء.",
        );
      } else setMessage("بدأت مهمة Manus. متابعة الحالة لا تنشئ مهمة جديدة.");
    } catch (error) {
      setMessage(
        `${errorText(error instanceof Error ? error.message : "")} احتفظ بمعرف الطلب الظاهر؛ لن نعيد التوليد تلقائيًا.`,
      );
    } finally {
      sending.current = false;
      void utils.aiManagement.usage.invalidate();
    }
  }

  return (
    <section
      className="ai-management"
      dir="rtl"
      aria-label="إدارة الذكاء الاصطناعي والتواصل"
    >
      <header className="ai-heading">
        <div>
          <h1>
            {
              {
                overview: "نظرة عامة",
                settings: "المزوّدون والحدود",
                experiments: "تجارب الاتصال",
                usage: "سجل الاستخدام",
              }[view]
            }
          </h1>
          <p>
            {
              {
                overview: "أدوات الذكاء الاصطناعي وإعداداتها في مكان واحد.",
                settings: "إعداد المزوّد والموديل وحدود الاستخدام لكل مهمة.",
                experiments:
                  "اختبار اتصال المزوّدين ببيانات اصطناعية قبل الاستخدام.",
                usage: "متابعة حالة الطلبات واستهلاك كل مزوّد.",
              }[view]
            }
          </p>
        </div>
        <Button
          variant="outline"
          onClick={() => {
            void status.refetch();
            if (enabled && showProfiles) {
              void profiles.refetch();
            }
            if (enabled && view === "usage") {
              void usage.refetch();
            }
          }}
          disabled={status.isFetching}
        >
          تحديث الحالة
        </Button>
      </header>
      {status.isLoading && <p role="status">جارٍ قراءة حالة الموديول...</p>}
      {status.isError && (
        <p role="alert">
          تعذر تحميل حالة الموديول أو التحقق من صلاحيتك. أعد المحاولة من «تحديث
          الحالة».
        </p>
      )}
      {status.data && (view === "overview" || !enabled) && (
        <section className="ai-panel" aria-label="حالة التشغيل">
          <h2>
            {enabled
              ? "إدارة التجارب متاحة"
              : "إدارة التجارب غير مفعّلة على الخادم"}
          </h2>
          <p>
            {enabled
              ? "تغيير إعدادات التجارب لا يغيّر النشر أو الرد الآلي أو المساعد الطبي الحالي."
              : "يلزم تطبيق جداول الموديول وتفعيل AI_CORE_MANAGEMENT_ENABLED على الخادم قبل الحفظ أو التوليد."}
          </p>
          <dl className="ai-credentials">
            <div>
              <dt>مفتاح Gemini العام</dt>
              <dd>
                {status.data.credentials.gemini
                  ? "موجود على الخادم"
                  : "غير مضبوط"}
              </dd>
            </div>
            <div>
              <dt>مفتاح Gemini للرد الآلي</dt>
              <dd>
                {status.data.credentials.replyGemini
                  ? "موجود على الخادم"
                  : "غير مضبوط"}
              </dd>
            </div>
            <div>
              <dt>مفتاح Manus</dt>
              <dd>
                {status.data.credentials.manus
                  ? "موجود على الخادم"
                  : "غير مضبوط"}
              </dd>
            </div>
          </dl>
          <p className="ai-help">
            وجود المفتاح ليس اختبار اتصال. المفاتيح نفسها لا تُعرض هنا.
          </p>
        </section>
      )}
      {enabled && (
        <>
          {showProfiles && profiles.isLoading && (
            <p role="status">جارٍ تحميل إعدادات المهام...</p>
          )}
          {showProfiles && profiles.isError && (
            <p role="alert">
              تعذر تحميل الإعدادات. تحقق من جداول الموديول ثم حدّث الحالة.
            </p>
          )}
          {showProfiles && profiles.data?.length === 0 && (
            <p role="status">
              لا توجد إعدادات مهام. يلزم تطبيق بيانات التهيئة على الخادم.
            </p>
          )}
          {showProfiles && profiles.data && profiles.data.length > 0 && (
            <label className="ai-task-label" htmlFor="ai-workload">
              المهمة
              <select
                id="ai-workload"
                aria-label="المهمة"
                value={selected}
                onChange={(event) =>
                  setSelected(event.target.value as Workload)
                }
              >
                {profiles.data.map((profile) => (
                  <option key={profile.workload} value={profile.workload}>
                    {labels[profile.workload]}
                  </option>
                ))}
              </select>
            </label>
          )}
          {showProfiles && active && view === "settings" && (
            <ProfileEditor key={active.workload} profile={active} />
          )}
          {view === "experiments" && active && (
            <section className="ai-panel space-y-3" aria-label="تجربة المهمة">
              <h2>{labels[active.workload]}</h2>
              <p>
                <bdi>
                  {active.provider} / {active.model}
                </bdi>
              </p>
              <p>
                تستخدم التجربة بيانات ثابتة، وقد تستهلك رصيدًا عند تأكيد
                التشغيل.
              </p>
              {active.workload === "medical.documentation" ? (
                <p>راجع الاقتراحات الطبية من قسم المساعد الطبي.</p>
              ) : (
                <Button
                  disabled={!active.enabled || Boolean(requestId)}
                  onClick={() => setConfirm(active)}
                >
                  تشغيل تجربة اتصال
                </Button>
              )}
              {!active.enabled && (
                <p>فعّل المهمة من قسم المزوّدين والحدود لتجربتها.</p>
              )}
            </section>
          )}
          {requestId && (
            <section className="ai-notice" aria-label="الطلب الجاري">
              <p>
                معرف الطلب: <bdi>{requestId}</bdi>
              </p>
              <p>
                {tracking.data
                  ? states[tracking.data.state]
                  : "جارٍ التحقق من الطلب. لا تبدأ تجربة أخرى حتى تتضح النتيجة."}
              </p>
              <Button
                variant="outline"
                onClick={() => void tracking.refetch()}
                disabled={tracking.isFetching}
              >
                متابعة نفس الطلب
              </Button>
              {tracking.isError && (
                <p role="alert">
                  تعذرت المتابعة. معرف الطلب محفوظ؛ لم نعد إرساله.
                </p>
              )}
            </section>
          )}
          {message && (
            <p className="ai-feedback" role="status" aria-live="polite">
              {message}
            </p>
          )}
          {image && (
            <figure className="ai-image">
              <img
                src={image}
                alt="صورة استقبال عيادة خيالية مولدة لاختبار الاتصال، وليست صورة المركز"
              />
              <figcaption>صورة تجربة اصطناعية، غير منشورة.</figcaption>
            </figure>
          )}
          {view === "usage" && (
            <section className="ai-panel" aria-label="سجل الاستهلاك">
              <h2>آخر الطلبات</h2>
              <p className="ai-help">
                حتى 100 طلب. لا تُعرض نصوص المرضى أو مفاتيح الاتصال.
              </p>
              {usage.isLoading ? (
                <p role="status">جارٍ تحميل سجل الاستهلاك...</p>
              ) : usage.isError ? (
                <p role="alert">
                  تعذر تحميل السجل. حدّث الحالة قبل إعادة تجربة غير محسومة.
                </p>
              ) : !usage.data?.length ? (
                <p>لا توجد طلبات مسجلة. تظهر التجارب هنا بعد تشغيلها.</p>
              ) : (
                <ul className="ai-usage-list">
                  {usage.data.map((row) => (
                    <li key={row.request_id}>
                      <div className="ai-record-heading">
                        <strong>{labels[row.workload]}</strong>
                        <span>{states[row.state]}</span>
                      </div>
                      <p>
                        <bdi>
                          {row.provider} / {row.model}
                        </bdi>
                      </p>
                      <dl className="ai-usage-details">
                        <div>
                          <dt>توكنات الإدخال</dt>
                          <dd>
                            {row.error_code === "usage_metadata_missing"
                              ? "غير متاح"
                              : row.input_tokens}
                          </dd>
                        </div>
                        <div>
                          <dt>توكنات الإخراج</dt>
                          <dd>
                            {row.error_code === "usage_metadata_missing"
                              ? "غير متاح"
                              : row.output_tokens}
                          </dd>
                        </div>
                        <div>
                          <dt>رصيد Manus المستهلك</dt>
                          <dd>{row.credits ?? "غير متاح"}</dd>
                        </div>
                      </dl>
                      <p className="ai-help">
                        معرف الطلب: <bdi>{row.request_id}</bdi>
                      </p>
                      <p className="ai-help">
                        {new Date(row.created_ms).toLocaleString("ar-EG", {
                          timeZone: "Africa/Cairo",
                        })}{" "}
                        بتوقيت القاهرة
                      </p>
                      {row.error_code && (
                        <p>تحتاج النتيجة مراجعة قبل إعادة الإرسال.</p>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </section>
          )}
        </>
      )}
      <Dialog
        open={Boolean(confirm)}
        onOpenChange={(open) => {
          if (!open) setConfirm(undefined);
        }}
      >
        <DialogContent dir="rtl" className="ai-management-dialog">
          <DialogHeader>
            <DialogTitle>
              تأكيد تشغيل تجربة{" "}
              {confirm?.workload === "marketing.image" ? "صورة" : "نص"}
            </DialogTitle>
            <DialogDescription>
              سيُرسل طلب واحد إلى{" "}
              {confirm?.provider === "manus" ? "Manus" : "Gemini"}، وقد يستهلك
              رصيدًا مدفوعًا. سنستخدم بيانات ثابتة فقط، بدون نشر أو إرسال رسائل
              أو بيانات مرضى.
            </DialogDescription>
          </DialogHeader>
          <div className="ai-actions">
            <Button variant="outline" onClick={() => setConfirm(undefined)}>
              إلغاء
            </Button>
            <Button
              onClick={() => void runProbe()}
              disabled={probe.isPending || Boolean(requestId)}
            >
              تشغيل التجربة مرة واحدة
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </section>
  );
}
