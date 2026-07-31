param(
  [string]$Url = "https://192.168.0.100:4000"
)

$ErrorActionPreference = "Stop"
Set-Location $PSScriptRoot

$env:SELRS_DESKTOP_URL = $Url

if (!(Test-Path ".\node_modules")) {
  pnpm install
}

pnpm run dist

Write-Host "Installer created in $PSScriptRoot" -ForegroundColor Green
