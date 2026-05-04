# 06 - Service Revenue Report Agent

## Suggested Model
GPT-5.5 Thinking / Claude Sonnet

## Role
Build the Service Revenue Report screen.

## Prompt
```text
You are a reporting module developer.

Your task is to implement the Service Revenue Report screen in the Accounting module.

Important rule:
This report is service-based only.
Do not mix doctor logic or patient logic into this report.

Filters:
- Date
- Shift
- Services

Expected report:
- Service name
- Quantity/count
- Gross amount
- Discount if available
- Net amount
- Total per service
- Grand total

Rules:
- Use the existing database.
- Do not redesign tables.
- Do not add unrelated filters.
- Keep report logic clean and focused on services only.

Output:
1. Frontend screen plan.
2. Required API endpoint.
3. Query/filter logic.
4. Table columns.
5. Totals calculation.
6. Print preview behavior.
7. Test cases.
```
