# Independent AI workspace

The AI module opens at `/ai` and uses `AiLayout` (`client/src/features/ai/AiLayout.tsx`) rather than the administration hub. The header title comes from `aiSubmoduleFor(location)` in `client/src/features/ai/navigation.ts`. Five workspaces share that layout:

| Workspace | Home | What it contains |
| --- | --- | --- |
| AI | `/ai` | Overview, `/ai/settings`, `/ai/experiments`, `/ai/usage` |
| المساعد الطبي | `/ai/medical` | Dictation and clinician proposal review |
| الرد الآلي والتدريب | `/ai/replies` | Conversations, Teach AI, channel settings, reply tests, delivery activity |
| محتوى التسويق | `/ai/marketing` | Generation, `/ai/marketing/drafts`, `history`, `brand`, `settings` |
| حملات واتساب | `/ai/marketing/whatsapp` | Campaign batches, WhatsApp copy (`WhatsAppCopy`), delivery results |

`aiSubmoduleFor` keeps the longest matching home. `/ai/marketing/whatsapp` stays on حملات واتساب. `/ai/marketing/drafts` stays on محتوى التسويق. Any other `/ai` path falls through to the AI workspace.

The sidebar lists those five groups separately (`adminNavGroups` in `client/src/components/layout/AppNav.tsx`). The top-nav **AI** menu lists the four AI pages, then a separator, then المساعد الطبي, الرد الآلي والتدريب, محتوى التسويق, and حملات واتساب. The mobile **المزيد** drawer folds the same pages into one **AI** group. The primary bottom bar has an **AI** tab (`/ai`) and a **محتوى التسويق** tab (`/ai/marketing`); `activeTabKey` lights the longer match, so `/ai/marketing` and `/ai/marketing/whatsapp` light محتوى التسويق. The home card and the command palette entry are both labeled **AI** and open `/ai`. The home التسويق card still links to `/marketing`, which redirects.

`legacyAiRoutes` redirects the old URLs and keeps `search` and `hash`:

| Old path | Destination |
| --- | --- |
| `/admin-hub/ai`, `/admin/ai`, `/booking-triage/ai` | `/ai` |
| `/admin-hub/auto-reply`, `/admin/auto-reply`, `/booking-triage/auto-reply` | `/ai/replies` |
| `/admin-hub/medical-assistant`, `/admin/medical-assistant`, `/booking-triage/medical-assistant` | `/ai/medical` |
| `/marketing` and its `drafts`, `history`, `brand`, `settings`, `whatsapp` children | the matching `/ai/marketing/...` page |
| `/ai/whatsapp` (`ROUTES.aiWhatsApp`) | `/ai/marketing/whatsapp` |

`aiPermissionPath` is unchanged. `/ai/replies` still checks `/admin-hub/auto-reply`. `/ai/medical` checks `/admin-hub/medical-assistant`. `/ai/marketing` checks `/marketing`. A path under `/ai/marketing/` drops the `/ai` prefix (`/ai/marketing/whatsapp` checks `/marketing/whatsapp`). The AI settings pages check `/admin-hub/ai`. The permission editor still groups those IDs under الذكاء الاصطناعي. No permission migration is required. A management permission on its own does not open the clinical, reply, or marketing pages.

## Content generation and the proxy timeout

`marketing.generatePost` and `marketing.generateCentralPost` are `adminProcedure`s in `server/routers/marketing.ts`. Gemini and Grok drafting goes through `generateCentralMarketingDraft` in `server/services/ai/marketingDraft.ts` with `{ detach: true }`.

The detached call inserts `aiMarketingJobs` (and `aiMarketingJobContext`) and returns `{ jobId, topic, state: "running", postId: null }` before `finishCentralMarketingDraft` writes the text and image. The client already polls the job. A rejection from that detached promise is logged as `[marketing] central draft failed` plus the request id. Errors caught inside `finishCentralMarketingDraft` leave the row `uncertain` and store `error_code`; the codes are in the next section. Validation that runs before the insert still fails the mutation: central management disabled, a missing or disabled `marketing.text` / `marketing.image` profile, a Manus profile for a workload whose model was not selected, a missing `GEMINI_API_KEY` or `XAI_API_KEY` for the chosen provider, a repeated request id whose topic, page, or day differs, or a topic that was already published (`PublishedMarketingTopicError` becomes `PRECONDITION_FAILED` on `generateCentralPost`).

