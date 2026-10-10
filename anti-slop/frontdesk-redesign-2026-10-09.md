# Dashboard, bookings, and main home redesign

Reading this as: an Arabic RTL medical-center workspace, retaining SELRS blue/orange,
Cairo/shared fonts, and ENERGY 1 / RHYTHM 1 / MOTION 1 from DESIGN.md.

## Scope and reasons

- Visible page headings establish context; the mobile shell previously hid booking headings.
- White canvas and neutral grouped surfaces separate navigation from operational content.
- Framed home sections distinguish destinations without introducing imagery or decoration.
- Wrapped dashboard tabs keep all permission-filtered destinations available at phone widths.
- RTL arrow keys, Home, and End support the existing dashboard tab interaction.
- Visible focus outlines and readable wrapping preserve keyboard access and useful labels.
- Existing blue selection, orange featured destinations, icons, and typography retain their purpose.
- Scoped CSS avoids changing other modules or the global shell's unrelated pages.

Bookings means the dashboard booking tab and its AdminPortalBookings component.
Kafr El Sheikh booking pages were not redesigned. Existing Arabic copy, routes,
permissions, queries, queue actions, and booking mutation handlers were preserved.
Unrelated worktree changes were not reverted.

## Delivery gate

- Hard gate PASS for the changed surfaces: 72 production-preview cases assert no
  horizontal page overflow or page errors, visible headings, representative text
  contrast of at least 4.5:1, keyboard tab navigation, and no API mutations.
- Purpose gate PASS: each major treatment has an operational reason above; no
  decorative assets, fabricated content, new libraries, or animation were added.
- Liveliness PASS: explicit 1/1/1 dials, context headings, selected navigation,
  existing route icons, and framed groups match the established direction.
- Quality locks PASS for this patch: localized styling, both themes, preserved
  workflows, TypeScript, unit tests, and isolated production build.

## Verification and limits

- pnpm check: passed.
- pnpm test: 50 files / 343 tests passed.
- pnpm exec vite build --outDir ../outputs/frontdesk-redesign-build: passed.
- scripts/verify-frontdesk-redesign.mjs: 72 cases passed at 320/768/1440px in
  light and dark themes, including admin/staff home, all seven dashboard tabs,
  and populated/empty/error booking states, search, and retry.
- Final run includes representative heading/home-description contrast checks;
  this is not a full application accessibility audit.
- Fixtures use synthetic intercepted API responses. Two initially incorrect
  array fixtures were corrected; no application API contracts were changed.
- Screenshots: outputs/frontdesk-redesign.
- graphify update . was started after source changes; completion is not claimed here.
- No live booking or other record was changed. No deployment was performed.
