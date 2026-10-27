# Independent AI workspace

The AI module opens at `/ai` from the home page, top navigation, sidebar and admin command search. It uses its own layout rather than the administration hub. Existing providers and server operations are reused.

| Page | Purpose |
| --- | --- |
| `/ai` | Provider configuration status and tool directory |
| `/ai/replies` | Conversations, Teach AI, channel settings, reply tests and delivery activity |
| `/ai/medical` | Dictation and clinician proposal review |
| `/ai/marketing` | Text/image generation and generation jobs |
| `/ai/marketing/{drafts,history,brand,settings,whatsapp}` | Drafts, published history, visual references, schedules and campaigns |
| `/ai/whatsapp` | Copy drafting |
| `/ai/settings` | Provider/model selection and workload limits |
| `/ai/experiments` | Explicitly confirmed synthetic connection requests |
| `/ai/usage` | Request outcomes, Gemini tokens and Manus credits |

Old administration and marketing links redirect into these pages, preserving query parameters and fragments. Existing permission IDs are retained and normalized by both the route guard and navigation filtering. Management permission alone does not grant access to clinical, reply or marketing pages. The permission editor groups the existing AI IDs under the AI section. No permission migration is required.

## Design read and verification

Product register, Arabic-first RTL, ENERGY 1 / RHYTHM 1 / MOTION 1 from `DESIGN.md`. Staff use this operational interface in the clinic, so it inherits the existing light/dark theme rather than introducing another palette. Navy/lavender selection identifies the current section. Existing fonts support mixed Arabic and model identifiers. Text navigation and labelled tool rows organize real destinations; no generated imagery or invented metrics were added. Existing action icons retain their task meanings. Navigation wraps into two columns at narrow widths and stays in document flow.

`scripts/verify-ai-workspace-ui.mjs` runs the real app in Edge/Chromium with intercepted APIs, including failures for existing reply/marketing services. It does not save real settings, send messages, publish posts or call a paid provider. Evidence is written to `outputs/ai-workspace-ui/`.

The local checks cover all primary navigation links, marketing subnavigation, legacy redirects, home entry, profile saving, experiment confirmation/Escape, a completed synthetic request, usage empty/populated states, disabled/error/recovery states, skip-to-content focus, 44px navigation targets, 200% text resizing and page overflow at 360/768/1440 in light/dark. Page errors are recorded. These checks do not recertify the business operations of every existing control in the moved marketing or reply screens, and browser viewport emulation is not native Android testing.

Shared foreground/background, primary/background and selected-navigation pairs are checked against the WCAG contrast formula. The core and UI antislop gates apply to the new workspace; existing operational screens are reused rather than redesigned. Local verification is separate from deployment.

### Observed local results, 2026-10-26

- `pnpm check`: passed.
- `pnpm test`: 92 files, 649 tests passed, including independent AI permission and redirect regressions.
- `pnpm build`: passed encoding, frontend and backend build.
- Workspace browser verification: all six theme/viewport combinations passed. All eight primary links and six marketing links reached their destinations; the active navigation changed with the route. Legacy medical links retained query/fragment and marketing draft links redirected. Home displayed the AI entry.
- Profile submit updated the intercepted profile once. Experiment confirmation opened, Escape cancelled without a request, and explicit confirmation produced one intercepted request. Medical documentation directed users to clinician review. Usage changed from its empty message to a populated row. Disabled status, status failure and refresh recovery were visible.
- Skip link focused content; navigation targets measured at least 44px; 200% text resize did not introduce page overflow. No page errors were recorded in these cases. Mobile and desktop screenshots are in the evidence folder.
- Contrast measurements: light foreground/background 14.71:1, light selection 9.40:1, light primary/background 10.90:1, light supporting text/muted surface 5.49:1; dark foreground/background 15.98:1, dark selection 8.31:1, dark primary/background 9.12:1, dark supporting text/muted surface 8.23:1. These measured text/focus colors pass the applicable AA thresholds. This is not a new audit of every reused marketing component.
- `git diff --check`: passed.
- `graphify update .`: completed. The tool reported a missing SQL parser, retained excluded nodes and automatically renamed community labels. Its output is an AST navigation aid, not application verification.

Delivery gate: new routes/actions, states, RTL/mobile containment, both themes and keyboard checks passed within the intercepted-API scope above. Palette, fonts, text rows and current-section emphasis follow the written design read. No decorative assets, animation or fabricated production data were added. Production provider calls, delivery/publishing actions and native Android operation were not exercised in this UI reorganization.
