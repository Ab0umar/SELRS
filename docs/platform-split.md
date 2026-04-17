# Platform Split

This project is the source of truth for shared SELRS application behavior.

## Shared by default

- `client/src/pages/*`
- `client/src/components/*`
- `client/src/hooks/*`
- `client/src/lib/*`
- `client/src/_core/*`
- `server/*`

Shared logic should be implemented here first, then mirrored to the web project when needed.

## APK-only files

- `client/src/components/MobileAppEnhancements.tsx`

These files hold native/mobile-specific behavior such as:

- push notification registration
- native notification bridging
- mobile theme toggle placement

## Expected remaining differences vs web

- `client/src/App.tsx`
  - platform shell wiring only
- `client/src/const.ts`
  - platform runtime origin handling may diverge slightly
- `client/src/index.css`
  - visual design is intentionally platform-specific

## Web-only counterparts

The web project intentionally keeps:

- `client/src/components/WebAppEnhancements.tsx`
- `client/src/components/GlobalCommandPalette.tsx`
- `client/src/lib/pdf.ts`

Those are not bugs; they are platform-specific UX differences.
