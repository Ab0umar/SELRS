import { useEffect, useRef, useState } from "react";
import type { inferRouterOutputs } from "@trpc/server";
import type { AppRouter } from "../../../../server/routers";
import { Link } from "wouter";
import { ROUTES } from "@shared/routes";
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
import {
  isMarketingWorkload,
  GROK_TEXT_MODEL,
  GROK_IMAGE_MODEL,
} from "@shared/marketing-providers";
import { createRequestId } from "@/lib/request-id";

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

function ProfileEditor({
  profile,
  title,
}: {
  profile: Profile;
  title: string;
}) {
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
      className="ai-profile"
      aria-label={`إعدادات ${title}`}
      onSubmit={async (event) => {
        event.preventDefault();
        if (save.isPending) return;
        setMessage("");
        try {
          await save.mutateAsync(draft);
          await utils.aiManagement.profiles.invalidate();
          await utils.aiManagement.todayUsage.invalidate();
          setMessage(
            "تم الحفظ. الحدود الجديدة تسري على الطلبات التالية، ولا تلغي حجوزات أو طلبات سابقة.",
          );
        } catch (error) {
          setMessage(errorText(error instanceof Error ? error.message : ""));
        }
      }}
    >
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
                    : provider === "grok"
                      ? profile.workload === "marketing.image"
                        ? GROK_IMAGE_MODEL
                        : GROK_TEXT_MODEL
                      : profile.workload === "marketing.image"
                        ? "gemini-nano-banana-2.1"
                        : "gemini-3.8-flash",
              }));
            }}
          >
            <option value="gemini">Gemini</option>
            <option value="manus">Manus</option>
            {isMarketingWorkload(profile.workload) && (
              <option value="grok">Grok</option>
            )}
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
          أقصى طلبات في اليوم
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
          الحد اليومي لتوكنات النص والصور
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
        تشغيل الخدمة
      </label>
      <p className="ai-help">
        الحدود تخص الطلبات التي تمر عبر الموديول المركزي. التوكنات وأرصدة Manus
        وحدات مختلفة وليست ميزانية مالية. Grok متاح لنصوص وصور التسويق فقط.
      </p>
      <div className="ai-actions">
        <Button type="submit" disabled={!dirty || save.isPending}>
          {save.isPending ? "جارٍ الحفظ..." : "حفظ"}
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

// Services in the owner's words, built from the workload profiles.
const SERVICES: ReadonlyArray<{ label: string; workload: Workload }> = [
  { label: "الرد الآلي", workload: "reply.live" },
  { label: "المساعد الطبي", workload: "medical.documentation" },
  { label: "نصوص التسويق", workload: "marketing.text" },
  { label: "صور التسويق", workload: "marketing.image" },
  { label: "صياغة رسائل واتساب", workload: "whatsapp.marketing" },
];
const TEST_ONLY: readonly Workload[] = ["reply.preview", "medical.synthetic"];
const providerName = (provider: Profile["provider"]) =>
  provider === "manus" ? "Manus" : provider === "grok" ? "Grok" : "Gemini";
type Status = Output["status"];
type Today = Output["todayUsage"];

function serviceState(
  workload: Workload,
  profile: Profile | undefined,
  status: Status,
): { tone: "on" | "off" | "down"; text: string } {
  if (!status.enabled)
    return {
      tone: "down",
      text: "واقفة: إدارة الذكاء الاصطناعي مش مفعّلة على السيرفر",
    };
  if (!profile)
    return { tone: "down", text: "واقفة: مفيش إعداد محفوظ للخدمة دي" };
  if (!profile.enabled) return { tone: "off", text: "متوقفة باختيارك" };
  const keys = status.credentials;
  const hasKey =
    profile.provider === "manus"
      ? keys.manus
      : profile.provider === "grok"
        ? keys.grok
        : workload.startsWith("reply.")
          ? keys.replyGemini || keys.gemini
          : keys.gemini;
  if (!hasKey)
    return {
      tone: "down",
      text: `واقفة: مفتاح ${providerName(profile.provider)} مش موجود على السيرفر`,
    };
  return { tone: "on", text: "شغّالة" };
}

function todayLine(profile: Profile | undefined, today: Today | undefined) {
  if (!profile) return "مفيش حد يومي";
  if (!today) return "استهلاك النهارده مش متاح";
  const row = today.find((entry) => entry.workload === profile.workload);
  return `النهارده ${row?.requests ?? 0} من ${profile.dailyRequests} طلب`;
}

const TONE_CLASS = {
  on: "text-success",
  off: "text-muted-foreground",
  down: "text-destructive",
} as const;

