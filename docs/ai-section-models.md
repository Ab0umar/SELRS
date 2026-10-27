# One assistant selection per AI section

The working pages now share a labelled assistant/model select while retaining their existing domain-specific controls.

| Section | Available choices | Effect |
| --- | --- | --- |
| Reply automation and teaching | Manus Standard/Lite/Max and Gemini models | Saves the active assistant/model. Manus uses the durable central adapter. Preview follows the live selection and resumes the same task after reload. |
| Medical review | Manus Standard/Lite/Max and clinically enabled Gemini models | Selection reaches the corresponding private-task or dedicated Gemini adapter, including model and usage accounting. Standalone review initially selects Manus Standard. Consent, transcript evidence and manual application remain required. |
| Marketing | Manus Standard, Lite, Max; enabled Gemini text/image pairs | One form and one generation endpoint dispatch to the chosen adapter. Default manual choice is Manus Standard. Existing page identity, topic rotation, draft review and scheduling controls remain. |
| WhatsApp copy | Manus Standard/Lite/Max and Gemini text models | Saves the workload assistant/model; changed selections must be saved before generation. Manus tasks resume by ID. Both use the same fixed offer facts, three variants and copy/review workflow. |

Both providers are implemented in all four sections. Clinical Gemini retains its existing server approval/key gate. Explicit reply/WhatsApp assistant saves can enable their workload; they do not change the global send switch or send a message. Manual marketing selection does not silently switch the existing scheduler provider.

## Dual-provider activation and durable tasks

Apply the additive `ai_provider_bindings.sql` migration with `pnpm exec tsx scripts/apply-ai-provider-bindings.ts --apply` before activating the new Manus reply/WhatsApp adapters. It adds only a UUID/hash binding table and changes no existing provider settings. The table was exercised in a randomized, owned MySQL database and removed with that database after the tests. This migration was not applied to the application or production databases.

Manus JSON tasks bind the request hash before task creation, persist the returned task ID in the usage ledger and poll that same task. Reusing an ID with different input is rejected. Ambiguous creation never triggers automatic creation of another task. Reply workers distinguish known pending tasks from failed/unknown results, poll within a bounded ten-minute lifetime and retain the existing send/claim guards. UI internal tests restore their temporary session-local test payload and UUID after reload and clear them after a result or explicit local stop. No reply text or clinical transcript is added to the new server binding table.

WhatsApp stores only its public campaign input while a task is pending, then caches validated variants for the owning user. Offer amounts, qualifications and days are appended by application code for both providers. Medical Gemini uses the dedicated extraction transport, preserves its clinical gate and records actual Gemini usage when supplied; unavailable usage metadata retains an uncertain reservation rather than claiming zero consumption.

### Dual-provider verification

- `pnpm check` and `pnpm build`: passed.
- `pnpm test`: 92 files, 649 tests passed.
- Final focused backend run: 16 files, 188 tests passed (including the 3 owned MySQL tests). Checks include provider selection, same-task resumption, changed-input rejection, ambiguous creation, explicit failure, pending deadlines, reply policy without a Gemini key, fixed WhatsApp offer facts, cached variants and Gemini model/usage propagation.
- Owned MySQL integration: 3 tests passed for restart-safe bindings/task IDs, provider/model accounting without profile rewrites and one-winner concurrent reservations. No existing application schema was changed by these tests.
- Browser: all six light/dark and 360/768/1440 combinations passed with both providers in all four sections, one selector per section, Manus reply and WhatsApp reload/resume without another creation, medical provider/model requests and a unified marketing form. Page error lists were empty. APIs were intercepted, not paid live generation.
- The updated medical component browser suite passed six combinations for model selection, consent reset, same-task retry, manual application and 200% text resize.
- The earlier full-backend failures below remain a separate, non-green suite result; no fresh full-backend pass is claimed by the focused run.

## Common marketing behavior

Same-day automatic catch-up is implemented in source: checks run on startup and every five minutes, using the current Cairo page calendar. Once a slot reaches its publish hour it remains eligible for that day, subject to the existing page/slot switches, post guard and durable request claim. Accepted or uncertain work is not automatically recreated, and earlier days are not backfilled. Provider capacity is still required. The prepared isolated server update has not been activated yet because this session lacks Windows service-control permission; see `docs/reviews/marketing-same-day-catchup-2026-10-27.md`.

