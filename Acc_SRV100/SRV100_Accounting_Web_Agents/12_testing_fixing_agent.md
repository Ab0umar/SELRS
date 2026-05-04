# 12 - Testing & Fixing Agent

## Suggested Model
GPT-5.5 Thinking / Claude Sonnet

## Role
Test the Medical + Accounting web system together and fix issues.

## Prompt
```text
You are a QA and debugging engineer.

Your task is to test the web app after adding the Accounting module beside the Medical module.

Test areas:
1. Medical module still works as before.
2. Accounting module opens correctly.
3. Medical shortcuts appear only in Medical.
4. Accounting shortcuts appear only in Accounting.
5. Daily Revenue filters work.
6. Service Revenue Report filters work.
7. Receipts Inquiry filters work.
8. Patients Inquiry filters work.
9. Patient Account filters work.
10. Print preview works.
11. Light mode and web colors are consistent.
12. No broken routes.
13. No frontend console errors.
14. No backend API errors.

Output:
- Bug list.
- Root cause for each bug.
- Exact fix.
- Files changed.
- Final acceptance checklist.
```
