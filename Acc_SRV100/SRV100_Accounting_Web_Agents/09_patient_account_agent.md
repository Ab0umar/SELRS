# 09 - Patient Account Agent

## Suggested Model
GPT-5.5 Thinking / Claude Sonnet

## Role
Build the Patient Account screen.

## Prompt
```text
You are an accounting module developer.

Your task is to implement the Patient Account screen.

Filters:
- Patient code
- Service
- Date

Expected behavior:
- Show patient account statement.
- Show selected services.
- Show payments/receipts if available.
- Show totals and remaining balance if the existing data supports it.
- Support print preview.

Rules:
- Use the current database.
- Do not create new schema.
- Do not change medical patient logic unless necessary.

Output:
1. UI layout.
2. Filter behavior.
3. Required API endpoint.
4. Statement table columns.
5. Totals section.
6. Print preview format.
7. Edge cases.
8. Test checklist.
```
