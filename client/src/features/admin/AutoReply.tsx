import { useState, type ReactNode } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  autoReplyChannels,
  channelLabels,
  autoReplySettingsSchema,
  supportsGeminiSampling,
  type AutoReplyChannel,
  type AutoReplySettings,
} from "../../../../shared/auto-reply";
import type { inferRouterOutputs } from "@trpc/server";
import type { autoReplyRouter } from "../../../../server/routers/autoReply";
import "./AutoReply.css";
import { WhatsAppCoexistence } from "./WhatsAppCoexistence";

type Tab = "inbox" | "knowledge" | "settings" | "test" | "activity";
type AutoReplyOutputs = inferRouterOutputs<typeof autoReplyRouter>;
type FacebookPages = AutoReplyOutputs["settings"]["pages"];
const pageLabel = (accountId: string, pages: FacebookPages) =>
  pages.find((p) => p.accountId === accountId)?.label || accountId;
function ReplyTargetSelect({
  value,
  onChange,
  pages,
  label = "يُستخدم في",
  disabled = false,
  includeAll = true,
}: {
  value: string;
  onChange: (value: string) => void;
  pages: FacebookPages;
  label?: string;
  disabled?: boolean;
  includeAll?: boolean;
}) {
  if (includeAll) {
    const pageIds = pages.map((page) => page.accountId);
    const options = [
      { id: "whatsapp", label: "واتساب" },
      ...pages.map((page, index) => ({
        id: page.accountId,
        label:
          index === 0
            ? "صفحة المركز"
            : index === 1
              ? "صفحة الدكتور"
              : page.label,
      })),
    ];
    const selected =
      value === "all"
        ? options.map((option) => option.id)
        : value === "facebook"
          ? pageIds
          : value.split(",");
    const toggle = (id: string, checked: boolean) => {
      const next = options
        .map((option) => option.id)
        .filter((option) =>
          option === id ? checked : selected.includes(option),
        );
      if (next.length === options.length) onChange("all");
      else if (
        pageIds.length > 1 &&
        pageIds.every((page) => next.includes(page))
      )
        onChange("facebook");
      else onChange(next.join(","));
    };
    return (
      <fieldset className="ar-targets" disabled={disabled}>
        <legend>{label}</legend>
        {options.map((option) => (
          <Check
            key={option.id}
            label={option.label}
            checked={selected.includes(option.id)}
            onChange={(checked) => toggle(option.id, checked)}
          />
        ))}
        <Check
          label="الكل"
          checked={value === "all"}
          onChange={(checked) => {
            if (checked) onChange("all");
            else onChange("");
          }}
        />
        {!value && <p role="status">اختر قناة واحدة على الأقل قبل الحفظ.</p>}
      </fieldset>
    );
  }
  return (
    <Field label={label}>
      <select
        className="ar-select"
        aria-label={label}
        value={value}
        disabled={disabled}
        required
        onChange={(e) => onChange(e.target.value)}
      >
        <option value="">اختر الصفحة</option>
        {pages.map((page) => (
          <option key={page.accountId} value={page.accountId}>
            {page.label}
          </option>
        ))}
        {value &&
          value !== "all" &&
          value !== "facebook" &&
          value !== "whatsapp" &&
          !pages.some((page) => page.accountId === value) && (
            <option value={value}>صفحة غير متاحة ({value})</option>
          )}
      </select>
    </Field>
  );
}
const statusLabels: Record<string, string> = {
  open: "رد آلي",
  human: "مع موظف",
  closed: "مغلقة",
  received: "واردة",
  imported: "مستوردة من السجل؛ لا رد آلي عليها",
  pending: "في الانتظار",
  generating: "تحضير الرد",
  sending: "جارٍ الإرسال",
  retry: "إعادة محاولة",
  sent: "قبلتها Meta",
  delivered: "تم التسليم",
  read: "مقروءة",
  failed: "فشل",
  unknown: "إرسال غير محسوم",
  cancelled: "ملغاة",
};
const time = (date: Date | string | null | undefined) =>
  date
    ? new Date(date).toLocaleString("ar-EG", { timeZone: "Africa/Cairo" })
    : "لم يحدث بعد";
function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="ar-field">
      <span>{label}</span>
      {children}
    </label>
  );
}
function Check({
  label,
  checked,
  onChange,
  disabled,
}: {
  label: string;
  checked: boolean;
  onChange: (value: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <label className="ar-check">
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(e) => onChange(e.target.checked)}
      />
      <span>{label}</span>
    </label>
  );
}
function ErrorState({
  message,
  retry,
}: {
  message: string;
  retry?: () => void;
}) {
  return (
    <div role="alert" className="ar-notice">
      <p>{message}</p>
      {retry && (
        <Button variant="outline" onClick={retry}>
          إعادة المحاولة
        </Button>
      )}
    </div>
  );
}
function ChannelSelect({
  value,
  onChange,
  all = false,
}: {
  value: string;
  onChange: (v: string) => void;
  all?: boolean;
}) {
  return (
    <select
      className="ar-select"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      aria-label="القناة"
    >
      {all && <option value="">كل القنوات</option>}
      {autoReplyChannels.map((c) => (
        <option key={c} value={c}>
          {channelLabels[c]}
        </option>
      ))}
    </select>
  );
}

