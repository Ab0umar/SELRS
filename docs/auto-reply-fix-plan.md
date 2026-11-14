# Auto-reply fix and feature plan

Owner-approved on 2026-11-14. Nine PRs, executed in order. Each PR is one branch stacked on the previous one, with its own pull request. Never merge a PR yourself.

## Ground rules

- Read `CLAUDE.md` and `docs/AI_CONTEXT.md` first. Smallest correct diff. No refactors outside the listed scope.
- Do not edit protected files (`server/db.ts`, `drizzle/schema.ts`, `server/_core/procedures.ts`, `ProtectedRoute.tsx`, …). Auto-reply tables live in `drizzle/autoReply.ts`.
- Migrations go in the `drizzle/` root as `.sql`, statements separated by `--> statement-breakpoint` on its own line. Check how recent auto-reply migrations (`0104`–`0108`) are named and registered before adding one. Never add `NOT NULL` to an existing column.
- UI text on the auto-reply screen is Arabic. Keep that. For any UI or copy edit, follow the antislop instructions in `CLAUDE.md`.
- Never log customer message bodies, tokens, or provider payloads.
- Per PR: `pnpm check`, `pnpm test`; add `pnpm build` where shipped behaviour changes; then `graphify update .`. Report failures honestly; do not skip or weaken existing tests. Where an existing test asserts behaviour this plan changes on purpose, update the test and say so in the PR body.
- Live Meta sends cannot be tested from the dev machine. Say so in the PR body and list what the owner must verify by hand.

## Code map

| Area | File |
|---|---|
| Worker loop, claim, send | `server/services/auto-reply/worker.ts` |
| Ingest, settings save, manual reply, purge | `server/services/auto-reply/store.ts` |
| Meta webhook parsing | `server/services/auto-reply/events.ts` |
| Webhook route | `server/_core/autoReplyWebhook.ts` |
| Safety rules, hours, knowledge selection | `server/services/auto-reply/policy.ts` |
| Meta client, reply generation, output guard | `server/services/auto-reply/providers.ts` |
| Settings schema | `shared/auto-reply.ts` |
| tRPC router (admin only today) | `server/routers/autoReply.ts` |
| Admin screen | `client/src/features/admin/AutoReply.tsx` |
| Legacy confirmation-number webhook | `server/_core/whatsappWebhook.ts` |
| Tests | `server/tests/autoReply.test.ts`, `autoReply.integration.test.ts`, `autoReplyRecipients.test.ts`, `dualProviderTasks.test.ts` |

Every ingest, send and settings mutation serialises on `SELECT … FOR UPDATE` of `auto_reply_settings` row 1. Keep that lock order (settings row first) in anything new.

---

## PR 1 — stop silent outages

1. **Transient check failure must not disable a channel** (`worker.ts`, periodic check in `startAutoReplyWorker`).
   - A network error, HTTP 429, HTTP 5xx, or Meta codes 1/2 during `checkMetaConnection` is transient: leave the `auto_reply_connections` row untouched.
   - Stop skipping rows with `checkOk = false`; re-check them too, as long as the fingerprint is current and `checkedAt` is set.
   - In `runAutoReplyTick`, when verification fails with `CHECK_NOT_OK` or `CHECK_EXPIRED`, the row exists, and its fingerprint is current: run one inline re-check (skip if `checkedAt` is under 5 minutes old and the failure is `CHECK_NOT_OK`), then re-evaluate. A transient outcome throws a retryable `ProviderError`.
2. **Settings save must not cancel staff replies** (`store.ts` `saveSettings`). When sending was on before and stays on: leave manual jobs alone; requeue auto jobs instead of cancelling (clear `body` on pending/retry/generating auto jobs; move `generating` jobs of any kind back to `pending` with `claim` and `leaseUntil` cleared). When sending is off before or after the save, keep today's cancel-everything behaviour ("never release a backlog").
3. **Knowledge save must not drop replies** (`store.ts` `withKnowledgeUpdate`): same requeue.
   - Caveat to resolve: with `engine: "central"`, a second generation for the same `requestKey` hits the duplicate check in `server/services/ai/managementStore.ts` (around line 172) and the job ends `unknown`. Read that path and make a requeued job regenerate cleanly without breaking the Manus pending/resume flow, which depends on a stable request id across `CENTRAL_AI_PENDING` retries. If no safe option exists, keep cancel for central-engine jobs but move the conversation to `human` with the reason, so it is visible.
