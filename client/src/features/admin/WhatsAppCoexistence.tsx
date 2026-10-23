import { useEffect, useRef, useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import {
  loadSignupSdk,
  parseSignupMessage,
  type SignupAssets,
} from "./whatsapp-signup";

const states: Record<string, string> = {
  not_started: "لم يبدأ الربط",
  created: "المحاولة جاهزة لفتح نافذة Meta",
  exchanging: "جارٍ تبادل الكود",
  token_ready: "تم تبادل الكود؛ في انتظار بيانات الرقم",
  verifying: "جارٍ التحقق من الرقم",
  subscribing: "جارٍ الاشتراك في الحساب",
  syncing: "تم ربط الأصل؛ راجع حالات المزامنة أدناه",
  cancelled: "أُلغيت المحاولة",
  exchange_unknown: "فشل تبادل الكود أو نتيجته غير محسومة",
  setup_failed: "فشل التحقق أو الاشتراك؛ يلزم مراجعة الإعداد",
  not_started_sync: "لم تبدأ",
  requesting: "بدأ الطلب؛ لا تكرره يدويًا",
  accepted: "قبلت Meta الطلب؛ في انتظار البيانات",
  receiving: "وصلت بيانات المزامنة",
  provider_complete:
    "أبلغت Meta بوصول تقدم السجل إلى 100٪؛ الأجزاء تعرض حسب وصولها",
  declined: "لم تُمنح مشاركة السجل",
  failed: "فشلت المزامنة",
  unknown: "نتيجة طلب المزامنة غير محسومة؛ لا إعادة تلقائية",
  deadline_expired: "انتهت مهلة بدء المزامنة",
};
export function WhatsAppCoexistence() {
  const status = trpc.autoReply.onboardingStatus.useQuery(undefined, {
    refetchInterval: 5000,
  });
  const begin = trpc.autoReply.beginOnboarding.useMutation();
  const exchange = trpc.autoReply.exchangeOnboardingCode.useMutation();
  const finish = trpc.autoReply.finishOnboarding.useMutation();
  const cancel = trpc.autoReply.cancelOnboarding.useMutation();
  const utils = trpc.useUtils();
  const [sdkReady, setSdkReady] = useState(false);
  const [attempt, setAttempt] = useState<{
    id: string;
    appId: string;
    configId: string;
    version: string;
  } | null>(null);
  const [message, setMessage] = useState("");
  const cleanup = useRef<(() => void) | null>(null);
  const active = useRef(false);
  useEffect(() => {
    let alive = true;
    if (status.data?.ready)
      void loadSignupSdk()
        .then(() => {
          if (alive) setSdkReady(true);
        })
        .catch(() => {
          if (alive)
            setMessage(
              "تعذر تحميل Facebook SDK. تحقق من الشبكة وأعد تحميل الصفحة.",
            );
        });
    return () => {
      alive = false;
    };
  }, [status.data?.ready]);
  useEffect(
    () => () => {
      active.current = false;
      cleanup.current?.();
    },
    [],
  );
  const launch = () => {
    if (!attempt || !window.FB || active.current) return;
    active.current = true;
    setMessage(
      "أكمل ربط رقم خدمة العملاء في نافذة Meta، وسيب WhatsApp Business مفتوحًا على الموبايل أثناء المزامنة.",
    );
    let assets: SignupAssets | undefined;
    let exchanged = false;
    let codeSeen = false;
    let finishing = false;
    const stop = () => {
      active.current = false;
      cleanup.current?.();
      cleanup.current = null;
      setAttempt(null);
    };
    const fail = (text: string) => {
      stop();
      setMessage(text);
      void cancel.mutateAsync({ id: attempt.id }).catch(() => {});
      void status.refetch();
    };
    const complete = async () => {
      if (!active.current || !assets || !exchanged || finishing) return;
      finishing = true;
      try {
        await finish.mutateAsync({ id: attempt.id, assets });
        stop();
        setMessage(
          "تم التحقق من أصل واتساب. المزامنة تعمل في الخلفية؛ الإرسال التلقائي ما زال مقفولًا.",
        );
        await utils.autoReply.invalidate();
      } catch {
        fail(
          "تعذر إكمال التحقق أو الاشتراك. راجع حالة المحاولة؛ لا تعِد ربط الرقم قبل مراجعتها.",
        );
      }
    };
    const listener = (event: MessageEvent<unknown>) => {
      if (!active.current) return;
      const parsed = parseSignupMessage(event.origin, event.data);
      if (parsed === "cancel") {
        fail("أُلغيت نافذة Meta أو أبلغت عن خطأ. لم يتم إعلان اتصال ناجح.");
        return;
      }
      if (parsed) {
        assets = parsed;
        void complete();
      }
    };
    window.addEventListener("message", listener);
    const timer = window.setTimeout(
      () =>
        fail(
          "انتهت مهلة انتظار نتيجة Meta. راجع حالة المحاولة قبل إعادة الربط.",
        ),
      14 * 60_000,
    );
    cleanup.current = () => {
      window.removeEventListener("message", listener);
      window.clearTimeout(timer);
    };
    try {
      window.FB.init({
        appId: attempt.appId,
        version: attempt.version,
        autoLogAppEvents: false,
        xfbml: false,
      });
      window.FB.login(
        (response) => {
          if (!active.current || codeSeen) return;
          const code = response.authResponse?.code;
          if (!code) {
            fail(
              "لم ترجع Meta كود الربط. راجع صلاحيات التطبيق وحالة المراجعة.",
            );
            return;
          }
          codeSeen = true;
          // Exchange immediately; session assets can arrive after this callback.
          void exchange
            .mutateAsync({ id: attempt.id, code })
            .then(() => {
              exchanged = true;
              void complete();
            })
            .catch(() =>
              fail(
                "تعذر تبادل الكود. لا تنسخ الكود أو التوكن؛ راجع حالة المحاولة.",
              ),
            );
        },
        {
          config_id: attempt.configId,
          response_type: "code",
          override_default_response_type: true,
          extras: {
            version: "v4",
            featureType: "whatsapp_business_app_onboarding",
          },
        },
      );
    } catch {
      fail(
        "تعذر فتح نافذة Meta. اسمح بالنوافذ المنبثقة وأعد المحاولة بعد مراجعة الحالة.",
      );
    }
  };
  const data = status.data;
  return (
    <article className="ar-knowledge-row">
      <div>
        <h3>ربط واتساب خدمة العملاء مع الموبايل</h3>
        <p>
          ربط رسمي عبر Coexistence. يحتاج موافقات Meta وأهلية الرقم؛ إنشاء
          Configuration لا يثبت اكتمال الربط.
        </p>
        {status.isError ? (
          <p role="alert">
            تعذر قراءة حالة الربط. تأكد من تطبيق migration الخاصة بالربط.
          </p>
        ) : (
          <p role="status">
            {states[data?.state ?? "not_started"] ??
              "حالة غير معروفة؛ يلزم مراجعة"}
          </p>
        )}
        {data && !data.ready && (
          <p>إعداد Coexistence على السيرفر غير مكتمل أو غير مفعّل.</p>
        )}
        {data?.details.contacts && (
          <p>
            جهات الاتصال:{" "}
            {states[
              data.details.contacts === "not_started"
                ? "not_started_sync"
                : data.details.contacts
            ] ?? "في انتظار التحقق"}
            . وصول بيانات لا يثبت اكتمال كل جهات الاتصال.
          </p>
        )}
        {data?.details.history && (
          <p>
            السجل:{" "}
            {states[
              data.details.history === "not_started"
                ? "not_started_sync"
                : data.details.history
            ] ?? "في انتظار التحقق"}
            {data.details.historyProgress !== undefined
              ? ` · ${data.details.historyProgress}٪`
              : ""}
            . الرسائل القديمة لا يُرسل عليها رد آلي.
          </p>
        )}
        {data?.details.errorCode && (
          <p role="alert">
            <bdi>{data.details.errorCode}</bdi>
          </p>
        )}
        {data?.syncQueue && (
          <p>
            أجزاء البيانات: قيد المعالجة {data.syncQueue.pending ?? 0} · عولجت{" "}
            {data.syncQueue.processed ?? 0} · فشلت {data.syncQueue.failed ?? 0}
          </p>
        )}
        {message && <p role="status">{message}</p>}
        <div className="ar-toolbar">
          {!attempt ? (
            <Button
              type="button"
              variant="outline"
              disabled={
                !data?.ready ||
                !sdkReady ||
                begin.isPending ||
                data.state === "syncing"
              }
              onClick={() => {
                setMessage("");
                void begin
                  .mutateAsync()
                  .then(setAttempt)
                  .catch((error) => setMessage(error.message));
              }}
            >
              تجهيز محاولة الربط
            </Button>
          ) : (
            <>
              <Button
                type="button"
                disabled={exchange.isPending || finish.isPending}
                onClick={launch}
              >
                فتح Meta لربط رقم خدمة العملاء
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  cleanup.current?.();
                  active.current = false;
                  void cancel.mutateAsync({ id: attempt.id }).catch(() => {});
                  setAttempt(null);
                  void status.refetch();
                }}
              >
                إلغاء المحاولة
              </Button>
            </>
          )}
        </div>
      </div>
    </article>
  );
}
