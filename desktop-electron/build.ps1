# Build desktop-electron with auto-synced version
param(
  [switch]$SkipSync
)

$ErrorActionPreference = "Stop"

$repoRoot = Split-Path -Parent $PSScriptRoot
$desktopElectronDir = $PSScriptRoot

if (-not $SkipSync) {
  Write-Host "[Desktop Electron] Syncing version..." -ForegroundColor Cyan
  Push-Location $desktopElectronDir
  try {
    powershell -ExecutionPolicy Bypass -File "$desktopElectronDir\sync-version.ps1"
  }
  finally {
    Pop-Location
  }
}

Write-Host "[Desktop Electron] Building installer..." -ForegroundColor Cyan
Push-Location $desktopElectronDir
try {
  npm run dist
}
finally {
  Pop-Location
}

# Get version from package.json for output path
$packageJsonPath = Join-Path $desktopElectronDir "package.json"
$packageJson = Get-Content -Raw $packageJsonPath | ConvertFrom-Json
$version = $packageJson.version
$outputPath = "C:\Users\SELRS\OneDrive\Documents\SELRS.cc\SELRS-Electron-Setup-$version.exe"
Write-Host ""
Write-Host "=============================================" -ForegroundColor Green
Write-Host "[OK] Build Complete!" -ForegroundColor Green
Write-Host "  Version: $version" -ForegroundColor Green
Write-Host "  Installer: $outputPath" -ForegroundColor Green
Write-Host "=============================================" -ForegroundColor Green
Write-Host ""
