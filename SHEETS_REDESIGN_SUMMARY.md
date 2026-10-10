# SELRS Clinical Sheet Design

## Direction

Shared UI direction lives in `design.md`.
Reading this as: ophthalmology entry and printable clinical records for Arabic-speaking
staff, using the existing blue/neutral document identity, ENERGY 1 / RHYTHM 1 / MOTION 1.

The patient context and labelled OD/OS measurements lead the document. Existing
approved clinical templates determine field content and ordering.
This document defines acceptance requirements and records the bounded checks below.

## Decisions and Reasons

| Decision | Direction | Reason |
| --- | --- | --- |
| Context | Patient identity and visit/date before findings | Measurements remain associated with the correct record. |
| Eye groups | Explicit OD/OS labels with consistent paired fields | Comparison does not depend on color or inferred position. |
| Palette | Existing blue emphasis and neutral rules | Clinical content remains prominent and readable in print. |
| Typography | Cairo Arabic, shared English font, isolated LTR abbreviations | Mixed-language findings stay legible and correctly ordered. |
| Spacing | Compact related fields and clear section separation | Clinical review can scan without excessive blank space. |
| Motion | Brief screen interaction feedback only | Entry feedback does not distract from clinical findings. |

## Screen Layout

Use labelled groups for patient context, findings, measurements, plan, and existing
signature roles. Preserve clinically meaningful units and eye labels.
No new clinical content is implied by the visual design.

Forms use the user's screen theme, visible focus, accessible labels, validation,
and save feedback. Keyboard use and 44px screen targets remain available.
Mobile groups reflow without clipping; long Arabic names wrap.
Data states identify missing patient context, measurements being loaded,
empty results, permission restrictions, or save failure.

## Print Layout

A4 portrait is 210mm by 297mm. Account for printer margins and usable content width.
Print uses readable light surfaces and hides navigation and editing controls.
Avoid splitting patient identity from the related clinical content.
Long histories may span pages; repeat headers where needed and inspect page breaks.
Signature areas use only existing approved roles and actual available content.

Use actual clinical records and approved logos, scans, and references. Missing
measurements remain empty. No invented diagnoses, signatures, scan imagery, or patients.

## Verification

Record screen interaction, keyboard/focus, measured contrast, both themes,
mobile/desktop, and empty/loading/error results. Inspect A4 preview with long Arabic
names, populated OD/OS fields, missing data, and multi-page history.
Verify that labels, fields, table headers, and signature areas are not clipped.

Apply the full Delivery Gate in `design.md`. A print requirement is not evidence
of a successful print run; the checks below do not certify the entire Delivery Gate.

## Verified Implementation - 2026-10-02

- Clinical sheet toolbars wrap on phones, with 44px actions and locally scrolling
  measurement tables. Screen styling is separate from the A4 print layout.
- Report patient names wrap. Leave-certificate statement and operation method use
  complete static text in print instead of clipped textarea content.
- Follow-up table print text is 12px before existing designer transforms. Saved
  placement and scale settings are unchanged.
- Native HTML serialization preserves current input, textarea, checkbox, and
  selected-option values. It uses the same sheet geometry as browser printing.

`scripts/verify-clinical-design.mjs` passed 18 isolated screen/PDF cases across
light/dark themes and phone/desktop widths, including LASIK at 768px. LASIK and
consultant output had two A4 pages; external sheets and leave certificates had one.
Two additional native HTML snapshots retained live field values and two-page
pagination. Follow-up groups fit their containers within a one-pixel tolerance.
Evidence is in `outputs/clinical-design-verification/`.

These checks intercept APIs with explicit test fixtures and make no clinical
writes. Physical Android printing, hardware printer margins, production saving,
all saved designer configurations, and the full accessibility gate remain
unverified. No production deployment is implied.