The dashboard selection now scopes summary/recent posts, scheduler settings, manual scheduler execution and the auto-publish toggle to the selected Facebook page. Historical slot keys remain unchanged: center uses Sunday/Tuesday/Thursday; doctor uses Saturday/Monday/Wednesday. Each slot displays its editorial category from `shared/marketingSchedule.ts`, also used by topic rotation and the Manus/Gemini publication brief. The existing forward/reverse topic rotation is preserved. Custom topics take priority over the default category. Scheduled times are displayed in Africa/Cairo.

Focused page-calendar/router/prompt/provider regression checks: `marketingPageSchedule`, `marketingSchedule`, `marketingPrompts`, `marketingAssistantSelection`, `centralMarketingDraft`, and `manusGeneration`: 6 files / 38 tests passed. Browser checks also select the doctor's Monday content slot and verify the same page/slot reaches generation and the manual scheduler; the toggle sends only that page's auto-publish change.

`server/services/marketing/prompts.ts` supplies the Manus-based editorial contract and concrete topic-specific image direction to both adapters. New Gemini images and image replacements receive the final caption, title, idea, CTA and suggested visual. A unified job list retains provider-specific recovery where needed and opens the same draft preview on completion.

Manual generation stores the request ID and its page/day/topic/assistant context before submission. The server also retains the public request context and whether generation was accepted or rejected before submission. Known preflight rejection unlocks the form; accepted unknown outcomes keep their request identity. Selected Gemini text/image models are written to their own usage rows; workload enablement, quotas and concurrency limits still apply. The review fixes require the additive tracking migration described below.

## Review fixes and activation

The sixth-review fixes cover WhatsApp context persistence before Manus creation, including connection failure and a missing draft row. These proven non-submissions now release unused capacity. Gemini's definite auth/configuration/rate rejections also settle unused work; timeouts and server/network uncertainty remain reserved. Image snapshots include topic, and both completion and recovery validate it against the original job. Existing checksum versions remain recoverable only for unchanged source data and original topic. No new migration is introduced. Current evidence is in `docs/reviews/ai-module-sixth-review-fixes-2026-10-27.md`.

The fifth-review fixes retain a WhatsApp UUID when its draft exists but usage is still absent; that state no longer allows starting a different request. Same-ID resubmission remains available with stored input, and confirmed failure still unlocks a new draft. Manus binding failures before provider creation are explicitly non-submissions, so reply/WhatsApp reservations are settled without a task ID. Scheduled creation now releases an unused claim after preflight failure only before acceptance and only when neither provider has a job. Existing jobs and unknown creation outcomes remain locked. No new migration is introduced. Verification is recorded in `docs/reviews/ai-module-fifth-review-fixes-2026-10-27.md`.

The fourth review resolves unused-capacity reservations after known provider/configuration rejection, publication by a superseded scheduler provider, and abandoned synthetic Manus probe accounting. A shared failure settlement path applies to replies, WhatsApp, central marketing, experiments and Manus creation. Unknown dispatch still retains its reservation; HTTP 408 from Manus is explicitly uncertain. Known completed usage stays recorded even if later persistence fails.

Synthetic probes are reconciled through their accepted operation ownership, including marketing and `medical.synthetic`; ordinary clinical output is excluded from this path. Scheduled publication rechecks the provider and enabled slot under the publication transaction, as well as the existing target/auto-publish checks. Central marketing checks credentials and workload activation before accepting a new job.

WhatsApp also offers explicit resubmission of the same stored UUID and campaign input when the server has no draft record. This covers reload before submission reaches the server. Concurrent same-ID submissions are tested against MySQL and create one provider task. Known running/uncertain requests remain tracked, and a legacy ID without stored input is not resubmitted with guessed data.

The reply integration fixture now creates and removes its own randomized database rather than reapplying migrations to a shared test database. No new deployment migration is needed for these fixes beyond the existing activation scripts below. The final review evidence is recorded in `docs/reviews/ai-module-final-review-2026-10-26.md`.

