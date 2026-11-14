import { useState } from "react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { DateInput } from "@/components/ui/date-input";

type Draft = {
  id?: string;
  name: string;
  details: string;
  endsOn: string;
  enabled: boolean;
};

const EMPTY: Draft = { name: "", details: "", endsOn: "", enabled: true };

function shownDate(iso: string) {
  return iso.split("-").reverse().join("/");
}

export default function WhatsAppOffers() {
  const utils = trpc.useUtils();
  const offers = trpc.marketing.whatsappOffers.useQuery(undefined, {
    retry: false,
  });
  const [draft, setDraft] = useState<Draft | null>(null);
  const refresh = () => void utils.marketing.whatsappOffers.invalidate();
  const save = trpc.marketing.saveWhatsAppOffer.useMutation({
    onSuccess: () => {
      toast.success("تم حفظ العرض");
      setDraft(null);
      refresh();
    },
    onError: (error) => toast.error(error.message),
  });
  const toggle = trpc.marketing.setWhatsAppOfferEnabled.useMutation({
    onSuccess: refresh,
    onError: (error) => toast.error(error.message),
  });
  const valid =
    draft !== null &&
    draft.name.trim().length >= 2 &&
    draft.details.trim().length >= 5;

  return (
    <section
      aria-labelledby="whatsapp-offers-title"
      className="space-y-4 rounded-xl border bg-card p-5"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 id="whatsapp-offers-title" className="font-bold">
            العروض
          </h2>
          <p className="text-sm text-muted-foreground">
            اللي الصياغة بتكتب منه. بتعدّلها من هنا بدل ما تتغيّر في الكود.
          </p>
        </div>
        {!draft && (
          <Button
            type="button"
            variant="outline"
            className="min-h-11"
            onClick={() => setDraft({ ...EMPTY })}
          >
            إضافة عرض
          </Button>
        )}
      </div>
      <p className="rounded-lg border border-warning/40 bg-warning/10 p-3 text-sm">
        تغيير العرض هنا بيغيّر الصياغة الجديدة بس. الرسالة اللي بتتبعت للعملاء
        هي قالب Meta المعتمد، وتعديلها بيتم عند Meta.
      </p>
      {offers.isLoading && <p role="status">جارٍ تحميل العروض…</p>}
      {offers.isError && (
        <p role="alert" className="text-sm text-destructive">
          تعذّر تحميل العروض: {offers.error.message}
        </p>
      )}
      {offers.data?.length === 0 && (
        <p className="text-sm text-muted-foreground">مفيش عروض لسه.</p>
      )}
      <ul className="divide-y">
        {offers.data?.map((offer) => (
          <li
            key={offer.id}
            className="flex flex-wrap items-center justify-between gap-3 py-3"
          >
            <div className="min-w-0 flex-1 space-y-1">
              <p className="font-medium break-words">{offer.name}</p>
              <p className="text-sm text-muted-foreground break-words">
                {offer.details} ·{" "}
                {offer.endsOn
                  ? `سارٍ حتى ${shownDate(offer.endsOn)}`
                  : "من غير تاريخ انتهاء"}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <span
                className={`text-sm font-semibold ${offer.enabled ? "text-success" : "text-muted-foreground"}`}
              >
                {offer.enabled ? "مفعّل" : "موقوف"}
              </span>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="min-h-11"
                disabled={toggle.isPending}
                onClick={() =>
                  toggle.mutate({ id: offer.id, enabled: !offer.enabled })
                }
              >
                {offer.enabled ? "إيقاف" : "تفعيل"}
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="min-h-11"
                onClick={() =>
                  setDraft({
                    id: offer.id,
                    name: offer.name,
                    details: offer.details,
                    endsOn: offer.endsOn ?? "",
                    enabled: offer.enabled,
                  })
                }
              >
                تعديل
              </Button>
            </div>
          </li>
        ))}
      </ul>
      {draft && (
        <form
          className="space-y-3 rounded-lg border p-4"
          aria-label={draft.id ? "تعديل العرض" : "إضافة عرض"}
          onSubmit={(event) => {
            event.preventDefault();
            if (!valid) return;
            save.mutate({
              ...(draft.id ? { id: draft.id } : {}),
              name: draft.name.trim(),
              details: draft.details.trim(),
              endsOn: draft.endsOn || null,
              enabled: draft.enabled,
            });
          }}
        >
          <label className="block space-y-2 text-sm">
            <span>اسم العرض</span>
            <Input
              value={draft.name}
              maxLength={80}
              onChange={(event) =>
                setDraft({ ...draft, name: event.target.value })
              }
            />
          </label>
          <label className="block space-y-2 text-sm">
            <span>تفاصيل العرض: السعر أو الخصم والشروط</span>
            <Textarea
              value={draft.details}
              maxLength={300}
              className="min-h-24"
              onChange={(event) =>
                setDraft({ ...draft, details: event.target.value })
              }
            />
          </label>
          <div className="space-y-2 text-sm">
            <label htmlFor="whatsapp-offer-ends">سارٍ حتى (اختياري)</label>
            <div className="flex flex-wrap items-center gap-2">
              <DateInput
                id="whatsapp-offer-ends"
                value={draft.endsOn}
                onChange={(event) =>
                  setDraft({ ...draft, endsOn: event.target.value })
                }
              />
              {draft.endsOn && (
                <Button
                  type="button"
                  variant="ghost"
                  className="min-h-11"
                  onClick={() => setDraft({ ...draft, endsOn: "" })}
                >
                  من غير تاريخ
                </Button>
              )}
            </div>
          </div>
          <label className="flex min-h-11 items-center gap-2 text-sm">
            <input
              type="checkbox"
              className="size-4"
              checked={draft.enabled}
              onChange={(event) =>
                setDraft({ ...draft, enabled: event.target.checked })
              }
            />
            مفعّل
          </label>
          <div className="flex flex-wrap gap-2">
            <Button
              type="submit"
              className="min-h-11"
              disabled={!valid || save.isPending}
            >
              {save.isPending ? "جارٍ الحفظ…" : "حفظ العرض"}
            </Button>
            <Button
              type="button"
              variant="outline"
              className="min-h-11"
              onClick={() => setDraft(null)}
            >
              إلغاء
            </Button>
          </div>
        </form>
      )}
    </section>
  );
}
