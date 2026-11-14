# Marketing content fix and feature plan

Written 2026-11-14 from a read-only review. Seven PRs, executed in order, each one branch stacked on the previous with its own pull request. Never merge a PR yourself.

Scope: scheduled and manual Facebook post generation and publishing. Out of scope: WhatsApp campaigns, brand-style analysis, Facebook OAuth linking.

## Ground rules

- Read `CLAUDE.md` and `docs/AI_CONTEXT.md` first. Smallest correct diff. No refactors outside the listed scope.
- Protected files stay untouched, including `drizzle/schema.ts` and `server/_core/env.ts`. Marketing tables live in `drizzle/schema.ts`, so **this plan adds no columns**. New settings are stored with `getSystemSetting` / `updateSystemSettings`, the way `server/services/marketing/equipmentAssets.ts` already does. New environment values are read with `process.env` and validated where used.
- Every new setting defaults to today's behaviour, except approval mode in PR 3, which defaults to on. The owner turns other new behaviour on from the settings page.
- UI text is Arabic on these screens. Existing marketing pages are in `client/src/pages/marketing/`; edit them in place. For any UI or copy edit follow the antislop instructions in `CLAUDE.md`.
- Never log access tokens or full post bodies.
- Per PR: `pnpm check`, `pnpm test`; add `pnpm build` where shipped behaviour changes; then `graphify update .`. Do not weaken tests. Where an existing test asserts behaviour this plan changes on purpose, update it and name it in the PR body.
- Real Facebook publishing and real Manus tasks cannot be exercised from the dev machine. Say so in each PR body and list what the owner must verify by hand.
- The line references below come from the review; the code is the source of truth. If they disagree, follow the code and say so in the PR body.

## Code map

| Area | File |
|---|---|
| Cron, due-slot logic, scheduled run | `server/services/marketing/scheduler.service.ts` |
| Day claim per page | `server/services/ai/marketingScheduler.ts` |
| Topic planning | `server/services/marketing/topicPlanner.ts`, `topicHistory.ts`, `topicIdentity.ts` |
| Manus generation and worker | `server/services/marketing/manusGeneration.service.ts` |
| Central (Gemini/Grok) generation | `server/services/ai/marketingDraft.ts`, `marketingRecovery.ts` |
| Publish claim and result | `server/services/marketing/publish.service.ts` |
| Graph call | `server/services/marketing/facebookPublisher.service.ts` |
| Logo and footer | `server/services/marketing/pageBranding.ts` |
| Router (admin only) | `server/routers/marketing.ts` |
| Pages | `client/src/pages/marketing/` |

---

## PR 1 — stop silent stoppages

**Landed.** Merged as PR #29 (`084c9f5d` on `main`, 2026-11-14). Do not re-apply this section. Current behavior, admin actions, and the failure checks are in `docs/ai-workspace.md` ("Scheduled generation and stuck jobs") and the `marketing.resolveGenerationJob` row in `docs/api-reference.md`. The bullets below are the problem statement from before that merge.

Two deviations from the bullets, both called out in the PR #29 body:

- `publishedMarketingTopics()` has no `ORDER BY`. The 200-item cap keeps the last 200 unique values in returned order.
- A `starting` job failed by the 10-minute orphan sweep is not given the automatic second attempt. Its Manus task may still exist.

1. **Topic planner input must stay bounded** (`topicPlanner.ts`). Today it sends the content of the last 60 posts plus every published topic twice, and `withMarketingBudget` rejects any input over 32000 characters, so planning fails once there are roughly 45–50 full posts.
   - Send only `topic` and `title` for recent posts, never `content`.
   - Drop the `rejected` field's duplication of history; send only identities rejected during this call's retries.
   - Cap the published list to the most recent 200 and enforce a hard size check with truncation of the oldest entries before calling the model. Exact-identity exclusion in code still uses the full list.
   - Test with 300 synthetic posts.
2. **Scheduler retry policy** (`scheduler.service.ts`, `marketingScheduler.ts`).
   - Before acceptance: today a failure releases the claim and retries every 5 minutes for the rest of the day, calling the topic model each time. Add a per page/day backoff (5 minutes, 30 minutes, 2 hours, then stop until tomorrow). In-memory state is acceptable; say in the PR that a restart resets it.
   - After acceptance: today any failure loses the day. When the day's job ended in a definite `failed` state (never `uncertain`), allow exactly one automatic second attempt with a distinct deterministic request id. The existing duplicate-post guard stays.
3. **Orphaned `starting` jobs** (`manusGeneration.service.ts`). The worker only selects jobs with a `taskId`, so a job whose process died before Manus returned an id stays `starting` forever and blocks its draft. Expire `starting` jobs with no `taskId` after 10 minutes to `failed`, with an error that says a Manus task may exist.
4. **Uncertain Manus jobs** block publishing and new image generation for their draft with no way out.
   - Keep polling `uncertain` jobs that have a `taskId` for 6 hours instead of 30 minutes, so a late Manus result still completes.
   - Add an admin procedure to resolve a job: re-check now, or abandon (mark `failed`, which frees the draft). Add the two actions to the jobs list on the drafts page, with a confirmation on abandon.
