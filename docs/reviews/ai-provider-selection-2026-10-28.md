# Marketing default provider selection

The user reported Manus being used after choosing Gemini. Read-only checks against the service checkout database (`selrs26`) found all central workload profiles enabled with Gemini, and both page schedulers configured as central. Gemini usage contained completed executions. Recent legacy Manus rows included failed requests without a recorded task ID; historical rows alone do not prove a new paid Manus execution.

## Reproduction and fix

The `marketingAssistantSelection` regression initially failed: an admin `generatePost` request without an assistant override dispatched to Manus despite enabled Gemini profiles. The route now resolves the configured marketing text/image profiles when central management is enabled. Missing, disabled or incompatible profiles reject before dispatch; there is no silent fallback. Legacy behavior remains available with central management disabled, and an explicit request selection remains authoritative.

The marketing form now derives its default from the saved profiles rather than a hard-coded Manus value or an old browser assistant preference. Pending requests retain their stored assistant and identity. Explicit provider/model overrides remain available. The scheduler configuration and existing tasks were not changed. No migration is required.

## Verification

- `pnpm check` and `pnpm build`: passed.
- Three focused backend files: 21 tests passed, including the reproduced route regression and no fallback when configuration is unavailable.
- Frontend suite: 96 files, 665 tests passed.
- `AI_UI_MARKETING_ONLY=true` browser verification: six light/dark cases at 360/768/1440 passed. A seeded stale Manus browser choice did not replace the configured Gemini default. Explicit Manus and Gemini requests, pending reload protection, absence of browser errors and absence of horizontal overflow passed. APIs were intercepted; no provider calls, messages or publishing occurred.
- The broader section browser script reached an unrelated medical selector timeout; it is not reported as passing for all AI sections. Marketing verification was rerun with the explicit marketing-only scope.
- `graphify update .` was run; SQL extraction reports its existing missing `tree_sitter_sql` dependency.

## Delivery gate

Design Read: preserve the approved existing RTL administration screen, controls and spacing. ENERGY 1 / RHYTHM 1 / MOTION 1. Scope is provider behavior, with no layout redesign.

- Hard gate PASS: real saved profiles drive selection, unavailable configuration blocks generation, six theme/width cases show no overflow or console errors.
- Purpose gate PASS: existing selector reflects the effective default; no decorative interface additions.
- Liveliness PASS: existing approved screen direction and its task controls remain intact, verified in six browser captures.
- Craftsmanship PASS: backend regression was red before the fix and green afterward; explicit overrides and pending identities remain tested. Production credentials and clinical data were not accessed by the browser test.

Clean-code guard: shared selection logic has no network side effects; database errors propagate and do not trigger fallback. Test guard: database/provider boundaries are replaced only in isolated tests; actual provider routing is asserted, with a browser check of the real form.

## Activation

The new build is ready. Another operator restart of `SRV100` was requested. The current session cannot control that service; an earlier elevated restart was rejected by automatic review, and no alternative elevated path was attempted. No production activation or new paid provider execution is claimed.