`generatePost` adds topic planning:

- A request that already has `topic` awaits the tracked operation. Gemini/Grok then detach as above. Manus still runs `startManusGeneration`, which waits for `createManusTask` before the mutation returns.
- A request with an empty `topic` returns `{ jobId: input.requestId, topic: "" }` immediately. `planMarketingTopic` and the provider start continue in the background. The comment in the router calls out Grok topic planning as the call that can outlast the proxy timeout.

The dashboard polls `marketing.generationRequest` every 4 seconds (`MarketingDashboard.tsx`). A tracked operation whose state is `rejected` clears the pending request and shows «لم يبدأ التوليد. راجع الإعدادات ثم ابدأ طلبًا جديدًا.» On the empty-topic path that error is only in the server log, as `[marketing] generatePost failed` plus the request id. There is no automated test for that empty-topic failure path. When the mutation itself returns a topic, the toast names it; an empty topic uses «بدأ اختيار الموضوع وتجهيز النص والصورة». A request that already includes a topic still returns provider errors from the mutation, and the dashboard shows `err.message`.

`AI_CORE_MANAGEMENT_ENABLED=true` with no request `assistant` resolves the configured marketing assistant. If none is configured, the operation throws `AiManagementError("unavailable")`. On the empty-topic path that rejection is the generic toast above.

## Scheduled generation and stuck jobs

Shipped in PR #29. `initMarketingScheduler` (`server/services/marketing/scheduler.service.ts`) still runs at process start and every five minutes in `Africa/Cairo`. A slot is due when `autoPublish` is on, the Cairo hour has reached `publishHour`, today's weekday is enabled for that page, and the duplicate guard finds no non-failed `marketing_posts` row for that `pageRole` and `postDay` created after the server's local midnight. The claim id uses the Cairo calendar date (`marketing:<yyyy-mm-dd>:<day>:<pageRole>`). Those two clocks differ when the host timezone is not Cairo.

`claimMarketingSchedule` still owns the page/day reservation. A check that finds an existing reservation returns `{ ok: true, skipped: "This page/day generation is already reserved; inspect its existing job" }` unless the Manus retry rule below opens the `:retry` claim.

### Pre-acceptance backoff

`server/services/marketing/schedulerBackoff.ts` stores one in-memory entry per page role (`center`, `doctor`). `checkDueMarketingPosts` calls `recordMarketingStartFailure` only when `runScheduledPost` returns `ok: false`. The waits are 5 minutes, then 30 minutes, then 2 hours. The failure after the 2-hour wait stops that page until the next Cairo date (`en-CA` calendar in `Africa/Cairo`). An `ok: true` result, including "post already exists" and "already reserved", calls `clearMarketingStartFailures`. The map lives in the process: a restart allows the next check to try immediately. The cron can fire before `nextAt`; that tick skips the page.

`ok: false` covers a missing database, a missing linked page, a topic-planner throw, and a generation throw. After a central job has been accepted, a result other than `{ state: "completed", postId }` throws «توليد الجدولة غير محسوم؛ راجع المهمة قبل المحاولة مرة أخرى», which is also `ok: false`. The unused claim is released only when acceptance never happened. The error is inserted into `marketing_logs` with action `scheduler_run`. A later check that only sees the surviving claim returns `ok: true` and clears the backoff counter.

### One retry after a definite Manus failure

When the first claim already exists, `definitelyFailedJob` reads `marketing_generation_jobs` for that id. State `failed` whose `error` does not start with `ORPHANED_START_ERROR` («انقطع بدء مهمة Manus قبل استلام رقمها») gets one more claim. The retry id is the same UUID-shaped SHA-256 of `marketing:<cairo-day>:<day>:<pageRole>:retry`. `uncertain`, `starting`, and `running` rows are left in place. A job failed by the 10-minute orphan sweep is left in place, because a Manus task may already exist.

