import { randomUUID } from "node:crypto";
import { and, desc, eq, gt, inArray, lt, sql } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import {
  autoReplyOnboarding as attempts,
  autoReplySettings as settings,
  autoReplySyncEvents as syncEvents,
  type CoexistenceDetails,
} from "../../../drizzle/autoReply";
import { ensureSettings, getAutoReplyDb, readSettings } from "./store";
import { hash } from "./policy";
import { autoReplySettingsSchema } from "../../../shared/auto-reply";
import {
  openCoexistence,
  readCoexistenceCredentials,
  saveCoexistenceCredentials,
  sealCoexistence,
} from "./coexistence-credentials";

export const coexistenceAssets = z.object({
  event: z.literal("FINISH_WHATSAPP_BUSINESS_APP_ONBOARDING"),
  phoneId: z.string().regex(/^\d{1,128}$/),
  wabaId: z.string().regex(/^\d{1,128}$/),
});
function fail(message: string): never {
  throw new TRPCError({ code: "PRECONDITION_FAILED", message });
}
export function assertCustomerServicePhone(phoneId: string) {
  if (!process.env.WHATSAPP_PHONE_NUMBER_ID)
    fail("BOOKING_PHONE_GUARD_MISSING");
  if (phoneId === process.env.WHATSAPP_PHONE_NUMBER_ID)
    fail("WHATSAPP_CONFIRMATION_NUMBER_RESERVED");
}
export function onboardingSession(cookieHeader: string | undefined) {
  const cookies = cookieHeader?.split(";").map((cookie) => cookie.trim()) ?? [];
  for (const name of ["app_session_id", "authToken"]) {
    const cookie = cookies.find((part) => part.startsWith(`${name}=`));
    if (cookie) return cookie.slice(name.length + 1);
  }
  return "";
}
function setup() {
  const appId = process.env.AUTO_REPLY_META_APP_ID ?? "";
  const configId = process.env.AUTO_REPLY_EMBEDDED_SIGNUP_CONFIG_ID ?? "";
  const origin = process.env.AUTO_REPLY_PUBLIC_ORIGIN ?? "";
  const version = process.env.AUTO_REPLY_META_GRAPH_VERSION ?? "";
  if (
    process.env.AUTO_REPLY_COEXISTENCE_ENABLED !== "true" ||
    !/^\d+$/.test(appId) ||
    !/^\d+$/.test(configId) ||
    !/^v\d+\.\d+$/.test(version) ||
    !process.env.AUTO_REPLY_META_APP_SECRET ||
    !/^https:\/\/[^/]+$/.test(origin)
  )
    fail("COEXISTENCE_SETUP_INCOMPLETE");
  sealCoexistence({ check: true });
  return { appId, configId, origin, version };
}
export async function onboardingStatus() {
  const db = await getAutoReplyDb();
  const [row] = await db
    .select()
    .from(attempts)
    .orderBy(desc(attempts.createdAt))
    .limit(1);
  let sdk: ReturnType<typeof setup> | null = null;
  try {
    sdk = setup();
  } catch {
    /* Only readiness is public. */
  }
  const queueCounts = row
    ? await db
        .select({ state: syncEvents.state, count: sql<number>`COUNT(*)` })
        .from(syncEvents)
        .where(eq(syncEvents.attemptId, row.id))
        .groupBy(syncEvents.state)
    : [];
  return {
    ready: Boolean(sdk),
    sdk,
    state: row?.state ?? "not_started",
    details: row?.details ?? {},
    updatedAt: row?.updatedAt ?? null,
    syncQueue: Object.fromEntries(
      queueCounts.map((entry) => [entry.state, Number(entry.count)]),
    ),
  };
}
export function requireOnboardingOrigin(origin: string | undefined) {
  if (origin !== setup().origin)
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "COEXISTENCE_ORIGIN_INVALID",
    });
}
export async function beginOnboarding(userId: number, session: string) {
  const config = setup();
  if (!session) fail("COEXISTENCE_SESSION_REQUIRED");
  if ((await readSettings()).sendingEnabled)
    fail("STOP_SENDING_BEFORE_LINKING");
  if (readCoexistenceCredentials()) fail("WHATSAPP_ALREADY_LINKED");
  await ensureSettings();
  const db = await getAutoReplyDb();
  const id = randomUUID();
  await db.transaction(async (tx) => {
    const [currentSettings] = await tx
      .select()
      .from(settings)
      .where(eq(settings.id, 1))
      .for("update");
    if (autoReplySettingsSchema.parse(currentSettings.config).sendingEnabled)
      fail("STOP_SENDING_BEFORE_LINKING");
    const active = await tx
      .select()
      .from(attempts)
      .where(
        and(
          gt(attempts.expiresAt, new Date()),
          inArray(attempts.state, [
            "created",
            "exchanging",
            "token_ready",
            "verifying",
            "subscribing",
            "syncing",
          ]),
        ),
      )
      .limit(1);
    if (active.length) fail("COEXISTENCE_ATTEMPT_ACTIVE");
    await tx.insert(attempts).values({
      id,
      userId,
      sessionHash: hash(session),
      state: "created",
      details: {},
      createdAt: new Date(),
      updatedAt: new Date(),
      expiresAt: new Date(Date.now() + 15 * 60_000),
    });
  });
  return { id, ...config };
}
async function ownedAttempt(id: string, userId: number, session: string) {
  const db = await getAutoReplyDb();
  const [row] = await db.select().from(attempts).where(eq(attempts.id, id));
  if (
    !row ||
    row.userId !== userId ||
    row.sessionHash !== hash(session) ||
    row.expiresAt.getTime() <= Date.now()
  )
    fail("COEXISTENCE_ATTEMPT_EXPIRED");
  return row;
}
export async function onboardingGraph(
  path: string,
  token?: string,
  body?: unknown,
) {
  const version = setup().version;
  let response: Response;
  try {
    response = await fetch(`https://graph.facebook.com/${version}/${path}`, {
      method: body === undefined ? "GET" : "POST",
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        "Content-Type": "application/json",
      },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
      signal: AbortSignal.timeout(12_000),
      redirect: "error",
    });
  } catch {
    throw new Error("META_ONBOARDING_RESULT_UNKNOWN");
  }
  let result: unknown;
  try {
    result = await response.json();
  } catch {
    throw new Error("META_ONBOARDING_INVALID_RESPONSE");
  }
  if (
    !response.ok ||
    !result ||
    typeof result !== "object" ||
    "error" in result
  )
    throw new Error("META_ONBOARDING_REJECTED");
  return result;
}
export async function exchangeOnboardingCode(
  id: string,
  code: string,
  userId: number,
  session: string,
) {
  await ownedAttempt(id, userId, session);
  const db = await getAutoReplyDb();
  const [claimed] = await db
    .update(attempts)
    .set({ state: "exchanging", updatedAt: new Date() })
    .where(and(eq(attempts.id, id), eq(attempts.state, "created")));
  if (!claimed.affectedRows) fail("COEXISTENCE_CODE_ALREADY_USED");
  try {
    const query = new URLSearchParams({
      client_id: setup().appId,
      client_secret: process.env.AUTO_REPLY_META_APP_SECRET!,
      code,
    });
    const result = z
      .object({ access_token: z.string().min(20) })
      .parse(await onboardingGraph(`oauth/access_token?${query}`));
    await db
      .update(attempts)
      .set({
        state: "token_ready",
        tokenCipher: sealCoexistence(result.access_token),
        updatedAt: new Date(),
      })
      .where(eq(attempts.id, id));
    return { ok: true };
  } catch {
    await db
      .update(attempts)
      .set({
        state: "exchange_unknown",
        details: { errorCode: "TOKEN_EXCHANGE_FAILED_OR_UNKNOWN" },
        updatedAt: new Date(),
      })
      .where(eq(attempts.id, id));
    fail("TOKEN_EXCHANGE_FAILED_OR_UNKNOWN");
  }
}
export async function finishOnboarding(
  id: string,
  assets: z.infer<typeof coexistenceAssets>,
  userId: number,
  session: string,
) {
  const row = await ownedAttempt(id, userId, session);
  assertCustomerServicePhone(assets.phoneId);
  if (readCoexistenceCredentials()) fail("WHATSAPP_ALREADY_LINKED");
  if (row.state !== "token_ready" || !row.tokenCipher)
    fail("COEXISTENCE_TOKEN_NOT_READY");
  const token = z.string().parse(openCoexistence(row.tokenCipher));
  const db = await getAutoReplyDb();
  const details: CoexistenceDetails = {
    phoneId: assets.phoneId,
    wabaId: assets.wabaId,
    history: "not_started",
    contacts: "not_started",
  };
  const [claim] = await db
    .update(attempts)
    .set({ state: "verifying", details, updatedAt: new Date() })
    .where(and(eq(attempts.id, id), eq(attempts.state, "token_ready")));
  if (!claim.affectedRows) fail("COEXISTENCE_ATTEMPT_ACTIVE");
  try {
    const appToken = `${setup().appId}|${process.env.AUTO_REPLY_META_APP_SECRET}`;
    const debug = z
      .object({
        data: z.object({
          app_id: z.string(),
          is_valid: z.boolean(),
          scopes: z.array(z.string()),
        }),
      })
      .parse(
        await onboardingGraph(
          `debug_token?${new URLSearchParams({ input_token: token })}`,
          appToken,
        ),
      );
    if (
      !debug.data.is_valid ||
      debug.data.app_id !== setup().appId ||
      !["whatsapp_business_messaging", "whatsapp_business_management"].every(
        (scope) => debug.data.scopes.includes(scope),
      )
    )
      fail("COEXISTENCE_TOKEN_INVALID");
    const phone = z
      .object({
        id: z.string(),
        is_on_biz_app: z.boolean(),
        platform_type: z.string(),
      })
      .parse(
        await onboardingGraph(
          `${assets.phoneId}?fields=id,is_on_biz_app,platform_type`,
          token,
        ),
      );
    if (
      phone.id !== assets.phoneId ||
      !phone.is_on_biz_app ||
      phone.platform_type !== "CLOUD_API"
    )
      fail("WHATSAPP_COEXISTENCE_NOT_VERIFIED");
    const phones = z
      .object({ data: z.array(z.object({ id: z.string() })) })
      .parse(
        await onboardingGraph(
          `${assets.wabaId}/phone_numbers?fields=id&limit=100`,
          token,
        ),
      );
    if (!phones.data.some((p) => p.id === assets.phoneId))
      fail("WHATSAPP_WABA_NUMBER_MISMATCH");
    await db
      .update(attempts)
      .set({ state: "subscribing", updatedAt: new Date() })
      .where(eq(attempts.id, id));
    z.object({ success: z.literal(true) }).parse(
      await onboardingGraph(`${assets.wabaId}/subscribed_apps`, token, {}),
    );
    const subscriptions = z
      .object({
        data: z.array(
          z.object({
            whatsapp_business_api_data: z.object({ id: z.string() }).optional(),
            id: z.string().optional(),
          }),
        ),
      })
      .parse(await onboardingGraph(`${assets.wabaId}/subscribed_apps`, token));
    if (
      !subscriptions.data.some(
        (s) => (s.whatsapp_business_api_data?.id ?? s.id) === setup().appId,
      )
    )
      fail("COEXISTENCE_SUBSCRIPTION_NOT_VERIFIED");
    saveCoexistenceCredentials({
      token,
      phoneId: assets.phoneId,
      wabaId: assets.wabaId,
      attemptId: id,
    });
    await db
      .update(attempts)
      .set({ state: "syncing", tokenCipher: null, updatedAt: new Date() })
      .where(eq(attempts.id, id));
    return { ok: true };
  } catch {
    await db
      .update(attempts)
      .set({
        state: "setup_failed",
        details: {
          ...details,
          errorCode: "COEXISTENCE_VERIFICATION_OR_SUBSCRIPTION_FAILED",
        },
        tokenCipher: null,
        updatedAt: new Date(),
      })
      .where(eq(attempts.id, id));
    fail("COEXISTENCE_VERIFICATION_OR_SUBSCRIPTION_FAILED");
  }
}
export async function cancelOnboarding(
  id: string,
  userId: number,
  session: string,
) {
  await ownedAttempt(id, userId, session);
  const db = await getAutoReplyDb();
  await db
    .update(attempts)
    .set({ state: "cancelled", tokenCipher: null, updatedAt: new Date() })
    .where(
      and(
        eq(attempts.id, id),
        inArray(attempts.state, ["created", "token_ready"]),
      ),
    );
  return { ok: true };
}

