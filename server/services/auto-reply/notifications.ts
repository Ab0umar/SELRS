import { pushAppNotification } from "../../_core/appNotifications";
import type { AutoReplyChannel } from "../../../shared/auto-reply";

export type AutoReplyNotificationKind = "inbound" | "reply" | "handoff";

export async function notifyAutoReply(
  event: AutoReplyNotificationKind,
  conversationId: number,
  channel: AutoReplyChannel,
) {
  const titles = {
    inbound: "رسالة جديدة",
    reply: "تم إرسال رد",
    handoff: "محادثة تحتاج موظفًا",
  };
  const channels = {
    whatsapp: "واتساب",
    messenger: "ماسنجر",
    facebook_comment: "تعليقات فيسبوك",
  };
  try {
    await pushAppNotification({
      title: titles[event],
      message: `${channels[channel]} · محادثة رقم ${conversationId}`,
      kind: event === "handoff" ? "warning" : "info",
      targetRoles: event === "handoff" ? ["admin", "reception"] : ["admin"],
      source: "auto_reply",
      entityType: "auto_reply_conversation",
      entityId: conversationId,
      meta: {
        path:
          event === "handoff" ? "/reception-inbox" : "/admin-hub/auto-reply",
        conversationId,
        event,
      },
      channels: { inApp: true, push: true },
    });
  } catch {
    console.warn("[auto-reply] NOTIFICATION_DELIVERY_FAILED");
  }
}