5. **Local failure after Manus succeeded** (`processManusGenerationJobs`). A database or image-processing error currently marks the job `failed` although the paid result exists. Retry such errors on the next ticks, up to 3 times, before failing.
6. **Central generation swallows every error** (`finishCentralMarketingDraft` catch). Log the error name and a safe code, and store a specific `errorCode` on the job instead of one generic value. Check which states `aiMarketingJobs` and `marketingRecovery.ts` support before changing state semantics; if a definite `failed` state is not supported, keep `uncertain` and only improve the code and the log.

Tests: planner with large history; backoff sequence; one retry after `failed`, none after `uncertain`; orphan expiry; abandon frees the draft.

## PR 2 — publish integrity

1. **Posts stuck in `publishing`.** A Facebook timeout leaves the post in `publishing`: it cannot be published or edited, and deleting it leaves the topic reserved forever.
   - Add an admin procedure to reconcile one post. It reads the page's recent posts from the Graph API, matches on the prepared message and the claim time (the `publish_claim` row in `marketingLogs`), and on a match marks the post `published` with its id and confirms the topic.
   - With no match, or when the page token cannot read posts, the admin chooses: "it was published" (mark published) or "it was not" (return to draft and release the topic). Each choice is logged with the user id.
   - Add the action to the posts in `publishing` on the dashboard or drafts page.
2. **Delete rules** (`deletePost`). Refuse to delete a post in `publishing`. For a draft: release any topic reservation still in state `publishing` for that post, and fail its pending generation jobs. Log the user id for every delete.
3. **Duplicate guard uses server-local midnight** (`runScheduledPost`). Compute the start of day in Cairo, like the request id. When a manual draft blocks a scheduled run, record the skip reason where the scheduler status is shown.
4. **API accepts states nothing implements.** Reject `platform` values other than `facebook` (permanently; there is no Instagram publishing) and, until PR 5 lands, `status: "scheduled"`, in `createPost` and `updatePost`. Confirm the client never sends them.
5. **Graph API version** (`facebookPublisher.service.ts`). Read the version from `process.env.MARKETING_GRAPH_VERSION`, validated as `v<number>.<number>`, falling back to the current constant. Document it in `.env.example`.
6. **Manus image generated then discarded.** When `readEquipmentPhoto` returns a real device photo for the topic, ask Manus for the text only, and let `finishJob` complete without an image attachment in that case. The central path already skips generation.

Tests: reconcile match, both manual choices, delete rules, Cairo boundary, text-only Manus job.

## PR 3 — review gate and alerts (opt-in)

1. **Content check after generation**, on both paths, before the draft is saved or auto-published. Deterministic rules on title, content and CTA: prices and currency, discounts and offers, guarantee wording, percentages and statistics, phone numbers and links inside the content. Keep the rule list in one small module with tests. A flagged draft is saved, never auto-published, and the reasons are written to `marketingLogs` and shown on the draft.
2. **Approval mode per page**: system setting `marketing_require_approval_<pageRole>`, **default on** (owner decision, 2026-11-14; this is the one setting in the plan that changes today's behaviour by default). When on, the scheduler generates the draft and does not publish; an admin publishes with the existing button. Add the toggle to the page's schedule settings.
3. **Notifications to admins** through the existing FCM and in-app helpers, title and reason only:
   - every generated draft that is ready, scheduled or manual, whether or not approval mode is on (owner request, 2026-11-14). The notification opens that draft for review. Say in it whether the draft is waiting for approval, was flagged by the content check, or was already auto-published.
   - scheduled generation failed or ended uncertain
   - publish failed or ended uncertain
   - page token rejected by Facebook (surface that case clearly in the log too)

Tests: each content rule; flagged draft is not published; approval mode never publishes; one notification per event.

## PR 4 — topics and housekeeping

1. **Topic reuse window**: system setting `marketing_topic_reuse_months`, default 0 (never, today's behaviour). When set, a topic published longer ago than the window no longer blocks, and the planner is told to pick a different angle. Check what date the topic history can rely on before implementing; if none is reliable, use the post's `publishedAt` and say so.
2. **Image files**: when a draft is deleted, remove its generated and branded files if no other post references them. Never remove reference designs or equipment photos.
3. Remove the unused imports in `scheduler.service.ts`. Build the booking link in `marketingDraft.ts` from the configured app origin instead of a hard-coded domain.
4. Update `docs/api-reference.md` and any marketing operations doc for PRs 1–4.

## PR 5 — content calendar and per-post scheduling

- Implement `status: "scheduled"` with `scheduledAt`: a worker publishes due posts through `publishMarketingPost`, with the same claim and uncertainty handling. A scheduled post can be edited or returned to draft.
- A calendar view of the coming two weeks on the dashboard: generated drafts, scheduled posts, and empty slots.
- A "generate this week's posts" action that creates drafts for the enabled slots ahead of time, for review.

## PR 6 — post performance

- Fetch reach and engagement for published posts from the Graph API on a daily schedule and show them in post history.
- This needs the `read_insights` permission on the page token. If the token lacks it, ship the feature disabled with a clear message on the page, and report it.
- Give the topic planner a short list of the best and worst performing topics as data.

## PR 7 — marketing staff permission

- A page permission for the marketing content screens following `.claude/rules/permissions.md`: drafts, history, generation, and publishing. Settings, Facebook connection, scheduler provider, and brand library stay admin-only.
- Gate both the frontend routes and every backend procedure.

## Instagram — dropped

The owner decided on 2026-11-14 that there is no Instagram publishing. Do not build it. The `platform` values `instagram` and `both` stay rejected by the API (PR 2 item 4) permanently.
