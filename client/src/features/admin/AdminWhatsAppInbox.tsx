import { useEffect, useRef, useState } from "react";
import {
  Bell,
  BellOff,
  ChevronLeft,
  ChevronRight,
  Loader2,
  MessageCircle,
  Reply,
  Search,
  Send,
} from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { trpc } from "@/lib/trpc";

function formatDateTime(value: unknown): string {
  if (!value) return "—";
  const date = value instanceof Date ? value : new Date(String(value));
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString("ar-EG");
}

const PAGE_SIZE_OPTIONS = [25, 50, 100, 200] as const;
const INBOX_REFRESH_INTERVAL_MS = 10_000;
const WHATSAPP_NOTIFICATIONS_KEY = "selrs_whatsapp_inbox_notifications";
const EMPTY_MESSAGES: any[] = [];

type ReplyTarget = {
  fromPhone: string;
  waMessageId: string | null;
  body: string | null;
};

export default function AdminWhatsAppInbox() {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] =
    useState<(typeof PAGE_SIZE_OPTIONS)[number]>(50);
  const [replyTarget, setReplyTarget] = useState<ReplyTarget | null>(null);
  const [replyMessage, setReplyMessage] = useState("");
  const [browserNotificationsEnabled, setBrowserNotificationsEnabled] =
    useState(() => {
      if (typeof window === "undefined" || !("Notification" in window)) {
        return false;
      }
      return (
        Notification.permission === "granted" &&
        localStorage.getItem(WHATSAPP_NOTIFICATIONS_KEY) === "enabled"
      );
    });
  const latestMessageIdRef = useRef<number | null>(null);

  const { data, isLoading, isFetching, error } =
    trpc.whatsappInbox.list.useQuery(
      { page, pageSize },
      {
        refetchInterval: INBOX_REFRESH_INTERVAL_MS,
        refetchIntervalInBackground: true,
        refetchOnWindowFocus: true,
      },
    );
  const latestMessagesQuery = trpc.whatsappInbox.list.useQuery(
    { page: 1, pageSize: 10 },
    {
      enabled: page !== 1,
      refetchInterval: INBOX_REFRESH_INTERVAL_MS,
      refetchIntervalInBackground: true,
      refetchOnWindowFocus: true,
    },
  );

  const rows = data?.rows ?? EMPTY_MESSAGES;
  const latestRows =
    page === 1 ? rows : (latestMessagesQuery.data?.rows ?? EMPTY_MESSAGES);
  const hasMore = rows.length === pageSize;
  const sendReply = trpc.whatsappInbox.sendReply.useMutation({
    onSuccess: () => {
      toast.success("تم إرسال الرد عبر واتساب");
      setReplyTarget(null);
      setReplyMessage("");
    },
    onError: (replyError) => {
      toast.error(replyError.message || "تعذر إرسال الرد عبر واتساب");
    },
  });

  const handlePageSizeChange = (value: string) => {
    setPageSize(Number(value) as (typeof PAGE_SIZE_OPTIONS)[number]);
    setPage(1);
  };

  useEffect(() => {
    const newestMessage = latestRows[0];
    if (!newestMessage) return;

    const newestId = Number(newestMessage.id);
    if (!Number.isFinite(newestId)) return;
    if (latestMessageIdRef.current === null) {
      latestMessageIdRef.current = newestId;
      return;
    }
    if (newestId <= latestMessageIdRef.current) return;

    const newMessages = latestRows.filter(
      (message: any) => Number(message.id) > latestMessageIdRef.current!,
    );
    latestMessageIdRef.current = newestId;

    const alertText =
      newMessages.length === 1
        ? `${newestMessage.fromPhone || "رقم غير معروف"}: ${newestMessage.body || "رسالة جديدة"}`
        : `${newMessages.length} رسائل واتساب جديدة`;
    toast.info(alertText);

    if (
      browserNotificationsEnabled &&
      "Notification" in window &&
      Notification.permission === "granted"
    ) {
      try {
        const notification = new Notification("رسالة واتساب جديدة", {
          body: alertText,
          icon: "/favicon.ico",
          dir: "rtl",
          lang: "ar",
          tag: `whatsapp-inbox-${newestId}`,
        });
        notification.onclick = () => {
          window.focus();
          notification.close();
        };
      } catch {
        // The in-app toast remains available when a browser blocks notifications.
      }
    }
  }, [browserNotificationsEnabled, latestRows]);

  const toggleBrowserNotifications = async () => {
    if (browserNotificationsEnabled) {
      localStorage.removeItem(WHATSAPP_NOTIFICATIONS_KEY);
      setBrowserNotificationsEnabled(false);
      toast.info("تم إيقاف إشعارات رسائل واتساب");
      return;
    }
    if (!("Notification" in window)) {
      toast.error("هذا المتصفح لا يدعم الإشعارات");
      return;
    }

    const permission =
      Notification.permission === "granted"
        ? "granted"
        : await Notification.requestPermission();
    if (permission !== "granted") {
      toast.error("لم يتم السماح بإشعارات المتصفح");
      return;
    }

    localStorage.setItem(WHATSAPP_NOTIFICATIONS_KEY, "enabled");
    setBrowserNotificationsEnabled(true);
    toast.success("تم تفعيل إشعارات رسائل واتساب");
  };

  return (
    <div className="w-full space-y-4 pb-6 text-right" dir="rtl">
      <Card
        dir="rtl"
        className="overflow-hidden rounded-lg border-border text-right shadow-none"
      >
        <CardHeader className="space-y-0 border-b border-border bg-muted/20 p-4 sm:p-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <MessageCircle className="h-5 w-5" aria-hidden />
              </div>
              <div>
                <h1 className="text-lg font-bold text-foreground sm:text-xl">
                  رسائل واتساب الواردة
                </h1>
                <p className="mt-0.5 text-xs text-muted-foreground sm:text-sm">
                  الرسائل المستلمة عبر Webhook واتساب
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="gap-1.5 px-2.5 py-1">
                تحديث تلقائي كل ١٠ ثوانٍ
              </Badge>
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={() => void toggleBrowserNotifications()}
                title={
                  browserNotificationsEnabled
                    ? "إيقاف إشعارات واتساب"
                    : "تفعيل إشعارات واتساب"
                }
                aria-label={
                  browserNotificationsEnabled
                    ? "إيقاف إشعارات واتساب"
                    : "تفعيل إشعارات واتساب"
                }
              >
                {browserNotificationsEnabled ? (
                  <Bell className="h-4 w-4" aria-hidden />
                ) : (
                  <BellOff className="h-4 w-4" aria-hidden />
                )}
              </Button>
              <Badge variant="outline" className="gap-1.5 px-2.5 py-1">
                {rows.length} رسالة
              </Badge>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-4 sm:p-5">
          <div className="flex justify-end">
            <Select
              value={String(pageSize)}
              onValueChange={handlePageSizeChange}
            >
              <SelectTrigger className="h-10 w-40">
                <SelectValue placeholder="عدد النتائج" />
              </SelectTrigger>
              <SelectContent>
                {PAGE_SIZE_OPTIONS.map((size) => (
                  <SelectItem key={size} value={String(size)}>
                    {size} / صفحة
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card
        dir="rtl"
        className="overflow-hidden rounded-lg border-border text-right shadow-none"
      >
        <CardContent className="p-0">
          {error ? (
            <div
              className="m-4 rounded-lg border border-destructive/25 bg-destructive/10 p-4 text-sm text-destructive"
              role="alert"
            >
              تعذر تحميل الرسائل: {error.message}
            </div>
          ) : isLoading ? (
            <div className="space-y-2 p-4">
              {Array.from({ length: 7 }).map((_, index) => (
                <Skeleton key={index} className="h-12 w-full rounded-md" />
              ))}
            </div>
          ) : rows.length === 0 ? (
            <div className="flex min-h-64 flex-col items-center justify-center gap-3 p-6 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
                <Search className="h-5 w-5" aria-hidden />
              </div>
              <div>
                <p className="font-semibold text-foreground">
                  لا توجد رسائل بعد
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  ستظهر هنا الرسائل فور استلامها عبر Webhook واتساب
                </p>
              </div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table dir="rtl" className="min-w-[900px]">
                <TableHeader className="bg-muted/50">
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="text-right">الهاتف</TableHead>
                    <TableHead className="text-right">النوع</TableHead>
                    <TableHead className="min-w-72 text-right">
                      نص الرسالة
                    </TableHead>
                    <TableHead className="text-right">وقت الاستلام</TableHead>
                    <TableHead className="w-24 text-right">إجراء</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((msg: any, index: number) => (
                    <TableRow
                      key={msg.id}
                      className={index % 2 === 1 ? "bg-muted/20" : undefined}
                    >
                      <TableCell dir="ltr" className="font-mono tabular-nums">
                        {msg.fromPhone || "—"}
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="font-normal">
                          {msg.messageType || "—"}
                        </Badge>
                      </TableCell>
                      <TableCell className="whitespace-pre-wrap">
                        {msg.body || "—"}
                      </TableCell>
                      <TableCell className="tabular-nums text-muted-foreground">
                        {formatDateTime(msg.receivedAt)}
                      </TableCell>
                      <TableCell>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          disabled={!msg.fromPhone}
                          onClick={() => {
                            setReplyTarget({
                              fromPhone: msg.fromPhone,
                              waMessageId: msg.waMessageId || null,
                              body: msg.body || null,
                            });
                            setReplyMessage("");
                          }}
                          className="gap-1.5"
                        >
                          <Reply className="h-4 w-4" aria-hidden />
                          رد
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

          <div className="flex items-center justify-between border-t border-border bg-muted/20 px-4 py-3">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={page <= 1 || isFetching}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="gap-1"
            >
              <ChevronRight className="h-4 w-4" aria-hidden />
              السابق
            </Button>
            <span className="text-sm font-medium text-foreground">
              صفحة {page}
            </span>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={!hasMore || isFetching}
              onClick={() => setPage((p) => p + 1)}
              className="gap-1"
            >
              التالي
              <ChevronLeft className="h-4 w-4" aria-hidden />
            </Button>
          </div>
        </CardContent>
      </Card>

      <Dialog
        open={replyTarget !== null}
        onOpenChange={(open) => {
          if (!open && !sendReply.isPending) {
            setReplyTarget(null);
            setReplyMessage("");
          }
        }}
      >
        <DialogContent dir="rtl" className="text-right sm:max-w-lg">
          <DialogHeader className="text-right">
            <DialogTitle>الرد عبر واتساب</DialogTitle>
            <DialogDescription dir="ltr" className="text-right">
              {replyTarget?.fromPhone}
            </DialogDescription>
          </DialogHeader>

          {replyTarget?.body ? (
            <div className="rounded-md border border-border bg-muted/40 p-3 text-sm text-muted-foreground">
              <div className="mb-1 text-xs font-bold text-foreground">
                الرسالة الواردة
              </div>
              <div className="whitespace-pre-wrap">{replyTarget.body}</div>
            </div>
          ) : null}

          <Textarea
            value={replyMessage}
            onChange={(event) => setReplyMessage(event.target.value)}
            placeholder="اكتب الرد..."
            maxLength={4096}
            rows={5}
            autoFocus
            disabled={sendReply.isPending}
          />
          <p className="text-xs text-muted-foreground">
            الرد النصي متاح خلال نافذة خدمة العميل. خارجها يتطلب واتساب قالبًا
            معتمدًا.
          </p>

          <DialogFooter className="gap-2 sm:justify-start">
            <Button
              type="button"
              disabled={!replyMessage.trim() || sendReply.isPending}
              onClick={() => {
                if (!replyTarget || !replyMessage.trim()) return;
                sendReply.mutate({
                  recipientPhone: replyTarget.fromPhone,
                  message: replyMessage.trim(),
                  replyToMessageId: replyTarget.waMessageId,
                });
              }}
              className="gap-2"
            >
              {sendReply.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
              ) : (
                <Send className="h-4 w-4" aria-hidden />
              )}
              إرسال
            </Button>
            <Button
              type="button"
              variant="outline"
              disabled={sendReply.isPending}
              onClick={() => {
                setReplyTarget(null);
                setReplyMessage("");
              }}
            >
              إلغاء
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
