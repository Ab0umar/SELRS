# Same-day automatic marketing catch-up

## Behavior

The scheduler now checks when the application starts and every five minutes in Africa/Cairo. For each page independently, the current enabled calendar slot becomes due at its configured hour and remains eligible until that Cairo day ends. This compensates for starting or recovering the service after the exact scheduled hour. It does not queue a backlog from earlier dates.

The existing non-failed-post check and durable page/day claim prevent a second generation. An accepted, failed-with-job or uncertain attempt is not recreated automatically. Known preflight failures with no accepted job retain the existing unused-claim cleanup. Provider capacity is still required; catch-up does not switch providers or bypass their limits.

One in-process check runs at a time. A page error does not stop checks for the other page. Checks that find an existing claim do not overwrite a previous error with idle or fabricate a new last-run timestamp. New generation errors are logged safely through the existing marketing log.

## Validation

- Due-slot tests cover before/exactly-at/after the scheduled hour, late evening, Cairo midnight, page-specific calendars, disabled pages and disabled slots.
- Startup/timer coverage verifies five-minute scheduling, startup execution, overlap prevention and page-read error isolation without provider calls.
- An owned MySQL concurrency test confirms that overlapping checks create one claim. Existing uncertain-creation coverage also confirms that a skipped check preserves the previous error and timestamp.
- The prepared server candidate is syntax checked. Its changes are restricted to the compiled scheduler module; a separate medical source change is deliberately excluded from this release.
- Logs and the release patch are under `outputs/marketing-catchup/`. Tests do not perform paid generation, send customer messages or publish Facebook posts.
- Final focused backend validation passed 24 files / 287 tests, including 36 owned MySQL tests. TypeScript, server bundling, candidate syntax validation, activation-script parsing and `git diff --check` passed. The code graph was refreshed.

## Activation status

Not activated on SRV100. A read-only Windows access check for service start/stop/query rights returned error 5 (Access denied); the current session is not elevated. The installed `dist/index.js` hash remains unchanged.

The isolated candidate, original server backup and expected hashes are prepared. From an Administrator PowerShell, run:

```powershell
& 'E:\selrs.cc\outputs\marketing-catchup\activate.ps1'
```

The script checks the service's configured workspace and both bundle hashes, refuses to overwrite a different release, installs only the scheduler update, restarts SRV100 and verifies health. It restores the previous bundle if activation fails after replacement. Startup will attempt any currently due same-day slot using the existing provider and auto-publish settings. No provider quota or balance is changed.
