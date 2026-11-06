import { and, eq, ne } from "drizzle-orm";
import type { MySql2Database } from "drizzle-orm/mysql2";
import {
  autoReplyContacts as contacts,
  autoReplyOnboarding as attempts,
  autoReplySyncEvents as queue,
} from "../../../drizzle/autoReply";
import {
  isAutoReplyRecipientAllowed,
  normalizeAutoReplyPhone,
  type AutoReplyChannel,
  type AutoReplySettings,
} from "../../../shared/auto-reply";
import {
  openCoexistence,
  readCoexistenceCredentials,
} from "./coexistence-credentials";

type RecipientDatabase = Pick<MySql2Database, "select">;

export async function whatsappContactAudience(
  db: RecipientDatabase,
  accountId: string,
) {
  const credentials = readCoexistenceCredentials();
  const unavailable = {
    available: false,
    syncId: null,
    phones: new Set<string>(),
  };
  if (!credentials || credentials.phoneId !== accountId) return unavailable;
  const [attempt] = await db
    .select()
    .from(attempts)
    .where(eq(attempts.id, credentials.attemptId));
  if (
    !attempt ||
    attempt.state !== "syncing" ||
    attempt.details.phoneId !== accountId ||
    attempt.details.contacts !== "receiving" ||
    attempt.details.errorCode
  )
    return unavailable;
  const [unfinished] = await db
    .select({ id: queue.id })
    .from(queue)
    .where(
      and(
        eq(queue.attemptId, attempt.id),
        eq(queue.field, "smb_app_state_sync"),
        ne(queue.state, "processed"),
      ),
    )
    .limit(1);
  if (unfinished) return unavailable;
  const rows = await db
    .select({
      phone: contacts.phone,
      nameCipher: contacts.nameCipher,
      sourceAt: contacts.sourceAt,
    })
    .from(contacts)
    .where(eq(contacts.accountId, accountId));
  const latest = new Map<string, { at: number; active: boolean }>();
  for (const row of rows) {
    const phone = normalizeAutoReplyPhone(row.phone);
    const at = row.sourceAt.getTime();
    const active = openCoexistence(row.nameCipher) !== null;
    const previous = latest.get(phone);
    if (!previous || at > previous.at || (at === previous.at && !active))
      latest.set(phone, { at, active });
  }
  const phones = new Set(
    [...latest].filter(([, row]) => row.active).map(([phone]) => phone),
  );
  return { available: true, syncId: attempt.id, phones };
}

export async function isRecipientAllowed(
  db: RecipientDatabase,
  settings: AutoReplySettings,
  recipient: {
    channel: AutoReplyChannel;
    accountId: string;
    participantId: string;
  },
) {
  if (
    recipient.channel !== "whatsapp" ||
    settings.whatsappRecipients.mode !== "except_contacts"
  )
    return isAutoReplyRecipientAllowed(
      settings,
      recipient.channel,
      recipient.participantId,
    );
  const audience = await whatsappContactAudience(db, recipient.accountId);
  const phone = normalizeAutoReplyPhone(recipient.participantId);
  return (
    audience.available &&
    audience.syncId === settings.whatsappRecipients.confirmedContactSync &&
    /^[1-9]\d{7,14}$/.test(phone) &&
    !audience.phones.has(phone)
  );
}