export default function AutoReply() {
  const [tab, setTab] = useState<Tab>("inbox");
  const settings = trpc.autoReply.settings.useQuery(undefined, {
    refetchInterval: 30_000,
  });
  const utils = trpc.useUtils();
  const stop = trpc.autoReply.saveSettings.useMutation({
    onSuccess: async () => {
      await utils.autoReply.invalidate();
      toast.success("تم إيقاف الإرسال");
    },
    onError: (e) => toast.error(e.message),
  });
  return (
    <main className="auto-reply" dir="rtl">
      <header className="ar-header">
        <div>
          <h1>الرد الآلي</h1>
          <p>مركز عيون الشروق · إدارة محادثات واتساب وماسنجر وتعليقات الصفحة</p>
        </div>
        {settings.data && (
          <div className="ar-toolbar">
            <strong role="status">
              {settings.data.config.sendingEnabled
                ? "الإرسال العام مفعّل"
                : "الإرسال العام متوقف"}
            </strong>
            <Button
              variant="destructive"
              disabled={!settings.data.config.sendingEnabled || stop.isPending}
              onClick={() =>
                stop.mutate({ ...settings.data!.config, sendingEnabled: false })
              }
            >
              إيقاف كل الإرسال
            </Button>
          </div>
        )}
      </header>
      <nav className="ar-tabs" aria-label="أقسام الرد الآلي">
        {(
          [
            ["inbox", "المحادثات"],
            ["knowledge", "Teach AI"],
            ["settings", "الربط والإعدادات"],
            ["test", "اختبار داخلي"],
            ["activity", "سجل الإرسال"],
          ] as [Tab, string][]
        ).map(([id, label]) => (
          <Button
            key={id}
            variant={tab === id ? "default" : "outline"}
            aria-pressed={tab === id}
            onClick={() => setTab(id)}
          >
            {label}
          </Button>
        ))}
      </nav>
      {settings.isLoading ? (
        <p role="status">جارٍ تحميل إعدادات الرد الآلي…</p>
      ) : settings.error ? (
        <ErrorState
          message={`تعذر تحميل القسم: ${settings.error.message}. تأكد من تطبيق migration الخاص بالرد الآلي.`}
          retry={() => void settings.refetch()}
        />
      ) : (
        settings.data && (
          <>
            {!settings.data.workerEnabled && (
              <p className="ar-notice">
                عامل الخلفية غير مفعّل على السيرفر. الاختبار الداخلي متاح، ولن
                تُرسل رسائل للعملاء.
              </p>
            )}
            {tab === "inbox" && (
              <Inbox
                sendingEnabled={settings.data.config.sendingEnabled}
                pages={settings.data.pages}
              />
            )}
            {tab === "knowledge" && <Knowledge pages={settings.data.pages} />}
            {tab === "settings" && <Settings data={settings.data} />}
            {tab === "test" && <InternalTest pages={settings.data.pages} />}
            {tab === "activity" && <Activity pages={settings.data.pages} />}
          </>
        )
      )}
    </main>
  );
}

