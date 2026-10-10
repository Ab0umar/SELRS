# SELRS Design System

## Purpose and Scope

SELRS is an Arabic-first medical-center workspace for clinical staff, reception,
accounting, attendance, payroll, and administration. Its design supports identifying
the right record, reviewing relevant details, and completing the next available action.
This document specifies direction and acceptance criteria. It does not certify
that every existing screen meets them.

Reading this as: an Arabic RTL clinical and operational workspace for medical-center
staff, using the existing blue/orange identity, ENERGY 1 / RHYTHM 1 / MOTION 1.

## Identity

| Decision | Direction | Reason |
| --- | --- | --- |
| Energy | 1, calm | Patient and operational records need sustained attention. |
| Rhythm | 1, predictable | Repeated work benefits from familiar filter, form, and table placement. |
| Motion | 1, interaction feedback | State changes need confirmation without continuous distraction. |
| Focal point | Active record, task, or exception | Staff need to know what requires action. |
| Motif | Arabic context headers and labelled data groups | Patient, employee, and account identity remain recognizable across modules. |
| Accent | Selective orange within the blue/neutral identity | Emphasis remains useful when concentrated on a key action. |

## Implementation References

- Shared screen tokens and fonts: `client/src/styles/design-system.css`.
- Platform layouts: `client/src/styles/web.css` and `client/src/styles/mobile.css`.
- `client/src/main.tsx` loads the shared contract after the platform stylesheet.
- Theme state: `client/src/contexts/ThemeContext.tsx`.
- Provider configuration: `client/src/App.tsx`.
- Shared operational theme configuration: `client/src/config/moduleThemes.ts`.
- Navigation: `client/src/components/layout/AppNav.tsx` and the current app router.

Source values determine the rendered theme. This document does not replace them
with a second hard-coded palette or certify route availability.

## Color and Themes

Use shared primary, secondary, surface, foreground, border, and semantic tokens.
The light identity is blue primary, orange secondary, and neutral surfaces.
Semantic success, warning, and destructive colors communicate actual state;
they are not a rotating category palette. Labels also communicate the state.

Limit brand colors to 2-3 core colors and one accent. Neutral colors do not count.
Use paired foreground/background tokens. Never assume white text on orange
passes contrast. Measure each combination and each shipped theme.

Light is the configured default; the app enables light/dark switching and persists
the preference. Both themes must work. Clinical print output remains light.
Avoid decorative colored backgrounds and gradients. Any permitted treatment
needs a documented hierarchy or identity purpose.

## Typography

| Role | Direction | Reason |
| --- | --- | --- |
| Arabic | Cairo with Segoe UI/system fallback | Matches the existing Arabic-first interface. |
| English | Inter with Segoe UI/system fallback | Matches existing mixed-language labels and data. |
| Codes | IBM Plex Mono with monospace fallback | Separates identifiers and code from prose. |
| Page title | 24-32px, 700 weight | Identifies the current task without a marketing hero. |
| Section title | 16-20px, 600-700 weight | Groups operational content compactly. |
| Body and fields | 14-16px with readable line height | Supports sustained reading and editing. |
| Supporting labels | 13-14px | Keeps secondary information legible. |

Use fixed sizes with explicit breakpoint changes. Letter spacing is zero.
Long Arabic text wraps. Do not reduce text until essential labels become unreadable.
Reserve monospace for data that benefits from it, not decorative headings.

## Layout and Components

- Build each screen around its task. Charts and metrics answer a specific question
  and use actual data with the period and scope identified.
- The approved visual direction restores the pre-October-2 framing, rounded
  controls, and subtle shadows. Do not flatten existing panels or impose an
  8px radius cap. Preserve the blue/orange brand and unified white canvas.
- Use the 4/8/12/16/24/32/48px spacing scale. Small gaps connect related fields;
  larger gaps separate tasks. A predictable layout can still vary spacing.
- Tables put decision-relevant fields early. Align text to logical start and
  isolate amounts, dates, codes, and eye measurements as LTR.
- Wrap filters and actions on narrow screens. Wide tables may scroll inside a
  labelled region; the page itself must not overflow.
- Use stable toolbar tracks and control dimensions so labels and data do not
  shift neighboring controls or overlap.
- Use shared button variants and form controls. Icon buttons identify familiar
  tools and have accessible names and tooltips.
- Use switches for binary settings, segmented controls for modes, inputs or
  steppers for numbers, menus for choices, and tabs for views.
- Use relevant existing Lucide icons for action recognition. The glyph's meaning
  determines its use; do not add generic feature icons merely to fill space.

## Content and Behavior

Action labels identify the actual operation. Avoid promotional claims, decorative
emoji, redundant headline badges, and em dashes in newly written copy.
Use actual records, events, metrics, and clinical content. Unknown values remain
empty or are explicitly labelled placeholders. No invented patients, signatures,
testimonials, customer claims, or performance figures.

Use existing approved assets. New final logos, people imagery, and navigation
require explicit direction or confirmation. Routes and actions must exist and
respect permissions. A permission-restricted view is distinct from an empty result.

Loading names the data being fetched. Empty states distinguish first use from
filtered results. Errors identify the failure and an available next action.
Save actions report success or failure and retain usable input on failure.

## Decoration and Motion

Solid surfaces are the default. Shadows communicate actual elevation, not a
floating page. Glass and glow are limited to 1-2 meaningful accents when justified.
Status dots and edge markers communicate real state or selection.
No decorative pulsing, bouncing, floating, or scroll choreography.
Brief color/opacity feedback follows user interaction and respects reduced motion.

## Accessibility and Print

Normal text meets 4.5:1 contrast; large text meets 3:1. Non-text controls and focus
indicators remain distinguishable. Touch targets are at least 44px.
Keyboard order follows the task. Controls have labels and visible focus.
Dialogs support Escape and restore focus. Drag interactions have keyboard alternatives.

Arabic is primary and RTL uses logical positioning. English and numeric fragments
use direction isolation. Clinical documents retain explicit OD/OS labels.
Print hides navigation and editing controls, uses readable light surfaces, and
avoids clipped fields or split patient context.

## Related Documents

- `PAGES_DESIGN.md`: task-based screen patterns.
- `REDESIGN_GUIDE.md`: applying the direction to existing screens.
- `REDESIGN_SUMMARY.md`: document index and verification status.
- `SHEETS_REDESIGN_SUMMARY.md`: clinical-sheet and A4 requirements.
- `.superdesign/design-system.md`: report-workspace specialization.

## Delivery Gate

For changed UI, record the core antislop Delivery Gate and UI checklist with
actual evidence. Every relevant item receives PASS only after verification.
Unverified behavior is not a PASS.

1. Hard Gate: real content/routes/actions, state coverage, measured contrast,
   mobile containment, keyboard/focus, and both themes.
2. Purpose-Gate: written reasons for color, typography, icons, cards, elevation,
   badges, backgrounds, illustrations, and motion; enforce dose caps.
3. Liveliness: declared dials, task focal point, structural whitespace, selective
   accent, identity motif, and a Design Read before generation.
4. Craftsmanship: run or build, inspect console output, record each control's
   observed action, and check desktop/mobile, themes, states, and print when relevant.

Documentation inspection verifies these written requirements only. It is not
runtime, accessibility, performance, or production verification.