Final validation: 24 focused backend files / 312 tests passed, including 23 owned SQL tests and 49 reply integration tests; 94 frontend files / 655 tests passed. TypeScript and build passed. Model-selection and recovery browser checks each passed six viewport/theme cases without page errors. The full backend suite still has seven failures in four attendance/patient/MSSQL files; it is not reported as green. No deployment occurred.

The third review fixes publication status after rollback, abandoned Manus accounting, image recovery concurrency and generation acceptance persistence. Publication commits its `publishing` claim and original Facebook target before sending, then finalizes separately; unknown outcomes remain locked for reconciliation. Correction to the original review: the existing durable topic reservation already prevented another publication after rollback; the new change makes the post status consistent with that protection.

The server independently polls known reply/WhatsApp Manus tasks, even after browser abandonment or delivery cancellation. A confirmed remote success records `provider_finished_output_pending` and releases concurrency without accepting output or reviving delivery. Foreground recovery validates the original completed task even past ten minutes; tasks still running past that bound remain uncertain. Remote failures settle as failed, while network uncertainty stays reserved. This reconciler excludes clinical workloads and never submits tasks or sends messages.

Image generation and recovery share the source-post lock and check both providers before any paid reservation; artifact attachment uses that exclusion too. Acceptance and job/context creation now commit atomically for Manus and Gemini, so a failed acceptance write leaves no unsubmitted job. These fixes add no further migration beyond the activation scripts below.

Fix validation: `pnpm check` and `pnpm build` passed; 23 focused backend files / 251 tests passed, including 14 disposable MySQL tests. Frontend: 94 files / 655 tests passed. Browser recovery checks passed all six viewport/theme cases with no page errors and intercepted APIs. Evidence is in `outputs/ai-module-review-3/`. No full backend-suite pass or production deployment is claimed.

All seven findings from the module review have corresponding fixes and regression coverage:

- When central management is enabled, the server enforces the medical workload even for callers requesting the legacy engine. Disabled or unavailable profiles block generation; the UI never treats disabled as permission to fall back.
- Missing Gemini token metadata is explicitly unknown. Valid generated output is retained, the token reservation remains charged to its original budget day, and completed remote work releases its concurrency slot. The usage UI displays unavailable counters instead of claiming zero tokens.
- Gemini medical completion settles accounting without client polling. Persistence failures retry from a metadata-only queue. Managed Manus medical jobs are checked server-side during their existing ten-minute lifetime and validate the same proposals before settlement. Expired unknown tasks remain uncertain; server restart still expires process-local clinical proposal access.
- Probe reads require the original probe operation and owner before reading a provider or changing usage state.
- Marketing and probe preflight rejections are durable and recoverable; requests accepted before a network error remain tracked. Automatic marketing mutation retries are disabled.
- Scheduler execution status and last-run timestamps are persisted separately for each Facebook page. Legacy shared status is not presented as a page-specific result.
- Marketing restores bound context from the server, with session storage as a local cache. WhatsApp stores and restores its campaign/day context alongside the pending UUID. Storage restrictions do not interrupt an already-started request.

Before deploying these changes, run `pnpm exec tsx scripts/apply-ai-module-review-fixes.ts --apply` against the intended deployment database. It idempotently adds provider bindings, operation tracking and per-page scheduler status, records the migration names and preserves profiles/publication switches. This work did not apply that command to the application/production database or deploy the build. Existing unbound requests are not guessed to be probes or retried automatically.

## Second review fixes

The second review's six findings are covered by the current implementation:

