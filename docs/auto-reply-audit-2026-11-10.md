# Auto Reply review and test results

## Repair update, 10 November 2026

The seven defects below have now been repaired by GPT-6.1 Sol (low reasoning effort). The original audit below is retained as historical evidence, not a description of the repaired source.

- Disabling delivery bypasses provider readiness checks; enabling still validates them.
- Accepted manual replies survive newer customer messages, while closure/global-stop checks remain. Concurrent manual replies are rejected. Reception can inspect failed/cancelled replies and restore their text; uncertain sends remain explicitly marked for reconciliation.
- Delivery failures preserve closed conversations and notify reception only after a committed transition into human handling.
- Administrator message history is separate from resettable AI context.
- Oversized knowledge entries contribute bounded relevant excerpts with source IDs and target isolation preserved.
- Conversation suggestions supply a stable request ID and poll pending results; input errors retain useful classification.
- The permission test recognizes the reception route's role-only policy.
- Migration `drizzle/0112_auto_reply_provider_indexes.sql` adds message/job provider-ID indexes. It was tested only in isolated MySQL; production application is still required. EXPLAIN changed from `ALL` to `ref` for both lookups (`outputs/auto-reply/repair-query-plans.json`).

Worker validation: 199 focused tests passed, including 89 isolated MySQL cases; all 712 frontend tests passed; TypeScript, encoding, diff checks and Graphify update passed. Graphify reported a missing SQL-parser dependency, so SQL validation relies on the database tests rather than graph extraction.

Parent validation: a fresh isolated Vite build passed. The full existing browser fixture passed all eight viewport/theme combinations, scope isolation, dialogs, independent memory/schedules, scoped log/reset/test, empty/error states and both Coexistence event orderings. Additional browser fixtures verified reception reply recovery and return-to-bot on desktop/mobile, and central suggestion pending polling reused the same request ID and rendered the result. Evidence: `repair-build.log`, `repair-browser.log`, `repair-reception.log`, and `repair-suggestion.log` under `outputs/auto-reply/`.

No deployment, service restart, real customer messages, or Meta modifications were performed. Real device push, live contact-sync completeness and deployed behavior remain unverified. Existing unrelated edits were preserved.

---

Date: 10 November 2026, Africa/Cairo. Repository: `E:\selrs.cc`.

Reviewed the working tree based on HEAD `182498a4`, including existing uncommitted Auto Reply and reception changes. Read `docs/auto-reply-conversations-summary.md` first. This is a code and isolated-test review, not certification of the deployed service or Meta account.

**Result: seven functional defects reproduced, one existing client test failure, and one SQL indexing concern. Production source was not changed.**

## Reproduced functional defects

### 1. P1: Emergency stop can be rejected by provider configuration checks

Location: `server/routers/autoReply.ts:438`; stop button in `client/src/features/admin/AutoReply.tsx:330`.

The stop button submits the existing configuration with `sendingEnabled: false`. `saveSettings` still requires an enabled central profile before it considers whether sending is being disabled. If central management/profile has been disabled, stopping fails with `PRECONDITION_FAILED`. Provider-dependent validation should apply to enabling or using a provider, not prevent disabling delivery.

Reproduction: save a sending-enabled central configuration; disable `AI_CORE_MANAGEMENT_ENABLED`; call the same save mutation with sending disabled. Expected success, received a prerequisite error. This establishes failure of the stop control, not that every central job continues sending when its provider is disabled. Manual/prepared jobs also depend on the unchanged global flag.

### 2. P1: A new customer message silently cancels a queued staff reply

Locations: `server/services/auto-reply/store.ts:230` and `server/services/auto-reply/worker.ts:174`.

Ingestion increments the conversation revision for new inbound messages, including while a manual reply is queued. The worker rejects a revision mismatch for manual jobs as well as generated replies. The reception UI has already cleared the employee's text after queue acceptance. When the customer sends another message before the worker processes the reply, the manual job becomes `cancelled` and the employee's reply is never sent. The reception view exposes only pending state, not the cancellation reason or queued body.

Reproduction: human conversation → queue staff reply → ingest another customer message → worker tick. Expected manual job `sent`; actual `cancelled` with no provider send. Preserve accepted manual replies or explicitly surface their cancellation and recoverable text.

