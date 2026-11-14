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

The detached call inserts `aiMarketingJobs` (and `aiMarketingJobContext`) and returns `{ jobId, topic, state: "running", postId: null }` before `finishCentralMarketingDraft` writes the text and image. The client already polls the job. A failure after that insert is logged as `[marketing] central draft failed` plus the request id. Validation that runs before the insert still fails the mutation: central management disabled, a missing or disabled `marketing.text` / `marketing.image` profile, a Manus profile for a workload whose model was not selected, a missing `GEMINI_API_KEY` or `XAI_API_KEY` for the chosen provider, a repeated request id whose topic, page, or day differs, or a topic that was already published (`PublishedMarketingTopicError` becomes `PRECONDITION_FAILED` on `generateCentralPost`).

`generatePost` adds topic planning:

- A request that already has `topic` awaits the tracked operation. Gemini/Grok then detach as above. Manus still runs `startManusGeneration`, which waits for `createManusTask` before the mutation returns.
- A request with an empty `topic` returns `{ jobId: input.requestId, topic: "" }` immediately. `planMarketingTopic` and the provider start continue in the background. The comment in the router calls out Grok topic planning as the call that can outlast the proxy timeout.

The dashboard polls `marketing.generationRequest` every 4 seconds (`MarketingDashboard.tsx`). A tracked operation whose state is `rejected` clears the pending request and shows «لم يبدأ التوليد. راجع الإعدادات ثم ابدأ طلبًا جديدًا.» On the empty-topic path that error is only in the server log, as `[marketing] generatePost failed` plus the request id. There is no automated test for that empty-topic failure path. When the mutation itself returns a topic, the toast names it; an empty topic uses «بدأ اختيار الموضوع وتجهيز النص والصورة». A request that already includes a topic still returns provider errors from the mutation, and the dashboard shows `err.message`.

`AI_CORE_MANAGEMENT_ENABLED=true` with no request `assistant` resolves the configured marketing assistant. If none is configured, the operation throws `AiManagementError("unavailable")`. On the empty-topic path that rejection is the generic toast above.

## Scheduled generation after a failure

`checkDueMarketingPosts` in `server/services/marketing/scheduler.service.ts` skips a page while `marketingStartAllowed` is false. `runScheduledPost` returning `ok: false` calls `recordMarketingStartFailure`. If generation was not accepted, the unused claim is released. If it was accepted, the claim stays and the backoff still advances. Delays for that page and Cairo day are 5 minutes, 30 minutes, then 2 hours (`MARKETING_RETRY_DELAYS_MS`). Another failure the same day sets `nextAt` to infinity until the Cairo date changes. The map is in memory: a process restart allows an immediate attempt. A run that returns `ok: true`, including a skip, calls `clearMarketingStartFailures`.

After a claim is accepted, a job whose state is `failed` gets one second claim. The request id is the schedule hash of `marketing:<cairo-day>:<slot>:<pageRole>:retry`. A job failed with the orphan prefix `انقطع بدء مهمة Manus قبل استلام رقمها`, and any `uncertain` job, does not get that second claim.

`processManusGenerationJobs` marks a `starting` row with no `taskId` older than 10 minutes as `failed`, and the error says a Manus task may already exist. Rows with a `taskId` in `uncertain` keep being polled for 6 hours (`UNCERTAIN_POLL_MS`). Other pending rows still become `uncertain` after 30 minutes (`MAX_AGE_MS`). A `LocalFinishError` while saving a finished Manus result stays on the job and is tried again on later ticks while the in-memory count is at most 3 (`MAX_LOCAL_RETRIES`). The next failure marks it `failed`. Restarting the process clears that count.

`marketing.resolveGenerationJob` (`adminProcedure`) takes `recheck` or `abandon` for a job still in `starting`, `running`, or `uncertain`. Recheck needs a `taskId`. Abandon sets `failed` with «أوقفها المسؤول يدويًا» and frees the draft. The drafts job list calls this.

Central drafts still have no `failed` state. `finishCentralMarketingDraft` logs the error name and `centralDraftErrorCode`, then stores that code on an `uncertain` row: `stale_execution`, `ai_<code>`, `gateway_<code>_<status>`, `invalid_output`, `topic_unavailable`, or `generation_or_persistence_failed`.

Topic planning sends `topic` and `title` only. `PLANNER_PUBLISHED_CAP` is 200. Exact-identity exclusion still uses the full published list in code.

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
