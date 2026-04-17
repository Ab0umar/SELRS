param(
  [string]$Url = "https://op.selrs.cc"
)

$ErrorActionPreference = "Stop"
Set-Location "E:\SELRS.cc\desktop-electron"

$env:SELRS_DESKTOP_URL = $Url

if (!(Test-Path ".\node_modules")) {
  pnpm install
}

pnpm run dist

Write-Host "Installer created in C:\Users\SELRS\OneDrive\Documents\SELRS.cc" -ForegroundColor Green