`ai_marketing_jobs.state` is `running`, `completed`, or `uncertain`. A central schedule claim therefore never matches `definitelyFailedJob`, and the scheduler does not open a `:retry` claim for it.

### Topic planner input

`planMarketingTopic` (`server/services/marketing/topicPlanner.ts`) still rejects an exact repeat against the full published history plus the latest 60 posts. `publishedMarketingTopics()` has no `ORDER BY`. The model payload is separate from that exclusion set:

- The latest 60 posts contribute `topic` and `title`. `content` is not sent.
- `rejected` contains only proposals discarded during this call. The loop allows three attempts, then throws «تعذر اختيار فكرة جديدة دون تكرار؛ أعد المحاولة أو اكتب موضوعًا محددًا».
- Published strings are de-duplicated by `marketingTopicIdentity`, then `slice(-200)` keeps the last 200 in the order the query returned. That is not a date order.
- `buildPlannerInput` drops from the front of that published list, then from the end of the recent list, until `JSON.stringify` length is at most `PLANNER_INPUT_LIMIT` (30,000). `withMarketingBudget` rejects an instruction or input longer than 32,000 characters.

### Manus worker

`initManusGenerationWorker` calls `processManusGenerationJobs` on start and every 20 seconds when `MANUS_API_KEY` is set. One pass runs at a time and reads at most five pending jobs that have a `taskId`.

| Condition | Result |
| --- | --- |
| `starting`, `taskId` null, `createdAt` older than 10 minutes | `failed`. Error is «انقطع بدء مهمة Manus قبل استلام رقمها؛ قد تكون المهمة موجودة في Manus، راجعها قبل إعادة المحاولة». No automatic `:retry`. |
| `starting` or `running`, has `taskId`, older than 30 minutes | `uncertain`, error «انتهت مهلة التوليد؛ راجع المهمة في Manus قبل إعادة المحاولة». Later ticks keep polling it. |
| `uncertain`, has `taskId`, `createdAt` within 6 hours | The tick reads the Manus task and can still save the draft. |
| `uncertain`, `createdAt` older than 6 hours | The worker stops selecting the row. It stays `uncertain` and still blocks a new image on that draft. |
| Manus finished, then the local file write, branding, or DB save threw | `LocalFinishError`. The in-memory counter allows the next three times that job is processed to try the save again. The fourth local failure sets `failed`. A restart zeroes the counter. The worker selects at most five pending jobs per pass, oldest first. |
| Draft row missing, or the image update matched zero rows because the draft changed | `DefiniteJobError`. The job is `failed` on that tick. Messages: «المسودة المطلوبة غير موجودة» or «المسودة تغيرت أثناء التوليد؛ لم يتم استبدال الصورة». |

### Admin resolution

`marketing.resolveGenerationJob` is an `adminProcedure` in `server/routers/marketing.ts`. Input is `{ jobId: string (1–36), action: "recheck" | "abandon" }`. It acts on `marketing_generation_jobs` in `starting`, `running`, or `uncertain`. Any other state is returned unchanged.

- `recheck` with a `taskId` calls `finishJob` immediately. A saved draft comes back `completed`. A task that is still running returns the current state and the worker's message. With no `taskId`, the row is unchanged and the error is «لا يوجد رقم مهمة في Manus لإعادة الفحص؛ يمكنك إيقاف المهمة».
- `abandon` sets `failed` and error «أوقفها المسؤول يدويًا». `marketing_logs.action` is `manus_job_abandoned` and the message includes the user id. The pending-job check on the draft then allows another image. A Manus result that arrives afterward is not written.

`ManusGenerationJobs` (heading «مهام التوليد») is rendered from `MarketingDashboard.tsx` and `DraftPosts.tsx`. For a Manus job in `uncertain` or `starting`, `ManusJobResolve` shows «إعادة فحص المهمة الآن» when `taskId` is set, and «إيقاف المهمة». Abandon opens a confirmation dialog before the mutation. Central `uncertain` rows keep `MarketingJobRecovery` (`marketing.centralRecoveryPlan` / `recoverCentralJob`) when AI management recovery is enabled. They do not get the Manus buttons.

