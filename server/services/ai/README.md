# Central AI module

Independent workspace: `/ai`, available from the home page and main navigation. Tools, provider settings, connection experiments and usage have separate pages. The former `/admin-hub/ai`, reply, medical-assistant and marketing URLs redirect into this workspace. The server flag `AI_CORE_MANAGEMENT_ENABLED=true` enables central operations. No credentials are accepted by the browser or returned in status responses.

Each working section has one assistant/model selector with both Manus and Gemini. Marketing uses one `generatePost` entry point and one job list. When central management is enabled, new manual requests default to the saved text/image profiles; stale browser selections cannot replace that default. Explicit per-request choices remain available, and in-progress requests retain their original provider. Missing, disabled or incompatible configured profiles block default generation rather than falling back to Manus. Manus Standard remains the legacy default only when central management is disabled. Both use the shared editorial and topic-specific visual briefs; Gemini images receive the final post text and idea. Request-selected models are recorded against the workload's existing limits without rewriting its profile. Reply preview uses the active live configuration. See `docs/ai-section-models.md` for verification and activation requirements.

| Workload | Consumer | Provider / activation |
| --- | --- | --- |
| `reply.preview` | Internal synthetic reply probe | Gemini or Manus |
| `reply.live` | Internal live-profile preview and background reply engine | Gemini or Manus; explicit assistant selection activates its profile while preserving the global send switch |
| `marketing.text` / `marketing.image` | Facebook drafts, image replacement and optional per-page scheduler | Gemini; Manus scheduler stays available |
| `whatsapp.marketing` | `/ai/whatsapp` copy drafting | Gemini or Manus; does not send or change approved Meta templates |
| `medical.synthetic` | Fixed synthetic probes | Never accepts a patient transcript |
| `medical.documentation` | Medical proposal review at `/ai/medical` and existing patient-file tools | Manus or clinically enabled Gemini, always subject to consent and source validation |

`gateway.ts` owns bounded Gemini SDK requests, typed structured output, image validation and safe usage metadata. `managementStore.ts` owns SQL profile locks, daily quotas, concurrency and unique request IDs. Unknown paid outcomes retain their reservations. There is no automatic provider fallback.

`providers/manus.ts` owns shared private Manus tasks and bounded downloads. `marketing/manusClient.ts` is a compatibility export for existing callers. `medical.ts` owns medical job state, source/speaker validation and optional central credit accounting. Old medical service paths remain compatibility exports. `medicalGemini.ts` retains the independently gated clinical alternative; the general Gemini gateway rejects clinical documentation workloads. `speech.ts` exchanges short-lived Azure Speech tokens without retaining them.

Marketing public context, selected-page reference images, customer reply knowledge and clinician transcripts remain separate. Marketing and WhatsApp copy builders never query patient records. Reply policy still runs before and after central generation. The medical interface still requires consent and explicit clinician application; the AI module does not write medical fields.

## Operations

Publication commits its post claim before contacting Facebook and finalizes the result separately. Unknown outcomes retain `publishing` and the original target audit entry. The pre-existing topic reservation already blocked repeated publication after rollback; the third-review change also preserves the post's status.

`reconcileManus.ts` checks recorded reply/WhatsApp tasks independently of browser polling or delivery cancellation. Confirmed remote completion records `provider_finished_output_pending`: it releases concurrency but leaves output unaccepted for normal validation. Running or unreadable tasks retain reservations; checked rows rotate through batches. A completed old task can still be read by its original ID. Clinical jobs keep their separate lifetime and consent rules. The reconciler creates no provider tasks and sends no replies.

It also settles accepted, owner-bound synthetic Manus probes across all probe workloads, including marketing and `medical.synthetic`. Probe completion settles accounting directly; it does not accept a marketing artifact or clinical proposal. Ordinary clinical tasks and unrelated marketing tasks are excluded from this probe path. Failed or interrupted remote reads keep their reservations.

`failure.ts` distinguishes known non-submission/rejection from ambiguous dispatch. Missing Gemini configuration, local gateway capacity rejection and explicit Manus creation rejection finish their unused reservations as failed. Gemini network failures without response metadata and Manus HTTP 408/5xx keep unknown outcomes reserved. Known response usage is preserved. Central marketing checks credentials and workload activation before creating/accepting a new job; existing jobs retain their original identity.

Manus model/binding failures before creation are explicitly classified as `AI_REQUEST_NOT_SUBMITTED`; their unused reservations settle as failed rather than requiring a nonexistent task ID for reconciliation. A failure after creation begins retains the existing uncertainty rules.

WhatsApp's preparation boundary also includes acquiring the context-save connection, writing pending input and verifying that exactly one row was saved. These failures settle as unused rather than starting a task that cannot be resumed. The reply/WhatsApp caller owns settlement; the shared JSON task helper propagates the preparation/creation outcome without duplicating accounting writes.

Definite Gemini rejections with HTTP 400/401/403/404/413/422/429 release unused capacity when no actual usage was reported. HTTP 408, 5xx and network ambiguity retain reservations. Reported token usage and missing-metadata handling are preserved.

Image snapshots now include topic with a versioned hash payload, still stored as 64 hexadecimal characters. Generation completion and recovery use the same matcher. Older checksums remain usable only when the job's recorded original topic and all checksum fields still match; changing topic cannot attach a stale image through either path. No snapshot migration is required.

