param(
  [string]$Url = "http://192.168.1.100:4000",
  [switch]$SkipFrontendBuild
)

$ErrorActionPreference = "Stop"
$root = "D:\c\srv100_acc"

# ── 1. Build frontend ─────────────────────────────────────────────────────────
if (-not $SkipFrontendBuild) {
  Write-Host "Building frontend..." -ForegroundColor Cyan
  Set-Location $root
  pnpm vite build
  if ($LASTEXITCODE -ne 0) { throw "Frontend build failed" }
}

# ── 2. Copy dist/public → desktop-electron/dist ───────────────────────────────
Write-Host "Copying frontend to desktop-electron/dist/ ..." -ForegroundColor Cyan
$src = "$root\dist\public"
$dst = "$root\desktop-electron\dist"
if (Test-Path $dst) { Remove-Item $dst -Recurse -Force }
Copy-Item $src $dst -Recurse
Write-Host "Copied." -ForegroundColor Green

# ── 3. Build Electron installer ───────────────────────────────────────────────
Set-Location "$root\desktop-electron"
$env:SELRS_DESKTOP_URL = $Url

if (!(Test-Path ".\node_modules")) { pnpm install }

Write-Host "Building Electron installer..." -ForegroundColor Cyan
pnpm exec electron-builder --win nsis
if ($LASTEXITCODE -ne 0) { throw "Electron build failed" }

Write-Host "Done! Installer: $root\desktop-electron\SELRS-Electron-Setup-*.exe" -ForegroundColor Green
