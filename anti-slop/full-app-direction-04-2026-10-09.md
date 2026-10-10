# Direction 04: Paper & signal

Deliverable: prototypes/full-app-direction-04.html. Standalone English concept.
This proposes a new direction without altering the existing application or the
previous three proposals. Sample records are explicitly synthetic.

Reading this as: a task-first medical-center workspace, open paper/ink structure,
ENERGY 2 / RHYTHM 2 / MOTION 1.

## Reasons and structural differences

- Task-based top navigation groups patient care, people, finance, and resources;
  a full module menu preserves access without a permanent sidebar.
- The home uses a numbered destination index, not an equal card grid.
- Patient flow uses actual workflow stages; bookings organize time and rooms.
- Register details expand inline so identity and surrounding records stay visible.
- Large system-sans headings identify the task; ordinary text and tabular figures
  make records readable without external fonts or a marketing display face.
- White/ink surfaces support long sessions; burnt orange identifies the primary
  action and pending review, always accompanied by textual labels.
- Rules separate work areas; close spacing groups source fields. Phone records
  reflow into labelled lines and the calendar becomes an appointment agenda.
- Motion is limited to hover/pressed feedback. Only the overlapping module menu
  uses a shadow. No decorative charts, illustrations, gradients, or animation.

## Delivery gate

- Hard gate PASS: 66 module/theme/viewport checks passed at 320/768/1440px,
  with no horizontal page overflow or page errors. Empty/loading/error/retry,
  search, inline records, native Escape-close dialogs, and local bookings work.
- Purpose gate PASS: every major treatment has a written reason above and in
  the embedded About dialog. No fabricated metrics or production claims.
- Liveliness PASS: explicit 2/2/1 dials, task headings, an open index/rule motif,
  one controlled accent, and distinct queue, schedule, register, and report layouts.
- Craftsmanship/quality PASS for this concept: both themes and mobile reflow
  checked; navigation and controls have local preview behaviors. No live mutations.

## Evidence and limits

- node prototypes/verify-full-app-direction-04.mjs: 66 cases passed.
- Contrast checker: muted text on white 6.19:1; white on primary 6.54:1;
  dark muted text 8.73:1; dark primary text 8.43:1; muted text on tinted areas
  5.21:1 light and 6.19:1 dark. Control boundaries 4.13:1 light and 6.87:1 dark
  exceed the 3:1 non-text threshold.
- Screenshots: outputs/full-app-direction-04. Desktop flow and phone home inspected.
- A hidden desktop/mobile duplicate caused an initial booking-test selector
  timeout. The selector was corrected to target the visible appointment.
- The phone home had an excessive percentage row gap; changed to 28px and rerun.
- Representative concepts cover 11 modules, not every existing clinical form.
- No deployment, persistence, network connection, or production source changes.
- Graph refresh was started; completion is not claimed.