function Inbox({
  sendingEnabled,
  pages,
}: {
  sendingEnabled: boolean;
  pages: FacebookPages;
}) {
  const [channel, setChannel] = useState("");
  const [accountId, setAccountId] = useState("");
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<number | null>(null);
  const query = trpc.autoReply.conversations.useQuery(
    {
      channel: channel ? (channel as AutoReplyChannel) : undefined,
      accountId: accountId || undefined,
      status: status ? (status as "open" | "human" | "closed") : undefined,
      page,
    },
    { refetchInterval: 10_000 },
  );
  return (
    <section aria-label="صندوق المحادثات">
      <div className="ar-toolbar">
        <ChannelSelect
          all
          value={channel}
          onChange={(v) => {
            setChannel(v);
            if (v === "whatsapp") setAccountId("");
            setSelected(null);
            setPage(1);
          }}
        />
        <select
          className="ar-select"
          aria-label="صفحة فيسبوك"
          value={accountId}
          disabled={channel === "whatsapp"}
          onChange={(e) => {
            setAccountId(e.target.value);
            setPage(1);
            setSelected(null);
          }}
        >
          <option value="">كل صفحات فيسبوك</option>
          {pages
            .filter((p) => p.accountId)
            .map((p) => (
              <option key={p.accountId} value={p.accountId}>
                {p.label}
              </option>
            ))}
        </select>
        <select
          className="ar-select"
          aria-label="حالة المحادثة"
          value={status}
          onChange={(e) => {
            setStatus(e.target.value);
            setPage(1);
          }}
        >
          <option value="">كل الحالات</option>
          <option value="open">رد آلي</option>
          <option value="human">مع موظف</option>
          <option value="closed">مغلقة</option>
        </select>
        <Button variant="outline" onClick={() => void query.refetch()}>
          تحديث المحادثات
        </Button>
      </div>
      <div className="ar-inbox">
        <aside className="ar-panel" aria-label="قائمة المحادثات">
          {query.isLoading && <p role="status">جارٍ تحميل المحادثات…</p>}
          {query.error && (
            <ErrorState
              message={query.error.message}
              retry={() => void query.refetch()}
            />
          )}
          {query.data?.rows.length === 0 && (
            <p>
              لا توجد محادثات مطابقة. تظهر الرسائل بعد استقبال Webhook من قناة
              مربوطة فعليًا.
            </p>
          )}
          {query.data?.rows.map((c) => (
            <button
              type="button"
              key={c.id}
              className="ar-conversation"
              aria-pressed={c.id === selected}
              onClick={() => setSelected(c.id)}
            >
              <strong>
                {channelLabels[c.channel]} · <bdi>{c.participantId}</bdi>
              </strong>
              {c.channel !== "whatsapp" && (
                <span>
                  {pageLabel(c.accountId, pages)} · <bdi>{c.accountId}</bdi>
                </span>
              )}
              <span>
                {statusLabels[c.status]} · #{c.id}
              </span>
              <small>{time(c.lastActivityAt)}</small>
              {c.channel === "facebook_comment" && (
                <small>
                  سياق التعليق: <bdi>{c.threadId}</bdi>
                </small>
              )}
            </button>
          ))}
          <div className="ar-toolbar">
            <Button
              variant="outline"
              disabled={page === 1}
              onClick={() => setPage((p) => p - 1)}
            >
              السابق
            </Button>
            <span>صفحة {page}</span>
            <Button
              variant="outline"
              disabled={!query.data?.hasMore}
              onClick={() => setPage((p) => p + 1)}
            >
              التالي
            </Button>
          </div>
        </aside>
        <div className="ar-panel ar-thread">
          {selected ? (
            <Conversation
              key={selected}
              id={selected}
              sendingEnabled={sendingEnabled}
              pages={pages}
            />
          ) : (
            <p>اختر محادثة لعرض سياقها والرد عليها.</p>
          )}
        </div>
      </div>
    </section>
  );
}
function Conversation({
  id,
  sendingEnabled,
  pages,
}: {
  id: number;
  sendingEnabled: boolean;
  pages: FacebookPages;
}) {
  const query = trpc.autoReply.conversation.useQuery(id, {
    refetchInterval: 5000,
  });
  const [text, setText] = useState("");
  const [requestId, setRequestId] = useState(() => crypto.randomUUID());
  const [proposal, setProposal] = useState<string | null>(null);
  const utils = trpc.useUtils();
  const refresh = () => utils.autoReply.invalidate();
  const status = trpc.autoReply.setStatus.useMutation({
    onSuccess: refresh,
    onError: (e) => toast.error(e.message),
  });
  const send = trpc.autoReply.sendManual.useMutation({
    onSuccess: async () => {
      setText("");
      setRequestId(crypto.randomUUID());
      await refresh();
      toast.success("أُضيف الرد للطابور، وتوقّف الرد الآلي على المحادثة");
    },
    onError: (e) => toast.error(e.message),
  });
  const test = trpc.autoReply.test.useMutation({
    onSuccess: (r) =>
      setProposal(`${r.text}${r.handoff ? "\nالمقترح: تحويل لموظف" : ""}`),
    onError: (e) => toast.error(e.message),
  });
  if (query.isLoading) return <p role="status">جارٍ تحميل سياق المحادثة…</p>;
  if (query.error)
    return (
      <ErrorState
        message={query.error.message}
        retry={() => void query.refetch()}
      />
    );
  if (!query.data) return null;
  const { conversation: c, rows, jobs } = query.data;
  const latest = rows.filter((m) => m.direction === "inbound").at(-1);
  return (
    <>
      <div className="ar-toolbar">
        <h2>
          {channelLabels[c.channel]} ·{" "}
          {c.channel !== "whatsapp"
            ? `${pageLabel(c.accountId, pages)} · `
            : ""}
          #{c.id}
        </h2>
        <span>{statusLabels[c.status]}</span>
      </div>
      {c.humanReason && (
        <p>
          سبب التحويل أو الإيقاف: <bdi>{c.humanReason}</bdi>
        </p>
      )}
      {c.channel === "facebook_comment" && (
        <p className="ar-notice">
          هذه محادثة عامة. لا تُدرج بيانات شخصية أو طبية.{" "}
          <a
            href={`https://www.facebook.com/${encodeURIComponent(c.threadId)}`}
            target="_blank"
            rel="noopener noreferrer"
          >
            عرض التعليق الأصلي
          </a>
        </p>
      )}
      <div className="ar-toolbar">
        <Button
          variant="outline"
          disabled={status.isPending || c.status === "human"}
          onClick={() => status.mutate({ id, status: "human" })}
        >
          تحويل لموظف وإيقاف البوت
        </Button>
        <Button
          variant="outline"
          disabled={status.isPending || c.status === "open"}
          onClick={() => status.mutate({ id, status: "open" })}
        >
          تفعيل البوت للرسائل الجديدة
        </Button>
        <Button
          variant="outline"
          disabled={status.isPending || c.status === "closed"}
          onClick={() => status.mutate({ id, status: "closed" })}
        >
          إغلاق المحادثة
        </Button>
      </div>
      <p className="ar-muted">
        آخر 20 رسالة ·{" "}
        {new Date(c.lastInboundAt).getTime() === 0
          ? "لم تبدأ نافذة رد من رسالة جديدة"
          : `بدء نافذة الرد: ${time(c.lastInboundAt)}`}
      </p>
      <ol className="ar-messages" aria-label="سياق المحادثة">
        {rows.map((m) => (
          <li key={m.id} className={`ar-message ar-message-${m.direction}`}>
            <div className="ar-toolbar">
              <strong>
                {m.direction === "history_inbound"
                  ? "العميل · سجل سابق"
                  : m.direction === "history_staff"
                    ? "موظف · سجل سابق"
                    : m.direction === "inbound"
                      ? "العميل"
                      : m.direction === "bot"
                        ? "الرد الآلي"
                        : "موظف"}
              </strong>
              <small>{time(m.createdAt)}</small>
            </div>
            <p dir="auto">{m.body}</p>
            <small>{statusLabels[m.state] ?? m.state}</small>
          </li>
        ))}
      </ol>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (text.trim()) send.mutate({ id, text, requestId });
        }}
      >
        <Field label="رد الموظف">
          <Textarea
            value={text}
            onChange={(e) => {
              setText(e.target.value);
              setRequestId(crypto.randomUUID());
            }}
            rows={3}
            maxLength={c.channel === "facebook_comment" ? 400 : 2000}
            placeholder="اكتب الرد المعتمد…"
          />
        </Field>
        <p className="ar-muted">
          الرد اليدوي يُوقف البوت حتى تعيد تفعيله. الإرسال ملتزم بنافذة القناة
          وبالمفتاح العام.
        </p>
        <div className="ar-toolbar">
          <Button
            type="submit"
            disabled={
              !text.trim() ||
              !sendingEnabled ||
              send.isPending ||
              c.status === "closed"
            }
          >
            {send.isPending ? "جارٍ إضافة الرد…" : "إرسال رد الموظف"}
          </Button>
          <Button
            type="button"
            variant="outline"
            disabled={!latest || test.isPending}
            onClick={() =>
              latest &&
              test.mutate({
                channel: c.channel,
                conversationId: id,
                text: latest.body,
              })
            }
          >
            {test.isPending ? "جارٍ اقتراح الرد…" : "اقتراح رد دون إرسال"}
          </Button>
        </div>
        {!sendingEnabled && <p role="status">الإرسال متوقف بالمفتاح العام.</p>}
      </form>
      {proposal && (
        <div className="ar-notice" role="status">
          <strong>اختبار فقط، لم يُرسل</strong>
          <p className="ar-prewrap" dir="auto">
            {proposal}
          </p>
        </div>
      )}
      <details>
        <summary>حالات الردود ({jobs.length})</summary>
        {jobs.map((j) => (
          <p key={j.id}>
            #{j.id} · {statusLabels[j.state] ?? j.state} · محاولات {j.attempts}
            {j.errorCode && (
              <>
                {" "}
                · <bdi>{j.errorCode}</bdi>
              </>
            )}
            {j.state === "unknown" &&
              " · راجع القناة قبل إرسال أي رد آخر لتجنب التكرار"}
          </p>
        ))}
      </details>
    </>
  );
}