4. **`LOCAL_RATE_LIMIT` must not consume attempts** (`worker.ts` `jobFailure`): retry in 2 seconds and do not count the attempt.
5. **Log internal errors** (`worker.ts`, both catch blocks): for anything that is not a `ProviderError`, log job id, error name, driver error code and stack frames only. Drizzle error messages can contain query parameters, so never log `error.message`.
6. **Indexes**: add an index on `provider_id` to `auto_reply_messages` and `auto_reply_jobs` (`drizzle/autoReply.ts` plus one migration).

Tests: transient check keeps `checkOk`; failed row recovers; manual job survives a settings save; auto job is requeued by settings and knowledge saves; rate-limit retry leaves attempts unchanged.

## PR 2 — webhook and send path

1. **Tolerant parsing** (`events.ts`, `autoReplyWebhook.ts`): parse each `messaging` item with `safeParse` and skip invalid ones. A correctly signed payload that still fails the envelope returns 200 after a diagnostic log. 503 stays for storage failures only.
2. **Meta request outside the lock** (`worker.ts`): three steps.
   1. One short transaction re-validates everything (conversation revision, claim, kill switch, channel enabled, recipient allowed, reply window, 2-second account rate limit) and marks the job `sending`.
   2. The Meta call(s) run with no transaction open.
   3. A second short transaction records `sent`, the message rows, `lastActivityAt` and `lastSentAt`.
   A crash between 2 and 3 already resolves to `unknown` through lease expiry; keep that. Keep the `acceptedByMeta` → `SEND_COMMIT_UNCERTAIN` handling.
3. **Private price reply**: record the private message row even when the public comment then fails, with a distinct job error code. Use an English public line when the comment is English.
4. **Staff-started conversations** (`store.ts` ingest): when the first event of a conversation is a staff echo, set `lastInboundAt` to epoch so the reply window reads as closed. In `sendMetaReply`, omit `context` when there is no inbound message id.

Tests: a batch with one malformed item ingests the rest; private-then-public failure leaves a message row; echo-started conversation rejects a manual reply with the window message.

## PR 3 — conversation behaviour

New settings in `shared/auto-reply.ts`, each with an Arabic field on the settings screen:

| Setting | Default | Meaning |
|---|---|---|
| `handoffReopenHours` | 24 | 0 = never |
| `staffReplyPauseMinutes` | 0 | 0 = today's behaviour |
| `maxAutoRepliesPerHour` | 20 | per conversation |

1. **Non-text messages**: ignore WhatsApp `reaction` events entirely. For other non-text messages (voice, image, sticker) on WhatsApp and Messenger, queue one fixed acknowledgement (Arabic: "وصلتنا رسالتك، وهنحوّلها لموظف من المركز يرد عليك." plus an English variant) while the conversation moves to `human`. Send it only on the open → human transition.
2. **Handoff reopen**: on a new customer message, a `human` conversation idle longer than `handoffReopenHours` reopens and gets a job. Exception: `humanReason = "staff_takeover"` never reopens automatically.
3. **Staff pause**: after a staff reply (`staff_reply` or `external_staff_reply`), automation resumes on the next customer message only once `staffReplyPauseMinutes` have passed since the staff message. Default 0 keeps the existing tested behaviour.
4. **Outside-hours message**: skip it if the same text was sent in that conversation in the last 6 hours.
5. **Facebook comments**:
   - The public handoff line becomes "نرجو التواصل على الخاص" (English: "Please message us privately.").
   - Post that line only when the comment is a question or request. For comments that are not questions (praise, prayers, tagging a friend), post nothing and hand off silently. Decide "is a question" from the model's structured output (add a field), not from keywords.
   - Use `parent_id`: do not reply to a nested comment unless its parent is one of the bot's own replies.
6. **Language**: detect from the current message; fall back to the first message only when the current one has no letters.
7. **Output guard**: strip list markers before the number check, accept numbers that appear in the cited source's title, trim trailing punctuation from links, and tell the model not to use numbered lists.
8. **Large teaching entries**: in `selectKnowledgeContext`, split entries over about 3000 characters into paragraph chunks, rank chunks by match, keep the original id on each chunk. Add a small Arabic stop-word list so "في" and "من" stop matching everything.
9. **Reply cap**: past `maxAutoRepliesPerHour` bot messages in a conversation, hand off with reason `rate_limited` and create no job. In the legacy webhook (`whatsappWebhook.ts`), send the fixed auto-reply at most once per number per 6 hours and only for text messages; marketing opt-in/opt-out replies are unchanged.

