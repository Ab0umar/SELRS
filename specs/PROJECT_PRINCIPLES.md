# SRV100 Project Principles

Companion to `specs/CONSTITUTION.md` (canonical: `.specify/memory/constitution.md`).
The Constitution is the *what* (non-negotiable rules). This document is the *how*
(the operating model that produces work consistent with the Constitution).

---

## 1. Spec-Driven Workflow

All work flows in this strict order. No step may be skipped.

1. **Constitution** — established once; amended per Governance.
2. **Project Principles** — this document.
3. **`/specify`** — feature spec: problem, scope, in/out, success criteria.
4. **`/clarify`** — targeted clarifying questions (if scope is ambiguous).
5. **`/plan`** — design artifacts: architecture, data flow, contracts, Constitution
   Check.
6. **`/tasks`** — dependency-ordered, model-routed task list.
7. **Execution** — Cursor/Codex/etc. implement per task.
8. **Review** — Claude reviews each delivered task against acceptance criteria.

> No code is written before steps 3–6 exist for that feature.

---

## 2. Task Contract (Mandatory Schema)

Every task in `tasks.md` MUST contain these fields. Tasks missing any field are
rejected during review.

| Field | Description |
|---|---|
| **ID** | Stable identifier, e.g. `T-LASIK-001`. |
| **Title** | One-line imperative. |
| **Owner Model** | Primary model/tool assigned (per §4 routing). |
| **Backup Model** | Fallback if Owner is unavailable or fails. |
| **Tool** | Execution surface: Cursor, Codex CLI, manual, etc. |
| **Role** | What the model is doing: implement / refactor / draft SQL / extract / review / design. |
| **Inputs** | Files, schemas, prior task outputs, references. |
| **Outputs** | Concrete artifacts (file paths, PR, report). |
| **Prompt** | The English prompt to give the Owner Model. MUST end with: *"Follow the project Constitution and Project Principles strictly."* |
| **Acceptance Criteria** | Verifiable conditions; includes verification commands and (for reports) legacy-parity check. |
| **Dependencies** | Predecessor task IDs. |
| **Constitution Refs** | Principles invoked (e.g., I, II, V). |

---

## 3. Roles

- **Claude (Leader/Planner/Reviewer)** — Constitution, principles, `/specify`,
  `/plan`, `/tasks`, prompt authoring, model routing, review, scope control.
  Claude does NOT implement.
- **Cursor** — Multi-file edits inside the project, frontend/backend integration,
  running checks.
- **Codex** — Implementation, refactoring, bug fixing.
- **GPT-5 / ChatGPT** — API design, SQL logic, report logic, debugging analysis.
- **GPT-5 mini / GLM / Kimi / OpenRouter cheap** — Bulk repetitive work, legacy
  file summaries, report-field extraction, SQL drafts, long-text processing.
- **Gemini** — UI/UX layout proposals, visual review, screen alternatives.
- **Ollama / Continue** — Lightweight local edits, offline summaries.

---

## 4. Model Routing Matrix

| Task type | Owner | Backup |
|---|---|---|
| Constitution / principles / spec / plan / tasks / review | Claude | — |
| Multi-file edits inside repo | Cursor | Codex |
| Implementation / refactor / bugfix | Codex | Cursor |
| SQL design, report logic, complex reasoning | GPT-5 | Claude |
| Bulk extraction, legacy summaries, SQL drafts | GPT-5 mini / GLM / Kimi | OpenRouter |
| UI layout / visual variants | Gemini | Cursor |
| Local lightweight edits | Ollama / Continue | Cursor |

**Routing rules:**
- Never use Claude for heavy implementation, large repetitive edits, bulk refactoring,
  or cheap long-form extraction.
- Never use a cheap model where legacy parity (Principle V) is at stake without a
  Claude review pass.
- Cursor is the default execution surface inside the live repo.

---

## 5. Validation Discipline

- **Per task:** run the smallest relevant check first. Order of preference:
  `pnpm check` → `pnpm test` → `pnpm smoke` → `pnpm build`.
- **Auth/routing/permissions/shared types touched:** `pnpm check` is mandatory.
- **Shipped behavior changed:** `pnpm build` is mandatory.
- **Reports:** legacy-output parity check is mandatory and the artifact MUST be
  attached to the task.
- **Reporting format:** changed files / what changed / checks run / checks skipped
  with reason.

---

## 6. Minimal Safe Changes

- Smallest correct diff wins.
- No refactor outside task scope.
- No new abstractions for hypothetical future needs (per CLAUDE.md).
- No removal of `ProtectedRoute`, role-based procedures, audit logging, or
  encoding/decoding helpers.
- Route paths stay stable unless the task explicitly requires a URL change.

---

## 7. Scope Control

- Out-of-scope items are listed in the Constitution (System Boundaries).
- If during execution a task discovers an out-of-scope need, the executor STOPS and
  files a scope-change request. Claude evaluates and either amends the spec or
  defers the item — never silently expands.

---

## 8. Cursor Execution Commands

After `/tasks` is generated, Claude produces a Cursor command block per task.
Format:

```
# Task: <ID> — <Title>
# Owner: <Model> | Tool: Cursor
# Files: <paths>

<Prompt body, ending with:>
Follow the project Constitution and Project Principles strictly.
```

These blocks are pasted directly into Cursor for execution.

---

## 9. Review Gate

Claude reviews every delivered task against:
1. Acceptance criteria met.
2. Constitution principles cited in the task respected.
3. No out-of-scope edits.
4. Verification evidence present.
5. Legacy parity (if a report).

Failed reviews return to the Owner Model with a reviewer note. No merge until
review passes.

---

**Version:** 1.0.0 — aligned with Constitution v1.0.0 (2026-05-03).
