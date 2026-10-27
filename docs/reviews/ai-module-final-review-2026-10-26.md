# AI module: remediation and final review, 2026-10-26

Scope: the standalone AI workspace and its replies/training, medical, marketing, WhatsApp, settings, experiments and usage paths. This review follows the three findings recorded in `outputs/ai-module-review-4/report.md`. Changes remain local; application/production migrations and deployment were not performed.

## Fixed

1. Known provider/configuration rejection now settles unused reservations as failed. Replies, WhatsApp, marketing and experiments share the classification. Missing Gemini keys and local gateway capacity rejection cannot strand active-work capacity. Manus creation rejection follows the same rule, including medical starts; unknown create outcomes remain reserved. Manus HTTP 408 is now classified as uncertain. Gemini network failure without response metadata remains uncertain, and known response usage is preserved through later persistence failure.
2. Scheduled Manus completion checks the current scheduler provider before publishing. Both providers also pass their expected provider into the publication transaction, which checks current provider, enabled day, original asset and auto-publish setting before claiming the send. Results whose schedule changed remain drafts.
3. Independent Manus accounting includes accepted, owner-bound synthetic probes for marketing and medical.synthetic as well as reply/WhatsApp probes. It settles probe accounting without browser polling and without accepting artifacts, sending messages or changing clinical records. Clinical documentation and unrelated marketing tasks remain outside the synthetic path. Genuine remote uncertainty keeps capacity reserved.
4. Central marketing checks credentials and workload activation before committing a new accepted job. Existing request/model bindings are reused before these checks so configuration changes do not replace a paid task.
5. WhatsApp can explicitly resume a submission that never reached the server using the stored UUID and campaign input. MySQL coverage races identical submissions and verifies one provider task, then replays the request without creating another task. Existing uncertainty stays tracked; missing legacy context is not reconstructed from defaults. The browser model check now waits for observed submission before testing reload of an accepted request.
6. The auto-reply integration suite creates and removes an owned database, fixing its repeat-run duplicate-column setup failure without changing application schemas.

## Coverage reviewed

| Area | Review and validation |
| --- | --- |
| Workspace/routes | Canonical AI pages, legacy redirects, admin boundaries and permission mappings; frontend and router boundary tests. |
| Provider selection | Both providers in four sections, selected model propagation, disabled workload handling and no automatic provider fallback. |
| Replies/training | Approved knowledge targeting, policy before/after generation, request resumption, cancellation/revision and send-switch rechecks; durable MySQL integration. |
| Medical | Dedicated clinical transport and Gemini gate, consent and manual application, source/speaker validation, process-local lifetime and accounting recovery. No clinical templates changed. |
| Marketing | Page/day/category mapping, shared editorial/image input, selected model/asset bindings, cross-provider image exclusion, recovery and publication claims. |
| Scheduling | Per-page state, current provider/slot/asset/auto-publish eligibility, retention as draft when eligibility changes. |
| WhatsApp | Fixed offer facts, stored campaign/day context, owner checks, interrupted-submission replay and one paid task per UUID. |
| Experiments/usage | Owned probes, non-clinical reconciliation, abandoned tasks, accounting-only completion, known rejection versus genuine uncertainty. |

## Verification

Detailed logs are under `outputs/ai-module-review-4/`. The original reproduction tests there describe the old defects and are historical evidence; maintained acceptance tests are in `server/tests/` and the browser scripts.

- `pnpm check` and `pnpm build`: passed.
- Focused backend AI/reply/medical/marketing: 24 files / 312 tests passed, including 23 owned SQL regression tests and 49 auto-reply integration tests. A final rerun of the owned SQL suite also passed all 23 tests after tightening its request-ID assertion.
- `pnpm test`: 94 files / 655 frontend tests passed.
- `scripts/verify-ai-reliability.ts`: all six light/dark and 360/768/1440 cases passed, including same-ID interrupted WhatsApp submission.
- `scripts/verify-ai-section-models.ts`: all six viewport/theme cases passed, with both providers in four sections and same-task reload/resumption. Both browser suites reported no page errors.
- `git diff --check`: passed. The code graph was refreshed after source edits.

The full backend suite is not green: its final run has 62 files passed and four failed, with 719 tests passed, seven failed and one todo. Remaining failures are in `attendance.test.ts`, `medical-fixes.test.ts`, `medical.test.ts` and `mssql-push.test.ts`. These concern attendance materialization and patient/visit/MSSQL paths, outside the AI changes; they have not been diagnosed as fixed. The auto-reply integration suite now passes all 49 tests. No blanket full-backend pass is claimed.

Provider requests, Facebook/WhatsApp delivery and browser APIs are intercepted in relevant tests. Disposable MySQL databases are removed after testing. No paid generation, real public post, customer message or clinical save was performed as AI validation. Browser emulation does not certify native Android recording or live provider image aesthetics. Unknown provider outcomes and process-local clinical retention remain explicit operational limits.
