# 08 - Patients Inquiry Agent

## Suggested Model
GPT-5.5 / Claude Sonnet

## Role
Build the full Patients Inquiry screen for Accounting.

## Prompt
```text
You are a full-stack developer.

Your task is to implement the Full Patients Inquiry screen inside the Accounting module.

Filters:
- Patient code
- Patient name
- Date
- Service
- Doctor

Expected behavior:
- Search patients and related accounting activity.
- Show patient identity, visits/services, doctor, date, and financial summary if available.
- Keep this screen separate from the Medical patient screen unless shared components already exist safely.

Rules:
- Use existing database.
- Do not redesign tables.
- Do not break the Medical module.

Output:
1. Screen layout.
2. Filter logic.
3. Required API endpoint.
4. Response structure.
5. Table columns.
6. Actions.
7. Edge cases.
8. Test checklist.
```