Tests: one per rule.

**Shipped** in #32 (`4a73a429` on `fix/auto-reply-pr3-conversation`, merge `79f2a99f` into `fix/auto-reply-pr2-webhook-send`). Operator detail: `docs/auto-reply-setup.md`, section «حدود المحادثة». The list above is the request; the code differs in these places:

- A comment that matches `safetyDecision` (`clinical`, `human_requested`, `untrusted_instruction`) or the public-comment personal-data pattern (7+ digits, «تقرير طبي», «تحاليل», `medical report`, or `@`) still posts «نرجو التواصل على الخاص» / "Please message us privately." with no model call. `isQuestion` is read only after a model response. A missing `isQuestion` is treated as a question (`parsed.isQuestion !== false` in `providers.ts`).
- The non-text acknowledgement language comes from the first inbound message (`englishFirst`), because the stored body is `[رسالة غير نصية]`.
- `staff_takeover` is the manual control «تحويل لموظف وإيقاف البوت» (`setConversationStatus`). It is not reopened while that reason remains. A non-text customer event replaces it with `unsupported_message`, and a safety-rule message replaces it with that rule's reason. Reopen is evaluated on a later customer message. A non-text message during `staffReplyPauseMinutes` changes the reason and does not queue the acknowledgement. Staff echoes keep `staff_takeover`.
- The hourly cap counts stored `auto_reply_messages` rows with `direction = bot` in the last hour. It is separate from the three generation attempts per job.
- WhatsApp `reaction` events are dropped in `events.ts` and are not stored. Messenger events with no `message.text` follow the non-text acknowledgement path.

## PR 4 — cleanup

- Remove the duplicated administrator instructions from the prompt and the current message from the history sent to the model.
- `clearAIHistory` takes the settings lock first, like every other mutation.
- Delete the unused legacy procedures `knowledge`, `saveKnowledge`, `deleteKnowledge`, `importCatalog` and their tests. Confirm no client or script calls them first. Do not delete rows or the `knowledgeMode` setting.
- Update `docs/auto-reply-setup.md`, `docs/auto-reply-verification.md` and `docs/api-reference.md`.

## PR 5 — staff notification on handoff, reception access

- Owner decision: admins and reception both receive notifications and can work the conversation inbox.
- Add a page permission for the auto-reply inbox following `.claude/rules/permissions.md` and the existing path-based pattern. Reception gets conversations list, conversation view, manual reply, and status change. Settings, teaching, connections and onboarding stay admin-only. Gate both the frontend route and each backend procedure.
- When a conversation moves to `human` (any reason except `staff_takeover` and `staff_reply`), notify through the existing FCM and WebSocket helpers: channel, reason, and a link that opens the conversation. No message body in the push payload.
- Tests: procedure access per role; notification fired once per transition.

## PR 6 — suggested-reply mode

- Setting per target: `replyMode: "auto" | "suggest"` (default `auto`).
- In `suggest` mode the worker generates, stores the draft on the job in a new state `suggested`, and does not send. The inbox shows the draft with approve, edit, and discard. Approve sends through the existing manual path and records who approved.
- A new customer message supersedes a pending suggestion, same as other auto jobs.
- Tests: draft is never sent without approval; approval sends once; supersede works.

## PR 7 — metrics tab

- New tab on the auto-reply screen: replies sent, handoff rate and reasons, median time to reply, tokens per channel per day. Read-only queries on `auto_reply_jobs`, `auto_reply_conversations`, `auto_reply_messages`.
- State on the tab that history is limited by the retention setting.
- Follow the dataviz skill for any chart.

## PR 8 — booking link

- Setting `bookingUrl` (https only). When set, it is offered to the model as an approved source so it passes the link guard, and the model may send it when the customer asks to book.
- The bot still never creates, reads or changes bookings.

## PR 9 — WhatsApp voice notes

- Owner approved sending customer audio to Google for transcription.
- Parse the audio media id in `events.ts`, download through the Graph API with the channel token, transcribe with Gemini, and store the transcript as the message body with a voice marker. The message then follows the normal text path, including `safetyDecision`.
- Limits: skip audio over 2 minutes or 5 MB and fall back to the PR 3 acknowledgement. Do not store the audio file. Transcription failure falls back the same way.
- Setting to turn it off. Document the data flow in `docs/auto-reply-setup.md`.
- WhatsApp only.
