# claude_review_prompt.md — Claude Review Template for Executed Tasks

Use this prompt verbatim (fill the placeholders) to have Claude review any
completed Accounting Phase 1 task before it is considered accepted. One
review per task.

---

```text
Follow the project Constitution and Project Principles strictly.

You are the SRV100 Accounting Phase 1 Reviewer.

Review this completed task result:

Task:
<paste Task ID and title, e.g. "Task 09: Implement Backend Accounting Layer">

Changed files:
<paste the exact list of files the executor changed, one per line,
grouped by folder>

Implementation summary:
<paste the executor's short description of what changed and why — the
"After coding" output block from the Cursor command>

Test result:
<paste the exact output of the checks that were run, e.g.:
- pnpm check: PASS / FAIL (summary line)
- pnpm test: PASS / FAIL (summary line, counts)
- parity-check.ts: PASS / FAIL per report
- Manual smoke: list verified flows
If a check was skipped, paste the reason>

Check:
- Does it match the task as defined in specs/tasks.md?
- Did it break Medical? (confirm zero diffs to server/routers/medical.ts,
  server/db.ts, server/integrations/mssqlPatients.ts,
  client/src/components/ProtectedRoute.tsx)
- Did it keep Accounting separated? (no imports between medical and
  accounting code; no shared mutation paths)
- Did it avoid DB redesign? (no new tables, no renamed columns, no schema
  migrations, no INSERT/UPDATE/DELETE on MSSQL accounting)
- Did it match service-based accounting rules? (Principle II: revenue
  derived from PAPAT_SRV / PAJRNRCVH service rows, not from patient or
  medical-side counts)
- Are there any scope creep issues vs specs/scope-lock.md?
- Is legacy parity preserved (if this task touches reports)?
- Is it ready for the next task?

Output (produce exactly these sections):

1. Verdict
   Approved | Needs Fixes

2. Blocking issues
   - <one line per blocker, with file:line reference when applicable>
   - (if none, write "None")

3. Non-blocking improvements
   - <one line per suggestion>
   - (if none, write "None")

4. Exact fix instructions (only if Needs Fixes)
   <for each blocker, give a precise instruction: which file, which
   change, which test to add>

5. Principle citations
   List the Constitution principles this review applied (I–VII) and the
   specific rules invoked.
```

---

## How to use

1. Copy the block above into Claude.
2. Replace every `<paste …>` placeholder with the real artifacts produced
   by the executor.
3. Attach (or paste) the relevant diff excerpt if file-level change volume
   is high.
4. Do NOT proceed to the next task until the verdict is **Approved**.
5. Record the verdict and any blockers in the task tracker / PR description.

---

## Review gates enforced by this template

- **Principle I (Separation):** changed-files list is cross-checked against
  the untouchable list; any hit on it automatically triggers Needs Fixes.
- **Principle II (Service-based):** revenue math provenance must be
  traceable to `PAPAT_SRV` / `PAJRNRCVH` joins; any patient-count or
  visit-count derivation triggers Needs Fixes.
- **Principle III (Read-only):** any INSERT/UPDATE/DELETE/EXEC/MERGE verb
  under `server/services/accounting/` or `server/routers/accounting.ts`
  triggers Needs Fixes.
- **Principle IV (DBs as-is):** any migration file, schema edit, or new
  MSSQL object triggers Needs Fixes.
- **Principle V (Legacy parity):** for report-touching tasks, missing or
  failing parity artifact triggers Needs Fixes.
- **Principle VI (Minimal-diff):** edits outside the task's declared
  output list trigger Needs Fixes.
- **Principle VII (Don't break Medical):** missing `pnpm check` on tasks
  that touch shared infrastructure triggers Needs Fixes.

---

**Template version:** 1.0.0 — aligned with Constitution v1.0.0, Principles
v1.0.0.
