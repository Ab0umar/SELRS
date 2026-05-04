# SRV100 - Claude Review Prompt

Use this after Cursor/Codex finishes any task.

```text
Follow the project Constitution and Project Principles strictly.

Review this completed task result:

Task:
<task name>

Owner Tool/Model:
<Cursor / Codex / GPT / etc>

Changed files:
<paste changed files>

Implementation summary:
<paste implementation summary>

Test result:
<paste test result>

Assumptions:
<paste assumptions>

Check:
1. Does it match the task scope?
2. Did it break the existing Medical module?
3. Did it keep Accounting separated from Medical?
4. Did it avoid database redesign?
5. Did it preserve service-based Accounting logic?
6. Did it avoid patient/doctor dependency in service revenue?
7. Did it avoid OneDrive/sync work?
8. Did it follow minimal safe changes?
9. Is it ready for the next task?

Output:
- Approved / Needs Fixes
- Blocking issues
- Non-blocking improvements
- Exact fix instructions if needed
- Next recommended task
```
