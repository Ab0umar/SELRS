import { useState } from "react";
import WhatsAppCopy from "./WhatsAppCopy";
import WhatsAppOffers from "./WhatsAppOffers";
import { Send, TestTube2, Users, UserCheck, UserX } from "lucide-react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const DEFAULT_BATCH_SIZE = 25;
const MAX_BATCH_SIZE = 1000;

type Kind = "opt_in" | "promotion";
type Delivery = {
  id: number;
  campaignName: string;
  campaignKind: Kind;
  recipientPhone: string;
  state: "accepted" | "sent" | "delivered" | "read" | "failed";
  errorCode: string | null;
  errorDetails: string | null;
};

const STATE_LABEL: Record<Delivery["state"], string> = {
  accepted: "قبلتها ميتا، بانتظار نتيجة التسليم",
  sent: "تم الإرسال، لم يتأكد التسليم بعد",
  delivered: "تم التسليم",
  read: "تمت القراءة",
  failed: "فشل الإرسال",
};

export default function WhatsAppCampaigns() {
  const utils = trpc.useUtils();
  const [optInName, setOptInName] = useState("دعوة الاشتراك في عروض المركز");
  const [promotionName, setPromotionName] = useState("عرض جديد من المركز");
  const [testPhone, setTestPhone] = useState("");
  const [optInBatch, setOptInBatch] = useState(DEFAULT_BATCH_SIZE);
  const [promotionBatch, setPromotionBatch] = useState(DEFAULT_BATCH_SIZE);
  const summary = trpc.marketing.whatsappSummary.useQuery(undefined, {
    refetchInterval: 15_000,
  });
  const refresh = () => void utils.marketing.whatsappSummary.invalidate();

  const optIn = trpc.marketing.sendWhatsAppOptInBatch.useMutation({
    onSuccess: (result) => {
      toast.success(`تم قبول ${result.accepted} رسالة من ${result.attempted}`);
      refresh();
    },
    onError: (error) => toast.error(error.message),
  });
  const promotion = trpc.marketing.sendWhatsAppPromotionBatch.useMutation({
    onSuccess: (result) => {
      toast.success(`تم قبول ${result.accepted} عرض من ${result.attempted}`);
      refresh();
    },
    onError: (error) => toast.error(error.message),
  });

  const sendOptIn = (test = false) => {
    if (
      !test &&
      !window.confirm(
        `سيتم إرسال دعوة الاشتراك إلى أول ${optInBatch} مريض لم تصله الدعوة. هل تريد المتابعة؟`,
      )
    )
      return;
    optIn.mutate({
      name: test ? `${optInName} - اختبار` : optInName,
      limit: optInBatch,
      testPhone: test ? testPhone : undefined,
    });
  };
  const sendPromotion = (test = false) => {
    if (
      !test &&
      !window.confirm(
        `سيتم إرسال العرض إلى أول ${promotionBatch} مشترك. هل تريد المتابعة؟`,
      )
    )
      return;
    promotion.mutate({
      name: test ? `${promotionName} - اختبار` : promotionName,
      limit: promotionBatch,
      testPhone: test ? testPhone : undefined,
    });
  };
  const canTest = testPhone.trim().length >= 8;
  const subscriptions = summary.data?.subscriptions;
  const deliveries = (summary.data?.deliveries ?? []) as Delivery[];

  return (
    <div className="mx-auto max-w-4xl space-y-5" dir="rtl">
      <header className="space-y-1">
        <h2 className="text-xl font-bold">دعاية واتساب</h2>
        <p className="text-sm text-muted-foreground">
          العروض بتوصل بس للي وافق على الدعوة. اللي داس «إيقاف الرسائل» مش
          بيوصله حاجة.
        </p>
      </header>

      <section
        aria-label="أعداد الاشتراك"
        className="grid grid-cols-1 gap-3 sm:grid-cols-3"
      >
        <Stat
          icon={UserCheck}
          label="مشتركون"
          value={subscriptions?.subscribed}
          loading={summary.isLoading}
          tone="text-success"
        />
        <Stat
          icon={Users}
          label="مستنيين رد على الدعوة"
          value={subscriptions?.pending}
          loading={summary.isLoading}
        />
        <Stat
          icon={UserX}
          label="أوقفوا الرسائل"
          value={subscriptions?.unsubscribed}
          loading={summary.isLoading}
          tone="text-destructive"
        />
      </section>
      {summary.isError && (
        <p role="alert" className="text-sm text-destructive">
          تعذر تحميل الأعداد والنتائج: {summary.error.message}
        </p>
      )}

      <Step number={1} title="جرّب على رقمك" hint="قبل أي إرسال لعملاء.">
        <label className="text-sm font-semibold" htmlFor="whatsapp-test-phone">
          رقمك
        </label>
        <Input
          id="whatsapp-test-phone"
          className="max-w-xs"
          value={testPhone}
          onChange={(event) => setTestPhone(event.target.value)}
          placeholder="010xxxxxxxx"
          inputMode="tel"
          dir="ltr"
        />
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="min-h-11"
            disabled={optIn.isPending || !canTest}
            onClick={() => sendOptIn(true)}
          >
            <TestTube2 className="ms-2 h-4 w-4" />
            ابعت الدعوة لنفسي
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="min-h-11"
            disabled={promotion.isPending || !canTest}
            onClick={() => sendPromotion(true)}
          >
            <TestTube2 className="ms-2 h-4 w-4" />
            ابعت العرض لنفسي
          </Button>
        </div>
      </Step>

      <Step
        number={2}
        title="دعوة الاشتراك"
        hint="رسالة واحدة لكل مريض بزرّين: استمرار، أو إيقاف الرسائل. بتتبعت بقالب الدعوة المعتمد عند Meta."
      >
        <CampaignFields
          name={optInName}
          onName={setOptInName}
          nameLabel="اسم حملة الاشتراك"
          batch={optInBatch}
          onBatch={setOptInBatch}
          id="opt-in"
        />
        <Button
          type="button"
          className="min-h-11 self-start"
          disabled={optIn.isPending}
          onClick={() => sendOptIn()}
        >
          <Send className="ms-2 h-4 w-4" />
          ابعت الدعوة لـ {optInBatch} مريض
        </Button>
        <Results
          deliveries={deliveries.filter((d) => d.campaignKind === "opt_in")}
          loading={summary.isLoading}
          empty="لسه مفيش دعوة اتبعتت."
        />
      </Step>

      <Step
        number={3}
        title="عرض للمشتركين"
        hint="بيتبعت بقالب العرض المعتمد عند Meta، ومش بيوصل للي أوقف الرسائل أو لسه مردش."
      >
        <CampaignFields
          name={promotionName}
          onName={setPromotionName}
          nameLabel="اسم حملة العرض"
          batch={promotionBatch}
          onBatch={setPromotionBatch}
          id="promotion"
        />
        <Button
          type="button"
          className="min-h-11 self-start"
          disabled={promotion.isPending}
          onClick={() => sendPromotion()}
        >
          <Send className="ms-2 h-4 w-4" />
          ابعت العرض لـ {promotionBatch} مشترك
        </Button>
        <Results
          deliveries={deliveries.filter((d) => d.campaignKind === "promotion")}
          loading={summary.isLoading}
          empty="لسه مفيش عرض اتبعت."
        />
      </Step>

      <details className="rounded-xl border bg-card p-5">
        <summary className="flex min-h-11 cursor-pointer items-center font-bold">
          تحضير صيغة لقالب جديد
        </summary>
        <p className="mb-4 text-sm text-muted-foreground">
          البوت بيكتب ثلاث صيغ للنسخ. الصيغة مش بتتبعت من هنا: لازم تتسجّل قالب
          عند Meta وتتعتمد الأول.
        </p>
        <WhatsAppCopy />
      </details>

      <WhatsAppOffers />
    </div>
  );
}