export default function AiManagement({
  view = "overview",
}: {
  view?: "overview" | "usage";
}) {
  const status = trpc.aiManagement.status.useQuery(undefined, {
    retry: false,
    refetchOnWindowFocus: false,
  });
  const enabled = status.data?.enabled === true;
  const profiles = trpc.aiManagement.profiles.useQuery(undefined, {
    enabled: enabled && view === "overview",
    retry: false,
    refetchOnWindowFocus: false,
  });
  const today = trpc.aiManagement.todayUsage.useQuery(undefined, {
    enabled: enabled && view === "overview",
    retry: false,
    refetchInterval: 30000,
  });
  const usage = trpc.aiManagement.usage.useQuery(undefined, {
    enabled: enabled && view === "usage",
    retry: false,
    refetchInterval: 10000,
  });
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
        ? "انتهى التوليد، لكن بيانات الاستهلاك غير متاحة. الحجز محفوظ للمراجعة."
        : state === "completed"
          ? "اكتملت مهمة المزوّد. راجع سجل الطلبات؛ اكتمال المهمة لا يثبت جودة الناتج."
          : state === "rejected"
            ? "لم يبدأ التوليد. راجع الإعدادات ثم ابدأ تجربة جديدة."
            : "فشلت التجربة. لم نرسل طلبًا بديلًا تلقائيًا.",
    );
    void utils.aiManagement.usage.invalidate();
    void utils.aiManagement.todayUsage.invalidate();
  }, [tracking.data?.state, requestId, probe.isPending, utils]);

  async function runProbe() {
    if (!confirm || sending.current || requestId) return;
    const profile = confirm;
    if (profile.workload === "medical.documentation") return;
    setConfirm(undefined);
    sending.current = true;
    const id = createRequestId();
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
        `${errorText(error instanceof Error ? error.message : "")} رقم الطلب محفوظ؛ لن نعيد التوليد تلقائيًا.`,
      );
    } finally {
      sending.current = false;
      void utils.aiManagement.usage.invalidate();
      void utils.aiManagement.todayUsage.invalidate();
    }
  }

  const profileFor = (workload: Workload) =>
    profiles.data?.find((profile) => profile.workload === workload);
  const states_ = status.data
    ? SERVICES.map(({ workload }) =>
        serviceState(workload, profileFor(workload), status.data),
      )
    : [];
  const downCount = states_.filter((state) => state.tone === "down").length;

  const row = (label: string, workload: Workload) => {
    const profile = profileFor(workload);
    const state = serviceState(workload, profile, status.data!);
    return (
      <li key={workload}>
        <details className="ai-panel ai-service">
          <summary className="ai-service-summary">
            <span className="ai-service-name">{label}</span>
            <span className={`ai-service-state ${TONE_CLASS[state.tone]}`}>
              {state.text}
            </span>
            <span className="ai-help">
              {profile ? (
                <bdi>
                  {providerName(profile.provider)} · {profile.model}
                </bdi>
              ) : (
                "مفيش مزوّد"
              )}
              {" · "}
              {todayLine(profile, today.data)}
            </span>
          </summary>
          {profile ? (
            <div className="ai-service-body">
              <ProfileEditor profile={profile} title={label} />
              {workload === "medical.documentation" ? (
                <p className="ai-help">
                  تجربة الاتصال للمساعد الطبي بتتم من صفحة المساعد الطبي نفسها.
                </p>
              ) : (
                <div className="ai-actions">
                  <Button
                    type="button"
                    variant="outline"
                    disabled={!profile.enabled || Boolean(requestId)}
                    onClick={() => setConfirm(profile)}
                  >
                    جرّب الاتصال
                  </Button>
                  {!profile.enabled && (
                    <span className="ai-help">فعّل الخدمة الأول لتجربتها.</span>
                  )}
                </div>
              )}
              <p className="ai-help">
                المزوّد والموديل بيتختاروا من هنا. الشاشات التانية بتعرضهم
                للقراءة.
              </p>
            </div>
          ) : (
            <p className="ai-help">
              مفيش إعداد محفوظ للخدمة دي على السيرفر.
            </p>
          )}
        </details>
      </li>
    );
  };

  return (
    <section
      className="ai-management"
      dir="rtl"
      aria-label="إدارة الذكاء الاصطناعي"
    >
      <header className="ai-heading">
        <div>
          <h1>{view === "usage" ? "سجل الطلبات" : "الذكاء الاصطناعي"}</h1>
          <p>
            {view === "usage"
              ? "حالة كل طلب واستهلاكه، من الأحدث."
              : !status.data || (enabled && profiles.isLoading)
                ? "جارٍ قراءة حالة الخدمات…"
                : downCount
                  ? `${downCount} خدمة واقفة من ${SERVICES.length}.`
                  : "مفيش خدمة واقفة."}
          </p>
        </div>
        <Button
          variant="outline"
          onClick={() => {
            void status.refetch();
            if (enabled && view === "overview") {
              void profiles.refetch();
              void today.refetch();
            }
            if (enabled && view === "usage") void usage.refetch();
          }}
          disabled={status.isFetching}
        >
          تحديث الحالة
        </Button>
      </header>
      {status.isLoading && <p role="status">جارٍ قراءة حالة الخدمات...</p>}
      {status.isError && (
        <p role="alert">
          تعذر تحميل الحالة أو التحقق من صلاحيتك. أعد المحاولة من «تحديث
          الحالة».
        </p>
      )}
      {status.data && !enabled && (
        <section className="ai-panel" aria-label="حالة التشغيل">
          <h2>إدارة الذكاء الاصطناعي مش مفعّلة على السيرفر</h2>
          <p>
            لازم تجهيز جداول الإدارة وتفعيلها على السيرفر قبل الحفظ أو التجربة.
            الخدمات الحالية شغّالة بإعداداتها القديمة ومش بتتأثر.
          </p>
        </section>
      )}
      {view === "overview" && status.data && (
        <>
          {enabled && profiles.isError && (
            <p role="alert">
              تعذر تحميل إعدادات الخدمات. حدّث الحالة، ولو استمر راجع تجهيز
              الإدارة على السيرفر.
            </p>
          )}
          {enabled && today.isError && (
            <p role="alert">تعذر قراءة استهلاك النهارده.</p>
          )}
          {enabled && profiles.data?.length === 0 && (
            <p role="status">
              مفيش إعدادات خدمات محفوظة. لازم تجهيز البيانات الأولية على
              السيرفر.
            </p>
          )}
          {(!enabled || profiles.data) && (
            <ul className="ai-service-list">
              {SERVICES.map(({ label, workload }) => row(label, workload))}
            </ul>
          )}
          {enabled && profiles.data && (
            <details className="ai-panel">
              <summary className="ai-service-summary">
                <span className="ai-service-name">تجارب بس</span>
                <span className="ai-help">
                  معاينة الرد الآلي واختبار طبي ببيانات اصطناعية
                </span>
              </summary>
              <ul className="ai-service-list">
                {TEST_ONLY.map((workload) => row(labels[workload], workload))}
              </ul>
            </details>
          )}
          <details className="ai-panel">
            <summary className="ai-service-summary">
              <span className="ai-service-name">مفاتيح المزوّدين</span>
            </summary>
            <dl className="ai-credentials">
              {(
                [
                  ["grok", "مفتاح Grok للتسويق"],
                  ["gemini", "مفتاح Gemini العام"],
                  ["replyGemini", "مفتاح Gemini للرد الآلي"],
                  ["manus", "مفتاح Manus"],
                ] as const
              ).map(([key, label]) => (
                <div key={key}>
                  <dt>{label}</dt>
                  <dd>
                    {status.data.credentials[key]
                      ? "موجود على الخادم"
                      : "غير مضبوط"}
                  </dd>
                </div>
              ))}
            </dl>
            <p className="ai-help">
              وجود المفتاح ليس اختبار اتصال. المفاتيح نفسها لا تُعرض هنا.
            </p>
          </details>
          <Link href={ROUTES.aiUsage} className="ai-usage-link">
            سجل الطلبات بالتفصيل
          </Link>
        </>
      )}
      {requestId && (
        <section className="ai-notice" aria-label="الطلب الجاري">
          <p>
            {tracking.data
              ? states[tracking.data.state]
              : "جارٍ التحقق من الطلب. لا تبدأ تجربة أخرى حتى تتضح النتيجة."}
          </p>
          <details className="ai-help">
            <summary>تفاصيل للدعم الفني</summary>
            رقم الطلب: <bdi>{requestId}</bdi>
          </details>
          <Button
            variant="outline"
            onClick={() => void tracking.refetch()}
            disabled={tracking.isFetching}
          >
            متابعة نفس الطلب
          </Button>
          {tracking.isError && (
            <p role="alert">تعذرت المتابعة. رقم الطلب محفوظ؛ لم نعد إرساله.</p>
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
      {view === "usage" && enabled && (
        <section className="ai-panel" aria-label="سجل الطلبات">
          <h2>آخر الطلبات</h2>
          <p className="ai-help">
            حتى 100 طلب. لا تُعرض نصوص المرضى أو مفاتيح الاتصال.
          </p>
          {usage.isLoading ? (
            <p role="status">جارٍ تحميل السجل...</p>
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
                      <dt>وحدات الإدخال (توكنز)</dt>
                      <dd>
                        {row.error_code === "usage_metadata_missing"
                          ? "غير متاح"
                          : row.input_tokens}
                      </dd>
                    </div>
                    <div>
                      <dt>وحدات الإخراج (توكنز)</dt>
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
                    رقم الطلب: <bdi>{row.request_id}</bdi>
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
          <Link href={ROUTES.ai} className="ai-usage-link">
            رجوع لصفحة الذكاء الاصطناعي
          </Link>
        </section>
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
              {confirm ? providerName(confirm.provider) : ""}، وقد يستهلك رصيدًا
              مدفوعًا. سنستخدم بيانات ثابتة فقط، بدون نشر أو إرسال رسائل أو
              بيانات مرضى.
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
