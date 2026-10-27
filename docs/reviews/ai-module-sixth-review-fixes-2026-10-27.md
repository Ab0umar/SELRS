# AI module: sixth-review fixes, 2026-10-27

The two findings in `outputs/ai-module-review-6/report.md` are fixed. The related audit also fixed handling of definite Gemini HTTP rejection. Changes are local; no application migration or deployment occurred.

## Fixed behavior

- WhatsApp classifies every context-preparation failure before Manus creation as non-submission. This includes failing to acquire the save connection, a failed UPDATE and an UPDATE that saved no row. It does not create a provider task without saved context; the unused reservation becomes failed and releases capacity.
- Reply and WhatsApp callers own accounting settlement. `startManusJson` propagates preparation/creation outcomes rather than performing a second settlement that could obscure the original failure.
- Definite Gemini HTTP 400/401/403/404/413/422/429 rejection settles unused work when there is no reported consumption. HTTP 408/5xx and network failures stay uncertain. SQL coverage exercises 401, 429, 408 and 500 through the actual gateway with intercepted HTTP responses.
- Image snapshots include topic. Completion, retry and artifact attachment use one topic-aware comparison. The new checksum remains compatible with the existing 64-character column. Historical checksums are accepted only if their checksum fields and the job's original topic still match, so unchanged paid work remains recoverable while a topic-only edit is rejected.

## Verification

- Focused backend: 23 files / 277 tests passed, including 35 owned MySQL regression tests. Added coverage includes three WhatsApp preparation failures, current/legacy image recovery after a topic-only edit, and known Gemini rejection versus uncertain timeout/server failure.
- Auto-reply MySQL integration: 49 tests passed in a separate owned database. Combined backend selection: 326 tests.
- Frontend: 94 files / 655 tests passed.
- `pnpm check` and `pnpm build`: passed.
- Browser recovery: six light/dark and 360/768/1440 cases passed with no page errors.
- `git diff --check` and the code graph refresh completed. Logs are under `outputs/ai-module-review-6/fixes/`.

Provider and browser API boundaries are intercepted. No paid generation, real customer message, public Facebook post or clinical write is used in validation. Existing unrelated full-backend failures are not claimed fixed by this run. Historical unresolved usage/claims are not mass-released because their remote outcome cannot be inferred from a missing task ID alone.