### Central `error_code`

`finishCentralMarketingDraft` catches the failure, leaves `ai_marketing_jobs.state` as `uncertain`, and sets `error_code` from `centralDraftErrorCode`. The log line is `[marketing] central draft ended uncertain`, the request id, `error.name`, and the code. Provider body text is not included.

| Cause | `error_code` |
| --- | --- |
| `StaleMarketingExecutionError` | `stale_execution` |
| `AiManagementError` | `ai_disabled`, `ai_budget`, `ai_capacity`, `ai_duplicate`, or `ai_unavailable` |
| `AiGatewayError` | `gateway_<code>` or `gateway_<code>_<http status>`. Codes: `configuration`, `capacity`, `provider`, `invalid_output` |
| `ZodError` or `SyntaxError` | `invalid_output` |
| `PublishedMarketingTopicError` | `topic_unavailable` |
| any other error | `generation_or_persistence_failed` |

The same column is also written outside that function. `centralMarketingJobs` (the jobs-list query, latest 50 rows) sets `interrupted_or_timed_out` on every `running` row whose `updatedAt` is older than 5 minutes. The dashboard polls that query every 5 seconds while AI management reports enabled, so loading «مهام التوليد» performs the update. Image regeneration stores `image_failed_or_draft_changed`. Recovery can store `recovery_requires_review`.

The jobs list copies `errorCode` onto the central row's `error` field. The red/muted error paragraph is rendered for Manus `failed` and Manus `uncertain` rows. A central code is on the database row and in the log; the on-screen recovery copy comes from `MarketingJobRecovery`'s plan reasons.

### When a scheduled day has no post

1. Confirm `[marketing-scheduler] Initialized` and any `scheduler_run` row in `marketing_logs`.
2. Confirm the page target: linked Facebook page, `autoPublish`, the weekday switch, and `publishHour`.
3. A non-failed post for that page and slot with `createdAt` after the server's local midnight blocks the run. The claim id uses the Cairo date, so the two windows match when the host timezone is Cairo.
4. A live claim whose Manus job is `uncertain`, `starting`, `running`, or orphan-`failed` does not get `:retry`. Use «مهام التوليد» on `/ai/marketing` or the drafts page.
5. Three spaced start failures, then one more, stop that page until the next Cairo day. Restarting the server clears that wait.
6. Topic planning fails closed with «تعذر اختيار فكرة جديدة دون تكرار…» after three colliding proposals. Exact exclusion still uses the full history, including identities trimmed out of the model input.

Tests: `server/tests/marketingSchedulerRetry.test.ts`, `server/tests/topicPlanner.test.ts`, `server/tests/manusGeneration.test.ts`, `server/tests/centralDraftErrorCode.test.ts`.

## WhatsApp campaign deliveries

`WhatsAppCampaigns.tsx` polls `marketing.whatsappSummary` every 15 seconds. The query's `deliveries` array comes from `marketingDeliveryResults()` in `server/services/whatsappMarketing.service.ts`.

The query reads the latest 25 `whatsapp_marketing_deliveries` rows, joined to the campaign name. It attaches one `whatsapp_confirmation_receipts` row with the same `provider_message_id` and `sender_phone_id = ENV.whatsappPhoneNumberId`. `FIELD(state, 'sent', 'failed', 'delivered', 'read') DESC` prefers `read`, then `delivered`, then `failed`, then `sent`. Ties use the later `event_ms`, then the higher receipt id. The shown state is the receipt state when one exists, otherwise the delivery status. Error text is the receipt's `error_details`, otherwise the delivery's `error_message`. Meta error `131049` is replaced with «ميتا منعت تسليم الرسالة للحفاظ على جودة التفاعل. لا تكرر الإرسال فورًا لنفس العميل.»

The panel labels are: `accepted` قبلتها ميتا، بانتظار نتيجة التسليم; `sent` تم الإرسال، لم يتأكد التسليم بعد; `delivered` تم التسليم; `read` تمت القراءة; `failed` فشل الإرسال. An empty list says «لا توجد رسائل حملات مسجلة.»

