# Three full-app HTML proposals

Deliverable: prototypes/full-app-directions.html. Open directly in a browser.
This is an English, standalone, throwaway concept study, not a production rebuild.
No existing application source, routes, permissions, or live records were changed.

## Design reads and reasons

- A: Clinical workbench for medical-center teams, blue/ink framed registers,
  ENERGY 1 / RHYTHM 1 / MOTION 1. Persistent navigation and a context panel
  support switching between patient and operational records.
- B: Patient-first daybook for reception and clinical teams, warm paper/forest,
  ENERGY 2 / RHYTHM 2 / MOTION 1. Top navigation, editorial headings, planning
  margins, and larger appointment rows prioritize patient identity and time.
- C: Operations console for reception, finance, and center operations, slate/petrol,
  ENERGY 1 / RHYTHM 2 / MOTION 1. A compact labelled rail, exception strip,
  denser registers, and contextual details prioritize review and comparison.

Every direction includes Home, Dashboard, Patients, Bookings, Operations,
Attendance, Salary, Accounting, Stockroom, Reports, and Settings.
Typography, color, layout, spacing, motif, component, and motion reasons are
also embedded in each direction's expandable design notes. No external fonts,
images, dependencies, decorative charts, or network connections are required.
The SELRS text and plus glyph are a concept treatment, not a new approved logo.
Sample identities, records, and amounts are explicitly labelled synthetic.

## Delivery gate

- Hard gate PASS for the standalone preview: 198 module/theme/viewport cases
  passed at 320/768/1440px. No page errors or horizontal page overflow.
  Populated, empty, loading, error/retry, and filtered-empty states were exercised.
  Palette foreground/background pairs passed measured 4.5:1 text contrast.
  Native forms, visible focus, keyboard cycling, and Escape-close dialogs work.
- Purpose gate PASS: written reasons are embedded per direction. Icons identify
  module concepts; statuses label record states; only the floating comparison
  switcher uses a shadow. No decorative gradients, glow, or imagery.
- Liveliness PASS: explicit dials and different shell/content structures, not
  color-only swaps; operational headings remain the focal point of each screen.
- Craftsmanship/quality PASS for a concept preview: modules and comparison
  controls navigate, search filters records, synthetic bookings can be added in
  memory, forms validate, theme/branch controls work, and no backend is called.

## Verification and boundaries

- node prototypes/verify-full-app-directions.mjs: 198 cases passed.
- node prototypes/verify-full-app-actions.mjs: form feedback, preview preferences,
  report preview, payroll-to-attendance navigation, review feedback, reverse
  cycling, and unmatched-module search feedback passed.
- Screenshots: outputs/full-app-directions. Desktop A/B and mobile dark C were
  visually inspected in addition to browser layout checks.
- These are representative module concepts, not every clinical form or existing
  production route. Mock data is not medical or financial guidance.
- Native keyboard behavior was checked; real device keyboard occlusion and a
  comprehensive assistive-technology audit are not claimed.
- Graph refresh was started with graphify update .; completion is not claimed.
- No deployment, production redesign, database writes, or persistent storage.
