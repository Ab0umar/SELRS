import { useEffect, useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { channelLabels } from "../../../../shared/auto-reply";
import { toast } from "sonner";
import "./AutoReply.css";

export default function ReceptionInbox() {
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<number | null>(null);
  const inbox = trpc.autoReply.receptionInbox.useQuery(
    { page },
    { refetchInterval: 2000 },
  );
  useEffect(() => {
    if (page > 1 && inbox.data?.rows.length === 0) setPage(1);
  }, [inbox.data, page]);
  return (
    <main className="auto-reply" dir="rtl">
      <header className="ar-header">
        <div>
          <h1>محادثات الاستقبال</h1>
          <p>
            المحادثات المحوّلة لموظف فقط. بعد نجاح ردك ترجع للبوت وتختفي من هنا.
          </p>
        </div>
      </header>
      {inbox.isLoading && <p role="status">جارٍ تحميل المحادثات…</p>}
      {inbox.error && (
        <p role="alert">
          {inbox.error.message}
          <Button onClick={() => void inbox.refetch()}>إعادة المحاولة</Button>
        </p>
      )}
      {inbox.data && !inbox.data.sendingEnabled && (
        <p role="alert">الإرسال العام متوقف. تواصل مع الإدارة لتفعيله.</p>
      )}
      {inbox.data?.rows.length === 0 && (
        <p role="status">لا توجد محادثات تحتاج ردّ الاستقبال.</p>
      )}
      <div className="ar-panel">
        {inbox.data?.rows.map((c) => (
          <div key={c.id} className="ar-knowledge-row">
            <div>
              <h2>
                {channelLabels[c.channel]} · محادثة #{c.id}
              </h2>
              <bdi>{c.participantId}</bdi>
            </div>
            <Button onClick={() => setSelected(c.id)}>فتح المحادثة</Button>
          </div>
        ))}
      </div>
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
          disabled={!inbox.data?.hasMore}
          onClick={() => setPage((p) => p + 1)}
        >
          التالي
        </Button>
      </div>
      <Dialog
        open={selected !== null}
        onOpenChange={(open) => {
          if (!open) setSelected(null);
        }}
      >
        <DialogContent className="auto-reply ar-conversation-dialog" dir="rtl">
          <DialogHeader>
            <DialogTitle>محادثة الاستقبال #{selected}</DialogTitle>
            <DialogDescription>
              الرد الناجح يعيد المحادثة للبوت تلقائيًا.
            </DialogDescription>
          </DialogHeader>
          {selected !== null && (
            <ReceptionThread
              key={selected}
              id={selected}
              sendingEnabled={Boolean(inbox.data?.sendingEnabled)}
              onDone={() => {
                setSelected(null);
                void inbox.refetch();
              }}
            />
          )}
        </DialogContent>
      </Dialog>
    </main>
  );
}

function ReceptionThread({
  id,
  sendingEnabled,
  onDone,
}: {
  id: number;
  sendingEnabled: boolean;
  onDone: () => void;
}) {
  const conversation = trpc.autoReply.receptionConversation.useQuery(id, {
    refetchInterval: 2000,
  });
  const [text, setText] = useState("");
  const [requestId, setRequestId] = useState(() => crypto.randomUUID());
  const utils = trpc.useUtils();
  const send = trpc.autoReply.receptionReply.useMutation({
    onSuccess: async () => {
      setText("");
      setRequestId(crypto.randomUUID());
      await utils.autoReply.receptionConversation.invalidate(id);
      toast.success("الرد قيد الإرسال؛ ستختفي المحادثة بعد نجاحه");
    },
    onError: (e) => toast.error(e.message),
  });
  useEffect(() => {
    if (conversation.isSuccess && conversation.data === null) onDone();
  }, [conversation.isSuccess, conversation.data, onDone]);
  if (conversation.isLoading) return <p role="status">جارٍ تحميل الرسائل…</p>;
  if (conversation.error)
    return <p role="alert">{conversation.error.message}</p>;
  if (!conversation.data) return null;
  return (
    <>
      <ol className="ar-messages">
        {conversation.data.rows.map((m) => (
          <li key={m.id}>
            <strong>
              {m.direction === "inbound"
                ? "العميل"
                : m.direction === "bot"
                  ? "البوت"
                  : "موظف"}
            </strong>
            <p className="whitespace-pre-wrap break-words">{m.body}</p>
          </li>
        ))}
      </ol>
      {conversation.data.manualReplies
        ?.filter((reply) =>
          ["failed", "cancelled", "unknown"].includes(reply.state),
        )
        .map((reply) => (
          <div key={reply.id} role="status">
            <p>
              {reply.state === "unknown"
                ? "نتيجة الإرسال غير مؤكدة؛ راجع القناة قبل إرسال رد آخر."
                : reply.state === "failed"
                  ? "تعذّر إرسال الرد."
                  : "أُلغي الرد قبل الإرسال."}
            </p>
            <p className="whitespace-pre-wrap break-words">{reply.body}</p>
            {reply.errorCode && (
              <p>
                <bdi>{reply.errorCode}</bdi>
              </p>
            )}
            {reply.state !== "unknown" && (
              <Button
                variant="outline"
                disabled={conversation.data?.replyPending || send.isPending}
                onClick={() => {
                  setText(reply.body ?? "");
                  setRequestId(crypto.randomUUID());
                }}
              >
                استعادة النص للمراجعة
              </Button>
            )}
          </div>
        ))}
      <label htmlFor="reception-reply">رد الاستقبال</label>
      <Textarea
        id="reception-reply"
        value={text}
        maxLength={2000}
        onChange={(e) => setText(e.target.value)}
        disabled={send.isPending || conversation.data.replyPending}
      />
      <Button
        disabled={
          !sendingEnabled ||
          !text.trim() ||
          send.isPending ||
          conversation.data.replyPending
        }
        onClick={() => send.mutate({ id, text, requestId })}
      >
        {conversation.data.replyPending || send.isPending
          ? "جارٍ إرسال الرد…"
          : "إرسال الرد"}
      </Button>
    </>
  );
}
