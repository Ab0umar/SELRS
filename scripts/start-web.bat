@echo off
setlocal

REM Run nssm stop selrs-web

REM Run kill-process node


REM Run the project from its repo root so pnpm can find package.json and node_modules.
cd /d "%~dp0\.."

REM Prefer PORT 4000 for the UI; override with PORT=xyz before invoking this script if needed.
set "PORT=4000"

REM Use pnpm dev so both Vite and the Express/Node server boot in dev mode.
pnpm dev
