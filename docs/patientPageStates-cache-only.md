# patientPageStates Contract (Phase 2.7)

`patientPageStates` is **UI/session cache only**.

## Allowed usage
- Save and restore ephemeral UI workflow state, such as:
  - selected sheet/tab
  - draft visit date
  - temporary doctor display text
  - follow-up toggle state
- Temporary fallback reads during checklist migration window.

## Not allowed usage
- Do not use `patientPageStates` as canonical source of:
  - medical checklist
  - demographics
  - doctor/service canonical assignment
  - any clinical reportable data
- Do not treat JSON blobs as source of truth in render paths where normalized tables exist.

## Source-of-truth rule
- Clinical checklist source: `examination_checklist_items`.
- Patient demographics source: `patients`.
- `patientPageStates` must remain non-authoritative cache.

## Migration status
- Backfill script: `scripts/backfill-examination-checklist.ts`
- Keep temporary fallback reads until backfill is executed and verified.
- Do not delete `patientPageStates` rows yet.
