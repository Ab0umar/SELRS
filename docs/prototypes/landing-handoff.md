# Public landing page: handoff

State as of 2026-11-10. Nothing is committed or deployed yet.

## What it is

A public bilingual (Arabic, RTL) landing page for مركز عيون الشروق, shown at `/` to signed-out visitors.
Signed-in staff and the app shells (Capacitor, `SELRSDesktop/1`, `SELRS/1` user agents) still redirect to `/home`.

## Files

| File | Role |
| --- | --- |
| `client/src/features/public-site/LandingPage.tsx` | Static JSX markup of the whole page. |
| `client/src/features/public-site/landingBehavior.ts` | `setupLanding(root, navigate)`: tabs, sub-tabs, procedure selector, deep links (`#id`), theme toggle. Returns a cleanup. |
| `client/src/features/public-site/landing.css` | All styles, scoped under `.selrs-landing`. Ends with overrides for Tailwind preflight and the app's global mobile `table` rules. |
| `client/src/routes/guards.tsx` | `RootRouteGate`: landing for visitors, redirect for staff/app shells. |
| `client/src/routes/misc-routes.tsx` | `ROUTES.root` now uses `RootRouteGate` (this file also holds unrelated uncommitted ReceptionInbox work). |
| `client/public/marketing/site/*` | Page images (doctors, devices, eye photo, logo). |
| `docs/prototypes/selrs-landing-a.src.html` | Single-file prototype source, kept in sync with the app by hand. |
| `docs/prototypes/selrs-landing-a.html` | Built prototype with images embedded (open by double-click). |
| `docs/prototypes/build_landing.py` | Builds the prototype: `python docs/prototypes/build_landing.py embed`. |

Unused old drafts, not imported anywhere: `client/src/features/public-site/PublicSiteShell.tsx`, `siteContent.ts`.

## Page structure

- Top strip with separate sign-in links: patients `/my/login`, doctors, staff `/login`. Never use the word «بوابة/بوابات».
- Header: logo `shorouk-eyes-logo.webp` (the sun logo is the current logo, not the SELRS badge).
- Hero «رؤية أوضح.. لحياة أفضل»: full-width banner. Eye photo on the left fading to the right, laser (`excimer-laser-cutout.webp`) and Pentacam (`pentacam.webp`, from oculus.de with the user's approval) in front. Text and buttons on the right. Services strip below it.
- Main tabs: الخدمات، جهاز الليزر، الأطباء، الفروع والمواعيد، نصائح.
- Services tab holds sub-tabs: كل الخدمات (titles and hints only), الليزك وتصحيح الإبصار، المياه البيضاء، زراعة العدسات، تثبيت القرنية، البنتاكام Pentacam، المياه الزرقاء، الحول والأطفال، الكشف والفحوصات.
- Every «احجز» link goes to `/my/login`.

## Content rules from the user

- No prices.
- Femto is treated like the other procedures; never write that it is done in another center.
- Don't copy the user's reference images; take ideas only. Real doctor and device photos are fine.
- Keep existing Arabic wording; match the screen's language.
- The user rejected: hand-drawn SVG lens/eye art in the hero, the SELRS badge banner, boxed cards in the hero.

## Contacts on the page

- Exams branch: 3 ش بطرس، أعلى توكيل LG، الدور الأول. Tel 0403320833, mobiles 01272303303 and 01027357352.
- Operations branch: علي بك الكبير من الحلو، مستشفى الشروق، الدور الثاني. Tel 04033288778 (11 digits as given; not yet confirmed).
- WhatsApp 01285800309.

## Preview without the backend

Port 4000 on this machine runs the production server. Don't run `pnpm dev` (it starts background workers against real databases) or `pnpm build` (writes `dist/`).
Use a client-only Vite server instead:

```bash
npx vite --host 127.0.0.1 --port 5180 --strictPort
```

Then open `http://127.0.0.1:5180/`. Login-dependent behavior can't be tested this way.

The same command is the `client-only` entry in `.claude/launch.json`.

## Checks

- `pnpm check` (tsc) and `pnpm check:encoding` pass.
- Visual checks were done with Playwright (msedge) at 1440, 1280, 1000 and 375 px, light and dark.

## Open items

1. Deploy: needs the user's explicit approval (build plus server restart).
2. Photos still missing: د. كريم عبدالرحيم، د. سما مصطفى، د. هبه طه.
3. Confirm the operations phone 04033288778.
4. Delete `PublicSiteShell.tsx` and `siteContent.ts`? Not answered yet.
5. Medical review of the self-written procedure explanations.
6. Dr. Ahmed Eissa's schedule.
7. «زراعة العدسات ICL وIOL» is still on one line in the services overview card and the lenses section title (the hero strip now shows ICL , IOL on a second line).
