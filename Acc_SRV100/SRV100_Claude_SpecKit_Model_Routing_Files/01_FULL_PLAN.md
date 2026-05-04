# SRV100 Final Plan

## Goal
Add the Accounting module to the existing web application beside the current Medical module.

## Scope
Included:
1. Add Accounting module entry/navigation.
2. Keep Medical module unchanged.
3. Add read-only Accounting backend APIs.
4. Connect Accounting APIs to the existing MSSQL accounting database.
5. Build Accounting screens.
6. Build reports and print preview.
7. Validate outputs against old/legacy reports.

Excluded:
1. No database redesign.
2. No OneDrive sync.
3. No full rebuild.
4. No rewriting Medical module.
5. No unrelated UI redesign.

## System Separation
### Medical
- Existing module.
- Patient/doctor-based.
- Must remain working as-is.

### Accounting
- New web module.
- Service-based.
- Uses existing MSSQL.
- Reports depend on service/date/shift filters.
- Service revenue must not depend on patient/doctor logic.

## AI Workflow
1. Claude starts the project.
2. Claude creates `/specify`.
3. Claude creates `/plan`.
4. Claude creates `/tasks`.
5. Claude assigns Owner Model, Backup Model, Tool, Role, Prompt, Acceptance Criteria for each task.
6. Cursor/Codex/GPT/Gemini/GLM/Kimi execute assigned tasks.
7. Claude reviews results and approves or sends fixes.

## Tool Roles
- Claude: SpecKit leader, planner, prompt writer, reviewer.
- Cursor: Project execution and multi-file edits.
- Codex: Code implementation, refactoring, bug fixing.
- GPT-5: API design, SQL logic, complex technical reasoning.
- GPT-5 mini / GLM / Kimi: Cheap summaries, extraction, drafts.
- Gemini: UI/UX layout and visual review.
- Ollama / Continue: Local small tasks.