## Marketing Facebook app credentials

`FB_USE_AUTO_REPLY_APP` defaults to `false` in `.env.example`. `server/_core/env.ts` sets `ENV.fbAppId` and `ENV.fbAppSecret` from `FB_APP_ID` and `FB_APP_SECRET`. When the flag is `true`, those two fields are read from `AUTO_REPLY_META_APP_ID` and `AUTO_REPLY_META_APP_SECRET` instead. `server/services/marketing/facebookOAuth.service.ts` is the caller. The auto-reply webhook keeps reading `AUTO_REPLY_META_APP_SECRET` directly. See `docs/auto-reply-setup.md` for the reply go-live checks.

## Design read and verification

Product register, Arabic-first RTL, ENERGY 1 / RHYTHM 1 / MOTION 1 from `DESIGN.md`. Staff use this operational interface in the clinic, so it inherits the existing light/dark theme rather than introducing another palette. Navy/lavender selection identifies the current section. Existing fonts support mixed Arabic and model identifiers. Text navigation and labelled tool rows organize real destinations; no generated imagery or invented metrics were added. Existing action icons retain their task meanings. Navigation wraps into two columns at narrow widths and stays in document flow.

`scripts/verify-ai-workspace-ui.mjs` runs the real app in Edge/Chromium with intercepted APIs, including failures for existing reply/marketing services. It does not save real settings, send messages, publish posts or call a paid provider. Evidence is written to `outputs/ai-workspace-ui/`.

The local checks cover all primary navigation links, marketing subnavigation, legacy redirects, home entry, profile saving, experiment confirmation/Escape, a completed synthetic request, usage empty/populated states, disabled/error/recovery states, skip-to-content focus, 44px navigation targets, 200% text resizing and page overflow at 360/768/1440 in light/dark. Page errors are recorded. These checks do not recertify the business operations of every existing control in the moved marketing or reply screens, and browser viewport emulation is not native Android testing.

Shared foreground/background, primary/background and selected-navigation pairs are checked against the WCAG contrast formula. The core and UI antislop gates apply to the new workspace; existing operational screens are reused rather than redesigned. Local verification is separate from deployment.

### Observed local results, 2026-10-26

These notes are from the workspace check on 2026-10-26, before the five-workspace split above. They do not re-check the current sidebar, top-nav menu, or bottom nav.

- `pnpm check`: passed.
- `pnpm test`: 92 files, 649 tests passed, including independent AI permission and redirect regressions.
- `pnpm build`: passed encoding, frontend and backend build.
- Workspace browser verification: all six theme/viewport combinations passed. All eight primary links and six marketing links reached their destinations; the active navigation changed with the route. Legacy medical links retained query/fragment and marketing draft links redirected. Home displayed the AI entry.
- Profile submit updated the intercepted profile once. Experiment confirmation opened, Escape cancelled without a request, and explicit confirmation produced one intercepted request. Medical documentation directed users to clinician review. Usage changed from its empty message to a populated row. Disabled status, status failure and refresh recovery were visible.
- Skip link focused content; navigation targets measured at least 44px; 200% text resize did not introduce page overflow. No page errors were recorded in these cases. Mobile and desktop screenshots are in the evidence folder.
- Contrast measurements: light foreground/background 14.71:1, light selection 9.40:1, light primary/background 10.90:1, light supporting text/muted surface 5.49:1; dark foreground/background 15.98:1, dark selection 8.31:1, dark primary/background 9.12:1, dark supporting text/muted surface 8.23:1. These measured text/focus colors pass the applicable AA thresholds. This is not a new audit of every reused marketing component.
- `git diff --check`: passed.
- `graphify update .`: completed. The tool reported a missing SQL parser, retained excluded nodes and automatically renamed community labels. Its output is an AST navigation aid, not application verification.

Delivery gate: new routes/actions, states, RTL/mobile containment, both themes and keyboard checks passed within the intercepted-API scope above. Palette, fonts, text rows and current-section emphasis follow the written design read. No decorative assets, animation or fabricated production data were added. Production provider calls, delivery/publishing actions and native Android operation were not exercised in this UI reorganization.
