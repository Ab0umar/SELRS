# SRV100 - Cursor Usage Guide

## Purpose
Cursor is the execution hand.

Claude creates:
- Constitution
- Project Principles
- /specify
- /plan
- /tasks
- cursor_commands.md

Cursor executes:
- Backend changes
- Frontend changes
- Multi-file edits
- Integration
- Tests

---

## Cursor Rule
Do not start Cursor before Claude generates:
- `/specs/CONSTITUTION.md`
- `/specs/PROJECT_PRINCIPLES.md`
- `/specs/specify.md`
- `/specs/plan.md`
- `/speckit-tasks/task_XX.md`
- `cursor_commands.md`

---

## How to use Cursor

1. Open the real project in Cursor.
2. Make sure these files exist in the project:
   - `/specs/CONSTITUTION.md`
   - `/specs/PROJECT_PRINCIPLES.md`
   - `/specs/specify.md`
   - `/specs/plan.md`
   - `/speckit-tasks/task_XX.md`
   - `/cursor_commands.md`

3. Open Cursor Agent.
4. Copy ONE command from `cursor_commands.md`.
5. Paste it into Cursor Agent.
6. Let Cursor implement ONLY that task.
7. Copy Cursor result summary.
8. Send result back to Claude for review.
9. If Claude approves, continue to next task.
10. If Claude says "Needs Fixes", paste the fix instructions into Cursor.

---

## Cursor Command Template

Use this only if Claude did not generate a command for a task.

```text
Read these files first:
- /specs/CONSTITUTION.md
- /specs/PROJECT_PRINCIPLES.md
- /specs/specify.md
- /specs/plan.md
- /speckit-tasks/task_XX.md

Follow the project Constitution and Project Principles strictly.

You are Cursor acting as the implementation agent.

Task:
Implement ONLY Task XX: <Task Name>.

Rules:
- Do not touch unrelated modules.
- Do not redesign the database.
- Do not break the existing Medical module.
- Keep Accounting separated from Medical.
- Use existing project structure and coding style.
- Apply minimal safe changes only.
- Do not add OneDrive or sync features.

Before coding:
1. Inspect the current project structure.
2. Identify relevant files.
3. Briefly explain the planned edits.
4. Then apply the changes.

After coding:
1. List changed files.
2. Explain how to test.
3. List assumptions.
4. List warnings if any.

Acceptance Criteria:
- The task is implemented only within its scope.
- Medical module still works.
- No database schema redesign happened.
- Accounting logic remains service-based.
- No unrelated files were modified.
```

---

## Cursor Fix Command Template

Use this when Claude reviews and says "Needs Fixes".

```text
Read these files first:
- /specs/CONSTITUTION.md
- /specs/PROJECT_PRINCIPLES.md
- /specs/specify.md
- /specs/plan.md
- /speckit-tasks/task_XX.md

Follow the project Constitution and Project Principles strictly.

Fix ONLY the issues listed below.

Claude Review:
<paste Claude review here>

Rules:
- Do not refactor unrelated code.
- Do not change task scope.
- Do not redesign database.
- Do not break Medical module.
- Apply minimal safe fixes.

After fixing:
1. List changed files.
2. Explain exact fixes.
3. Explain how to retest.
```

---

## What Cursor should NOT do
- Do not create the project plan.
- Do not change the Constitution.
- Do not rewrite Medical module.
- Do not redesign the database.
- Do not add OneDrive now.
- Do not merge unrelated tasks.
- Do not implement multiple tasks unless explicitly told.
