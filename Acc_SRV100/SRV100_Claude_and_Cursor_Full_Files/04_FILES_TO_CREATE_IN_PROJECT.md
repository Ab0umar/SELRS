# Files Claude should create in your project

After running `01_CLAUDE_FULL_MASTER_PROMPT.md`, save Claude output into:

```text
/specs/CONSTITUTION.md
/specs/PROJECT_PRINCIPLES.md
/specs/specify.md
/specs/plan.md
/speckit-tasks/task_01.md
/speckit-tasks/task_02.md
/speckit-tasks/task_03.md
...
/cursor_commands.md
/claude_review_prompt.md
```

## Execution order
1. Run Claude full master prompt.
2. Save output files.
3. Open Cursor.
4. Execute one command from cursor_commands.md.
5. Send result to Claude using claude_review_prompt.md.
6. Fix if needed.
7. Continue next task.
