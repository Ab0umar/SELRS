# Task 19 — Deployment Preparation (Phase 1 Accounting)

**Document version:** 1.0.0 — aligned with Constitution v1.0.0, Project Principles v1.0.0, Spec v1.0.0, Plan v1.0.0, Tasks v1.0.0.  
**Workspace verified:** `D:\C\SRV100` — **2026-05-04**

---

## PASS / FAIL summary

| Step | Command | Result |
|------|---------|--------|
| Typecheck | `pnpm check` | **PASS** (exit 0) |
| Tests | `pnpm test` | **PASS** (exit 0) |
| Production build | `pnpm build` | **PASS** (exit 0) |
| Production serve | `pnpm start` | **PASS** when an available `PORT` is used (see below) |

---

## Commands run (verbatim excerpts)

### `pnpm check`

```
> SELRS@1.0.113 check D:\C\SRV100
> tsc --noEmit
```

Exit code: **0**

### `pnpm test`

```
> SELRS@1.0.113 test D:\C\SRV100
> vitest run

 RUN  v4.1.2 D:/C/SRV100/client

 Test Files  2 passed (2)
      Tests  44 passed (44)
```

Exit code: **0**

### `pnpm build`

```
> SELRS@1.0.113 build D:\C\SRV100
> pnpm check:encoding && vite build && esbuild server/_core/index.ts --platform=node --packages=external --bundle --format=esm --outdir=dist

> node scripts/check-mojibake.mjs
Encoding check passed.
vite v8.0.3 building client environment for production...
✓ 4208 modules transformed.
✓ built in 3.68s

  dist\index.js  644.9kb

⚡ Done in 42ms
```

Exit code: **0**

### `pnpm start`

`package.json` maps `start` to `cross-env NODE_ENV=production node dist/index.js`.

**Observation on this machine:** With `PORT=4000`, Node exited with `EADDRINUSE` (another process already bound `0.0.0.0:4000`). This is **environment-specific**, not an application defect.

**Successful run** (explicit free port):

```powershell
$env:PORT='4020'; pnpm start
```

```
> SELRS@1.0.113 start D:\C\SRV100
> cross-env NODE_ENV=production node dist/index.js

[blackice-import] Disabled
[blackice-ocr] Disabled
[clinic] Server running on http://0.0.0.0:4020/
```

Exit code: **0** (process ran until stopped manually).

**Equivalence check:** `NODE_ENV=production` + `node dist/index.js` on `PORT=4010` also logged `[clinic] Server running on http://0.0.0.0:4010/` and returned **HTTP 200** for all verification paths below.

---

## Verification URLs (HTTP GET, production static + Express)

Base URL during verification: **`http://127.0.0.1:4010`** (first successful listener after build). Replace host/port with your deployment (`HOST` / `PORT` from `.env`; defaults `0.0.0.0` / `4000`).

| Path | Expected |
|------|----------|
| `http://127.0.0.1:<PORT>/dashboard` | **200** — SPA shell (`index.html`, ~4185 bytes in this build) |
| `http://127.0.0.1:<PORT>/patients` | **200** |
| `http://127.0.0.1:<PORT>/accounting` | **200** |
| `http://127.0.0.1:<PORT>/accounting/daily-revenue` | **200** |
| `http://127.0.0.1:<PORT>/accounting/service-revenue` | **200** |
| `http://127.0.0.1:<PORT>/accounting/receipts` | **200** |

**Recorded probe (4010):** all six paths returned **200** with identical document length **4185** (client routing is client-side; success means the built app is served).

**Post-login behavior** is not exercised by naked GETs; use the manual smoke checklist in the browser.

---

## Environment expectations — **no new env vars**

- **Accounting Phase 1** reuses existing **`MSSQL_*`** settings already documented in `.env.example` (pool for read-only accounting queries). No additional keys were introduced for this release slice.
- Standard runtime: `NODE_ENV`, `PORT`, `HOST`, `DATABASE_URL`, `JWT_SECRET`, plus optional integrations unchanged from template.
- **No edits** were made to `.env.example` as part of Task 19.

---

## PM2 (`ecosystem.config.js`)

- **No changes** were required or applied to `ecosystem.config.js` for Accounting Phase 1.
- The committed file describes **machine-specific** paths (e.g. `cwd` under `E:\…`) and other processes (`API`, `CF-TUNNEL`). Deploying **this repo** under PM2 remains: set `cwd` to the deployed checkout, run `pnpm start` (or `node dist/index.js` after `pnpm build`), and align `PORT` with your reverse proxy.
- If `PORT` **4000** is already taken on the host, either free it or set `PORT` in the PM2 `env` block (existing pattern for `SELRS.cc` shows `PORT: "4000"` — adjust only on the server if needed; no repo commit required).

---

## Rollback plan

1. Stop the Node/PM2 process serving this app.
2. **Revert the feature branch** (or redeploy the previous tagged release):  
   `git checkout <previous-stable-branch-or-tag>` → `pnpm install` (if lockfile changed) → `pnpm build` → restart.
3. No database migrations were introduced for Accounting Phase 1 read-only scope; rollback is **code-only**.

---

## Manual smoke checklist (browser)

After deploy, sign in with a user who has Medical access and (for Accounting) **`admin` / `manager` / `accountant`**:

1. **Medical — Dashboard:** open `/dashboard`; confirm layout loads without console errors.
2. **Medical — Patients:** open `/patients`; confirm list/search loads.
3. **Accounting — Home:** open `/accounting`; confirm dashboard cards / navigation.
4. **Accounting — Daily revenue:** `/accounting/daily-revenue`; set a date range, run query, confirm table renders.
5. **Accounting — Service revenue:** `/accounting/service-revenue`; run query, confirm grouped table / totals area.
6. **Accounting — Receipts:** `/accounting/receipts`; run inquiry, confirm rows; open one receipt detail if applicable.
7. **Regression:** open an existing Medical workflow you rely on (e.g. patient file from `/patients`) and confirm unchanged behavior.

---

## Config drift notes

- **`pnpm start`** requires a prior successful **`pnpm build`** (`dist/index.js` + `dist/public/`).
- Port collision on **4000** is an operational concern only; resolve by freeing the port or setting **`PORT`** (already supported — not a new variable).

---

## Files changed (Task 19)

- `specs/deploy-notes.md` — this document only.
