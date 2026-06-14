param(
  [string]$Url = "https://192.168.0.100:4000"
)

$ErrorActionPreference = "Stop"
Set-Location "D:\c\srv100_acc\desktop-electron"

$env:SELRS_DESKTOP_URL = $Url

if (!(Test-Path ".\node_modules")) {
  pnpm install
}

pnpm run dist

Write-Host "Installer created in D:\c\srv100_acc\desktop-electron" -ForegroundColor Green