type KnowledgeRow = AutoReplyOutputs["teaching"][number];
function Knowledge({ pages }: { pages: FacebookPages }) {
  const query = trpc.autoReply.teaching.useQuery();
  const [editing, setEditing] = useState<KnowledgeRow | "new" | null>(null);
  const [search, setSearch] = useState("");
  const utils = trpc.useUtils();
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [websiteDraft, setWebsiteDraft] = useState<
    AutoReplyOutputs["previewWebsite"] | null
  >(null);
  const website = trpc.autoReply.previewWebsite.useMutation({
    onSuccess: (draft) => {
      setWebsiteDraft(draft);
      setEditing("new");
    },
    onError: (error) => toast.error(error.message),
  });
  const remove = trpc.autoReply.deleteTeaching.useMutation({
    onSuccess: () => utils.autoReply.teaching.invalidate(),
    onError: (e) => toast.error(e.message),
  });
  return (
    <section className="ar-panel">
      <div className="ar-toolbar">
        <h2>Teach AI</h2>
        <Button
          onClick={() => {
            setWebsiteDraft(null);
            setEditing("new");
          }}
        >
          إضافة نص للتعليم
        </Button>
      </div>
      <p>
        اكتب المعلومات وطريقة الرد بحرية. تقدر تضيف كذا نص، وتحدد الصفحة لكل
        واحد. المساعد يقرأ النصوص المفعّلة معًا ويرد منها بشكل طبيعي.
      </p>
      {editing !== null && (
        <Dialog
          open
          onOpenChange={(open) => {
            if (!open) setEditing(null);
          }}
        >
          <DialogContent
            dir="rtl"
            className="auto-reply ar-teach-dialog"
            onInteractOutside={(event) => event.preventDefault()}
          >
            <DialogHeader>
              <DialogTitle>
                {editing === "new"
                  ? "إضافة محتوى إلى Teach AI"
                  : "تعديل محتوى Teach AI"}
              </DialogTitle>
              <DialogDescription>
                اكتب النص كما تريد أن يفهمه المساعد، ثم حدد أين يُستخدم.
              </DialogDescription>
            </DialogHeader>
            <KnowledgeEditor
              key={editing === "new" ? "new" : editing.id}
              row={editing === "new" ? undefined : editing}
              pages={pages}
              websiteDraft={websiteDraft}
              close={() => setEditing(null)}
            />
          </DialogContent>
        </Dialog>
      )}
      <details>
        <summary>المواقع كمصدر للمعلومات</summary>
        <p>
          أضف رابط صفحة عامة، راجع النص المستخرج ثم احفظه. صفحات تسجيل الدخول
          والمحتوى الخاص لا تُقرأ.
        </p>
        <form
          className="ar-toolbar"
          onSubmit={(event) => {
            event.preventDefault();
            website.mutate({ url: websiteUrl });
          }}
        >
          <Field label="رابط الموقع">
            <Input
              type="url"
              dir="ltr"
              required
              value={websiteUrl}
              onChange={(event) => setWebsiteUrl(event.target.value)}
              placeholder="https://example.com/about"
              maxLength={2048}
            />
          </Field>
          <Button disabled={website.isPending}>
            {website.isPending ? "جارٍ قراءة الموقع…" : "قراءة ومعاينة الموقع"}
          </Button>
        </form>
      </details>
      <Field label="بحث في Teach AI">
        <Input value={search} onChange={(e) => setSearch(e.target.value)} />
      </Field>
      {query.isLoading && <p role="status">جارٍ تحميل محتوى Teach AI…</p>}
      {query.error && (
        <ErrorState
          message={query.error.message}
          retry={() => void query.refetch()}
        />
      )}
      {query.data?.length === 0 && (
        <p>
          لم تضف نصوصًا بعد. اضغط «إضافة نص للتعليم» واكتب المعلومات التي تريد
          أن يرد منها المساعد.
        </p>
      )}
      <div className="ar-knowledge-list">
        {query.data
          ?.filter((k) => `${k.title} ${k.content}`.includes(search))
          .map((k) => (
            <article key={k.id} className="ar-knowledge-row">
              <div>
                <strong>{k.title}</strong>
                <p>
                  {k.kind === "website" ? "محتوى موقع" : "نص تعليمي"} ·{" "}
                  {k.approved ? "مفعّل" : "متوقف"}
                </p>
                <p className="ar-prewrap">
                  {k.content.length > 350
                    ? `${k.content.slice(0, 350)}…`
                    : k.content}
                </p>
                <p>
                  يُستخدم في:{" "}
                  {!k.targetPage || k.targetPage === "all"
                    ? "الكل"
                    : k.targetPage === "whatsapp"
                      ? "واتساب"
                      : k.targetPage === "facebook"
                        ? "الصفحتان فقط"
                        : k.targetPage
                            .split(",")
                            .map((target) =>
                              target === "whatsapp"
                                ? "واتساب"
                                : pageLabel(target, pages),
                            )
                            .join("، ")}
                </p>
                <small>
                  {k.sourceUrl && (
                    <>
                      <bdi>{k.sourceUrl}</bdi> ·{" "}
                    </>
                  )}
                  آخر تعديل: {time(k.updatedAt)}
                </small>
              </div>
              <div className="ar-toolbar">
                <Button
                  variant="outline"
                  onClick={() => {
                    setWebsiteDraft(null);
                    setEditing(k);
                  }}
                >
                  فتح وتعديل
                </Button>
                <Button
                  variant="outline"
                  disabled={remove.isPending}
                  onClick={() => {
                    if (window.confirm(`حذف «${k.title}» من Teach AI؟`))
                      remove.mutate(k.id);
                  }}
                >
                  حذف
                </Button>
              </div>
            </article>
          ))}
      </div>
    </section>
  );
}
function KnowledgeEditor({
  row,
  close,
  pages,
  websiteDraft,
}: {
  row?: KnowledgeRow;
  close: () => void;
  pages: FacebookPages;
  websiteDraft: AutoReplyOutputs["previewWebsite"] | null;
}) {
  const [targetPage, setTargetPage] = useState(row?.targetPage ?? "all");
  const [title, setTitle] = useState(row?.title ?? websiteDraft?.title ?? "");
  const [content, setContent] = useState(
    row?.content ?? websiteDraft?.content ?? "",
  );
  const [approved, setApproved] = useState(row?.approved ?? !websiteDraft);
  const utils = trpc.useUtils();
  const save = trpc.autoReply.saveTeaching.useMutation({
    onSuccess: async () => {
      await utils.autoReply.teaching.invalidate();
      await utils.autoReply.settings.invalidate();
      close();
      toast.success("حُفظ محتوى Teach AI");
    },
    onError: (e) => toast.error(e.message),
  });
  return (
    <form
      className="ar-editor"
      onSubmit={(e) => {
        e.preventDefault();
        save.mutate({
          id: row?.id,
          title: title.trim() || content.trim().split("\n")[0].slice(0, 100),
          content,
          enabled: approved,
          sourceUrl: row?.sourceUrl ?? websiteDraft?.url,
          targetPage,
        });
      }}
    >
      <ReplyTargetSelect
        value={targetPage}
        onChange={setTargetPage}
        pages={pages}
        disabled={save.isPending}
      />
      <Field label="اسم المحتوى (اختياري)">
        <Input
          value={title}
          maxLength={255}
          onChange={(e) => setTitle(e.target.value)}
        />
      </Field>
      <Field label="النص الذي يتعلم منه المساعد">
        <Textarea
          aria-label="النص الذي يتعلم منه المساعد"
          value={content}
          maxLength={30000}
          required
          rows={12}
          onChange={(e) => setContent(e.target.value)}
        />
      </Field>
      <p>
        {content.length.toLocaleString("ar-EG")} / ٣٠٬٠٠٠ حرف. اكتب الخدمات
        والأسعار والمواعيد وأمثلة لطريقة الرد في نفس النص.
      </p>
      {websiteDraft?.truncated && (
        <p role="status">
          النص المستخرج طويل؛ تعرض المعاينة أول ٣٠٬٠٠٠ حرف. راجعه قبل التفعيل.
        </p>
      )}
      <Check
        label="استخدام هذا المحتوى في الردود"
        checked={approved}
        onChange={setApproved}
      />
      <div className="ar-toolbar">
        <Button disabled={save.isPending || !content.trim() || !targetPage}>
          حفظ المحتوى
        </Button>
        <Button type="button" variant="outline" onClick={close}>
          إلغاء
        </Button>
      </div>
    </form>
  );
}

