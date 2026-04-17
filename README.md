# SELRS

SELRS is a full-stack TypeScript application with a React/Vite frontend and a Node/Express + tRPC backend.

## Structure
- `client/src`: frontend app
- `server/_core`: backend core and server entry
- `server/routers`: API routers
- `shared`: shared types and contracts
- `drizzle`, `scripts`: database and maintenance scripts

## Run
```bash
pnpm install
pnpm dev
```

## Main Commands
```bash
pnpm check
pnpm test
pnpm build
pnpm start
pnpm smoke
```

## Database
```bash
pnpm db:migrate
pnpm db:push
pnpm db:sync-check
```

## AI Notes
- Repo-wide coding instructions for Claude Code live in `CLAUDE.md`.
- Keep code changes minimal and aligned with existing patterns.

