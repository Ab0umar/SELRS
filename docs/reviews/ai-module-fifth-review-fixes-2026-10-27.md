# AI module: fifth-review fixes, 2026-10-27

All three findings in `outputs/ai-module-review-5/report.md` have source fixes and maintained regression coverage. Changes remain local; no application migration or deployment was performed.

## Behavior

- WhatsApp treats null usage state as unresolved. Reload retains the original UUID and campaign input, offers only same-ID resubmission, and does not show the new-request action. Valid variants or confirmed failure still permit another draft. Legacy input is not guessed.
- Manus model validation and input-binding persistence occur before the provider creation boundary. Errors there become `AiRequestNotSubmitted`, and the shared settlement path records failed, unused usage. Provider creation/attachment failures continue to preserve genuine uncertainty.
- Both schedulers signal acceptance from their existing job-claim transaction. On failure before that signal, cleanup locks the current claim and checks both provider job tables. Only a claim with matching provider and no job is deleted. Accepted attempts and ambiguous creation remain reserved; old ambiguous claims are not mass-released.

## Verification

- Focused backend: 23 files / 268 tests passed, including 28 tests in an owned disposable MySQL database. Added coverage checks binding-write failure in replies and WhatsApp, same-day retry after missing credentials for both schedule providers, and retention after uncertain Manus creation. See `outputs/ai-module-review-5/fixes/backend.log`.
- Frontend: `pnpm test` passed 94 files / 655 tests.
- `pnpm check` and `pnpm build`: passed.
- Browser recovery: all six light/dark and 360/768/1440 cases passed, with no page errors. The new assertions verify null-usage identity retention, same-ID replay, retained state after reload and unlocking only after confirmed failure.
- `git diff --check`: passed. Logs and the graph refresh output are under `outputs/ai-module-review-5/fixes/`.

The browser recovery script exercises null usage, same-ID replay, reload and unlocking after confirmed failure across its light/dark viewport cases. APIs and provider calls are intercepted; no paid generation, actual post, customer message or clinical write is used. These fixes do not change clinical consent, application or print behavior. The wider backend failures reported in earlier reviews are not claimed fixed or revalidated as a green full suite in this scoped run.
