import {
  mysqlTable,
  varchar,
  text,
  timestamp,
  bigint,
  char,
  index,
  uniqueIndex,
} from "drizzle-orm/mysql-core";
export const whatsappConfirmationAttempts = mysqlTable(
  "whatsapp_confirmation_attempts",
  {
    id: varchar("id", { length: 36 }).primaryKey(),
    requestKey: char("request_key", { length: 64 }),
    kind: varchar("kind", { length: 40 }).notNull(),
    senderPhoneId: varchar("sender_phone_id", { length: 64 }).notNull(),
    recipientPhone: varchar("recipient_phone", { length: 32 }),
    patientName: varchar("patient_name", { length: 255 }),
    templateName: varchar("template_name", { length: 100 }).notNull(),
    language: varchar("language", { length: 20 }).notNull(),
    state: varchar("state", { length: 20 }).notNull(),
    providerMessageId: varchar("provider_message_id", { length: 255 }),
    eventMs: bigint("event_ms", { mode: "number" }),
    errorCode: varchar("error_code", { length: 40 }),
    errorDetails: text("error_details"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
  },
  (t) => ({
    provider: uniqueIndex("whatsapp_confirmation_provider").on(
      t.providerMessageId,
    ),
    request: uniqueIndex("whatsapp_confirmation_request").on(t.requestKey),
    created: index("whatsapp_confirmation_created").on(t.createdAt),
    recipient: index("whatsapp_confirmation_recipient").on(
      t.recipientPhone,
      t.createdAt,
    ),
  }),
);
export const whatsappConfirmationReceipts = mysqlTable(
  "whatsapp_confirmation_receipts",
  {
    id: char("id", { length: 64 }).primaryKey(),
    senderPhoneId: varchar("sender_phone_id", { length: 64 }).notNull(),
    recipientPhone: varchar("recipient_phone", { length: 32 }),
    providerMessageId: varchar("provider_message_id", {
      length: 255,
    }).notNull(),
    state: varchar("state", { length: 20 }).notNull(),
    eventMs: bigint("event_ms", { mode: "number" }).notNull(),
    errorCode: varchar("error_code", { length: 40 }),
    errorDetails: text("error_details"),
    receivedAt: timestamp("received_at").defaultNow().notNull(),
  },
  (t) => ({
    message: index("whatsapp_confirmation_receipt_message").on(
      t.senderPhoneId,
      t.providerMessageId,
    ),
    received: index("whatsapp_confirmation_receipt_received").on(t.receivedAt),
  }),
);
