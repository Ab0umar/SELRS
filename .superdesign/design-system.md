# SELRS Medical Reports Design

## Direction

Shared identity and acceptance criteria live in `../design.md`.
The existing report identity uses navy reference colors such as `#003D82`
and `#003D9B`, Cairo Arabic typography, and shared UI primitives.
Use runtime theme tokens for screen surfaces and paired text colors.

Reading this as: an Arabic RTL ophthalmology report workspace for clinical staff,
using the existing navy/Cairo document identity, ENERGY 1 / RHYTHM 1 / MOTION 1.

## Decisions and Reasons

- Patient context leads the screen so the document identifies the correct record.
- Existing document-type tabs organize actual report templates.
- Labelled OD/OS grids support eye comparison without relying on color.
- Neutral surfaces and selective accent preserve attention for clinical content.
- Cairo Arabic and shared English typography support mixed-language findings.
- Unframed sections and compact field groups keep the document prominent.
- Relevant existing icons identify supported print, download, and editing actions.
- Brief hover/focus feedback confirms interaction without decorative looping motion.

Preserve existing authenticated routing, patient-id URL synchronization, and
print-only chrome when editing the report experience. Do not infer new routes
or templates from a design document.

## Screen Acceptance

Both screen themes retain contrast, hierarchy, and visible focus.
Mobile groups reflow; long Arabic content wraps; numeric and eye measurements
use isolated LTR direction. Toolbar controls have stable dimensions, accessible
names, tooltips where useful, and at least 44px touch targets.

Distinguish loading, missing patient context, empty results, permission restriction,
and save failure. Each state identifies the context and available next action.
Use actual records and approved report content. Missing measurements remain empty.
No invented findings, signatures, patient imagery, or final logos.

## Print Acceptance

Use readable light A4 portrait output with no application navigation.
Check patient context, table headers, long reports, page breaks, and signature areas.
Display actual scans at usable dimensions without decorative blur or cropping
that hides information needed for inspection.

## Delivery Evidence

Record the core Delivery Gate and antislop-ui checklist for changed UI:
control actions, console results, keyboard/focus, measured contrast, both themes,
mobile/desktop, data states, and A4 preview. Written direction here is not proof
that the existing application passed these checks.
