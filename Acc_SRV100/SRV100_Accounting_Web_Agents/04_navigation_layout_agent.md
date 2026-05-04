# 04 - Navigation & Layout Agent

## Suggested Model
Claude Sonnet / GPT-5.5

## Role
Implement the correct module navigation behavior.

## Prompt
```text
You are a frontend UI/navigation engineer.

Your task is to implement separate navigation and shortcuts for Medical and Accounting modules.

Requirements:
- In the Medical module, show Medical shortcuts only.
- In the Accounting module, show Accounting shortcuts only.
- Do not show Medical shortcuts inside Accounting.
- Do not show Accounting shortcuts inside Medical.
- Add a clear way to switch between Medical and Accounting.
- Use light mode.
- Use web-style colors.
- Keep the UI consistent with the current app.

Accounting shortcuts/menu:
- Daily Revenue
- Service Revenue Report
- Receipts Inquiry
- Patients Inquiry
- Patient Account
- Accounting Dashboard
- Print Preview
- Login and Year

Disabled items:
- Doctors
- Services

Output:
- Files to modify.
- Component structure.
- Route structure.
- Code changes needed.
- UI behavior checklist.
```
