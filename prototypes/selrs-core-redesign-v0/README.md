# SELRS interface redesign · V0

A local, standalone review prototype for three screens: signed-in Home (`/home`), the daily Dashboard, and Admin Hub. Open `index.html` in a browser; use the top switcher to move between screens and the Admin Hub filters/search to explore the information grouping.

- No production routes, React components, APIs, database, or permissions are changed.
- All names, identifiers, counts, and statuses are illustrative, not patient or operational data.
- The prototype bundles a small copy of the existing SELRS icon at `assets/selrs-mark.png` so the preview opens without external requests.
- This is a first visual pass for direction review, not a production implementation. Main assumption: “Home” means the signed-in `/home` landing page (`MainHome.tsx`), not the login screen (`/`).

## V0 design intent

Arabic-first RTL, light clinical operations UI, familiar navigation, restrained blue/orange brand cues, compact but readable daily data, fewer repetitive cards, and grouped Admin Hub tools with direct search. Focus is on composition and hierarchy; detailed states, route wiring, real data, and production behavior are intentionally out of scope until the direction is reviewed.
