# SRV100 Project Principles

Companion to the Critical Rules in `docs/AI_CONTEXT.md` (Principles I–VII, the
non-negotiable _what_). This document is the _how_: the working rules that keep
changes consistent with them. Day-to-day coding rules live in `CLAUDE.md` and
`.claude/rules/`.

---

## 1. Validation Discipline

- Run the smallest relevant check first. Order of preference:
  `pnpm check` → `pnpm test` → `pnpm smoke` → `pnpm build`.
- Auth, routing, permissions, or shared types touched: `pnpm check` is mandatory.
- Shipped behavior changed: `pnpm build` is mandatory.
- Reports: a legacy-output parity check is mandatory (see `docs/parity/`).
- Reporting format: changed files / what changed / checks run / checks skipped with reason.

---

## 2. Minimal Safe Changes

- Smallest correct diff wins.
- No refactor outside the scope of the change.
- No new abstractions for hypothetical future needs.
- No removal of `ProtectedRoute`, role-based procedures, audit logging, or
  encoding/decoding helpers.
- Route paths stay stable unless the change explicitly requires a URL change.

---

## 3. Scope Control

- Out-of-scope items are listed in `docs/AI_CONTEXT.md` (Prohibited Expansion).
- If a change uncovers an out-of-scope need, stop and raise it; never silently expand
  the scope.

---

## 4. Review Checklist

1. The requested behavior works.
2. The Critical Rules in `docs/AI_CONTEXT.md` are respected.
3. No out-of-scope edits (`git diff --stat`).
4. Verification evidence is present.
5. Legacy parity holds, if the change touches a report.

---

**Version:** 2.0.0 — spec-driven workflow, task schema, and model routing removed
(2026-10-26).
