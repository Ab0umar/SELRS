import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  confirmationKinds,
  confirmationStates,
  confirmationKindLabels,
  confirmationStateLabels,
} from "@shared/whatsapp-confirmations";
type Kind = (typeof confirmationKinds)[number];
type State = (typeof confirmationStates)[number];
function time(value: Date | string | null) {
  return value
    ? new Intl.DateTimeFormat("ar-EG", {
        dateStyle: "short",
        timeStyle: "short",
        timeZone: "Africa/Cairo",
      }).format(new Date(value))
    : "غير متاح";
}
export default function WhatsAppConfirmations() {
  const [page, setPage] = useState(1),
    [search, setSearch] = useState(""),
    [query, setQuery] = useState("");
  const [kind, setKind] = useState<Kind | "">(""),
    [state, setState] = useState<State | "">("");
  const log = trpc.whatsappConfirmations.list.useQuery(
    {
      page,
      search: query,
      ...(kind ? { kind } : {}),
      ...(state ? { state } : {}),
    },
    { retry: false, refetchInterval: 15000 },
  );
  const data = log.data;
  const delivered =
    data?.counts
      .filter((row) => row.state === "delivered" || row.state === "read")
      .reduce((sum, row) => sum + row.total, 0) ?? 0;
  return (
    <section
      dir="rtl"
      aria-label="سجل رسائل التأكيد"
      className="mx-auto max-w-6xl space-y-5 p-4 sm:p-6"
    >
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-2">
          <h1 className="text-2xl font-bold">سجل رسائل التأكيد</h1>
          <p className="text-sm text-muted-foreground">
            تأكيدات وإلغاءات الكشف والعمليات. «قبلتها Meta» لا تعني وصولها؛
            الوصول يظهر عند «تم التسليم» أو «تمت القراءة».
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          disabled={log.isFetching}
          onClick={() => void log.refetch()}
        >
          {log.isFetching ? "جارٍ التحديث…" : "تحديث السجل"}
        </Button>
      </header>
      <form
        className="grid gap-3 rounded-xl border bg-card p-4 sm:grid-cols-3"
        onSubmit={(event) => {
          event.preventDefault();
          setQuery(search.trim());
          setPage(1);
        }}
      >
        <label className="space-y-2">
          اسم أو رقم المريض
          <Input
            aria-label="اسم أو رقم المريض"
            value={search}
            maxLength={80}
            onChange={(event) => setSearch(event.target.value)}
          />
        </label>
        <label className="space-y-2">
          نوع الرسالة
          <select
            aria-label="نوع الرسالة"
            className="block min-h-11 w-full rounded-md border bg-background px-3"
            value={kind}
            onChange={(event) => {
              setKind(event.target.value as Kind | "");
              setPage(1);
            }}
          >
            <option value="">الكل</option>
            {confirmationKinds.map((value) => (
              <option key={value} value={value}>
                {confirmationKindLabels[value]}
              </option>
            ))}
          </select>
        </label>
        <label className="space-y-2">
          حالة الرسالة
          <select
            aria-label="حالة الرسالة"
            className="block min-h-11 w-full rounded-md border bg-background px-3"
            value={state}
            onChange={(event) => {
              setState(event.target.value as State | "");
              setPage(1);
            }}
          >
            <option value="">الكل</option>
            {confirmationStates.map((value) => (
              <option key={value} value={value}>
                {confirmationStateLabels[value]}
              </option>
            ))}
          </select>
        </label>
        <div className="flex flex-wrap gap-2 sm:col-span-3">
          <Button type="submit">بحث</Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              setSearch("");
              setQuery("");
              setKind("");
              setState("");
              setPage(1);
            }}
          >
            مسح التصفية
          </Button>
        </div>
      </form>
      {log.isLoading && <p role="status">جارٍ تحميل محاولات الإرسال…</p>}
      {log.isError && (
        <div role="alert" className="space-y-2 rounded-md border p-4">
          <p>
            تعذر تحميل السجل. تحقق من تشغيل النسخة الجديدة وجداول سجل التأكيدات.
          </p>
          <Button
            type="button"
            variant="outline"
            onClick={() => void log.refetch()}
          >
            إعادة المحاولة
          </Button>
        </div>
      )}
      {data && (
        <>
          <dl className="grid grid-cols-3 gap-3 rounded-xl border bg-card p-4">
            <div>
              <dt className="text-sm text-muted-foreground">
                المحاولات المطابقة
              </dt>
              <dd className="text-xl font-semibold">{data.total}</dd>
            </div>
            <div>
              <dt className="text-sm text-muted-foreground">وصلت</dt>
              <dd className="text-xl font-semibold">{delivered}</dd>
            </div>
            <div>
              <dt className="text-sm text-muted-foreground">فشلت</dt>
              <dd className="text-xl font-semibold">
                {data.counts.find((row) => row.state === "failed")?.total ?? 0}
              </dd>
            </div>
          </dl>
          {!data.rows.length ? (
            <p role="status" className="rounded-xl border p-5">
              لا توجد محاولات مطابقة. يبدأ السجل من تفعيل هذا التحديث؛ المحاولات
              السابقة لا يظهر لها سجل إرسال بأثر رجعي.
            </p>
          ) : (
            <div className="space-y-3">
              {data.rows.map((row) => (
                <article
                  key={row.id}
                  className="space-y-3 rounded-xl border bg-card p-4"
                >
                  <header className="flex flex-wrap items-center justify-between gap-2">
                    <h2 className="font-semibold">
                      {row.patient_name || "بدون اسم"} ·{" "}
                      {confirmationKindLabels[row.kind]}
                    </h2>
                    <span
                      className={
                        row.state === "failed"
                          ? "font-semibold text-destructive"
                          : "font-semibold"
                      }
                    >
                      {confirmationStateLabels[row.state]}
                    </span>
                  </header>
                  <dl className="grid gap-2 text-sm sm:grid-cols-3">
                    <div>
                      <dt className="text-muted-foreground">الرقم</dt>
                      <dd>
                        <bdi>{row.recipient_phone || "رقم غير صالح"}</bdi>
                      </dd>
                    </div>
                    <div>
                      <dt className="text-muted-foreground">المحاولة</dt>
                      <dd>{time(row.created_at)}</dd>
                    </div>
                    <div>
                      <dt className="text-muted-foreground">آخر تحديث</dt>
                      <dd>{time(row.updated_at)}</dd>
                    </div>
                    <div>
                      <dt className="text-muted-foreground">القالب</dt>
                      <dd className="break-all">
                        <bdi>{row.template_name || "غير مضبوط"}</bdi>
                      </dd>
                    </div>
                  </dl>
                  {row.error_code && (
                    <p className="break-words text-sm" dir="auto">
                      {row.error_details ||
                        (
                          {
                            configuration_missing:
                              "إعداد الربط أو القالب غير مكتمل",
                            invalid_phone: "رقم الهاتف غير صالح",
                            provider_outcome_unknown:
                              "تعذر التأكد من قبول Meta؛ لا تُعد الإرسال قبل مراجعة الحالة",
                            acceptance_log_uncertain:
                              "تعذر حفظ نتيجة القبول بالكامل؛ راجع إشعارات التسليم",
                            invalid_template_payload:
                              "تعذر تجهيز بيانات القالب",
                          } as Record<string, string>
                        )[row.error_code] ||
                        "رفضت Meta الرسالة؛ راجع رمز الخطأ"}{" "}
                      · <bdi>{row.error_code}</bdi>
                    </p>
                  )}
                  <details className="text-sm">
                    <summary className="min-h-11 cursor-pointer py-3">
                      معرّفات التتبع
                    </summary>
                    <p className="break-all" dir="ltr">
                      {row.id}
                    </p>
                    <p className="break-all" dir="ltr">
                      {row.provider_message_id ||
                        "لم يُرجع المزوّد معرّف رسالة"}
                    </p>
                  </details>
                </article>
              ))}
            </div>
          )}
          <nav
            aria-label="صفحات سجل التأكيدات"
            className="flex flex-wrap items-center gap-3"
          >
            <Button
              type="button"
              variant="outline"
              disabled={page === 1 || log.isFetching}
              onClick={() => setPage((value) => value - 1)}
            >
              السابق
            </Button>
            <span>
              صفحة {page} من {Math.max(1, Math.ceil(data.total / 25))}
            </span>
            <Button
              type="button"
              variant="outline"
              disabled={page * 25 >= data.total || log.isFetching}
              onClick={() => setPage((value) => value + 1)}
            >
              التالي
            </Button>
          </nav>
          {!!data.unmatchedReceipts.length && (
            <section
              className="space-y-3 rounded-xl border p-4"
              aria-label="إشعارات غير مرتبطة بمحاولة"
            >
              <h2 className="font-semibold">إشعارات لا تقابل محاولة مسجلة</h2>
              <p className="text-sm text-muted-foreground">
                قد تخص رسائل أُرسلت قبل بدء التسجيل أو رسائل أخرى على نفس الرقم.
              </p>
              {data.unmatchedReceipts.map((row, index) => (
                <p
                  key={`${row.provider_message_id}-${index}`}
                  className="break-words text-sm"
                  dir="auto"
                >
                  {row.recipient_phone || "بدون رقم"} ·{" "}
                  {confirmationStateLabels[row.state]} ·{" "}
                  {row.error_code || "بدون رمز خطأ"} {row.error_details || ""}
                </p>
              ))}
            </section>
          )}
        </>
      )}
    </section>
  );
}
