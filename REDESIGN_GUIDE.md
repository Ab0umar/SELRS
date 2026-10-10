# SELRS Design Implementation Guide

## Direction and Scope

This replaces the historical salary/attendance redesign proposal.
Shared design direction lives in `design.md`.
Reading this as: refinement of existing clinical and operational screens for medical
center staff, in SELRS's existing Arabic RTL identity, ENERGY 1 / RHYTHM 1 / MOTION 1.

## Applying the Direction

1. Identify the screen's main task, current renderer, data sources, permissions,
   and existing controls before changing its layout.
2. Select the record, action, or exception that should lead the hierarchy.
3. Reuse shared tokens, fonts, components, and route-specific shell conventions.
4. Arrange filters, forms, and tables around actual comparison or editing needs.
5. Implement empty/loading/error and permission states with specific feedback.
6. Verify the changed controls, themes, breakpoints, and applicable print output.

Use focused edits in the owning source files. Preserve worktree changes.
A design guide does not authorize database, business-policy, deployment, or
permission changes. Do not replace active source files wholesale from old prototypes.

## Module-Specific Decisions

| Module | Direction | Reason |
| --- | --- | --- |
| Attendance | Lead with employee/punch records and actionable exceptions | Staff need to review actual attendance and synchronization state. |
| Payroll | Keep period, employee rows, and calculated amounts prominent | Users compare amounts before available finalization actions. |
| Accounting | Wrap statements and align amounts consistently | Transactions must be read and compared without hidden text. |
| Clinical | Keep patient context and explicit OD/OS groups visible | Findings must remain associated with the correct patient and eye. |

Metrics are sourced, scoped, and relevant. Do not impose a fixed four-card header.
Navigation uses existing routes and permissions. Section headings use normal casing
and zero letter spacing. Icons identify actual actions; motion confirms interaction.
Page sections remain unframed, and cards frame individual items or genuine tools.

## Verification Record

For each changed screen, record the build/run command and result, viewport sizes,
theme, tested data state, control, observed action, console results, and remaining
limitations. Claims of accessibility, compatibility, performance, or preserved
behavior require corresponding evidence.

Check at least:
- Long Arabic labels and statements, mixed LTR values, and mobile containment.
- 44px targets, keyboard order, visible focus, and dialog Escape/focus restoration.
- Empty/loading/error, filtered-empty, permission, validation, and save feedback.
- Actual route navigation, filters, row actions, menus, tabs, and theme switching.
- Measured contrast in both themes and A4 preview for affected printable documents.

Run the full core Delivery Gate and antislop-ui checklist. Written reasons cover
color, layout, typography, spacing, cards, icons, assets, and motion.
This guide defines the process; it does not record a runtime PASS.
