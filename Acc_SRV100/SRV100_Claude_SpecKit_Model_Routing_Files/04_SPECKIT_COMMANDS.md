# SpecKit Commands

## 1. /specify
Use Claude with `03_CLAUDE_MASTER_PROMPT.md`.

Claude should generate:
- Goal
- Scope
- Non-scope
- Rules
- Acceptance criteria

## 2. /plan
Claude should generate:
- Architecture
- Data boundaries
- API strategy
- Frontend strategy
- Testing strategy
- Tool/model strategy

## 3. /tasks
Claude should generate:
- Full task list
- Owner Model
- Backup Model
- Tool
- Role
- Input
- Output
- Prompt
- Acceptance Criteria

## 4. /implement
Do not use Claude as the main implementer.

Use:
- Cursor for project-level edits
- Codex for implementation/fixes
- GPT for API/SQL/report help
- Gemini for UI
- GLM/Kimi for cheap extraction

## 5. /review
Return outputs to Claude.

Claude checks:
- Medical is not broken
- Accounting is separated
- Reports are service-based
- Legacy output is matched
- No scope creep
