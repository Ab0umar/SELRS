import { useEffect, useId, useRef, useState, type ReactNode } from "react";
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
  autoReplyErrorLabel,
  handoffReasonLabel,
  channelLabels,
  autoReplySettingsSchema,
  supportsGeminiSampling,
  settingsForTarget,
  isAutoReplyEnabled,
  defaultAutoReplySettings,
  handoffReopenPresets,
  presetChoices,
  presetCustomLabels,
  presetLabel,
  replyLengthPresets,
  staffReplyPausePresets,
  type SettingPreset,
  type AutoReplyChannel,
  type AutoReplySettings,
} from "../../../../shared/auto-reply";
import type { inferRouterOutputs } from "@trpc/server";
import type { autoReplyRouter } from "../../../../server/routers/autoReply";
import "./AutoReply.css";
import {
  WhatsAppCoexistence,
  states as coexistenceStates,
} from "./WhatsAppCoexistence";
import AssistantModelSelect from "@/features/ai/AssistantModelSelect";

function ChannelTabs({
  value,
  onChange,
  pageOnly = false,
}: {
  value: string;
  onChange: (value: AutoReplyChannel) => void;
  pageOnly?: boolean;
}) {
  return (
    <nav className="ar-subtabs" aria-label="القنوات">
      {[
        ["whatsapp", "واتساب"],
        ["messenger", "مسنجر"],
        ["facebook_comment", "كومينت"],
      ]
        .filter(([id]) => !pageOnly || id !== "whatsapp")
        .map(([id, label]) => (
          <Button
            key={id}
            type="button"
            variant={value === id ? "default" : "ghost"}
            aria-pressed={value === id}
            onClick={() => onChange(id as AutoReplyChannel)}
          >
            {label}
          </Button>
        ))}
    </nav>
  );
}
function TargetTabs({
  value,
  onChange,
  pages,
}: {
  value: string;
  onChange: (value: string) => void;
  pages: FacebookPages;
}) {
  return (
    <nav className="ar-subtabs" aria-label="جهة المحتوى">
      {[
        { id: "whatsapp", label: "واتساب" },
        ...pages.slice(0, 2).map((page, index) => ({
          id: page.accountId,
          label: index === 0 ? "المركز" : "العيادة",
        })),
        { id: "all", label: "الكل" },
      ].map(({ id, label }) => (
        <Button
          key={id}
          type="button"
          variant={value === id ? "default" : "ghost"}
          aria-pressed={value === id}
          onClick={() => onChange(id)}
        >
          {label}
        </Button>
      ))}
    </nav>
  );
}
const belongsToTarget = (value: string | undefined, target: string) =>
  target === "all"
    ? !value || value === "all" || value === "facebook" || value.includes(",")
    : value === target;
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
  suggested: "اقتراح ينتظر المراجعة",
  approved: "اقتراح معتمد",
  discarded: "اقتراح مرفوض",
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
        <Button type="button" variant="outline" onClick={retry}>
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
  disabled = false,
}: {
  value: string;
  onChange: (v: string) => void;
  all?: boolean;
  disabled?: boolean;
}) {
  return (
    <select
      className="ar-select"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      aria-label="القناة"
      disabled={disabled}
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

type ChannelTab = "inbox" | "reply" | "connect" | "knowledge";
type View =
  | { kind: "board" }
  | { kind: "conversations" }
  | {
      kind: "channel";
      scope: string;
      tab: ChannelTab;
      channel?: AutoReplyChannel;
    }
  | { kind: "shared"; part: "knowledge" | "settings" | "test" };
type SettingsData = AutoReplyOutputs["settings"];
type ChannelRow = SettingsData["channels"][number];
type Tone = "on" | "wait" | "off" | "idle";

const scopeName = (scope: string, pages: FacebookPages) => {
  if (scope === "whatsapp") return "واتساب";
  const index = pages.findIndex((page) => page.accountId === scope);
  if (index === 0) return "صفحة المركز";
  if (index === 1) return "صفحة العيادة";
  return pageLabel(scope, pages);
};
const rowScope = (row: { channel: AutoReplyChannel; accountId: string }) =>
  row.channel === "whatsapp" ? "whatsapp" : row.accountId;
const rowName = (row: ChannelRow, pages: FacebookPages) =>
  row.channel === "whatsapp"
    ? channelLabels.whatsapp
    : `${channelLabels[row.channel]} · ${scopeName(row.accountId, pages)}`;

// Built only from the saved settings and the last stored Meta check.
function channelState(
  row: ChannelRow,
  config: AutoReplySettings,
): { tone: Tone; label: string } {
  if (!row.configured) return { tone: "off", label: "إعداد السيرفر غير مكتمل" };
  if (row.errorCode)
    return {
      tone: "off",
      label: `فشل آخر فحص: ${autoReplyErrorLabel(row.errorCode)}`,
    };
  if (!isAutoReplyEnabled(config, row.channel, row.accountId))
    return { tone: "idle", label: "الرد الآلي مقفول للقناة" };
  if (!config.sendingEnabled)
    return { tone: "idle", label: "الإرسال العام متوقف" };
  if (!row.checkedAt) return { tone: "wait", label: "شغّال · لم يُفحص الاتصال" };
  if (!row.checkOk)
    return { tone: "wait", label: "شغّال · الربط اتغيّر بعد آخر فحص" };
  if (!row.checkFresh)
    return { tone: "wait", label: "شغّال · آخر فحص أقدم من يوم" };
  return { tone: "on", label: "شغّال" };
}
const parsedConfig = (data: SettingsData) =>
  autoReplySettingsSchema.parse(data.config);

export default function AutoReply() {
  const [settingsDirty, setSettingsDirty] = useState(false);
  const canLeaveSettings = () =>
    !settingsDirty || window.confirm("عندك تعديلات لم تُحفظ. تسيبها وتكمل؟");
  const [previewPending, setPreviewPending] = useState(() => {
    try {
      return Boolean(sessionStorage.getItem("selrs.ai.reply.preview"));
    } catch {
      return false;
    }
  });
  const [testTarget, setTestTarget] = useState(() => {
    const pending = restoredPreview();
    return pending && pending.channel !== "whatsapp"
      ? pending.accountId || "whatsapp"
      : "whatsapp";
  });
  const [view, setView] = useState<View>(() => {
    if (previewPending) return { kind: "shared", part: "test" };
    if (new URLSearchParams(window.location.search).get("conversation"))
      return { kind: "conversations" };
    return { kind: "board" };
  });
  const go = (next: View) => {
    // الرد and الربط share one settings form, so moving between them keeps the draft.
    const formTabs: ChannelTab[] = ["reply", "connect"];
    const keepsForm =
      view.kind === "channel" &&
      next.kind === "channel" &&
      view.scope === next.scope &&
      formTabs.includes(view.tab) &&
      formTabs.includes(next.tab);
    if (!keepsForm) {
      if (!canLeaveSettings()) return;
      setSettingsDirty(false);
    }
    setView(next);
    window.scrollTo({ top: 0 });
  };
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
  const data = settings.data;
  const title =
    view.kind === "board"
      ? "الرد الآلي"
      : view.kind === "conversations"
        ? "كل المحادثات"
        : view.kind === "channel"
          ? data
            ? scopeName(view.scope, data.pages)
            : "القناة"
          : view.part === "knowledge"
            ? "معلومات المركز"
            : view.part === "settings"
              ? "التعليمات والإعدادات المشتركة"
              : "اختبار داخلي";
  const config = data ? parsedConfig(data) : null;
  const live = data
    ? data.channels.filter((row) =>
        ["on", "wait"].includes(channelState(row, config!).tone),
      ).length
    : 0;
  return (
    <main className="auto-reply" dir="rtl">
      {view.kind !== "board" && (
        <Button
          type="button"
          variant="outline"
          className="ar-back"
          disabled={previewPending && view.kind === "shared"}
          onClick={() => go({ kind: "board" })}
        >
          رجوع للوحة
        </Button>
      )}
      <header className="ar-header">
        <div>
          <h1>{title}</h1>
          {data && config && view.kind === "board" && (
            <p role="status">
              {config.sendingEnabled
                ? `بيرد على ${count(live)} من ${count(data.channels.length)} قنوات`
                : "الإرسال العام متوقف · مفيش رسائل بتتبعت للعملاء"}
            </p>
          )}
          {data && view.kind === "channel" && (
            <p>
              {data.channels
                .filter((row) => rowScope(row) === view.scope)
                .map(
                  (row) =>
                    `${channelLabels[row.channel]}: ${channelState(row, config!).label}`,
                )
                .join(" · ")}
            </p>
          )}
        </div>
        {data && (
          <div className="ar-toolbar">
            {view.kind !== "board" && (
              <strong role="status">
                {data.config.sendingEnabled
                  ? "الإرسال العام مفعّل"
                  : "الإرسال العام متوقف"}
              </strong>
            )}
            <Button
              variant="destructive"
              disabled={!data.config.sendingEnabled || stop.isPending}
              onClick={() =>
                stop.mutate({ ...data.config, sendingEnabled: false })
              }
            >
              إيقاف كل الإرسال
            </Button>
          </div>
        )}
      </header>
      {settings.isLoading ? (
        <p role="status">جارٍ تحميل إعدادات الرد الآلي…</p>
      ) : settings.error ? (
        <ErrorState
          message={`تعذر تحميل القسم: ${settings.error.message}. تأكد من تطبيق migration الخاص بالرد الآلي.`}
          retry={() => void settings.refetch()}
        />
      ) : (
        data &&
        config && (
          <>
            {!data.workerEnabled && (
              <p className="ar-notice">
                عامل الخلفية غير مفعّل على السيرفر. الاختبار الداخلي متاح، ولن
                تُرسل رسائل للعملاء.
              </p>
            )}
            {view.kind === "board" && (
              <StatusBoard data={data} config={config} onOpen={go} />
            )}
            {view.kind === "conversations" && (
              <Inbox
                sendingEnabled={data.config.sendingEnabled}
                pages={data.pages}
                filters={inboxFilters(data.pages)}
              />
            )}
            {view.kind === "channel" && (
              <>
                <div
                  className="ar-seg ar-channel-tabs"
                  role="group"
                  aria-label="أقسام القناة"
                >
                  {(
                    [
                      ["inbox", "المحادثات"],
                      ["reply", "الرد"],
                      ["connect", "الربط"],
                      ["knowledge", "معلومات المركز"],
                    ] as [ChannelTab, string][]
                  ).map(([id, label]) => (
                    <button
                      key={id}
                      type="button"
                      aria-pressed={view.tab === id}
                      onClick={() =>
                        view.tab !== id && go({ ...view, tab: id })
                      }
                    >
                      {label}
                    </button>
                  ))}
                </div>
                {view.tab === "inbox" && (
                  <Inbox
                    key={view.scope}
                    sendingEnabled={data.config.sendingEnabled}
                    pages={data.pages}
                    filters={inboxFilters(data.pages, view.scope)}
                    initialFilter={
                      view.channel && view.channel !== "whatsapp"
                        ? `${view.channel}:${view.scope}`
                        : undefined
                    }
                  />
                )}
                {(view.tab === "reply" || view.tab === "connect") && (
                  <div hidden={view.tab !== "reply"}>
                    <Settings
                      key={`${view.scope}:${data.config.model}:${data.config.engine}`}
                      data={data}
                      scope={view.scope}
                      onDirtyChange={setSettingsDirty}
                    />
                  </div>
                )}
                {view.tab === "connect" && (
                  <Connection
                    key={view.scope}
                    data={data}
                    scope={view.scope}
                    onOpenInbox={() => go({ ...view, tab: "inbox" })}
                  />
                )}
                {view.tab === "knowledge" && (
                  <Knowledge
                    key={view.scope}
                    pages={data.pages}
                    scope={view.scope}
                    aside={
                      <aside className="ar-try" aria-label="جرّب سؤال">
                        <InternalTest
                          compact
                          scope={view.scope}
                          pages={data.pages}
                          activeEngine={data.config.engine}
                          onPendingChange={setPreviewPending}
                        />
                      </aside>
                    }
                  />
                )}
              </>
            )}
            {view.kind === "shared" && view.part === "knowledge" && (
              <Knowledge pages={data.pages} scope="all" />
            )}
            {view.kind === "shared" && view.part === "settings" && (
              <>
                <details className="ar-assistant-disclosure">
                  <summary>المساعد والموديل الحالي</summary>
                  <ReplyAssistantSelect
                    key={`${data.config.model}:${data.config.engine}`}
                    data={data}
                    disabled={previewPending}
                  />
                </details>
                <Settings
                  key={`all:${data.config.model}:${data.config.engine}`}
                  data={data}
                  scope="all"
                  onDirtyChange={setSettingsDirty}
                />
              </>
            )}
            {view.kind === "shared" && view.part === "test" && (
              <>
                <Field label="اختبار الرد كأنه على">
                  <select
                    className="ar-select"
                    value={testTarget}
                    disabled={previewPending}
                    onChange={(e) => setTestTarget(e.target.value)}
                  >
                    <option value="whatsapp">واتساب</option>
                    {data.pages.map((page) => (
                      <option key={page.accountId} value={page.accountId}>
                        {scopeName(page.accountId, data.pages)}
                      </option>
                    ))}
                  </select>
                </Field>
                <InternalTest
                  key={testTarget}
                  scope={testTarget}
                  pages={data.pages}
                  activeEngine={data.config.engine}
                  onPendingChange={setPreviewPending}
                />
              </>
            )}
          </>
        )
      )}
    </main>
  );
}

function StatusBoard({
  data,
  config,
  onOpen,
}: {
  data: SettingsData;
  config: AutoReplySettings;
  onOpen: (view: View) => void;
}) {
  const counts = trpc.autoReply.humanCounts.useQuery(undefined, {
    refetchInterval: 30_000,
  });
  const recipients = config.whatsappRecipients;
  const audience = trpc.autoReply.whatsappContactAudience.useQuery(undefined, {
    enabled: recipients.mode === "except_contacts",
    refetchInterval: 30_000,
    retry: false,
  });
  const utils = trpc.useUtils();
  const check = trpc.autoReply.checkConnection.useMutation({
    onSuccess: async (r) => {
      await utils.autoReply.settings.invalidate();
      if (r.ok) toast.success("نجح فحص الوصول للأصل لدى Meta");
      else
        toast.error(
          `فشل الفحص: ${autoReplyErrorLabel(r.errorCode ?? "META_CHECK_FAILED")}`,
        );
    },
    onError: (e) => toast.error(e.message),
  });
  const humanFor = (row: { channel: AutoReplyChannel; accountId: string }) =>
    (counts.data ?? [])
      .filter(
        (c) =>
          c.channel === row.channel &&
          (row.channel === "whatsapp" || c.accountId === row.accountId),
      )
      .reduce((sum, c) => sum + c.count, 0);
  const humanTotal = (counts.data ?? []).reduce((sum, c) => sum + c.count, 0);
  const needs: {
    key: string;
    title: string;
    detail: string;
    action: ReactNode;
  }[] = [];
  if (humanTotal > 0)
    needs.push({
      key: "human",
      title: `${count(humanTotal)} محادثة مستنية موظف`,
      detail: "البوت وقف عليها لحد ما حد يرد أو يرجّعها له.",
      action: (
        <Button onClick={() => onOpen({ kind: "conversations" })}>
          افتح المحادثات
        </Button>
      ),
    });
  for (const row of data.channels.filter((r) => r.errorCode))
    needs.push({
      key: `check:${row.channel}:${row.accountId}`,
      title: `${rowName(row, data.pages)}: فشل آخر فحص للاتصال`,
      detail: `${autoReplyErrorLabel(row.errorCode!)} · ${time(row.checkedAt)}`,
      action: (
        <Button
          variant="outline"
          disabled={check.isPending}
          onClick={() =>
            check.mutate({ channel: row.channel, accountId: row.accountId })
          }
        >
          {check.isPending ? "جارٍ الفحص…" : "افحص الاتصال"}
        </Button>
      ),
    });
  if (
    recipients.mode === "except_contacts" &&
    !audience.isLoading &&
    (!audience.data?.available ||
      recipients.confirmedContactSync !== audience.data.syncId)
  )
    needs.push({
      key: "contacts",
      title: "واتساب: قائمة جهات الاتصال محتاجة مراجعة",
      detail: audience.isError
        ? "تعذر قراءة حالة مزامنة جهات الاتصال."
        : !audience.data?.available
          ? "جهات الاتصال مش متاحة من الهاتف المرتبط، والمستلمين مضبوطين على استثنائها."
          : `جهات الاتصال المُزامنة: ${count(audience.data.count)}، ولسه ما اتأكدتش.`,
      action: (
        <Button
          variant="outline"
          onClick={() =>
            onOpen({ kind: "channel", scope: "whatsapp", tab: "reply" })
          }
        >
          راجع وأكّد
        </Button>
      ),
    });
  if (!config.sendingEnabled)
    needs.push({
      key: "sending",
      title: "الإرسال العام متوقف",
      detail: "مفيش ردود بتتبعت للعملاء، ولا الردود اليدوية.",
      action: (
        <Button
          variant="outline"
          onClick={() => onOpen({ kind: "shared", part: "settings" })}
        >
          افتح الإعدادات المشتركة
        </Button>
      ),
    });
  return (
    <div className="ar-board">
      <section className="ar-needs" aria-labelledby="ar-needs-title">
        <h2 id="ar-needs-title">محتاج منك</h2>
        {counts.error && (
          <ErrorState
            message={`تعذر حساب المحادثات المستنية موظف: ${counts.error.message}`}
            retry={() => void counts.refetch()}
          />
        )}
        {needs.length ? (
          <ul>
            {needs.map((item) => (
              <li key={item.key}>
                <div>
                  <strong>{item.title}</strong>
                  <p className="ar-muted">{item.detail}</p>
                </div>
                {item.action}
              </li>
            ))}
          </ul>
        ) : counts.isLoading ? (
          <p role="status">جارٍ مراجعة الحالة…</p>
        ) : (
          !counts.error && <p>مفيش حاجة محتاجة منك دلوقتي.</p>
        )}
      </section>
      <section aria-labelledby="ar-channels-title">
        <h2 id="ar-channels-title">القنوات</h2>
        {data.channels.length === 0 ? (
          <p>مفيش قنوات مضبوطة على السيرفر.</p>
        ) : (
          <ul className="ar-channel-list">
            <li className="ar-channel-head" aria-hidden="true">
              <span>القناة</span>
              <span>الحالة</span>
              <span>طريقة الرد</span>
              <span>مع موظف</span>
              <span />
            </li>
            {data.channels.map((row) => {
              const state = channelState(row, config);
              const mode = settingsForTarget(
                config,
                row.channel,
                row.accountId,
              ).replyMode;
              return (
                <li key={`${row.channel}:${row.accountId}`}>
                  <strong>{rowName(row, data.pages)}</strong>
                  <span className={`ar-state ar-state-${state.tone}`}>
                    {state.label}
                  </span>
                  <span>
                    {mode === "suggest" ? "يقترح وأنا أوافق" : "يرد لوحده"}
                  </span>
                  <span>
                    <span className="ar-mobile-label">مع موظف: </span>
                    {counts.data ? count(humanFor(row)) : "…"}
                  </span>
                  <Button
                    variant="outline"
                    aria-label={`فتح ${rowName(row, data.pages)}`}
                    onClick={() =>
                      onOpen({
                        kind: "channel",
                        scope: rowScope(row),
                        tab: "inbox",
                        channel: row.channel,
                      })
                    }
                  >
                    فتح
                  </Button>
                </li>
              );
            })}
          </ul>
        )}
      </section>
      <section aria-labelledby="ar-shared-title">
        <h2 id="ar-shared-title">مشترك بين كل القنوات</h2>
        <ul className="ar-shared-list">
          {(
            [
              [
                "knowledge",
                "معلومات المركز",
                "مكتبة Teach AI اللي المساعد بيرد منها.",
              ],
              [
                "settings",
                "التعليمات والإعدادات المشتركة",
                "المساعد والموديل، أسلوب الرد الافتراضي، المواعيد وحدود الرد.",
              ],
              [
                "test",
                "اختبار داخلي",
                "جرّب رد البوت على رسالة من غير ما يتبعت لعميل.",
              ],
            ] as ["knowledge" | "settings" | "test", string, string][]
          ).map(([part, label, detail]) => (
            <li key={part}>
              <div>
                <strong>{label}</strong>
                <p className="ar-muted">{detail}</p>
              </div>
              <Button
                variant="outline"
                onClick={() => onOpen({ kind: "shared", part })}
              >
                فتح
              </Button>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

function SuggestedReply({
  jobId,
  draft,
  handoff,
  disabled,
  onDone,
}: {
  jobId: number;
  draft: string;
  handoff: boolean;
  disabled: boolean;
  onDone: () => Promise<unknown>;
}) {
  const [text, setText] = useState(draft);
  const [requestId] = useState(() => crypto.randomUUID());
  const approve = trpc.autoReply.approveSuggestion.useMutation({
    onSuccess: async () => {
      await onDone();
      toast.success("اعتُمد الرد وأُضيف للطابور");
    },
    onError: (e) => toast.error(e.message),
  });
  const discard = trpc.autoReply.discardSuggestion.useMutation({
    onSuccess: onDone,
    onError: (e) => toast.error(e.message),
  });
  const busy = approve.isPending || discard.isPending;
  return (
    <section className="ar-notice" aria-label="رد مقترح">
      <strong>
        رد مقترح لم يُرسل{handoff ? " · المقترح تحويل لموظف" : ""}
      </strong>
      <Field label="نص الرد">
        <Textarea
          dir="auto"
          value={text}
          onChange={(e) => setText(e.target.value)}
        />
      </Field>
      <div className="ar-toolbar">
        <Button
          type="button"
          disabled={disabled || busy || !text.trim()}
          onClick={() => approve.mutate({ jobId, text, requestId })}
        >
          {approve.isPending
            ? "جارٍ الاعتماد…"
            : text.trim() === draft.trim()
              ? "اعتماد وإرسال"
              : "إرسال بعد التعديل"}
        </Button>
        <Button
          type="button"
          variant="outline"
          disabled={busy}
          onClick={() => discard.mutate({ jobId })}
        >
          تجاهل الاقتراح
        </Button>
      </div>
    </section>
  );
}

// Conversations only, for reception staff: no settings, teaching or connections.
export function AutoReplyInbox() {
  const context = trpc.autoReply.inboxContext.useQuery(undefined, {
    refetchInterval: 30_000,
  });
  return (
    <main className="auto-reply" dir="rtl">
      <header className="ar-header">
        <div>
          <h1>محادثات الاستقبال</h1>
          <p>المحادثات المحوّلة لموظف من الرد الآلي على واتساب والصفحات</p>
        </div>
      </header>
      {context.isLoading ? (
        <p role="status">جارٍ تحميل المحادثات…</p>
      ) : context.error ? (
        <ErrorState
          message={context.error.message}
          retry={() => void context.refetch()}
        />
      ) : (
        context.data && (
          <Inbox
            sendingEnabled={context.data.sendingEnabled}
            pages={context.data.pages}
            filters={inboxFilters(context.data.pages)}
            canSuggest={false}
          />
        )
      )}
    </main>
  );
}

function ReplyAssistantSelect({
  data,
  disabled,
}: {
  data: AutoReplyOutputs["settings"];
  disabled: boolean;
}) {
  const models = trpc.autoReply.models.useQuery(undefined, {
    retry: false,
    staleTime: 300000,
  });
  const profiles = trpc.aiManagement.profiles.useQuery(undefined, {
    enabled: data.centralAvailable,
    retry: false,
  });
  const live = profiles.data?.find(
    (profile) => profile.workload === "reply.live",
  );
  const [model, setModel] = useState(`gemini:${data.config.model}`);
  const [feedback, setFeedback] = useState("");
  const utils = trpc.useUtils();
  const save = trpc.autoReply.saveSettings.useMutation({ retry: false });
  const saveProfile = trpc.aiManagement.updateProfile.useMutation({
    retry: false,
  });
  const active =
    data.config.engine === "central" && live
      ? `${live.provider}:${live.model}`
      : `gemini:${data.config.model}`;
  useEffect(() => {
    if (active) setModel(active);
  }, [active]);
  const choices = new Map(
    (models.data ?? []).map((item) => [
      `gemini:${item.id}`,
      {
        value: `gemini:${item.id}`,
        label: `Gemini · ${item.label} (${item.id})`,
        disabled: false,
      },
    ]),
  );
  for (const tier of ["standard", "lite", "max"])
    choices.set(`manus:${tier}`, {
      value: `manus:${tier}`,
      label: `Manus · ${tier}`,
      disabled: !data.centralAvailable || !live,
    });
  for (const value of [`gemini:${data.config.model}`, active])
    if (value)
      choices.set(value, {
        value,
        label: value.replace(":", " · "),
        disabled: false,
      });
  return (
    <section className="ar-panel space-y-3" aria-label="مساعد الرد الآلي">
      <AssistantModelSelect
        value={model}
        options={[...choices.values()]}
        disabled={
          disabled ||
          save.isPending ||
          saveProfile.isPending ||
          (data.config.engine === "central" && !live)
        }
        onChange={(value) => {
          setModel(value);
          setFeedback("");
        }}
      />
      <p className="text-sm">
        الموديل الفعلي: <bdi>{active ?? "جارٍ تحميل الإعداد"}</bdi>. الاختبار
        الداخلي يستخدم نفس إعداد الردود الفعلية.
      </p>
      {models.isError && (
        <p role="status">تعذر تحديث قائمة الموديلات؛ الإعداد المحفوظ ظاهر.</p>
      )}
      {model !== active && (
        <Button
          disabled={disabled || save.isPending || saveProfile.isPending}
          onClick={async () => {
            try {
              const provider = model.startsWith("manus:") ? "manus" : "gemini";
              const selected = model.slice(provider.length + 1);
              const central =
                data.centralAvailable ||
                provider === "manus" ||
                data.config.engine === "central";
              if (central) {
                if (!live || !data.centralAvailable)
                  throw new Error("PROFILE_UNAVAILABLE");
                await saveProfile.mutateAsync({
                  ...live,
                  provider,
                  model: selected,
                  enabled: true,
                });
              }
              await save.mutateAsync({
                ...data.config,
                engine: central ? "central" : "current",
                model: provider === "gemini" ? selected : data.config.model,
                topK: null,
              });
              await Promise.all([
                utils.autoReply.settings.invalidate(),
                utils.aiManagement.profiles.invalidate(),
              ]);
              setFeedback("تم حفظ الموديل للردود الجديدة والاختبار الداخلي.");
            } catch {
              setFeedback(
                "تعذر تأكيد حفظ الاختيار. حدّث الإعدادات للتحقق قبل الاختبار.",
              );
            }
          }}
        >
          حفظ اختيار المساعد
        </Button>
      )}
      {feedback && <p role="status">{feedback}</p>}
    </section>
  );
}

type InboxFilter = {
  id: string;
  label: string;
  channel?: AutoReplyChannel;
  accountId?: string;
};
// With a scope the inbox is one channel page; without one it spans every channel.
function inboxFilters(pages: FacebookPages, scope?: string): InboxFilter[] {
  const pageFilters = (accountId: string, named: boolean) =>
    (["messenger", "facebook_comment"] as const).map((channel) => ({
      id: `${channel}:${accountId}`,
      label: named
        ? `${channelLabels[channel]} · ${scopeName(accountId, pages)}`
        : channelLabels[channel],
      channel,
      accountId,
    }));
  if (scope === "whatsapp")
    return [{ id: "whatsapp", label: "واتساب", channel: "whatsapp" }];
  if (scope) return pageFilters(scope, false);
  return [
    { id: "", label: "كل القنوات" },
    { id: "whatsapp", label: "واتساب", channel: "whatsapp" },
    ...pages
      .filter((page) => page.accountId)
      .flatMap((page) => pageFilters(page.accountId, true)),
  ];
}
const statusFilters = [
  ["human", "محتاجة ردّك"],
  ["open", "مع البوت"],
  ["closed", "مغلقة"],
  ["", "الكل"],
] as const;
type StatusFilter = (typeof statusFilters)[number][0];

function Inbox({
  sendingEnabled,
  pages,
  filters,
  initialFilter,
  canSuggest = true,
}: {
  sendingEnabled: boolean;
  pages: FacebookPages;
  filters: InboxFilter[];
  initialFilter?: string;
  canSuggest?: boolean;
}) {
  const [filterId, setFilterId] = useState(initialFilter ?? filters[0]?.id);
  const filter = filters.find((f) => f.id === filterId) ?? filters[0];
  const [status, setStatus] = useState<StatusFilter>("human");
  const [page, setPage] = useState(1);
  // A handoff notification links here with ?conversation=<id>.
  const [selected, setSelected] = useState<number | null>(() => {
    const linked = Number(
      new URLSearchParams(window.location.search).get("conversation"),
    );
    return Number.isSafeInteger(linked) && linked > 0 ? linked : null;
  });
  const query = trpc.autoReply.conversations.useQuery(
    {
      channel: filter?.channel,
      accountId: filter?.accountId,
      status: status || undefined,
      page,
    },
    { refetchInterval: 10_000 },
  );
  return (
    <section
      aria-label="صندوق المحادثات"
      className={`ar-inbox-a ${selected ? "ar-has-selection" : ""}`}
    >
      <aside className="ar-inbox-list" aria-label="قائمة المحادثات">
        <div className="ar-seg" role="group" aria-label="حالة المحادثة">
          {statusFilters.map(([id, label]) => (
            <button
              key={id || "all"}
              type="button"
              aria-pressed={status === id}
              onClick={() => {
                setStatus(id);
                setPage(1);
              }}
            >
              {label}
            </button>
          ))}
        </div>
        {filters.length > 1 && (
          <div className="ar-chips" role="group" aria-label="القناة">
            {filters.map((f) => (
              <button
                key={f.id || "all"}
                type="button"
                aria-pressed={f.id === filter?.id}
                onClick={() => {
                  setFilterId(f.id);
                  setPage(1);
                }}
              >
                {f.label}
              </button>
            ))}
          </div>
        )}
        <div className="ar-list-heading">
          <span className="ar-muted">تحديث تلقائي كل ١٠ ثوانٍ</span>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => void query.refetch()}
          >
            تحديث المحادثات
          </Button>
        </div>
        {query.isLoading && <p role="status">جارٍ تحميل المحادثات…</p>}
        {query.error && (
          <ErrorState
            message={`تعذر تحميل المحادثات: ${query.error.message}`}
            retry={() => void query.refetch()}
          />
        )}
        {query.data?.rows.length === 0 && (
          <p>
            {status === "human"
              ? "مفيش محادثات مستنية موظف هنا دلوقتي."
              : "لا توجد محادثات مطابقة. تظهر الرسائل بعد استقبال Webhook من قناة مربوطة فعليًا."}
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
              <span>{pageLabel(c.accountId, pages)}</span>
            )}
            <span>
              {statusLabels[c.status]} · #{c.id}
              {c.status === "human" && c.humanReason
                ? ` · ${autoReplyErrorLabel(c.humanReason)}`
                : ""}
            </span>
            <small>{time(c.lastActivityAt)}</small>
          </button>
        ))}
        {(page > 1 || query.data?.hasMore) && (
          <div className="ar-toolbar ar-pager">
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
        )}
      </aside>
      <div className="ar-inbox-thread">
        {selected ? (
          <>
            <Button
              type="button"
              variant="outline"
              className="ar-back-list"
              onClick={() => setSelected(null)}
            >
              رجوع للقائمة
            </Button>
            <Conversation
              key={selected}
              id={selected}
              sendingEnabled={sendingEnabled}
              pages={pages}
              canSuggest={canSuggest}
            />
          </>
        ) : (
          <p className="ar-inbox-empty">
            اختار محادثة من القائمة علشان تقرأها وترد.
          </p>
        )}
      </div>
    </section>
  );
}
function Conversation({
  id,
  sendingEnabled,
  pages,
  canSuggest,
}: {
  id: number;
  sendingEnabled: boolean;
  pages: FacebookPages;
  canSuggest: boolean;
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
  // Admin only, like the per-target reset in الرد: the server keeps it on autoReplyAdminProcedure.
  const reset = trpc.autoReply.clearAIHistory.useMutation({
    onSuccess: () =>
      toast.success("تم بدء سياق جديد للمحادثة، دون حذف سجل الرسائل"),
    onError: (e) => toast.error(e.message),
  });
  if (query.isLoading) return <p role="status">جارٍ تحميل سياق المحادثة…</p>;
  if (query.error)
    return (
      <ErrorState
        message={`تعذر تحميل المحادثة: ${query.error.message}`}
        retry={() => void query.refetch()}
      />
    );
  if (!query.data) return null;
  const { conversation: c, rows, jobs } = query.data;
  const latest = rows.filter((m) => m.direction === "inbound").at(-1);
  return (
    <div className="ar-conv">
      <div className="ar-conv-main">
        <div className="ar-toolbar">
          <h2>
            {channelLabels[c.channel]} ·{" "}
            {c.channel !== "whatsapp"
              ? `${pageLabel(c.accountId, pages)} · `
              : ""}
            <bdi>{c.participantId}</bdi>
          </h2>
          <span>{statusLabels[c.status]}</span>
        </div>
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
        <p className="ar-muted">آخر 20 رسالة</p>
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
        {jobs
          .filter((j) => j.state === "suggested" && j.body)
          .map((j) => (
            <SuggestedReply
              key={j.id}
              jobId={j.id}
              draft={j.body!}
              handoff={j.handoff}
              disabled={!sendingEnabled || c.status === "closed"}
              onDone={refresh}
            />
          ))}
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
            {canSuggest && (
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
            )}
          </div>
          {!sendingEnabled && (
            <p role="status">الإرسال متوقف بالمفتاح العام.</p>
          )}
        </form>
        {proposal && (
          <div className="ar-notice" role="status">
            <strong>اختبار فقط، لم يُرسل</strong>
            <p className="ar-prewrap" dir="auto">
              {proposal}
            </p>
          </div>
        )}
      </div>
      <aside className="ar-conv-details" aria-label="تفاصيل المحادثة">
        <h3>التفاصيل</h3>
        <dl>
          <div>
            <dt>القناة</dt>
            <dd>
              {channelLabels[c.channel]}
              {c.channel !== "whatsapp" &&
                ` · ${pageLabel(c.accountId, pages)}`}
            </dd>
          </div>
          <div>
            <dt>الحالة</dt>
            <dd>{statusLabels[c.status]}</dd>
          </div>
          {c.humanReason && (
            <div>
              <dt>سبب التحويل أو الإيقاف</dt>
              <dd>{autoReplyErrorLabel(c.humanReason)}</dd>
            </div>
          )}
          <div>
            <dt>نافذة الرد</dt>
            <dd>
              {new Date(c.lastInboundAt).getTime() === 0
                ? "لم تبدأ نافذة رد من رسالة جديدة"
                : `بدأت ${time(c.lastInboundAt)}`}
            </dd>
          </div>
        </dl>
        <div className="ar-detail-actions">
          <Button
            variant="outline"
            disabled={status.isPending || c.status === "open"}
            onClick={() => status.mutate({ id, status: "open" })}
          >
            تفعيل البوت للرسائل الجديدة
          </Button>
          <Button
            variant="outline"
            disabled={status.isPending || c.status === "human"}
            onClick={() => status.mutate({ id, status: "human" })}
          >
            تحويل لموظف وإيقاف البوت
          </Button>
          <Button
            variant="outline"
            disabled={status.isPending || c.status === "closed"}
            onClick={() => status.mutate({ id, status: "closed" })}
          >
            إغلاق المحادثة
          </Button>
          {canSuggest && (
            <Button
              variant="outline"
              disabled={reset.isPending}
              onClick={() => {
                if (
                  window.confirm(
                    "البوت هيبدأ سياق جديد للمحادثة دي، وسجل الرسائل مش هيتمسح. تكمل؟",
                  )
                )
                  reset.mutate({ conversationId: id });
              }}
            >
              بدء سياق جديد للبوت
            </Button>
          )}
        </div>
        <details>
          <summary>حالات الردود ({jobs.length})</summary>
          {jobs.map((j) => (
            <p key={j.id}>
              #{j.id} · {statusLabels[j.state] ?? j.state} · محاولات{" "}
              {j.attempts}
              {j.errorCode && (
                <>
                  {" "}
                  · <span>{autoReplyErrorLabel(j.errorCode)}</span>
                </>
              )}
              {j.state === "unknown" &&
                " · راجع القناة قبل إرسال أي رد آخر لتجنب التكرار"}
            </p>
          ))}
        </details>
      </aside>
    </div>
  );
}

type KnowledgeRow = AutoReplyOutputs["teaching"][number];
const knowledgeTargets = (targetPage: string | null, pages: FacebookPages) =>
  !targetPage || targetPage === "all"
    ? "الكل"
    : targetPage === "whatsapp"
      ? "واتساب"
      : targetPage === "facebook"
        ? "الصفحتان فقط"
        : targetPage
            .split(",")
            .map((target) =>
              target === "whatsapp" ? "واتساب" : pageLabel(target, pages),
            )
            .join("، ");
function Switch({
  checked,
  label,
  disabled,
  onChange,
}: {
  checked: boolean;
  label: string;
  disabled?: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      className="ar-switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
    />
  );
}
function Knowledge({
  pages,
  scope,
  aside,
}: {
  pages: FacebookPages;
  scope: string;
  aside?: ReactNode;
}) {
  const target = scope;
  const query = trpc.autoReply.teaching.useQuery();
  const [editing, setEditing] = useState<KnowledgeRow | "new" | null>(null);
  const [search, setSearch] = useState("");
  const [contentStatus, setContentStatus] = useState("all");
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
  const toggle = trpc.autoReply.saveTeaching.useMutation({
    onSuccess: async () => {
      await utils.autoReply.teaching.invalidate();
      await utils.autoReply.settings.invalidate();
    },
    onError: (e) => toast.error(`ما اتغيرتش حالة المعلومة: ${e.message}`),
  });
  const inScope = query.data?.filter((k) => belongsToTarget(k.targetPage, target));
  const rows = inScope?.filter(
    (k) =>
      `${k.title} ${k.content}`.includes(search) &&
      (contentStatus === "all" ||
        (contentStatus === "active" ? k.approved : !k.approved)),
  );
  return (
    <div className={aside ? "ar-know" : undefined}>
      <section className="ar-panel ar-teaching" aria-label="المعلومات">
        <div className="ar-know-bar">
          <Input
            type="search"
            aria-label="دوّر في المعلومات"
            placeholder="دوّر في المعلومات"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <select
            className="ar-select"
            aria-label="حالة المعلومات"
            value={contentStatus}
            onChange={(event) => setContentStatus(event.target.value)}
          >
            <option value="all">الكل ({count(inScope?.length ?? 0)})</option>
            <option value="active">المفعّلة</option>
            <option value="paused">المتوقفة</option>
          </select>
          <Button
            onClick={() => {
              setWebsiteDraft(null);
              setEditing("new");
            }}
          >
            إضافة معلومة
          </Button>
        </div>
        <p className="ar-muted">
          {scope === "all"
            ? "المعلومات المشتركة بتتستخدم في الجهات المحددة لها. تقدر تختار أكتر من جهة لكل معلومة."
            : "المعلومات الخاصة بالجهة دي. البوت بيستخدمها مع المعلومات المشتركة المفعّلة لها."}
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
                  {editing === "new" ? "إضافة معلومة" : "تعديل معلومة"}
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
                target={target}
                close={() => setEditing(null)}
              />
            </DialogContent>
          </Dialog>
        )}
        {query.isLoading && <p role="status">جارٍ تحميل المعلومات…</p>}
        {query.error && (
          <ErrorState
            message={`تعذر تحميل المعلومات: ${query.error.message}`}
            retry={() => void query.refetch()}
          />
        )}
        {inScope?.length === 0 && (
          <p className="ar-notice">
            مفيش معلومات للجهة دي لسه. اضغط «إضافة معلومة» واكتب اللي عايز
            البوت يرد منه.
          </p>
        )}
        <ul className="ar-entries">
          {rows?.map((k) => (
            <li key={k.id} className="ar-entry">
              <div>
                <h3>{k.title}</h3>
                <p className="ar-muted ar-entry-line" dir="auto">
                  {k.content.split("\n").find((line) => line.trim()) ?? ""}
                </p>
                <p className="ar-entry-meta">
                  {k.kind === "website" ? "من موقع" : "نص مكتوب"} ·{" "}
                  {k.approved ? "مفعّلة" : "متوقفة"} · بتتستخدم في:{" "}
                  {knowledgeTargets(k.targetPage, pages)} · آخر تعديل:{" "}
                  {time(k.updatedAt)}
                </p>
              </div>
              <Switch
                checked={k.approved}
                label={`استخدام «${k.title}» في الردود`}
                disabled={toggle.isPending && toggle.variables?.id === k.id}
                onChange={(enabled) =>
                  toggle.mutate({
                    id: k.id,
                    title: k.title,
                    content: k.content,
                    targetPage: k.targetPage ?? "all",
                    sourceUrl: k.sourceUrl ?? undefined,
                    enabled,
                  })
                }
              />
              <Button
                variant="outline"
                aria-label={`تعديل «${k.title}»`}
                onClick={() => {
                  setWebsiteDraft(null);
                  setEditing(k);
                }}
              >
                تعديل
              </Button>
            </li>
          ))}
        </ul>
        {!!inScope?.length && rows?.length === 0 && (
          <p role="status" className="ar-notice">
            مفيش معلومات مطابقة. غيّر البحث أو الحالة.
          </p>
        )}
        <details className="ar-disclosure">
          <summary>مواقع البوت يقرا منها</summary>
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
              {website.isPending
                ? "جارٍ قراءة الموقع…"
                : "قراءة ومعاينة الموقع"}
            </Button>
          </form>
        </details>
      </section>
      {aside}
    </div>
  );
}
function KnowledgeEditor({
  row,
  close,
  pages,
  websiteDraft,
  target,
}: {
  row?: KnowledgeRow;
  close: () => void;
  pages: FacebookPages;
  websiteDraft: AutoReplyOutputs["previewWebsite"] | null;
  target: string;
}) {
  const [targetPage, setTargetPage] = useState(row?.targetPage ?? target);
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
      toast.success("حُفظت المعلومة");
    },
    onError: (e) => toast.error(e.message),
  });
  const remove = trpc.autoReply.deleteTeaching.useMutation({
    onSuccess: async () => {
      await utils.autoReply.teaching.invalidate();
      close();
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
      <Field label="اسم المعلومة (اختياري)">
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
        label="استخدام هذه المعلومة في الردود"
        checked={approved}
        onChange={setApproved}
      />
      <div className="ar-toolbar">
        <Button disabled={save.isPending || !content.trim() || !targetPage}>
          حفظ المعلومة
        </Button>
        <Button type="button" variant="outline" onClick={close}>
          إلغاء
        </Button>
        {row && (
          <Button
            type="button"
            variant="outline"
            className="ar-danger"
            disabled={remove.isPending}
            onClick={() => {
              if (window.confirm(`حذف «${row.title}» نهائيًا؟`))
                remove.mutate(row.id);
            }}
          >
            حذف المعلومة
          </Button>
        )}
      </div>
    </form>
  );
}
function unsavedText(changes: number) {
  if (changes === 0) return "كل التعديلات محفوظة";
  if (changes === 1) return "عندك تعديل واحد لم يُحفظ";
  if (changes === 2) return "عندك تعديلان لم يُحفظا";
  if (changes <= 10) return `عندك ${count(changes)} تعديلات لم تُحفظ`;
  return `عندك ${count(changes)} تعديلًا لم يُحفظ`;
}
// Counts the settings that differ as this screen shows them, not raw JSON keys.
function changeCount(
  saved: AutoReplySettings,
  draft: AutoReplySettings,
  scope: string,
  recipientsChanged: boolean,
) {
  const shown = (config: AutoReplySettings) =>
    scope === "all"
      ? config
      : settingsForTarget(
          config,
          scope === "whatsapp" ? "whatsapp" : "messenger",
          scope,
        );
  const before = shown(saved);
  const after = shown(draft);
  return (
    (Object.keys(after) as (keyof AutoReplySettings)[]).filter(
      (key) =>
        key !== "targets" &&
        key !== "whatsappRecipients" &&
        JSON.stringify(before[key]) !== JSON.stringify(after[key]),
    ).length + (recipientsChanged ? 1 : 0)
  );
}
function Question({
  title,
  summary,
  open,
  advanced = false,
  onToggle,
  children,
}: {
  title: string;
  summary: string;
  open: boolean;
  advanced?: boolean;
  onToggle: () => void;
  children: ReactNode;
}) {
  const id = useId();
  return (
    <div className={advanced ? "ar-q ar-q-advanced" : "ar-q"}>
      <h2>
        <button
          type="button"
          className="ar-q-head"
          aria-expanded={open}
          aria-controls={id}
          onClick={onToggle}
        >
          <span className="ar-q-title">{title}</span>
          <span className="ar-q-now">{summary}</span>
          <span className="ar-q-edit" aria-hidden="true">
            {open ? "قفل" : advanced ? "فتح" : "تعديل"}
          </span>
        </button>
      </h2>
      <div id={id} className="ar-q-body" hidden={!open}>
        {children}
      </div>
    </div>
  );
}
function Row({
  title,
  help,
  stack = false,
  children,
}: {
  title: string;
  help?: ReactNode;
  stack?: boolean;
  children: ReactNode;
}) {
  const id = useId();
  return (
    <div className={stack ? "ar-row ar-row-stack" : "ar-row"}>
      <div>
        <h3 id={id}>{title}</h3>
        {help && <p className="ar-muted">{help}</p>}
      </div>
      <div className="ar-row-control" role="group" aria-labelledby={id}>
        {children}
      </div>
    </div>
  );
}
function PresetSelect({
  label,
  value,
  presets,
  custom,
  onChange,
}: {
  label: string;
  value: number;
  presets: readonly SettingPreset[];
  custom: (value: number) => string;
  onChange: (value: number) => void;
}) {
  return (
    <select
      className="ar-select"
      aria-label={label}
      value={value}
      onChange={(e) => onChange(Number(e.target.value))}
    >
      {presetChoices(presets, value, custom).map((choice) => (
        <option key={choice.value} value={choice.value}>
          {choice.label}
        </option>
      ))}
    </select>
  );
}
const recipientModes = [
  ["all", "الكل"],
  ["except_contacts", "الكل ما عدا جهات اتصال الموبايل"],
  ["include", "أرقام محددة فقط"],
  ["exclude", "الكل ما عدا أرقام محددة"],
] as const;
const splitPhones = (draft: string) =>
  draft
    .split(/[\n,،;؛]+/)
    .map((phone) => phone.trim())
    .filter(Boolean);
const days = [
  "الأحد",
  "الاثنين",
  "الثلاثاء",
  "الأربعاء",
  "الخميس",
  "الجمعة",
  "السبت",
];
function Settings({
  data,
  scope,
  onDirtyChange,
}: {
  data: AutoReplyOutputs["settings"];
  scope: string;
  onDirtyChange: (dirty: boolean) => void;
}) {
  const target = scope;
  const saved = autoReplySettingsSchema.parse(data.config);
  const [storedConfig, setStoredConfig] = useState<AutoReplySettings>(saved);
  const [recipientDraft, setRecipientDraft] = useState(
    storedConfig.whatsappRecipients.phones.join("\n"),
  );
  const recipientsChanged =
    JSON.stringify(storedConfig.whatsappRecipients) !==
      JSON.stringify(saved.whatsappRecipients) ||
    recipientDraft !== storedConfig.whatsappRecipients.phones.join("\n");
  const dirty =
    JSON.stringify(storedConfig) !== JSON.stringify(saved) || recipientsChanged;
  const changes = dirty
    ? Math.max(1, changeCount(saved, storedConfig, scope, recipientsChanged))
    : 0;
  useEffect(() => {
    onDirtyChange(dirty);
  }, [dirty, onDirtyChange]);
  useEffect(() => () => onDirtyChange(false), [onDirtyChange]);
  const [open, setOpen] = useState<Set<string>>(() => new Set(["when"]));
  const toggleOpen = (id: string) =>
    setOpen((current) => {
      const next = new Set(current);
      if (!next.delete(id)) next.add(id);
      return next;
    });
  const [showInstructions, setShowInstructions] = useState(false);
  const config =
    scope === "all"
      ? storedConfig
      : settingsForTarget(
          storedConfig,
          scope === "whatsapp" ? "whatsapp" : "messenger",
          scope,
        );
  const setConfig = (
    change: (current: AutoReplySettings) => AutoReplySettings,
  ) =>
    setStoredConfig((base) => {
      const next = change(
        scope === "all"
          ? base
          : settingsForTarget(
              base,
              scope === "whatsapp" ? "whatsapp" : "messenger",
              scope,
            ),
      );
      if (scope === "all") return next;
      const {
        style,
        maxReplyChars,
        historyMessageLimit,
        temperature,
        topP,
        topK,
        maxOutputTokens,
        stopSequences,
        hoursEnabled,
        hours,
        outsideMessage,
        outsideMessageEn,
        replyMode,
      } = next;
      return {
        ...base,
        instructions: next.instructions,
        channels: next.channels,
        facebookPages: next.facebookPages,
        whatsappRecipients: next.whatsappRecipients,
        targets: {
          ...base.targets,
          [scope]: {
            style,
            maxReplyChars,
            historyMessageLimit,
            temperature,
            topP,
            topK,
            maxOutputTokens,
            stopSequences,
            hoursEnabled,
            hours,
            outsideMessage,
            outsideMessageEn,
            replyMode,
          },
        },
      };
    });
  const [stopDraft, setStopDraft] = useState(config.stopSequences.join("\n"));
  const phoneContacts = trpc.autoReply.whatsappContactAudience.useQuery(
    undefined,
    {
      enabled: scope === "whatsapp",
      refetchInterval: 5000,
      retry: false,
    },
  );
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
  const update = <K extends keyof AutoReplySettings>(
    key: K,
    value: AutoReplySettings[K],
  ) => setConfig((c) => ({ ...c, [key]: value }));
  // Shared by every channel; the per-target copy in setConfig would drop them.
  const updateShared = <K extends keyof AutoReplySettings>(
    key: K,
    value: AutoReplySettings[K],
  ) => setStoredConfig((base) => ({ ...base, [key]: value }));
  const shared = scope === "all" ? undefined : "مشترك لكل القنوات.";
  const discard = () => {
    setStoredConfig(saved);
    setRecipientDraft(saved.whatsappRecipients.phones.join("\n"));
    setStopDraft(settingsForTarget(saved, scope === "whatsapp" ? "whatsapp" : "messenger", scope).stopSequences.join("\n"));
  };
  const channelEnabled =
    scope === "all"
      ? null
      : scope === "whatsapp"
        ? config.channels.whatsapp
        : (["messenger", "facebook_comment"] as const).some(
            (c) => config.channels[c] && config.facebookPages[scope]?.[c],
          );
  const scopedInstructions = config.instructions.filter(
    (instruction) =>
      instruction.enabled && belongsToTarget(instruction.targetPage, target),
  ).length;
  const recipientMode = config.whatsappRecipients.mode;
  const contactsConfirmed =
    !!phoneContacts.data?.available &&
    config.whatsappRecipients.confirmedContactSync ===
      phoneContacts.data.syncId;
  const defaults = defaultAutoReplySettings;
  const changedAdvanced = [
    config.historyMessageLimit !== defaults.historyMessageLimit &&
      `يفتكر ${count(config.historyMessageLimit)} رسالة`,
    (config.temperature !== defaults.temperature ||
      config.topP !== defaults.topP ||
      config.topK !== defaults.topK ||
      config.maxOutputTokens !== defaults.maxOutputTokens ||
      config.stopSequences.length > 0) &&
      "إعدادات التوليد متغيّرة",
  ].filter(Boolean);
  const summaries = {
    when: [
      channelEnabled === false && "الرد الآلي مقفول هنا",
      config.replyMode === "suggest" ? "يقترح وموظف يوافق" : "يرد لوحده",
      config.hoursEnabled
        ? `في مواعيد العمل بس (${count(config.hours.length)} فترة)`
        : "طول اليوم",
    ],
    who: [
      recipientModes.find(([mode]) => mode === recipientMode)?.[1],
      ["include", "exclude"].includes(recipientMode) &&
        `${count(splitPhones(recipientDraft).length)} رقم`,
      recipientMode === "except_contacts" &&
        !contactsConfirmed &&
        "محتاج تأكيدك",
    ],
    how: [
      config.style.trim() ? "أسلوب مكتوب" : "من غير أسلوب محدد",
      `${count(scopedInstructions)} تعليمات إضافية مفعّلة`,
      `الرد ${presetLabel(replyLengthPresets, config.maxReplyChars, presetCustomLabels.replyLength)}`,
      config.bookingUrl && "فيه رابط حجز",
      (scope === "all" || scope === "whatsapp") &&
        (config.voiceTranscription ? "بيرد على الصوت" : "ما بيردش على الصوت"),
    ],
    handoff: [
      `بعد ${count(config.maxAutoRepliesPerHour)} رد في الساعة`,
      `ترجع للبوت: ${presetLabel(handoffReopenPresets, config.handoffReopenHours, presetCustomLabels.handoffReopen)}`,
      `بعد رد الموظف: ${presetLabel(staffReplyPausePresets, config.staffReplyPauseMinutes, presetCustomLabels.staffReplyPause)}`,
    ],
    advanced: changedAdvanced.length
      ? [...changedAdvanced, `احتفاظ ${count(config.retentionDays)} يوم`]
      : [
          `على الوضع الافتراضي · احتفاظ ${count(config.retentionDays)} يوم. غيّرها بس لو عارف تأثيرها.`,
        ],
  };
  const line = (parts: (string | false | null | undefined)[]) =>
    parts.filter(Boolean).join(" · ");
  return (
    <section className="ar-settings">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          const parsed = autoReplySettingsSchema.safeParse({
            ...storedConfig,
            whatsappRecipients: {
              ...storedConfig.whatsappRecipients,
              phones: ["include", "exclude"].includes(
                storedConfig.whatsappRecipients.mode,
              )
                ? splitPhones(recipientDraft)
                : storedConfig.whatsappRecipients.phones,
            },
          });
          if (!parsed.success) {
            toast.error(parsed.error.issues[0].message);
            return;
          }
          setStoredConfig(parsed.data);
          setRecipientDraft(parsed.data.whatsappRecipients.phones.join("\n"));
          save.mutate(parsed.data);
        }}
      >
        <Question
          title="البوت يرد إمتى؟"
          summary={line(summaries.when)}
          open={open.has("when")}
          onToggle={() => toggleOpen("when")}
        >
          {scope === "all" ? (
            <Row
              title="السماح بالإرسال العام"
              help="يشمل الرد اليدوي من الموظفين. لو اتقفل، مفيش رسالة بتتبعت لأي عميل."
            >
              <Switch
                label="السماح بالإرسال العام"
                checked={config.sendingEnabled}
                onChange={(v) => update("sendingEnabled", v)}
              />
            </Row>
          ) : (
            autoReplyChannels
              .filter((c) =>
                scope === "whatsapp" ? c === "whatsapp" : c !== "whatsapp",
              )
              .map((c) => (
                <Row
                  key={c}
                  title={`الرد الآلي على ${channelLabels[c]}`}
                  help={
                    config.sendingEnabled
                      ? undefined
                      : "الإرسال العام متوقف، فمفيش رد هيتبعت حتى لو المفتاح ده شغّال."
                  }
                >
                  <Switch
                    label={`تشغيل الرد الآلي على ${channelLabels[c]}`}
                    checked={
                      scope === "whatsapp"
                        ? config.channels[c]
                        : (config.facebookPages[scope]?.[
                            c as "messenger" | "facebook_comment"
                          ] ?? false)
                    }
                    onChange={(v) =>
                      setStoredConfig((base) =>
                        scope === "whatsapp"
                          ? {
                              ...base,
                              channels: { ...base.channels, whatsapp: v },
                            }
                          : {
                              ...base,
                              channels: {
                                ...base.channels,
                                [c]:
                                  v ||
                                  Object.entries(base.facebookPages).some(
                                    ([id, flags]) =>
                                      id !== scope &&
                                      flags[
                                        c as "messenger" | "facebook_comment"
                                      ],
                                  ),
                              },
                              facebookPages: {
                                ...base.facebookPages,
                                [scope]: {
                                  ...(base.facebookPages[scope] ?? {
                                    messenger: false,
                                    facebook_comment: false,
                                  }),
                                  [c]: v,
                                },
                              },
                            },
                      )
                    }
                  />
                </Row>
              ))
          )}
          <Row
            title="طريقة الرد"
            help="في الاقتراح، مفيش رسالة بتتبعت من غير موافقة موظف."
          >
            <div className="ar-seg">
              {(
                [
                  ["auto", "يرد لوحده"],
                  ["suggest", "يقترح وموظف يوافق"],
                ] as const
              ).map(([mode, label]) => (
                <button
                  key={mode}
                  type="button"
                  aria-pressed={config.replyMode === mode}
                  onClick={() => update("replyMode", mode)}
                >
                  {label}
                </button>
              ))}
            </div>
          </Row>
          <Row
            title="في مواعيد العمل بس"
            help="خارجها بيبعت رسالة ثابتة بدل الرد. المواعيد بتوقيت القاهرة."
          >
            <Switch
              label="في مواعيد العمل بس"
              checked={config.hoursEnabled}
              onChange={(v) => update("hoursEnabled", v)}
            />
          </Row>
          {config.hoursEnabled && (
            <>
              {config.hours.length === 0 && (
                <p role="status" className="ar-notice">
                  مفيش فترات عمل. أضف فترة أو اقفل «في مواعيد العمل بس» قبل
                  الحفظ.
                </p>
              )}
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
                            n === i
                              ? { ...item, day: Number(e.target.value) }
                              : item,
                          ),
                        )
                      }
                    >
                      {days.map((d, n) => (
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
                إضافة فترة عمل
              </Button>
              <p className="ar-muted">
                الفترة اللي بتخلص قبل ما تبدأ بتكمل لليوم اللي بعده. المواعيد
                مش بتتبعت للعميل إلا لو كتبتها في معلومات المركز.
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
            </>
          )}
        </Question>
        {scope === "whatsapp" && (
          <Question
            title="يرد على مين؟"
            summary={line(summaries.who)}
            open={open.has("who")}
            onToggle={() => toggleOpen("who")}
          >
            <Row title="المستلمون">
              <select
                className="ar-select"
                aria-label="المستلمون"
                value={recipientMode}
                disabled={save.isPending}
                onChange={(e) =>
                  update("whatsappRecipients", {
                    ...config.whatsappRecipients,
                    mode: e.target
                      .value as AutoReplySettings["whatsappRecipients"]["mode"],
                  })
                }
              >
                {recipientModes.map(([mode, label]) => (
                  <option key={mode} value={mode}>
                    {label}
                  </option>
                ))}
              </select>
            </Row>
            {recipientMode === "except_contacts" && (
              <Row
                title="جهات الاتصال المُزامنة من الموبايل"
                help="بيستثني جهات اتصال WhatsApp Business المُزامنة من الموبايل المربوط، مش سجل المحادثات ولا قايمة المرضى. البوت مش بيرد بالاختيار ده لحد ما تأكد القايمة وتحفظ."
              >
                {phoneContacts.isLoading ? (
                  <p role="status">جارٍ التحقق من مزامنة جهات الاتصال…</p>
                ) : phoneContacts.isError ? (
                  <ErrorState
                    message="تعذر تحديث حالة جهات الاتصال. أعد المحاولة قبل تأكيد اكتمال المزامنة."
                    retry={() => void phoneContacts.refetch()}
                  />
                ) : phoneContacts.data?.available ? (
                  <Check
                    label={`راجعت العدد (${count(phoneContacts.data.count)} جهة) وأأكد إن المشاركة من الموبايل اكتملت`}
                    checked={contactsConfirmed}
                    onChange={(confirmed) =>
                      update("whatsappRecipients", {
                        ...config.whatsappRecipients,
                        confirmedContactSync: confirmed
                          ? phoneContacts.data!.syncId
                          : null,
                      })
                    }
                  />
                ) : (
                  <p role="status">
                    جهات الاتصال مش جاهزة أو المزامنة لسه ما خلصتش. راجع «الربط
                    ← ربط الموبايل».
                  </p>
                )}
              </Row>
            )}
            {["include", "exclude"].includes(recipientMode) && (
              <Row
                stack
                title={
                  recipientMode === "include"
                    ? "الأرقام المسموح لها بالرد"
                    : "الأرقام المستثناة من الرد"
                }
                help="رقم في كل سطر أو افصل بفاصلة، لحد 500 رقم. الأرقام المصرية اللي بتبدأ بـ 01 بتتحوّل لـ 20."
              >
                <Textarea
                  dir="ltr"
                  rows={5}
                  maxLength={32500}
                  className="ar-recipient-phones"
                  aria-label={
                    recipientMode === "include"
                      ? "الأرقام المسموح لها بالرد"
                      : "الأرقام المستثناة من الرد"
                  }
                  value={recipientDraft}
                  onChange={(event) => setRecipientDraft(event.target.value)}
                />
                {splitPhones(recipientDraft).length === 0 && (
                  <p role="status">
                    {recipientMode === "include"
                      ? "القايمة فاضية: مفيش رد آلي هيتبعت لأي رقم."
                      : "القايمة فاضية: الرد الآلي متاح للكل."}
                  </p>
                )}
              </Row>
            )}
          </Question>
        )}
        <Question
          title="يرد إزاي؟"
          summary={line(summaries.how)}
          open={open.has("how")}
          onToggle={() => toggleOpen("how")}
        >
          <Row
            stack
            title={scope === "all" ? "أسلوب الرد الافتراضي" : "أسلوب الرد"}
          >
            <Textarea
              aria-label="أسلوب الرد"
              rows={4}
              maxLength={3000}
              value={config.style}
              onChange={(e) => update("style", e.target.value)}
            />
          </Row>
          <Row
            title="تعليمات إضافية"
            help={`قواعد قصيرة، كل واحدة لوحدها. ${count(scopedInstructions)} مفعّلة هنا.`}
          >
            <Button
              type="button"
              variant="outline"
              aria-expanded={showInstructions}
              onClick={() => setShowInstructions((v) => !v)}
            >
              {showInstructions ? "قفل التعليمات" : "إدارة التعليمات"}
            </Button>
          </Row>
          {showInstructions && (
            <div className="ar-instructions">
              <p className="ar-muted">
                التعليمات المفعّلة بتتطبق مع بعض، ومش بتتخطى قواعد الخصوصية أو
                التحويل لموظف أو منع التشخيص والعلاج. لحد 30 تعليمة، و1000 حرف
                للواحدة و12000 حرف إجمالًا.
              </p>
              <div className="ar-instruction-grid">
                {config.instructions.map((instruction, index) => (
                  <fieldset
                    className="ar-editor"
                    key={index}
                    hidden={!belongsToTarget(instruction.targetPage, target)}
                  >
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
                              i === index
                                ? { ...item, text: e.target.value }
                                : item,
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
              </div>
              <Button
                type="button"
                variant="outline"
                disabled={save.isPending || config.instructions.length >= 30}
                onClick={() =>
                  update("instructions", [
                    ...config.instructions,
                    { text: "", enabled: true, targetPage: target },
                  ])
                }
              >
                إضافة تعليمة
              </Button>
            </div>
          )}
          <Row
            title="طول الرد"
            help={`أقصى عدد حروف: ${count(config.maxReplyChars)}. الرد الأطول من كده بيتحوّل لموظف.`}
          >
            <PresetSelect
              label="طول الرد"
              value={config.maxReplyChars}
              presets={replyLengthPresets}
              custom={presetCustomLabels.replyLength}
              onChange={(v) => update("maxReplyChars", v)}
            />
          </Row>
          <Row
            title="رابط الحجز"
            help={line([
              "بيتبعت لما العميل يطلب حجز. فاضي = مفيش. لازم يبدأ بـ https.",
              shared,
            ])}
          >
            <Input
              type="url"
              dir="ltr"
              placeholder="https://"
              aria-label="رابط الحجز"
              value={config.bookingUrl}
              onChange={(e) => updateShared("bookingUrl", e.target.value.trim())}
            />
          </Row>
          {(scope === "all" || scope === "whatsapp") && (
            <Row
              title="الرد على الرسائل الصوتية"
              help={line([
                "الصوت بيتبعت لـ Google Gemini عشان يتحوّل لنص، لحد دقيقتين و5 ميجا.",
                shared,
              ])}
            >
              <Switch
                label="الرد على الرسائل الصوتية"
                checked={config.voiceTranscription}
                onChange={(v) => updateShared("voiceTranscription", v)}
              />
            </Row>
          )}
        </Question>
        <Question
          title="يسيبها لموظف إمتى؟"
          summary={line(summaries.handoff)}
          open={open.has("handoff")}
          onToggle={() => toggleOpen("handoff")}
        >
          <Row
            title="أقصى ردود آلية في الساعة"
            help={line(["لكل محادثة، من 1 لـ 200. بعدها بتتحوّل لموظف.", shared])}
          >
            <Input
              type="number"
              dir="ltr"
              min={1}
              max={200}
              aria-label="أقصى ردود آلية في الساعة"
              value={config.maxAutoRepliesPerHour}
              onChange={(e) =>
                updateShared("maxAutoRepliesPerHour", Number(e.target.value))
              }
            />
          </Row>
          <Row
            title="ترجع للبوت بعد سكون"
            help={line([
              "بعد التحويل لموظف، المحادثة ترجع للبوت لو فضلت ساكتة المدة دي.",
              shared,
            ])}
          >
            <PresetSelect
              label="ترجع للبوت بعد سكون"
              value={config.handoffReopenHours}
              presets={handoffReopenPresets}
              custom={presetCustomLabels.handoffReopen}
              onChange={(v) => updateShared("handoffReopenHours", v)}
            />
          </Row>
          <Row
            title="بعد ما موظف يرد"
            help={line(["البوت يستنى قد إيه قبل ما يرد تاني.", shared])}
          >
            <PresetSelect
              label="بعد ما موظف يرد"
              value={config.staffReplyPauseMinutes}
              presets={staffReplyPausePresets}
              custom={presetCustomLabels.staffReplyPause}
              onChange={(v) => updateShared("staffReplyPauseMinutes", v)}
            />
          </Row>
        </Question>
        <Question
          advanced
          title="إعدادات متقدمة"
          summary={line(summaries.advanced)}
          open={open.has("advanced")}
          onToggle={() => toggleOpen("advanced")}
        >
          <Row
            title="البوت يفتكر كام رسالة من المحادثة"
            help="من 0 لـ 50 لكل محادثة. صفر يوقف إرسال التاريخ للموديل، والرسالة الجديدة بتتبعت عادي."
          >
            <Input
              type="number"
              dir="ltr"
              min={0}
              max={50}
              aria-label="عدد الرسائل اللي البوت يفتكرها"
              value={config.historyMessageLimit}
              onChange={(event) =>
                update("historyMessageLimit", Number(event.target.value))
              }
            />
          </Row>
          <Row
            title="مسح سياق الذكاء الاصطناعي"
            help="البوت يبدأ من غير ما يفتكر الرسائل القديمة. سجل الرسائل بيفضل محفوظ."
          >
            <Button
              type="button"
              variant="outline"
              disabled={clearHistory.isPending}
              onClick={() => {
                if (
                  window.confirm(
                    scope === "all"
                      ? "بدء سياق جديد لكل المحادثات؟ سجل الرسائل سيظل محفوظًا."
                      : "بدء سياق جديد لمحادثات هذه الجهة فقط؟ سجل الرسائل سيظل محفوظًا.",
                  )
                )
                  clearHistory.mutate({ targetPage: scope });
              }}
            >
              مسح السياق
            </Button>
          </Row>
          <Row
            title="الاحتفاظ بالمحادثات بالأيام"
            help={line([
              "من 7 لـ 365. الأقدم بيتمسح دوريًا، وبصمات الأحداث غير النصية بتفضل 90 يوم لمنع التكرار.",
              shared,
            ])}
          >
            <Input
              type="number"
              dir="ltr"
              min={7}
              max={365}
              aria-label="الاحتفاظ بالمحادثات بالأيام"
              value={config.retentionDays}
              onChange={(e) =>
                updateShared("retentionDays", Number(e.target.value))
              }
            />
          </Row>
          <h3 className="ar-subhead">إعدادات التوليد</h3>
          <p className="ar-muted">
            {samplingSupported
              ? "القيم الافتراضية مناسبة للبدء. غيّرها بس لو عارف تأثيرها."
              : "الموديل الحالي مش بيطبّق درجة التنويع ونطاق الاحتمالات وعدد الاختيارات. تقدر تضبط حد المخرجات وعبارات التوقف."}{" "}
            Gemini:{" "}
            {data.geminiConfigured
              ? "المفتاح مضبوط على السيرفر."
              : "المفتاح مش مضبوط على السيرفر."}
          </p>
          {models.isLoading && (
            <p role="status">جارٍ تحميل الموديلات المتاحة لحسابك…</p>
          )}
          {models.error && (
            <ErrorState
              message={`تعذر تحميل حدود الموديلات: ${models.error.message}`}
              retry={() => void models.refetch()}
            />
          )}
          <div className="ar-form-grid">
            <Field label="درجة التنويع (Temperature)">
              <Input
                type="number"
                dir="ltr"
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
            <Field label="نطاق الاحتمالات (topP)">
              <Input
                type="number"
                dir="ltr"
                min={0.01}
                max={1}
                step={0.01}
                disabled={!samplingSupported}
                value={config.topP}
                onChange={(event) => update("topP", Number(event.target.value))}
              />
            </Field>
            <Field label="عدد الاختيارات، اختياري (topK)">
              <Input
                type="number"
                dir="ltr"
                min={1}
                max={100}
                disabled={
                  !samplingSupported ||
                  !models.data?.find((model) => model.id === config.model)
                    ?.topK
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
            <Field label="حد مخرجات الموديل (maxOutputTokens)">
              <Input
                type="number"
                dir="ltr"
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
          <Field label="عبارات التوقف (stopSequences)، كل عبارة في سطر">
            <Textarea
              dir="ltr"
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
          <p className="ar-muted">
            لحد 5 عبارات، و40 حرف للعبارة. حد المخرجات بيشمل توليد JSON وممكن
            يشمل التفكير؛ حد قليل جدًا ممكن يقطع الرد.
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
        </Question>
        <div className="ar-save-bar" data-dirty={dirty}>
          <span role="status">
            {unsavedText(changes)}
            {dirty && (
              <span className="ar-muted">
                {" "}
                · الحفظ بيلغي الردود المنتظرة عشان ما تتبعتش بالإعدادات القديمة.
              </span>
            )}
          </span>
          <span className="ar-toolbar">
            <Button
              type="button"
              variant="outline"
              disabled={!dirty || save.isPending}
              onClick={discard}
            >
              تراجع
            </Button>
            <Button disabled={!dirty || save.isPending}>
              {save.isPending ? "جارٍ الحفظ…" : "حفظ"}
            </Button>
          </span>
        </div>
      </form>
    </section>
  );
}
type CheckTone = "on" | "wait" | "off" | "idle";
function CheckItem({
  tone,
  title,
  children,
  action,
}: {
  tone: CheckTone;
  title: string;
  children: ReactNode;
  action?: ReactNode;
}) {
  return (
    <article className="ar-check-item" data-tone={tone}>
      <div>
        <h3>
          <span className={`ar-state ar-state-${tone}`}>{title}</span>
        </h3>
        <div className="ar-muted">{children}</div>
      </div>
      {action}
    </article>
  );
}
const failureText = (code: string) => {
  const label = autoReplyErrorLabel(code);
  return label === code ? "Meta أو السيرفر رفض الطلب." : label;
};
function Connection({
  data,
  scope,
  onOpenInbox,
}: {
  data: SettingsData;
  scope: string;
  onOpenInbox: () => void;
}) {
  const utils = trpc.useUtils();
  const phone = scope === "whatsapp";
  const rows = data.channels.filter((c) =>
    phone ? c.channel === "whatsapp" : c.accountId === scope,
  );
  const [panel, setPanel] = useState<
    "phone" | "log" | "numbers" | "dev" | null
  >(null);
  const togglePanel = (next: NonNullable<typeof panel>) =>
    setPanel((current) => (current === next ? null : next));
  const check = trpc.autoReply.checkConnection.useMutation({
    onSuccess: async (r) => {
      await utils.autoReply.settings.invalidate();
      if (r.ok) toast.success("نجح فحص الوصول لدى Meta");
      else
        toast.error(
          `فشل الفحص: ${autoReplyErrorLabel(r.errorCode ?? "META_CHECK_FAILED")}`,
        );
    },
    onError: (e) => toast.error(e.message),
  });
  const primary = trpc.autoReply.activity.useQuery(
    phone
      ? { channel: "whatsapp" }
      : { channel: "messenger", accountId: scope },
    { refetchInterval: 30_000 },
  );
  const comments = trpc.autoReply.activity.useQuery(
    { channel: "facebook_comment", accountId: scope },
    { refetchInterval: 30_000, enabled: !phone },
  );
  const activity = {
    isLoading: primary.isLoading || (!phone && comments.isLoading),
    error: primary.error ?? (phone ? null : comments.error),
    refetch: () => Promise.all([primary.refetch(), comments.refetch()]),
    data: [...(primary.data ?? []), ...(phone ? [] : (comments.data ?? []))]
      .sort((a, b) => b.id - a.id),
  };
  const contacts = trpc.autoReply.whatsappContactAudience.useQuery(undefined, {
    enabled: phone,
    retry: false,
    refetchInterval: 30_000,
  });
  const onboarding = trpc.autoReply.onboardingStatus.useQuery(undefined, {
    enabled: phone,
    retry: false,
  });
  const config = parsedConfig(data);
  const latest = activity.data?.[0];
  const prefix = (row: ChannelRow) =>
    rows.length > 1 ? `${channelLabels[row.channel]}: ` : "";
  const history = (onboarding.data?.details as { history?: string } | undefined)
    ?.history;
  const historyText = history
    ? (coexistenceStates[
        history === "not_started" ? "not_started_sync" : history
      ] ?? "في انتظار التحقق")
    : "لسه ما بدأش";
  const needsConfirm =
    config.whatsappRecipients.mode === "except_contacts" &&
    !!contacts.data?.available &&
    config.whatsappRecipients.confirmedContactSync !== contacts.data.syncId;
  return (
    <section className="ar-connect" aria-label="حالة الربط">
      {rows.length === 0 && (
        <p className="ar-notice">
          القناة دي مش متعرّفة على السيرفر. ده محتاج المبرمج يضيفها.
        </p>
      )}
      {rows.map((c) => {
        const meta: [CheckTone, string, ReactNode] = !c.configured
          ? [
              "off",
              "إعداد السيرفر غير مكتمل",
              "متغيرات الربط ناقصة على السيرفر. ده محتاج المبرمج.",
            ]
          : c.errorCode
            ? [
                "off",
                "فشل آخر فحص مع Meta",
                <>
                  {failureText(c.errorCode)} الكود:{" "}
                  <bdi className="ar-code">{c.errorCode}</bdi> ·{" "}
                  {time(c.checkedAt)}
                </>,
              ]
            : c.checkFresh
              ? [
                  "on",
                  "الاتصال بـ Meta سليم",
                  `آخر فحص ناجح: ${time(c.checkedAt)}`,
                ]
              : c.checkedAt && !c.checkOk
                ? [
                    "wait",
                    "الربط اتغيّر بعد آخر فحص",
                    `آخر فحص: ${time(c.checkedAt)}. افحص تاني.`,
                  ]
                : c.checkedAt
                  ? [
                      "wait",
                      "آخر فحص أقدم من يوم",
                      `آخر فحص: ${time(c.checkedAt)}`,
                    ]
                  : ["wait", "لسه ما اتعملش فحص", "افحص الاتصال قبل التشغيل."];
        return (
          <div key={`${c.channel}:${c.accountId}:${c.label}`}>
            <CheckItem
              tone={meta[0]}
              title={`${prefix(c)}${meta[1]}`}
              action={
                <Button
                  variant="outline"
                  disabled={!c.configured || check.isPending}
                  onClick={() =>
                    check.mutate({ channel: c.channel, accountId: c.accountId })
                  }
                >
                  {check.isPending &&
                  check.variables?.channel === c.channel &&
                  check.variables.accountId === c.accountId
                    ? "جارٍ الفحص…"
                    : "افحص الآن"}
                </Button>
              }
            >
              {meta[2]}
            </CheckItem>
            <CheckItem
              tone={c.lastWebhookAt ? "on" : "wait"}
              title={`${prefix(c)}${c.lastWebhookAt ? "الرسائل بتوصل" : "لسه ما وصلش حدث من Meta"}`}
              action={
                <Button variant="outline" onClick={onOpenInbox}>
                  المحادثات
                </Button>
              }
            >
              {c.lastWebhookAt
                ? `آخر حدث وصل من Meta: ${time(c.lastWebhookAt)}`
                : "لو العملاء بعتوا ومفيش حاجة وصلت، راجع اشتراك الـ Webhook في التفاصيل التقنية."}
              {c.channel === "whatsapp" &&
                c.lastMobileEchoAt &&
                ` · آخر رد من الموبايل: ${time(c.lastMobileEchoAt)}`}
            </CheckItem>
          </div>
        );
      })}
      {activity.isLoading ? (
        <CheckItem tone="idle" title="آخر رد">
          <span role="status">جارٍ تحميل آخر إرسال…</span>
        </CheckItem>
      ) : activity.error ? (
        <CheckItem
          tone="off"
          title="تعذر تحميل سجل الإرسال"
          action={
            <Button variant="outline" onClick={() => void activity.refetch()}>
              إعادة المحاولة
            </Button>
          }
        >
          {activity.error.message}
        </CheckItem>
      ) : !latest ? (
        <CheckItem tone="idle" title="لسه مفيش ردود اتبعتت من هنا">
          نتايج «جرّب سؤال» مش بتظهر هنا.
        </CheckItem>
      ) : (
        <CheckItem
          tone={
            ["failed", "unknown"].includes(latest.state)
              ? "off"
              : ["sent", "delivered", "read"].includes(latest.state)
                ? "on"
                : "wait"
          }
          title={
            ["failed", "unknown"].includes(latest.state)
              ? "آخر رد ما اتبعتش"
              : ["sent", "delivered", "read"].includes(latest.state)
                ? "آخر رد اتبعت"
                : `آخر رد: ${statusLabels[latest.state] ?? latest.state}`
          }
          action={
            <Button
              variant="outline"
              aria-expanded={panel === "log"}
              onClick={() => togglePanel("log")}
            >
              سجل الإرسال
            </Button>
          }
        >
          {statusLabels[latest.state] ?? latest.state} ·{" "}
          {latest.kind === "auto" ? "رد آلي" : "رد موظف"} ·{" "}
          {time(latest.updatedAt)}
          {latest.errorCode && (
            <>
              <br />
              {failureText(latest.errorCode)} كود Meta:{" "}
              <bdi className="ar-code">{latest.errorCode}</bdi>
            </>
          )}
        </CheckItem>
      )}
      {phone && (
        <CheckItem
          tone={
            contacts.isError || onboarding.isError
              ? "off"
              : needsConfirm || !contacts.data?.available
                ? "wait"
                : "on"
          }
          title={
            contacts.isError || onboarding.isError
              ? "ربط الموبايل: تعذر تحميل الحالة"
              : needsConfirm
                ? "ربط الموبايل: جهات الاتصال محتاجة تأكيدك"
                : contacts.data?.available
                  ? "ربط الموبايل شغّال"
                  : "ربط الموبايل: جهات الاتصال لسه ما وصلتش"
          }
          action={
            <Button
              variant="outline"
              aria-expanded={panel === "phone"}
              onClick={() => togglePanel("phone")}
            >
              إدارة الربط
            </Button>
          }
        >
          {contacts.isLoading
            ? "جارٍ تحميل جهات الاتصال…"
            : contacts.data?.available
              ? `جهات الاتصال المُزامنة: ${count(contacts.data.count)}`
              : "جهات الاتصال: مش جاهزة"}{" "}
          · تاريخ المحادثات القديمة:{" "}
          {onboarding.isLoading ? "جارٍ التحميل…" : historyText}
          {needsConfirm && ". أكّد القايمة من «الرد ← يرد على مين؟»."}
        </CheckItem>
      )}
      <div className="ar-toolbar ar-connect-links">
        {(
          [
            ["log", "سجل الإرسال"],
            ["numbers", "أرقام القناة"],
            ["dev", "تفاصيل تقنية للمبرمج"],
          ] as const
        ).map(([id, label]) => (
          <Button
            key={id}
            variant="outline"
            aria-expanded={panel === id}
            onClick={() => togglePanel(id)}
          >
            {label}
          </Button>
        ))}
      </div>
      {panel === "phone" && <WhatsAppCoexistence />}
      {panel === "log" && <Activity pages={data.pages} scope={scope} />}
      {panel === "numbers" && <Metrics scope={scope} />}
      {panel === "dev" && (
        <div className="ar-panel">
          <h2>تفاصيل تقنية للمبرمج</h2>
          <p>
            الأسرار بتتضاف في بيئة السيرفر. الشاشة دي مش بتستقبل المفاتيح ولا
            بتعرض قيمها. نجاح فحص الوصول مش بيثبت اكتمال مراجعة التطبيق أو
            صلاحية إرسال كل أنواع الرسائل.
          </p>
          {phone && (
            <p className="ar-notice">
              رقم تأكيد الحجوزات منفصل ويستمر بالربط الحالي. رقم خدمة العملاء
              يحتاج WhatsApp Business App Coexistence عبر Embedded Signup حتى
              يستمر على الموبايل. يجب التحقق من أهلية الرقم واستقبال حدث رد من
              الهاتف قبل تشغيل الرد الآلي.
            </p>
          )}
          <h3>مسار Webhook</h3>
          <p dir="ltr" className="ar-prewrap">
            {window.location.origin}/webhook/auto-reply/meta
          </p>
          <h3>الصلاحيات المطلوبة</h3>
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
          <h3>الأصول</h3>
          {rows.map((c) => (
            <p key={`${c.channel}:${c.accountId}:${c.label}`}>
              {channelLabels[c.channel]} · {c.label}: معرّف الأصل{" "}
              <bdi>{c.accountId || "غير مضبوط"}</bdi> · آخر فحص:{" "}
              {time(c.checkedAt)} · آخر Webhook مطابق: {time(c.lastWebhookAt)}
              {c.errorCode && (
                <>
                  {" "}
                  · نتيجة الفحص: <bdi>{c.errorCode}</bdi>
                </>
              )}
            </p>
          ))}
        </div>
      )}
    </section>
  );
}
type PendingPreview = {
  requestId: string;
  engine: "central_live";
  channel: AutoReplyChannel;
  text: string;
  accountId?: string;
};
function restoredPreview(): PendingPreview | undefined {
  try {
    const raw: unknown = JSON.parse(
      sessionStorage.getItem("selrs.ai.reply.preview") ?? "null",
    );
    if (!raw || typeof raw !== "object") return;
    const value = raw as Record<string, unknown>;
    if (
      typeof value.requestId === "string" &&
      typeof value.text === "string" &&
      autoReplyChannels.includes(value.channel as AutoReplyChannel)
    )
      return {
        requestId: value.requestId,
        text: value.text,
        channel: value.channel as AutoReplyChannel,
        accountId:
          typeof value.accountId === "string" ? value.accountId : undefined,
        engine: "central_live",
      };
  } catch {}
}
function InternalTest({
  pages,
  activeEngine,
  onPendingChange,
  scope,
  compact = false,
}: {
  pages: FacebookPages;
  activeEngine: "current" | "central";
  onPendingChange: (pending: boolean) => void;
  scope: string;
  compact?: boolean;
}) {
  const capabilities = trpc.aiManagement.status.useQuery(undefined, {
    retry: false,
  });
  const centralReady =
    capabilities.data?.enabled && capabilities.data.replyPreviewAvailable;
  const [restored] = useState(restoredPreview);
  const [requestId, setRequestId] = useState<string | undefined>(
    restored?.requestId,
  );
  const engine =
    requestId || activeEngine === "central" ? "central_live" : "current";
  const sending = useRef(false);
  const [accountId, setAccountId] = useState(scope === "whatsapp" ? "" : scope);
  const [channel, setChannel] = useState<AutoReplyChannel>(
    scope === "whatsapp" ? "whatsapp" : "messenger",
  );
  const [text, setText] = useState(restored?.text ?? "");
  const test = trpc.autoReply.test.useMutation({ retry: false });
  const lastInput = useRef<Parameters<typeof test.mutate>[0] | undefined>(
    restored,
  );
  const mutate = test.mutate;
  useEffect(() => {
    if (test.error?.message !== "AI_TASK_PENDING" || !lastInput.current) return;
    const timer = setTimeout(() => {
      if (lastInput.current) mutate(lastInput.current);
    }, 5000);
    return () => clearTimeout(timer);
  }, [test.error, mutate]);
  useEffect(() => {
    if (!test.data && test.error?.message !== "AI_TASK_FAILED") return;
    try {
      sessionStorage.removeItem("selrs.ai.reply.preview");
    } catch {}
    setRequestId(undefined);
    onPendingChange(false);
  }, [test.data, test.error, onPendingChange]);
  return (
    <section className={compact ? "ar-try-panel" : "ar-panel"}>
      {compact ? (
        <>
          <h2>جرّب سؤال</h2>
          <p className="ar-muted">
            شوف البوت هيرد بإيه بالمعلومات المفعّلة، من غير إرسال لأي عميل. ممكن
            يستهلك رصيد المساعد.
          </p>
        </>
      ) : (
        <>
          <h2>اختبار داخلي دون إرسال للعملاء</h2>
          <p>
            يستخدم المعرفة المعتمدة والموديل المحدد. لا ينشئ محادثة حقيقية أو
            مهمة إرسال. قد يستهلك رصيد المساعد المختار.
          </p>
        </>
      )}
      {engine === "central_live" && (
        <p>هذه معاينة دون إرسال، بنفس موديل وحدود مهمة «الرد الآلي المركزي».</p>
      )}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (sending.current) return;
          if (engine !== "current" && !centralReady) return;
          sending.current = true;
          const id =
            engine !== "current"
              ? (requestId ?? crypto.randomUUID())
              : undefined;
          setRequestId(id);
          const payload: Parameters<typeof test.mutate>[0] = {
            engine,
            requestId: id,
            channel,
            text,
            accountId: channel === "whatsapp" ? undefined : accountId,
          };
          lastInput.current = payload;
          if (id) {
            onPendingChange(true);
            try {
              sessionStorage.setItem(
                "selrs.ai.reply.preview",
                JSON.stringify(payload),
              );
            } catch {}
          }
          test.mutate(payload, {
            onSettled: () => {
              sending.current = false;
            },
          });
        }}
      >
        {scope !== "whatsapp" && !requestId && (
          <ChannelTabs pageOnly value={channel} onChange={setChannel} />
        )}
        <Field label={compact ? "سؤال العميل" : "رسالة العميل للاختبار"}>
          <Textarea
            required
            value={text}
            disabled={Boolean(requestId)}
            maxLength={3000}
            rows={compact ? 3 : 4}
            onChange={(e) => setText(e.target.value)}
          />
        </Field>
        <Button disabled={test.isPending || !text.trim()}>
          {test.isPending
            ? "جارٍ تحضير الرد…"
            : compact
              ? "جرّب"
              : "عرض الرد المقترح"}
        </Button>
      </form>
      {test.error?.message === "AI_TASK_PENDING" ? (
        <p role="status">
          المساعد يجهّز الرد. تتم متابعة نفس المهمة دون طلب توليد جديد.
        </p>
      ) : (
        test.error && (
          <ErrorState
            message={
              test.error.message === "AI_TASK_FAILED"
                ? "فشلت المهمة أو لم ترجع ردًا صالحًا. لم يُرسل أي رد، ويمكنك مراجعة الاختيار قبل اختبار جديد."
                : test.error.message === "AI_TASK_EXPIRED"
                  ? "انتهت مهلة المتابعة. راجع سجل الاستخدام قبل بدء طلب بديل."
                  : test.error.message
            }
          />
        )
      )}
      {requestId && (
        <p>
          معرف طلب المعاينة: <bdi>{requestId}</bdi>. عند خطأ الاتصال راجع هذا
          الطلب في سجل AI قبل بدء تجربة أخرى.
          <Button
            type="button"
            variant="outline"
            disabled={test.isPending}
            onClick={() => {
              if (
                !window.confirm(
                  "إيقاف المتابعة لا يلغي المهمة أو تكلفتها لدى المساعد. راجع سجل الاستخدام قبل بدء اختبار جديد. هل تريد إيقاف المتابعة المحلية؟",
                )
              )
                return;
              try {
                sessionStorage.removeItem("selrs.ai.reply.preview");
              } catch {}
              lastInput.current = undefined;
              setRequestId(undefined);
              onPendingChange(false);
              test.reset();
            }}
          >
            إيقاف المتابعة المحلية
          </Button>
        </p>
      )}
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
          <h4>اعتمد على إيه؟</h4>
          {test.data.sources.length ? (
            <>
              <ul className="ar-sources">
                {test.data.sources.map((source) => (
                  <li key={source.id} dir="auto">
                    {source.title}
                  </li>
                ))}
              </ul>
              <p className="ar-muted">
                الموديل هو اللي بيحدد المعلومات دي، والسيرفر بيتأكد إنها من
                المعلومات اللي اتبعتت له. مش بيثبت إن كل جملة جت منها.
              </p>
            </>
          ) : (
            <p>
              {test.data.reason
                ? "ولا معلومة: ده رد ثابت من قواعد البوت."
                : "ولا معلومة محددة: الرد تواصل عام زي التحية أو الشكر."}
            </p>
          )}
          <p>
            الموديل:{" "}
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
const count = (value: number) => value.toLocaleString("ar-EG");
function duration(seconds: number | null) {
  if (seconds === null) return "—";
  if (seconds < 90) return `${count(Math.round(seconds))} ثانية`;
  if (seconds < 5400) return `${count(Math.round(seconds / 60))} دقيقة`;
  return `${count(Math.round(seconds / 3600))} ساعة`;
}
function Metrics({ scope }: { scope: string }) {
  const [days, setDays] = useState(7);
  const query = trpc.autoReply.metrics.useQuery({ scope, days });
  const data = query.data;
  return (
    <section className="ar-panel" aria-label="أرقام الرد الآلي">
      <div className="ar-section-heading">
        <div>
          <h2>أرقام الرد الآلي</h2>
          <p className="ar-muted">
            محسوبة من المهام والمحادثات المحفوظة فقط.
            {data &&
              ` الأقدم من ${count(data.retentionDays)} يومًا يُحذف حسب إعداد الاحتفاظ، فلا يظهر هنا.`}
          </p>
        </div>
        <Field label="الفترة">
          <select
            value={days}
            onChange={(e) => setDays(Number(e.target.value))}
          >
            <option value={1}>آخر يوم</option>
            <option value={7}>آخر 7 أيام</option>
            <option value={30}>آخر 30 يومًا</option>
            <option value={90}>آخر 90 يومًا</option>
          </select>
        </Field>
      </div>
      {query.isLoading && <p role="status">جارٍ حساب الأرقام…</p>}
      {query.error && (
        <ErrorState
          message={query.error.message}
          retry={() => void query.refetch()}
        />
      )}
      {data && (
        <>
          <dl className="ar-form-grid">
            <div>
              <dt>ردود آلية قبلتها Meta</dt>
              <dd>{count(data.sentAuto)}</dd>
            </div>
            <div>
              <dt>ردود موظفين من الشاشة</dt>
              <dd>{count(data.sentStaff)}</dd>
            </div>
            <div>
              <dt>نسبة التحويل لموظف</dt>
              <dd>
                {data.autoJobs
                  ? `${count(Math.round((data.handoffs / data.autoJobs) * 100))}٪ (${count(data.handoffs)} من ${count(data.autoJobs)})`
                  : "—"}
              </dd>
            </div>
            <div>
              <dt>متوسط زمن الرد الآلي (الوسيط)</dt>
              <dd>{duration(data.medianReplySeconds)}</dd>
            </div>
          </dl>
          <h3>أسباب المحادثات المحوّلة حاليًا</h3>
          {data.handoffReasons.length === 0 ? (
            <p>لا توجد محادثات مع موظف في هذه الفترة.</p>
          ) : (
            <div className="ar-table-wrap" role="region" aria-label="أسباب التحويل" tabIndex={0}>
              <table>
                <thead>
                  <tr>
                    <th>السبب</th>
                    <th>المحادثات</th>
                  </tr>
                </thead>
                <tbody>
                  {data.handoffReasons.map((row) => (
                    <tr key={row.reason}>
                      <td>{handoffReasonLabel(row.reason)}</td>
                      <td>{count(row.count)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <h3>التوكنز لكل قناة يوميًا</h3>
          {data.tokensByDay.length === 0 ? (
            <p>لا يوجد استهلاك مسجل في هذه الفترة.</p>
          ) : (
            <div className="ar-table-wrap" role="region" aria-label="التوكنز اليومية" tabIndex={0}>
              <table>
                <thead>
                  <tr>
                    <th>اليوم</th>
                    <th>القناة</th>
                    <th>التوكنز</th>
                  </tr>
                </thead>
                <tbody>
                  {data.tokensByDay.map((row) => (
                    <tr key={`${row.day}:${row.channel}`}>
                      <td>
                        <bdi>{row.day}</bdi>
                      </td>
                      <td>
                        {channelLabels[row.channel as AutoReplyChannel] ??
                          row.channel}
                      </td>
                      <td>{count(row.tokens)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </section>
  );
}
function Activity({ pages, scope }: { pages: FacebookPages; scope: string }) {
  const [channel, setChannel] = useState<AutoReplyChannel>(
    scope === "whatsapp" ? "whatsapp" : "messenger",
  );
  const query = trpc.autoReply.activity.useQuery(
    { channel, accountId: scope === "whatsapp" ? undefined : scope },
    {
      refetchInterval: 10_000,
    },
  );
  return (
    <section className="ar-panel">
      {scope !== "whatsapp" && (
        <ChannelTabs pageOnly value={channel} onChange={setChannel} />
      )}
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
                  {j.attempts} · <span>{j.errorCode ? autoReplyErrorLabel(j.errorCode) : "لا يوجد"}</span>
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
