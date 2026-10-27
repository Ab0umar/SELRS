# AI provider routing review

Scope: trace saved provider/model settings through every live AI consumer, retain explicit overrides and existing remote-task identities, and fix silent provider mismatches. This extends the marketing-default fix recorded in `ai-provider-selection-2026-10-28.md`.

## Routing matrix

| Consumer | Authoritative selection | Result |
| --- | --- | --- |
| Manual marketing text/image | Saved text/image profiles by default; explicit request override remains supported | Configured default is honored; stale browser preference does not replace it. |
| Scheduled marketing | Explicit per-page scheduler provider; central schedules require enabled Gemini text/image profiles | Missing page setting rejects instead of defaulting to Manus. Existing schedules/publication switches were not changed. |
| Generic draft image button | Saved `marketing.image` profile | Removed unconditional Manus dispatch. UUID retries return the original owned image job even if profiles change. |
| Explicit Gemini image control | Explicitly named Gemini action | Continues to require central Gemini support; no automatic provider fallback. |
| Reference-image analysis and brand aggregation | Saved `marketing.text` Gemini model and central accounting | Removed the fixed legacy Gemini model from the managed path. The vision capability supports Gemini only; choosing Manus blocks it explicitly instead of secretly using Gemini. One-design deterministic aggregation performs no AI request. |
| Live auto-reply | Explicit current/central engine, then the live workload profile for central execution | Saving an assistant choice from the reply page now uses the central profile when available. Enabled Manus is accepted and its own credential is checked; Gemini-only sampling validation is skipped for Manus. The delivery switch/channel checks remain unchanged. |
| Internal reply preview | Active live engine/profile, or explicitly requested isolated preview workload | A default `current` request cannot bypass an already selected central live engine. Managed preview requires a request UUID. |
| WhatsApp marketing copy | `whatsapp.marketing` profile reserved in SQL | Existing implementation already binds provider/model/task to the request. Reviewed and regression-tested without a replacement workflow. No Meta templates or sending rules changed. |
| Medical processing | `medical.documentation` profile while central management is enabled; legacy saved setting otherwise | Display and dispatch now agree. Saving processing selection updates the profile and medical settings atomically, preserving enablement and limits. |
| Medical synthetic route | Configured medical processing provider/model | Removed hard-coded Manus selection. The generic synthetic workload probes already use their own profiles. |
| Speech | Explicit saved Azure/Gemini speech setting, with existing credential/clinical gates | Separate from text-processing selection; no provider fallback was introduced. |
| Legacy unused marketing generators | Legacy mode only | Direct text/image legacy entry points reject while central management is enabled, preventing a bypass through fixed Gemini/Fal/Forge/OpenAI settings. Normal live routes do not call them. |

The explicit legacy reply engine remains available for compatibility; this review did not silently migrate it or enable sending. Main provider-profile changes do not recreate already accepted work. Existing Manus tasks continue under their original task IDs after a new default becomes Gemini.

## Medical safeguards

- An incoming provider/model expectation that differs from current settings is rejected before a transcript is sent, so stale consent cannot silently authorize another provider.
- The medical review freezes the displayed provider/model after a job starts. Old static text naming Manus irrespective of the selected provider was removed.
- Clinical Gemini approval, source-quote validation, consent and manual clinician application remain in force. No automatic clinical saving or patient-data access was added to marketing.
- SQL rollback was verified by rejecting settings persistence with a trigger in an owned disposable database: the provider update rolled back too, while the original quota and enablement fields remained intact.

## Verification

- Reproduced failures first: configured Gemini was ignored by the generic image action and by the medical settings display. Both regression tests now pass.
- Backend: 31 focused files / 367 tests passed, including owned SQL fixtures, live-worker guards, provider binding, recovery, metadata/accounting, clinical gates and both providers. An additional four-file / 40-test check passed after final medical error-copy changes.
- Frontend: 96 files / 665 tests passed.
- `pnpm check` and `pnpm build` passed. The final build includes the completed medical selector/copy changes.
- Browser: `scripts/verify-ai-section-models.ts` passed six light/dark cases at 360/768/1440, with no page errors or horizontal overflow. Covered configured Gemini default despite stale Manus preference, explicit provider overrides, UUID-backed generic image action, saved medical selection reaching processing, central reply preview, WhatsApp saved selection and pending-task reload protection. Requests were intercepted; no provider task, message or Facebook post was created.
- `graphify update .` completed. Its existing warning about missing SQL extraction support remains; no semantic extraction or paid API was requested.

Evidence: `outputs/all-provider-{backend-final,client-final,check-final,build,browser,final-regressions,graph}.log`, `outputs/provider-routing-regression.log`, and `outputs/ai-section-models/`.

## Delivery gate

Design Read: preserve the approved existing Arabic RTL screens, controls and spacing. ENERGY 1 / RHYTHM 1 / MOTION 1. No layout redesign.

- Hard gate PASS: real saved settings drive routing; missing/disabled settings block dispatch; all six browser cases have no page errors or overflow.
- Purpose gate PASS: the existing medical selector now edits the same central setting that actually processes requests; no decorative additions.
- Liveliness PASS: existing task-focused screens and approved visual direction remain intact in six captured cases.
- Craftsmanship PASS: reproduced regressions, real SQL rollback, explicit provider choices and retained remote-task identities are verified. Tests never substitute fabricated success into production code.

Clean-code guard: provider errors propagate without cross-provider fallback, image UUID ownership/source binding is checked, and settings writes are parameterized and transactional. Test guard: provider/database boundaries use fixtures; SQL and browser tests verify behavior across the actual workflow seams.

## Activation and limits

No migration or production-setting change is required. The production bundle is built, but this review did not restart `SRV100` or create a live paid generation. The operator must restart the service and refresh the client to activate the new backend code. The current session cannot control the service; an earlier elevated restart was rejected by automatic review, and no alternative elevated route was attempted.

Local and intercepted tests establish routing behavior, not current external provider availability or successful paid delivery. Gemini-only reference vision fails clearly for Manus; it does not pretend that capability exists for both providers.
