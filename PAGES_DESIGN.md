# SELRS Screen Design Reference

## Direction

Shared identity and acceptance criteria live in `design.md`.
Reading this as: task screens for Arabic-speaking clinical and operational staff,
in SELRS's existing blue/orange RTL identity, ENERGY 1 / RHYTHM 1 / MOTION 1.

This reference describes screen patterns, not a route inventory or an authorization
to add features. Existing routes, permissions, data sources, and supported actions
come from the current implementation.

## Screen Tasks

| Screen family | Main task and focal point | Composition and reason |
| --- | --- | --- |
| Authentication | Enter credentials and resolve validation | Focused labelled form without unrelated navigation. |
| Patient search and reception | Identify the patient and current visit | Search/filter row followed by comparison fields and actual registration actions. |
| Queue and workflow | Find the patient requiring the next action | Ordered records with explicit service, doctor, and state. |
| Patient file and examination | Review context and record clinical findings | Persistent patient identity with grouped history and labelled clinical fields. |
| Prescriptions and reports | Prepare the correct patient document | Patient selection, document-specific form, and real preview/print actions. |
| Clinical measurements and scans | Compare labelled OD/OS results | Paired-eye data and actual scan assets at inspectable dimensions. |
| Attendance | Review punches, exceptions, or employee status | Date/scope filters and relevant records; device and sync states are explicit. |
| Payroll | Review the selected period and employee amounts | Scoped payroll table, totals, and supported save/finalization actions. |
| Accounting | Compare transactions and reconcile balances | Date/account filters, wrapped statements, aligned amounts, and sourced totals. |
| Inventory | Inspect stock and supported movement records | Item identifiers, units, quantities, and movement context. |
| Administration | Review or change authorized configuration | Labelled settings or record tables with clear save feedback. |
| Patient and doctor portals | Complete the available self-service task | Permission-scoped records and direct actions without staff-only controls. |
| Marketing | Review actual drafts, recipients, and send state | Sourced campaign records and explicit supported actions. |

## Shared Patterns

- Identify the active patient, employee, account, or configuration before actions.
- Keep filters near the records they affect; display selected scope and period.
- Put deciding fields early in tables. Include only supported row actions.
- Use inline forms, full-page editing, or dialogs according to task complexity.
- Status labels describe real state and remain understandable without color.
- Metrics and charts exist only when they answer a question needed for the task.
- Actual images remain inspectable; skeletons indicate loading, not final product imagery.

## Responsive and RTL Behavior

Arabic labels lead; logical start/end placement follows RTL. Codes, dates,
amounts, and measurements are isolated as LTR. Long statements wrap.
Mobile filters and actions reflow without collisions. Touch targets remain 44px.
Keep wide-table scrolling inside its region and account for fixed mobile navigation.

## States and Acceptance

Distinguish loading, first use, filtered-empty results, permission restriction,
and request failure. Each state names its context and available next action.
Verify keyboard/focus, validation, real control behavior, console output, measured
contrast, both themes, and desktop/mobile layouts for changed screens.
Printed documents omit application chrome and preserve patient/account context.

The main record provides the focal point; shared Arabic typography provides the
motif; selective accent identifies a key action. These reasons implement R-20 and
R-31 without a default dashboard shell. Apply the full Delivery Gate in `design.md`.
No screen behavior is certified by this reference alone.