function Step({
  number,
  title,
  hint,
  children,
}: {
  number: number;
  title: string;
  hint: string;
  children: React.ReactNode;
}) {
  return (
    <section
      aria-labelledby={`whatsapp-step-${number}`}
      className="flex flex-col gap-3 rounded-xl border bg-card p-5"
    >
      <div className="flex items-start gap-3">
        <span
          aria-hidden="true"
          className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/10 font-bold text-primary"
        >
          {number}
        </span>
        <div className="min-w-0">
          <h3 id={`whatsapp-step-${number}`} className="font-bold">
            {title}
          </h3>
          <p className="text-sm text-muted-foreground">{hint}</p>
        </div>
      </div>
      {children}
    </section>
  );
}

function CampaignFields({
  id,
  name,
  onName,
  nameLabel,
  batch,
  onBatch,
}: {
  id: string;
  name: string;
  onName: (value: string) => void;
  nameLabel: string;
  batch: number;
  onBatch: (value: number) => void;
}) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <label className="grid gap-2 text-sm">
        {nameLabel}
        <Input value={name} onChange={(event) => onName(event.target.value)} />
      </label>
      <label className="grid gap-2 text-sm" htmlFor={`whatsapp-batch-${id}`}>
        عدد الرسائل في الدفعة (حتى {MAX_BATCH_SIZE})
        <Input
          id={`whatsapp-batch-${id}`}
          type="number"
          min={1}
          max={MAX_BATCH_SIZE}
          value={batch}
          onChange={(event) =>
            onBatch(
              Math.min(
                MAX_BATCH_SIZE,
                Math.max(1, Number(event.target.value) || 1),
              ),
            )
          }
        />
      </label>
    </div>
  );
}

function Results({
  deliveries,
  loading,
  empty,
}: {
  deliveries: Delivery[];
  loading: boolean;
  empty: string;
}) {
  return (
    <div className="space-y-2 border-t pt-3">
      <h4 className="text-sm font-semibold">آخر النتائج</h4>
      <p className="text-xs text-muted-foreground">
        قبول ميتا للطلب لا يعني وصول الرسالة. النتائج بتتحدث كل 15 ثانية.
      </p>
      {loading && <p role="status">جارٍ تحميل النتائج...</p>}
      {!loading && deliveries.length === 0 && (
        <p className="text-sm text-muted-foreground">{empty}</p>
      )}
      <ul className="divide-y">
        {deliveries.map((delivery) => (
          <li key={delivery.id} className="space-y-1 py-2 break-words text-sm">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <span>{delivery.campaignName}</span>
              <span
                className={
                  delivery.state === "failed"
                    ? "font-semibold text-destructive"
                    : "font-semibold"
                }
              >
                {STATE_LABEL[delivery.state]}
              </span>
            </div>
            <bdi dir="ltr">{delivery.recipientPhone}</bdi>
            {delivery.state === "failed" && (
              <p className="text-destructive">
                {delivery.errorDetails || "لم يصل سبب الفشل من ميتا."}
                {delivery.errorCode && <> (الكود: {delivery.errorCode})</>}
              </p>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

function Stat({
  icon: Icon,
  label,
  value,
  loading,
  tone = "text-foreground",
}: {
  icon: typeof Users;
  label: string;
  value: number | undefined;
  loading: boolean;
  tone?: string;
}) {
  return (
    <div className="rounded-xl border bg-card p-4">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Icon className="h-4 w-4" />
        {label}
      </div>
      <div className={`mt-2 text-2xl font-bold ${tone}`}>
        {loading ? "…" : (value ?? "—")}
      </div>
    </div>
  );
}