### 3. P2: Clearing AI context also hides stored messages from the administrator

Locations: `server/routers/autoReply.ts:608`, `server/services/auto-reply/store.ts:574`.

The administrator conversation endpoint uses `conversationContext`, which filters messages by `contextResetAt`. Thus the reset action retains database rows but removes older messages from the administrator's conversation view. This conflicts with the intended separation between AI memory and the message record. Reception uses a separate unfiltered query, so the two views disagree.

Reproduction: ingest an older message; reset that conversation's AI history; query the administrator conversation. Database message count stays 1; endpoint returns 0 messages. Use separate queries for visible message history and model context.

### 4. P2: A delayed failed-delivery receipt reopens a closed conversation

Location: `server/services/auto-reply/store.ts:313`.

`recordDeliveryReceipts` sets the associated conversation to `human` unconditionally. It does not preserve a later explicit `closed` state. A delayed delivery failure therefore brings a closed conversation back into the reception inbox.

Reproduction: send a reply successfully to the mocked provider; close the conversation; ingest a failed receipt for that accepted message. Expected `closed`; actual `human`. Record delivery failure without overwriting a later closed state.

### 5. P2: Delivery-failure handoff does not notify reception

Location: `server/services/auto-reply/store.ts:313`.

The receipt handler changes an open conversation to `human` but never calls `notifyAutoReply`. Existing handoffs from ingestion and worker failures do send notifications. Reception polling can discover this conversation, but no handoff notification is dispatched through this path.

Reproduction: accept a reply, clear the notification spy, ingest a failed receipt. Conversation changes to `human`; notification spy receives zero calls. Dispatch a notification after a committed transition into the human inbox, without duplicating notifications for repeated receipts.

### 6. P2: Long approved Teach AI entries disappear from central generation

Locations: `server/services/auto-reply/providers.ts:429`, `server/services/auto-reply/policy.ts:180`.

The editor/schema accepts 30,000-character entries. Central generation has a 12,000-character knowledge budget, and selection skips an entire entry if it exceeds that budget. There is no excerpting or chunk selection. A single relevant 16,000-character entry is therefore excluded completely; with no other entries the response becomes `missing_information` without calling the generator. Direct generation uses a different, 64,000-character budget.

Reproduction: provide one approved Teach AI entry containing `"address ".repeat(2000)` and a central generator spy. Expected generator call; actual zero calls. Select bounded relevant excerpts or explicitly validate/document the effective limit instead of silently omitting accepted knowledge.

### 7. P2: Conversation-level suggestion fails when central AI is selected

Locations: `client/src/features/admin/AutoReply.tsx:954`, `server/routers/autoReply.ts:811`.

The conversation's “اقتراح رد دون إرسال” button calls `autoReply.test` without `requestId`. When the configured engine is central, the server switches to `central_live` and requires that ID. It throws before generation and the catch block masks the validation error as a generic `BAD_GATEWAY`. The separate Internal Test screen supplies an ID, so its successful tests do not cover this button.

Reproduction: save a central configuration, then invoke the test endpoint with the conversation button's payload. Expected a preview; actual `BAD_GATEWAY`. Give this flow a stable preview request ID and pending-result handling, and preserve useful input-validation errors.

## Existing test failure

`pnpm test`: **711 passed, 1 failed**, across 105 files. The failing assertion is `client/src/lib/page-permissions.test.ts:127`, which reports `/reception-inbox` missing from the page permission registry/exemption list.

This is a test/permission-policy inconsistency, not evidence of an access bypass: the route explicitly restricts roles to admin/reception, the server checks these roles, and `ProtectedRoute` explicitly permits reception on this path. Resolve whether this role-only route belongs in the registry or in the test's recognized exemptions. Existing mobile navigation tests passed.

## SQL review