Scheduled publication checks the current provider, enabled day, original Facebook target and auto-publish setting inside its claim transaction. Switching the provider while a task runs leaves the old provider's result as a draft. WhatsApp can explicitly resubmit an interrupted, absent request using its stored UUID and campaign input; an existing request does not create another paid task. Missing legacy context is never guessed.

An absent WhatsApp usage row is not a terminal result. The page retains the UUID and stored input and permits same-ID resubmission; a different request is available only after validated variants or confirmed failure. This also applies after reload while the original submission has not yet reserved usage.

For scheduled creation, an early failure before acceptance releases only the current attempt's unused claim. Cleanup locks the claim and checks both provider job tables before deleting it. A saved job, accepted attempt or uncertain creation keeps the claim. Correcting missing credentials therefore permits another attempt for that page/day when the previous attempt demonstrably never started. Historical ambiguous claims are not automatically rewritten.

The scheduler checks on startup and every five minutes in Africa/Cairo. An enabled slot remains due after its configured hour until that Cairo day ends, so restarting after the scheduled time can catch up that day's missed work. It does not replay earlier days or recreate accepted/uncertain jobs. Durable page/day claims and the post guard still prevent duplicates. Skipped checks preserve the prior error and last-run timestamp. Pages are checked independently, and overlapping checks within one process are suppressed. See `docs/reviews/marketing-same-day-catchup-2026-10-27.md` for activation status.

New job/context creation and operation acceptance use the same database transaction. Both image providers, including Gemini recovery and artifact attachment, check the common source-post exclusion under its row lock before proceeding. These lifecycle fixes require no additional migration beyond those listed below.

The second review adds `ai_marketing_recovery_fixes.sql` to the same explicit activation script. It expands Manus generation state with `uncertain` and stores the original image model/Facebook asset in `ai_marketing_job_context`. Confirmed retries retain their model; unknown creation outcomes retain their identity. Scheduled publication checks the original asset and current auto-publish setting in the publication transaction. `marketing.generationRequest` reads the exact owned job rather than depending on a recent-job list. Older unbound scheduled jobs are kept as drafts, and unknown original image models are not guessed.

The module review fixes add durable operation acceptance and per-page scheduler status. Apply `pnpm exec tsx scripts/apply-ai-module-review-fixes.ts --apply` before deploying this version; it includes the provider-binding table. Only public marketing/probe context and ownership are stored in operation tracking, never clinical transcripts. Probe readers verify that binding before touching provider tasks. A known rejected preflight can be reset; an accepted unknown request must retain its identity.

Central management now applies to all medical starts while its flag is enabled, including callers requesting the current engine. Known Gemini completion settles accounting independently of the browser and retries persistence from a metadata-only queue; managed Manus tasks have server-side status checks within the existing clinical job lifetime. Missing token metadata retains the token reservation with `usage_metadata_missing`, but does not occupy remote-work concurrency. Counts remain unavailable until reconciled. No numeric usage is invented.

Apply only the dedicated additive SQL migration scripts with explicit `--apply`. Preserve existing profiles, schedules, publication flags and approved templates. New profile migrations do not switch existing consumers. Do not use broad schema push to deploy this feature.

For dual-provider replies/WhatsApp apply `pnpm exec tsx scripts/apply-ai-provider-bindings.ts --apply` before enabling Manus in these sections. The new table stores only a request UUID and input hash; task/model/usage metadata remains in the usage ledger. Manus tasks are polled by their recorded ID, including after restart. Ten minutes bounds foreground waiting for unfinished tasks; accounting continues independently, and completed output can be recovered without automatic task re-creation. Medical Gemini requires the existing `MEDICAL_GEMINI_CLINICAL_APPROVED=true` and server key; clinical transcripts still bypass the general Gemini gateway.

For interrupted marketing jobs use the recovery controls. Attaching an existing validated artifact incurs no provider request. A confirmed failed/missing image stage can be retried only after explicit confirmation. Unknown outcomes and missing paid images require review.

Central reply jobs derive their usage identity from the durable job request key. A crash or network ambiguity does not permit a second paid generation for the same key. The worker hands off for review rather than falling back or sending an unconfirmed response.

Medical jobs retain the existing ten-minute, process-local lifetime. A service restart expires local proposal access; usage reservations persist and must not be blindly retried. Usage rows contain task/model/status/credits, not transcripts. Manus credits and Gemini tokens are separate units, not a financial budget.

Image references guide style, not exact logo reproduction or factual claims. All generated images and captions remain subject to operator review. Published-topic retirement applies across both Facebook pages and survives deleting a published post; free-form semantic paraphrases are not a guaranteed match.

Verification and current operating state are recorded in `docs/ai-module-completion-report.md`.

Provider-routing review: `docs/reviews/ai-provider-routing-all-2026-10-28.md`. Managed medical settings display the actual workload profile and save processing selection atomically with the medical settings, preserving limits. Generic draft image generation follows the image profile and retains known request identities. Managed reference analysis uses the saved Gemini text model and central accounting; unsupported Manus reference vision fails explicitly. Legacy direct marketing generators cannot bypass central management.
