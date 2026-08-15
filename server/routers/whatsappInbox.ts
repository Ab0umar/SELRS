/**
 * Admin view over inbound WhatsApp Cloud API messages received via
 * server/_core/whatsappWebhook.ts (stored in whatsappInboundMessages).
 */
import { z } from "zod";
import { makePageProcedure, router } from "../_core/procedures";
import { getDb } from "../db";
import { whatsappInboundMessages } from "../../drizzle/schema";
import { desc } from "drizzle-orm";
import { sendWhatsAppReply } from "../services/whatsappReply.service";

const whatsappInboxProcedure = makePageProcedure("/admin/whatsapp-inbox");

export const whatsappInboxRouter = router({
  list: whatsappInboxProcedure
    .input(
      z.object({
        page: z.number().int().min(1).default(1),
        pageSize: z.number().int().min(1).max(200).default(50),
      }),
    )
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      const offset = (input.page - 1) * input.pageSize;
      const rows = await db
        .select()
        .from(whatsappInboundMessages)
        .orderBy(desc(whatsappInboundMessages.receivedAt))
        .limit(input.pageSize)
        .offset(offset);
      return { rows, page: input.page, pageSize: input.pageSize };
    }),
  sendReply: whatsappInboxProcedure
    .input(
      z.object({
        recipientPhone: z.string().trim().min(8).max(32),
        message: z.string().trim().min(1).max(4096),
        replyToMessageId: z.string().trim().max(128).nullish(),
      }),
    )
    .mutation(async ({ input }) => {
      return sendWhatsAppReply(input);
    }),
});
