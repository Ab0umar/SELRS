# Central AI module

Administrative surface: `/admin-hub/ai`. The server flag `AI_CORE_MANAGEMENT_ENABLED=true` enables central operations. No credentials are accepted by the browser or returned in status responses.

| Workload | Consumer | Provider / activation |
| --- | --- | --- |
| `reply.preview` | Existing internal reply test, central preview choice | Gemini, opt in |
| `reply.live` | Internal live-profile preview and optional background reply engine | Gemini; enable the profile, preview it, then explicitly select central in auto-reply settings |
| `marketing.text` / `marketing.image` | Facebook drafts, image replacement and optional per-page scheduler | Gemini; Manus scheduler stays available |
| `whatsapp.marketing` | `/marketing/whatsapp` copy drafting | Gemini, disabled initially; does not send or change approved Meta templates |
| `medical.synthetic` | Fixed synthetic Gemini probes | Never accepts a patient transcript |
| `medical.documentation` | Optional central medical proposal workflow; standalone review at `/admin-hub/medical-assistant` and existing patient-file tools | Manus only; disabled initially; current Manus Lite remains default |

`gateway.ts` owns bounded Gemini SDK requests, typed structured output, image validation and safe usage metadata. `managementStore.ts` owns SQL profile locks, daily quotas, concurrency and unique request IDs. Unknown paid outcomes retain their reservations. There is no automatic provider fallback.

`providers/manus.ts` owns shared private Manus tasks and bounded downloads. `marketing/manusClient.ts` is a compatibility export for existing callers. `medical.ts` owns medical job state, source/speaker validation and optional central credit accounting. Old medical service paths remain compatibility exports. `medicalGemini.ts` retains the independently gated clinical alternative; the general Gemini gateway rejects clinical documentation workloads. `speech.ts` exchanges short-lived Azure Speech tokens without retaining them.

Marketing public context, selected-page reference images, customer reply knowledge and clinician transcripts remain separate. Marketing and WhatsApp copy builders never query patient records. Reply policy still runs before and after central generation. The medical interface still requires consent and explicit clinician application; the AI module does not write medical fields.

## Operations

Apply only the dedicated additive SQL migration scripts with explicit `--apply`. Preserve existing profiles, schedules, publication flags and approved templates. New profile migrations do not switch existing consumers. Do not use broad schema push to deploy this feature.

For interrupted marketing jobs use the recovery controls. Attaching an existing validated artifact incurs no provider request. A confirmed failed/missing image stage can be retried only after explicit confirmation. Unknown outcomes and missing paid images require review.

Central reply jobs derive their usage identity from the durable job request key. A crash or network ambiguity does not permit a second paid generation for the same key. The worker hands off for review rather than falling back or sending an unconfirmed response.

Medical jobs retain the existing ten-minute, process-local lifetime. A service restart expires local proposal access; usage reservations persist and must not be blindly retried. Usage rows contain task/model/status/credits, not transcripts. Manus credits and Gemini tokens are separate units, not a financial budget.

Image references guide style, not exact logo reproduction or factual claims. All generated images and captions remain subject to operator review. Published-topic retirement applies across both Facebook pages and survives deleting a published post; free-form semantic paraphrases are not a guaranteed match.

Verification and current operating state are recorded in `docs/ai-module-completion-report.md`.