export async function initiateCoexistenceSync() {
  const credentials = readCoexistenceCredentials();
  if (!credentials) return;
  assertCustomerServicePhone(credentials.phoneId);
  const db = await getAutoReplyDb();
  for (const kind of ["contacts", "history"] as const) {
    const claimed = await db.transaction(async (tx) => {
      const [row] = await tx
        .select()
        .from(attempts)
        .where(eq(attempts.id, credentials.attemptId))
        .for("update");
      if (
        row &&
        ["subscribing", "setup_failed"].includes(row.state) &&
        row.details.phoneId === credentials.phoneId &&
        row.details.wabaId === credentials.wabaId
      ) {
        await tx
          .update(attempts)
          .set({ state: "syncing", tokenCipher: null, updatedAt: new Date() })
          .where(eq(attempts.id, row.id));
        row.state = "syncing";
      }
      if (
        !row ||
        row.state !== "syncing" ||
        row.details[kind] !== "not_started"
      )
        return false;
      const expired = Date.now() - row.createdAt.getTime() >= 24 * 3600_000;
      await tx
        .update(attempts)
        .set({
          details: {
            ...row.details,
            [kind]: expired ? "deadline_expired" : "requesting",
          },
          updatedAt: new Date(),
        })
        .where(eq(attempts.id, row.id));
      return !expired;
    });
    if (!claimed) continue;
    let requestId: string | undefined;
    try {
      const response = z.object({ request_id: z.string() }).parse(
        await onboardingGraph(
          `${credentials.phoneId}/smb_app_data`,
          credentials.token,
          {
            messaging_product: "whatsapp",
            sync_type: kind === "contacts" ? "smb_app_state_sync" : "history",
          },
        ),
      );
      requestId = response.request_id;
    } catch {
      /* An uncertain POST is never automatically repeated. */
    }
    await db.transaction(async (tx) => {
      const [row] = await tx
        .select()
        .from(attempts)
        .where(eq(attempts.id, credentials.attemptId))
        .for("update");
      if (!row) return;
      await tx
        .update(attempts)
        .set({
          details: {
            ...row.details,
            ...(row.details[kind] === "requesting"
              ? { [kind]: requestId ? "accepted" : "unknown" }
              : {}),
            ...(requestId
              ? {
                  [kind === "contacts"
                    ? "contactsRequestId"
                    : "historyRequestId"]: requestId,
                }
              : {}),
          },
          updatedAt: new Date(),
        })
        .where(eq(attempts.id, row.id));
    });
  }
  await db
    .update(attempts)
    .set({ tokenCipher: null })
    .where(lt(attempts.expiresAt, new Date()));
}