- The 80-test MySQL integration suite ran against a dynamically created `selrs_test_reply_<uuid>` database, using migrations 0104–0108 and fixture tables. The suite removes its own database afterward. Production rows were not used for tests.
- Transactional ingestion, duplicate events, concurrent worker claims, account separation, contact tombstones, send retries, unknown outcomes, settings/knowledge cancellation, staff transitions, and reception authorization have existing passing coverage.
- A real `EXPLAIN` for `SELECT * FROM auto_reply_messages WHERE provider_id = 'fixture-id' LIMIT 1` returned `type: ALL`, `possible_keys: null`, `key: null`. The receipt handler executes this lookup while holding the singleton settings lock. Message and job schemas lack provider-ID indexes. This is a scaling concern supported by the query plan, **not a measured production latency incident**. Assess indexes for message/job provider IDs, and measure with representative volume before choosing additional composite indexes.
- Contact exclusion reads and decrypts the account's whole contact set at enqueue/pre-send checkpoints. It fails closed when sync is unavailable/unconfirmed, but its cost should be measured with a large contact book. No large-volume load benchmark was run.
- No migrations, index changes, production data writes, or deployment were performed.

## Validation performed

| Check | Result |
| --- | --- |
| `pnpm check` | Passed |
| `pnpm exec vitest run --config vitest.backend.config.ts server/tests/autoReply.test.ts server/tests/autoReplyRecipients.test.ts server/tests/autoReplyAIConfiguration.test.ts server/tests/coexistence.test.ts server/tests/autoReply.integration.test.ts` | 189 passed, including 80 isolated MySQL cases; none skipped |
| `pnpm test` | 711 passed; 1 failed as detailed above |
| `pnpm exec vite build --outDir ../outputs/auto-reply/audit-build` | Passed; isolated output, not `dist` |
| `DESIGN_PREVIEW_URL=http://127.0.0.1:5198 node scripts/verify-auto-reply.mjs` (PowerShell environment assignment used) | Eight viewport/theme cases passed at 320, 390, 768, 1440 pixels in light/dark, plus empty/error and both signup-event orderings |
| Reception browser fixture | Desktop/mobile open → type → queue → poll → return to bot → disappear from inbox passed |
| Additional reproduction checks | Seven expected-behavior assertions failed, establishing the seven defects above; one query-plan capture passed |

Browser checks used the freshly built frontend with intercepted API fixtures. They covered scoped knowledge/settings/history/schedules/logs/test requests, dialogs, layout overflow, and error states. They do not prove live endpoint behavior, actual Meta onboarding, mobile APK delivery, or push reception on a device. The separate API/MySQL tests supplied backend evidence.

## Scope examined

- Shared settings, target selection, recipient normalization, knowledge and teaching schemas.
- Webhook signature verification, parser boundaries, account routing, customer and staff echoes, comments/deletions and delivery receipts.
- Store queries, event deduplication, conversation state, manual replies, AI reset and retention.
- Worker claims/leases, final gates, connection freshness, working hours, private-price/public-confirmation ordering, retries, uncertain sends and notifications.
- Provider credential selection, connection checks, AI generation, knowledge selection and output guards, central preview/live adapter.
- Coexistence signup, encrypted vault, ownership/origin checks, cancellation, synchronization queue, imported history and contact tombstones/readiness.
- Admin/reception endpoints and UI flows, route guards, mobile navigation, schema and migration alignment.
- Website preview parsing and public-address checks, Gemini model configuration, teaching CRUD, activity and pagination.

The graph query was used for initial navigation, then findings were verified against current source. Passing tests are not a claim of exhaustive branch coverage. No coverage percentage or proof of every possible function/input combination is asserted.

## Evidence and replay

Local evidence is under `outputs/auto-reply/`:

- `audit-reproductions.log`: assertion failures and stack traces.
- `audit-cases.txt`: additional reproduction cases.
- `run-audit-reproductions.ps1`: inserts those cases into a temporary copy of the existing isolated integration fixture, runs only `AUDIT` cases, and removes the temporary test in `finally`. Requires the existing test database environment; deliberately exits nonzero until the defects are fixed.
- `audit-query-plan.json`: MySQL EXPLAIN output.
- `audit-browser.log`: existing browser suite result.
- `audit-reception.mjs` and `audit-reception.log`: isolated reception browser check.

No permanent test or production-source modifications were left by this review. Existing unrelated worktree changes were preserved. The report and evidence are new review artifacts.

## Unverified live layers

Current Meta token/asset eligibility, real incoming/outgoing messages on all three channels, final contact synchronization completeness, live failed sync chunks, actual reception push delivery, and whether SRV100 serves this source revision were not verified. No messages were sent to people, no Meta assets or permissions were changed, and no service was restarted. These require separate controlled live verification; historical successes in the conversation summary do not establish today's state.