function Settings({ data }: { data: AutoReplyOutputs["settings"] }) {
  const [config, setConfig] = useState<AutoReplySettings>(() =>
    autoReplySettingsSchema.parse(data.config),
  );
  const [stopDraft, setStopDraft] = useState(config.stopSequences.join("\n"));
  const utils = trpc.useUtils();
  const models = trpc.autoReply.models.useQuery(undefined, {
    retry: false,
    staleTime: 300000,
  });
  const clearHistory = trpc.autoReply.clearAIHistory.useMutation({
    onSuccess: (result) =>
      toast.success(
        `تم بدء سياق جديد لـ ${result.count} محادثة، دون حذف سجل الرسائل`,
      ),
    onError: (error) => toast.error(error.message),
  });
  const samplingSupported = supportsGeminiSampling(config.model);
  const save = trpc.autoReply.saveSettings.useMutation({
    onSuccess: async () => {
      await utils.autoReply.invalidate();
      toast.success("حُفظت الإعدادات؛ تُطبّق على الرسائل الجديدة");
    },
    onError: (e) => toast.error(e.message),
  });
  const check = trpc.autoReply.checkConnection.useMutation({
    onSuccess: async (r) => {
      await utils.autoReply.settings.invalidate();
      if (r.ok) toast.success("نجح فحص الوصول للأصل لدى Meta");
      else toast.error(`فشل الفحص: ${r.errorCode}`);
    },
    onError: (e) => toast.error(e.message),
  });
  const update = <K extends keyof AutoReplySettings>(
    key: K,
    value: AutoReplySettings[K],
  ) => setConfig((c) => ({ ...c, [key]: value }));
  return (
    <section className="ar-panel">
      <h2>الربط الرسمي بالقنوات</h2>
      <p>
        أضف الأسرار في بيئة السيرفر. هذه الشاشة لا تستقبل المفاتيح ولا تعرض
        قيمها. نجاح فحص الوصول لا يثبت اكتمال مراجعة التطبيق أو صلاحية إرسال كل
        أنواع الرسائل.
      </p>
      <p className="ar-notice">
        رقم تأكيد الحجوزات منفصل ويستمر بالربط الحالي. رقم خدمة العملاء يحتاج
        WhatsApp Business App Coexistence عبر Embedded Signup حتى يستمر على
        الموبايل. يجب التحقق من أهلية الرقم واستقبال حدث رد من الهاتف قبل تشغيل
        الرد الآلي.
      </p>
      <div className="ar-connection-list">
        <WhatsAppCoexistence />
        {data.channels.map((c) => (
          <article
            key={`${c.channel}:${c.accountId}:${c.label}`}
            className="ar-knowledge-row"
          >
            <div>
              <h3>
                {channelLabels[c.channel]} · {c.label}
              </h3>
              <p>
                {c.configured
                  ? "متغيرات الربط مضبوطة"
                  : "إعداد السيرفر غير مكتمل"}{" "}
                ·{" "}
                {c.checkFresh
                  ? "نجح فحص الوصول خلال آخر 24 ساعة"
                  : "يحتاج فحص وصول حديثًا"}
              </p>
              <p>
                معرّف الأصل: <bdi>{c.accountId || "غير مضبوط"}</bdi>
              </p>
              <p>
                آخر فحص: {time(c.checkedAt)} · آخر Webhook مطابق:{" "}
                {time(c.lastWebhookAt)}
              </p>
              {c.channel === "whatsapp" && (
                <p>
                  آخر رد مرصود من الموبايل: {time(c.lastMobileEchoAt)}. رد
                  الموظف يوقف البوت على المحادثة.
                </p>
              )}
              {c.errorCode && (
                <p role="status">
                  نتيجة الفحص: <bdi>{c.errorCode}</bdi>
                </p>
              )}
            </div>
            <Button
              variant="outline"
              disabled={!c.configured || check.isPending}
              onClick={() =>
                check.mutate({ channel: c.channel, accountId: c.accountId })
              }
            >
              فحص الوصول لدى Meta
            </Button>
          </article>
        ))}
      </div>
      <details>
        <summary>مسار Webhook والصلاحيات المطلوبة</summary>
        <p dir="ltr" className="ar-prewrap">
          {window.location.origin}/webhook/auto-reply/meta
        </p>
        <p>
          WhatsApp: whatsapp_business_messaging وwhatsapp_business_management.
          ماسنجر: pages_messaging. التعليقات: pages_read_engagement
          وpages_read_user_content وpages_manage_engagement. الاشتراك:
          pages_manage_metadata. راجع Advanced Access وApp Review وBusiness
          Verification حسب استخدام التطبيق والأصول.
        </p>
        <p>
          اشترك في messages وsmb_message_echoes لواتساب، وmessages
          وmessage_echoes وfeed للصفحة. دليل الإعداد داخل المستودع:
          docs/auto-reply-setup.md.
        </p>
      </details>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          save.mutate(config);
        }}
      >
        <h2>الإرسال وأسلوب الرد</h2>
        <Check
          label="السماح بالإرسال العام (يشمل الرد اليدوي)"
          checked={config.sendingEnabled}
          onChange={(v) => update("sendingEnabled", v)}
        />
        {autoReplyChannels.map((c) => (
          <Check
            key={c}
            label={`تشغيل الرد الآلي على ${channelLabels[c]}`}
            checked={config.channels[c]}
            onChange={(v) => update("channels", { ...config.channels, [c]: v })}
          />
        ))}
        <h3>تشغيل الرد لكل صفحة</h3>
        <p>
          مفتاح القناة العام يتحكم في الصفحتين. فعّل ماسنجر والتعليقات لكل صفحة
          على حدة بعد فحص اتصالها.
        </p>
        {data.pages.map((p, i) => (
          <fieldset key={`${p.accountId}:${i}`} className="ar-editor">
            <legend>{p.label}</legend>
            <p>
              معرّف الصفحة: <bdi>{p.accountId || "غير مضبوط على السيرفر"}</bdi>
            </p>
            {(["messenger", "facebook_comment"] as const).map((channel) => (
              <Check
                key={channel}
                label={`الرد الآلي على ${channelLabels[channel]} · ${p.label}`}
                disabled={!p.accountId || save.isPending}
                checked={config.facebookPages[p.accountId]?.[channel] ?? false}
                onChange={(value) =>
                  update("facebookPages", {
                    ...config.facebookPages,
                    [p.accountId]: {
                      ...(config.facebookPages[p.accountId] ?? {
                        messenger: false,
                        facebook_comment: false,
                      }),
                      [channel]: value,
                    },
                  })
                }
              />
            ))}
          </fieldset>
        ))}
        <div className="ar-form-grid">
          <Field label="موديل Gemini">
            <select
              className="ar-select"
              aria-label="موديل Gemini"
              dir="ltr"
              required
              value={config.model}
              onChange={(e) =>
                setConfig((current) => ({
                  ...current,
                  model: e.target.value,
                  topK: null,
                }))
              }
            >
              {!models.data?.some((model) => model.id === config.model) && (
                <option value={config.model}>{config.model}</option>
              )}
              {models.data?.map((model) => (
                <option key={model.id} value={model.id}>
                  {model.label} ({model.id})
                </option>
              ))}
            </select>
          </Field>
          <Field label="أقصى طول للرد بالحروف">
            <Input
              type="number"
              min={100}
              max={2000}
              value={config.maxReplyChars}
              onChange={(e) => update("maxReplyChars", Number(e.target.value))}
            />
          </Field>
          <Field label="الاحتفاظ بالمحادثات بالأيام (7–365)">
            <Input
              type="number"
              min={7}
              max={365}
              value={config.retentionDays}
              onChange={(e) => update("retentionDays", Number(e.target.value))}
            />
          </Field>
        </div>
        {models.isLoading && (
          <p role="status">جارٍ تحميل الموديلات المتاحة لحسابك…</p>
        )}
        {models.error && (
          <ErrorState
            message={models.error.message}
            retry={() => void models.refetch()}
          />
        )}
        <p>
          Gemini:{" "}
          {data.geminiConfigured
            ? "المفتاح مضبوط على السيرفر، استخدم الاختبار الداخلي للتحقق من الموديل"
            : "المفتاح غير مضبوط على السيرفر"}
          . لا يتاح للبوت تعديل بيانات المرضى أو الحجوزات.
        </p>
        <h2>AI Settings · ذاكرة المحادثة</h2>
        <Field label="عدد الرسائل التي يتذكرها المساعد">
          <Input
            type="number"
            min={0}
            max={50}
            value={config.historyMessageLimit}
            onChange={(event) =>
              update("historyMessageLimit", Number(event.target.value))
            }
          />
        </Field>
        <p>
          من ٠ إلى ٥٠ رسالة لكل محادثة. اختيار ٠ يوقف إرسال التاريخ للموديل، مع
          بقاء الرسالة الجديدة.
        </p>
        <Button
          type="button"
          variant="outline"
          disabled={clearHistory.isPending}
          onClick={() => {
            if (
              window.confirm(
                "بدء سياق جديد لكل المحادثات؟ سجل الرسائل سيظل محفوظًا، ولن يتغير وضع الموظف أو تشغيل البوت.",
              )
            )
              clearHistory.mutate({});
          }}
        >
          مسح سياق الذكاء الاصطناعي
        </Button>
        <details>
          <summary>AI Parameters · إعدادات التوليد</summary>
          <p>
            {samplingSupported
              ? "غيّر القيم عند الحاجة؛ الإعدادات الافتراضية مناسبة للبدء."
              : "الموديل الحالي لا يطبق temperature وtopP وtopK؛ يمكن ضبط حد المخرجات وعبارات التوقف."}
          </p>
          <div className="ar-form-grid">
            <Field label="Temperature">
              <Input
                type="number"
                min={0}
                max={2}
                step={0.1}
                disabled={!samplingSupported}
                value={config.temperature}
                onChange={(event) =>
                  update("temperature", Number(event.target.value))
                }
              />
            </Field>
            <Field label="topP">
              <Input
                type="number"
                min={0.01}
                max={1}
                step={0.05}
                disabled={!samplingSupported}
                value={config.topP}
                onChange={(event) => update("topP", Number(event.target.value))}
              />
            </Field>
            <Field label="topK (اختياري)">
              <Input
                type="number"
                min={1}
                max={100}
                disabled={
                  !samplingSupported ||
                  !models.data?.find((model) => model.id === config.model)?.topK
                }
                value={config.topK ?? ""}
                placeholder="افتراضي الموديل"
                onChange={(event) =>
                  update(
                    "topK",
                    event.target.value ? Number(event.target.value) : null,
                  )
                }
              />
            </Field>
            <Field label="maxOutputTokens">
              <Input
                type="number"
                min={500}
                max={Math.min(
                  8192,
                  models.data?.find((model) => model.id === config.model)
                    ?.outputTokenLimit ?? 8192,
                )}
                value={config.maxOutputTokens}
                onChange={(event) =>
                  update("maxOutputTokens", Number(event.target.value))
                }
              />
            </Field>
          </div>
          <Field label="stopSequences (كل عبارة في سطر)">
            <Textarea
              aria-label="stopSequences (كل عبارة في سطر)"
              rows={3}
              value={stopDraft}
              onChange={(event) => {
                setStopDraft(event.target.value);
                update(
                  "stopSequences",
                  event.target.value.split("\n").filter(Boolean),
                );
              }}
            />
          </Field>
          <p>
            حتى ٥ عبارات توقف، و٤٠ حرفًا للعبارة. حد المخرجات يشمل توليد JSON
            وقد يشمل التفكير؛ حد قليل جدًا قد يقطع الرد.
          </p>
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              setStopDraft("");
              setConfig((current) => ({
                ...current,
                temperature: 0.2,
                topP: 0.95,
                topK: null,
                maxOutputTokens: 4096,
                stopSequences: [],
              }));
            }}
          >
            استعادة إعدادات التوليد
          </Button>
        </details>
        <Field label="تعليمات أسلوب الرد">
          <Textarea
            rows={3}
            maxLength={3000}
            value={config.style}
            onChange={(e) => update("style", e.target.value)}
          />
        </Field>
        <h2>تعليمات إضافية للرد</h2>
        <p>
          أضف كل تعليمة في خانة مستقلة. تُطبّق التعليمات المفعّلة معًا، ولا
          تتجاوز قواعد الخصوصية أو التحويل لموظف أو حظر التشخيص والعلاج.
        </p>
        {config.instructions.map((instruction, index) => (
          <fieldset className="ar-editor" key={index}>
            <legend>تعليمة {index + 1}</legend>
            <ReplyTargetSelect
              label={`تطبيق التعليمة ${index + 1} على`}
              value={instruction.targetPage ?? "all"}
              pages={data.pages}
              disabled={save.isPending}
              onChange={(targetPage) =>
                update(
                  "instructions",
                  config.instructions.map((item, i) =>
                    i === index ? { ...item, targetPage } : item,
                  ),
                )
              }
            />
            <Field label={`نص التعليمة ${index + 1}`}>
              <Textarea
                aria-label={`نص التعليمة ${index + 1}`}
                rows={3}
                maxLength={1000}
                required
                value={instruction.text}
                disabled={save.isPending}
                onChange={(e) =>
                  update(
                    "instructions",
                    config.instructions.map((item, i) =>
                      i === index ? { ...item, text: e.target.value } : item,
                    ),
                  )
                }
              />
            </Field>
            <div className="ar-toolbar">
              <Check
                label={`تفعيل التعليمة ${index + 1}`}
                checked={instruction.enabled}
                disabled={save.isPending}
                onChange={(enabled) =>
                  update(
                    "instructions",
                    config.instructions.map((item, i) =>
                      i === index ? { ...item, enabled } : item,
                    ),
                  )
                }
              />
              <Button
                type="button"
                variant="outline"
                disabled={save.isPending}
                aria-label={`حذف التعليمة ${index + 1}`}
                onClick={() =>
                  update(
                    "instructions",
                    config.instructions.filter((_, i) => i !== index),
                  )
                }
              >
                حذف التعليمة
              </Button>
            </div>
          </fieldset>
        ))}
        <Button
          type="button"
          variant="outline"
          disabled={save.isPending || config.instructions.length >= 30}
          onClick={() =>
            update("instructions", [
              ...config.instructions,
              { text: "", enabled: true, targetPage: "all" },
            ])
          }
        >
          إضافة تعليمة
        </Button>
        <p>
          حتى 30 تعليمة، و1000 حرف للواحدة وبحد أقصى 12000 حرف إجمالًا. اضغط حفظ
          الإعدادات لتطبيق التغييرات.
        </p>
        <h2>ساعات العمل بتوقيت القاهرة</h2>
        <Check
          label="إرسال رسالة خارج المواعيد"
          checked={config.hoursEnabled}
          onChange={(v) => update("hoursEnabled", v)}
        />
        {config.hours.map((h, i) => (
          <div className="ar-hours" key={i}>
            <Field label="اليوم">
              <select
                className="ar-select"
                value={h.day}
                onChange={(e) =>
                  update(
                    "hours",
                    config.hours.map((item, n) =>
                      n === i ? { ...item, day: Number(e.target.value) } : item,
                    ),
                  )
                }
              >
                {[
                  "الأحد",
                  "الاثنين",
                  "الثلاثاء",
                  "الأربعاء",
                  "الخميس",
                  "الجمعة",
                  "السبت",
                ].map((d, n) => (
                  <option key={n} value={n}>
                    {d}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="من">
              <Input
                type="time"
                value={h.start}
                onChange={(e) =>
                  update(
                    "hours",
                    config.hours.map((item, n) =>
                      n === i ? { ...item, start: e.target.value } : item,
                    ),
                  )
                }
              />
            </Field>
            <Field label="إلى">
              <Input
                type="time"
                value={h.end}
                onChange={(e) =>
                  update(
                    "hours",
                    config.hours.map((item, n) =>
                      n === i ? { ...item, end: e.target.value } : item,
                    ),
                  )
                }
              />
            </Field>
            <Button
              type="button"
              variant="outline"
              onClick={() =>
                update(
                  "hours",
                  config.hours.filter((_, n) => n !== i),
                )
              }
            >
              حذف الفترة {i + 1}
            </Button>
          </div>
        ))}
        <Button
          type="button"
          variant="outline"
          disabled={config.hours.length >= 28}
          onClick={() =>
            update("hours", [
              ...config.hours,
              { day: 0, start: "09:00", end: "17:00" },
            ])
          }
        >
          إضافة فترة عمل للمراجعة
        </Button>
        <p className="ar-muted">
          الفترات التي تنتهي قبل بدايتها تمتد لليوم التالي. لا تُرسل هذه
          المواعيد للعميل إلا إذا كتبتها في محتوى Teach AI المفعّل.
        </p>
        <Field label="رسالة خارج المواعيد بالعربية">
          <Textarea
            value={config.outsideMessage}
            maxLength={1000}
            onChange={(e) => update("outsideMessage", e.target.value)}
          />
        </Field>
        <Field label="رسالة خارج المواعيد بالإنجليزية">
          <Textarea
            dir="ltr"
            value={config.outsideMessageEn}
            maxLength={1000}
            onChange={(e) => update("outsideMessageEn", e.target.value)}
          />
        </Field>
        <p>
          حفظ الإعدادات يلغي الردود المنتظرة حتى لا تُرسل وفق تعليمات قديمة.
          الاحتفاظ يحذف المحتوى دوريًا؛ تبقى بصمات أحداث غير نصية 90 يومًا لمنع
          التكرار.
        </p>
        <Button disabled={save.isPending}>
          {save.isPending ? "جارٍ الحفظ…" : "حفظ إعدادات الرد الآلي"}
        </Button>
      </form>
    </section>
  );
}
function InternalTest({ pages }: { pages: FacebookPages }) {
  const [accountId, setAccountId] = useState("");
  const [channel, setChannel] = useState<AutoReplyChannel>("whatsapp");
  const [text, setText] = useState("");
  const test = trpc.autoReply.test.useMutation();
  return (
    <section className="ar-panel">
      <h2>اختبار داخلي دون إرسال للعملاء</h2>
      <p>
        يستخدم المعرفة المعتمدة والموديل المحدد. لا ينشئ محادثة حقيقية أو مهمة
        إرسال. قد يستهلك رصيد Gemini.
      </p>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          test.mutate({
            channel,
            text,
            accountId: channel === "whatsapp" ? undefined : accountId,
          });
        }}
      >
        <ChannelSelect
          value={channel}
          onChange={(v) => setChannel(v as AutoReplyChannel)}
        />
        {channel !== "whatsapp" && (
          <ReplyTargetSelect
            label="صفحة الاختبار"
            value={accountId}
            onChange={setAccountId}
            pages={pages}
            includeAll={false}
          />
        )}
        <Field label="رسالة العميل للاختبار">
          <Textarea
            required
            value={text}
            maxLength={3000}
            rows={4}
            onChange={(e) => setText(e.target.value)}
          />
        </Field>
        <Button disabled={test.isPending || !text.trim()}>
          {test.isPending ? "جارٍ تحضير المقترح…" : "عرض الرد المقترح"}
        </Button>
      </form>
      {test.error && <ErrorState message={test.error.message} />}
      {test.data && (
        <div className="ar-notice" role="status">
          <h3>نتيجة اختبار، لم يُرسل رد</h3>
          <p className="ar-prewrap" dir="auto">
            {test.data.text}
          </p>
          <p>
            {test.data.handoff ? "يُحوّل لموظف ويوقف البوت" : "يمكن الرد آليًا"}{" "}
            · السبب: <bdi>{test.data.reason ?? "معلومة معتمدة"}</bdi>
          </p>
          <p>
            مصادر الرد:{" "}
            {test.data.sourceIds
              .map((id) => (id < 0 ? `تعليمة ${-id}` : `معلومة ${id}`))
              .join("، ") || "تواصل عام دون معلومة محددة"}{" "}
            · الموديل:{" "}
            <bdi>{test.data.model ?? "رد سياسة ثابت دون Gemini"}</bdi>
          </p>
          <p>
            استهلاك الطلب: إدخال {test.data.inputTokens} · إخراج{" "}
            {test.data.outputTokens}
          </p>
          {!test.data.inWorkingHours && (
            <p>
              الوقت الحالي خارج المواعيد. في الإرسال الحقيقي تُطبّق رسالة خارج
              المواعيد بعد قواعد السلامة.
            </p>
          )}
        </div>
      )}
    </section>
  );
}
function Activity({ pages }: { pages: FacebookPages }) {
  const query = trpc.autoReply.activity.useQuery(undefined, {
    refetchInterval: 10_000,
  });
  return (
    <section className="ar-panel">
      <h2>آخر 100 مهمة إرسال</h2>
      <p>
        يعرض الحالات وأكواد الأخطاء واستهلاك Gemini دون نصوص العملاء أو
        المفاتيح. «قبلتها Meta» لا تعني تسليمها للعميل. الإرسال غير المحسوم لا
        يعاد تلقائيًا.
      </p>
      {query.isLoading && <p role="status">جارٍ تحميل السجل…</p>}
      {query.error && (
        <ErrorState
          message={query.error.message}
          retry={() => void query.refetch()}
        />
      )}
      {query.data?.length === 0 && (
        <p>لا توجد مهام إرسال. نتائج الاختبار الداخلي لا تظهر كإرسال حقيقي.</p>
      )}
      <div
        className="ar-table-wrap"
        role="region"
        aria-label="سجل إرسال الردود"
        tabIndex={0}
      >
        <table>
          <thead>
            <tr>
              <th>المهمة</th>
              <th>القناة / المحادثة</th>
              <th>الحالة</th>
              <th>المحاولات / الخطأ</th>
              <th>Gemini</th>
              <th>آخر تحديث</th>
            </tr>
          </thead>
          <tbody>
            {query.data?.map((j) => (
              <tr key={j.id}>
                <td>
                  #{j.id} · {j.kind === "auto" ? "آلي" : "موظف"}
                </td>
                <td>
                  {channelLabels[j.channel]} · #{j.conversationId}
                  {j.channel !== "whatsapp" && (
                    <>
                      <br />
                      {pageLabel(j.accountId, pages)} · <bdi>{j.accountId}</bdi>
                    </>
                  )}
                </td>
                <td>{statusLabels[j.state] ?? j.state}</td>
                <td>
                  {j.attempts} · <bdi>{j.errorCode ?? "لا يوجد"}</bdi>
                </td>
                <td>
                  <bdi>{j.model ?? "لم يُستخدم"}</bdi>
                  <br />
                  إدخال {j.inputTokens} · إخراج {j.outputTokens}
                </td>
                <td>{time(j.updatedAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