- Manus creation timeouts and ambiguous responses remain `uncertain`. A returned task ID is retained when its first persistence attempt fails. Definite provider rejections remain distinct. Completed rows cannot be overwritten by a late failure handler; uncertain jobs without a task ID are not re-created automatically. Known task IDs can still be checked, while expired uncertain jobs do not starve newer work.
- Facebook HTTP 5xx/408 and incomplete success responses retain the publication claim for review. Photo/text requests have a bounded timeout. No synthetic `unknown` publication ID is accepted as success.
- Scheduled Manus jobs persist their original Facebook asset. The worker checks that binding, and the publication transaction rechecks the expected page and auto-publish setting under row locks before sending. Gemini scheduling uses the same transaction guard. Older unbound scheduled jobs remain drafts for review.
- Retryable clinical attachment download errors leave the task available for checking again. Invalid or out-of-scope proposals still fail validation; retries use the same paid task.
- Gemini jobs persist their selected image model. Confirmed image retries reuse that model under current workload limits even when the saved default provider is Manus. Older jobs can use their recorded usage model; if the original choice is unavailable, recovery requires review instead of silently choosing a different model.
- Pending marketing status is read by exact UUID and owner through `marketing.generationRequest`, independently of the recent activity window. Older owned jobs can supply their canonical page/day/topic without an operation record. Uncertain outcomes stay locked; known terminal outcomes can release the form.

The activation script now also applies `ai_marketing_recovery_fixes.sql`, which adds the job-context table and expands the Manus job-state enum with `uncertain`. Run the updated script before deploying this version even if the earlier tracking migration was already applied. No application or production database was changed during this work.

Validation: 21 focused backend files / 234 tests passed, including nine isolated MySQL tests; 93 frontend files / 653 tests passed. The browser reliability checks passed all six viewport/theme cases, including an exact terminal request absent from recent history and an uncertain request that cannot be replaced. The normal four-section model checks also passed all six cases. Provider and publication boundaries were intercepted; no real generation, Facebook post, customer message or clinical save was performed. Full backend-suite status is not represented as green.

Verification of the fixes: `pnpm test` passed 653 tests in 93 files; focused backend checks passed 213 tests in 19 files, including seven isolated MySQL tests. `scripts/verify-ai-reliability.ts` passed six viewport/theme cases for preflight recovery, retained unknown outcomes, server-restored marketing context, WhatsApp context, disabled medical blocking, unchanged-model central dispatch and probe recovery. APIs were intercepted; no paid generation or real publication was performed.

## Verification, 2026-10-26

- `pnpm check`: passed.
- `pnpm test`: 92 files, 649 tests passed.
- Focused backend selection/AI/medical/marketing checks: 10 files, 95 tests passed. These include real router dispatch with mocked adapters, selected Manus task profiles, request-model accounting, disabled-workload rejection and final-caption image inputs.
- `pnpm build`: encoding check, frontend build and backend bundle passed.
- `scripts/verify-ai-section-models.ts`: all six light/dark and 360/768/1440 cases passed. Observed one assistant selector per page, one marketing form, Manus/Gemini request payloads, selected page identity, request-lock restoration without another submission, selected clinical model, reply preview using the active engine and WhatsApp save-before-generate behavior. Page errors were empty. Screenshot/results evidence: `outputs/ai-section-models/`.
- Updated medical component browser checks: six cases passed, covering model selection, consent reset, same-task status retry without another creation, manual application and 200% text resizing. Evidence: `outputs/ai-medical-ui/`.
- Full backend run is **not green**: 49 files passed and 5 failed; 558 tests passed, 9 failed, 49 skipped and 1 todo. Failures occurred in attendance, medical persistence/queue, MSSQL patient-push fixtures and auto-reply integration setup (`Duplicate column name 'account_id'`). These are outside the provider-selection files; no blanket full-backend pass is claimed.

Browser APIs were intercepted and provider boundaries mocked. No real customer message, public post, patient record update or paid generation was used in this verification. Prompt/data consistency was checked; equivalent image aesthetics across providers was not established. The changes are local source/build changes, not a production deployment.

## Design gate

The product direction remains `DESIGN.md`, Arabic RTL with shared theme tokens, existing typography and ENERGY 1 / RHYTHM 1 / MOTION 1. The select identifies the actual generation choice, while domain controls retain their existing meanings. No new decorative assets, motion, badges or fabricated production metrics were added. Select controls use a 44px minimum, wrapping labels and shared light/dark surfaces. Six viewport/theme cases, visible save/lock feedback and medical consent/application were exercised. Existing print templates were not changed. The wider workspace contrast measurements are recorded in `docs/ai-workspace.md`; this change reuses its palette and shared form controls.
