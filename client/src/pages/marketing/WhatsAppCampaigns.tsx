import { useState } from "react";
import {
  MessageCircle,
  Send,
  TestTube2,
  Users,
  UserCheck,
  UserX,
} from "lucide-react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const DEFAULT_BATCH_SIZE = 25;
const MAX_BATCH_SIZE = 1000;

export default function WhatsAppCampaigns() {
  const utils = trpc.useUtils();
  const [optInName, setOptInName] = useState("دعوة الاشتراك في عروض المركز");
  const [promotionName, setPromotionName] = useState("عرض جديد من المركز");
  const [testPhone, setTestPhone] = useState("");
  const [batchSize, setBatchSize] = useState(DEFAULT_BATCH_SIZE);
  const summary = trpc.marketing.whatsappSummary.useQuery();
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
        `سيتم إرسال دعوة الاشتراك إلى أول ${batchSize} مريض لم تصله الدعوة. هل تريد المتابعة؟`,
      )
    )
      return;
    optIn.mutate({
      name: test ? `${optInName} - اختبار` : optInName,
      limit: batchSize,
      testPhone: test ? testPhone : undefined,
    });
  };
  const sendPromotion = (test = false) => {
    if (
      !test &&
      !window.confirm(
        `سيتم إرسال العرض إلى أول ${batchSize} مشترك. هل تريد المتابعة؟`,
      )
    )
      return;
    promotion.mutate({
      name: test ? `${promotionName} - اختبار` : promotionName,
      limit: batchSize,
      testPhone: test ? testPhone : undefined,
    });
  };
  const canTest = testPhone.trim().length >= 8;
  const subscriptions = summary.data?.subscriptions;

  return (
    <div className="mx-auto max-w-5xl space-y-6" dir="rtl">
      <section className="rounded-xl border border-primary/20 bg-primary/5 p-5">
        <div className="flex items-start gap-3">
          <MessageCircle className="mt-0.5 h-6 w-6 text-primary" />
          <div>
            <h2 className="text-lg font-bold">حملات واتساب</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              ترسل الدعوة الأولى بزرّي «استمرار» و«إيقاف الرسائل». العروض لا تصل
              إلا لمن اختار الاستمرار.
            </p>
          </div>
        </div>
      </section>

      <section className="grid gap-3 sm:grid-cols-3">
        <Stat
          icon={Users}
          label="بانتظار الرد"
          value={subscriptions?.pending ?? 0}
        />
        <Stat
          icon={UserCheck}
          label="مشتركون"
          value={subscriptions?.subscribed ?? 0}
          tone="text-success"
        />
        <Stat
          icon={UserX}
          label="أوقفوا الرسائل"
          value={subscriptions?.unsubscribed ?? 0}
          tone="text-destructive"
        />
      </section>

      <section className="rounded-xl border bg-muted/25 p-5">
        <label className="text-sm font-semibold" htmlFor="whatsapp-batch-size">
          عدد الرسائل في الدفعة
        </label>
        <Input
          id="whatsapp-batch-size"
          className="mt-2 max-w-xs"
          type="number"
          min={1}
          max={MAX_BATCH_SIZE}
          value={batchSize}
          onChange={(event) =>
            setBatchSize(
              Math.min(
                MAX_BATCH_SIZE,
                Math.max(1, Number(event.target.value) || 1),
              ),
            )
          }
        />
        <p className="mt-2 text-xs text-muted-foreground">
          اختر العدد الذي يناسبك، حتى {MAX_BATCH_SIZE} رسالة في الدفعة الواحدة.
        </p>
      </section>

      <section className="rounded-xl border bg-card p-5 space-y-4">
        <div>
          <h3 className="font-bold">1. دعوة الاشتراك</h3>
          <p className="text-sm text-muted-foreground">
            تستخدم قالب Meta المسجل في WHATSAPP_MARKETING_OPT_IN_TEMPLATE.
          </p>
        </div>
        <Input
          value={optInName}
          onChange={(event) => setOptInName(event.target.value)}
          aria-label="اسم حملة الاشتراك"
        />
        <CampaignActions
          disabled={optIn.isPending}
          canTest={canTest}
          onSend={() => sendOptIn()}
          onTest={() => sendOptIn(true)}
        />
      </section>

      <section className="rounded-xl border bg-card p-5 space-y-4">
        <div>
          <h3 className="font-bold">2. إرسال عرض للمشتركين</h3>
          <p className="text-sm text-muted-foreground">
            تستخدم قالب Meta المسجل في WHATSAPP_MARKETING_TEMPLATE، ولا ترسل إلى
            من اختار الإيقاف أو لم يرد.
          </p>
        </div>
        <Input
          value={promotionName}
          onChange={(event) => setPromotionName(event.target.value)}
          aria-label="اسم حملة العرض"
        />
        <CampaignActions
          disabled={promotion.isPending}
          canTest={canTest}
          onSend={() => sendPromotion()}
          onTest={() => sendPromotion(true)}
        />
      </section>

      <section className="rounded-xl border bg-muted/25 p-5 space-y-3">
        <label className="text-sm font-semibold" htmlFor="whatsapp-test-phone">
          رقم الاختبار
        </label>
        <Input
          id="whatsapp-test-phone"
          value={testPhone}
          onChange={(event) => setTestPhone(event.target.value)}
          placeholder="010xxxxxxxx"
          inputMode="tel"
        />
        <p className="text-xs text-muted-foreground">
          أرسل اختبارًا لنفسك أولًا قبل أي دفعة كبيرة.
        </p>
      </section>
    </div>
  );
}

function Stat({
  icon: Icon,
  label,
  value,
  tone = "text-foreground",
}: {
  icon: typeof Users;
  label: string;
  value: number;
  tone?: string;
}) {
  return (
    <div className="rounded-xl border bg-card p-4">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Icon className="h-4 w-4" />
        {label}
      </div>
      <div className={`mt-2 text-2xl font-bold ${tone}`}>{value}</div>
    </div>
  );
}

function CampaignActions({
  disabled,
  canTest,
  onSend,
  onTest,
}: {
  disabled: boolean;
  canTest: boolean;
  onSend: () => void;
  onTest: () => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      <Button type="button" onClick={onSend} disabled={disabled}>
        <Send className="ms-2 h-4 w-4" />
        إرسال دفعة
      </Button>
      <Button
        type="button"
        variant="outline"
        onClick={onTest}
        disabled={disabled || !canTest}
      >
        <TestTube2 className="ms-2 h-4 w-4" />
        إرسال اختبار
      </Button>
    </div>
  );
}
