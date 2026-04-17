# Complete build for SELRS Desktop with auto-synced version
param(
  [string]$Configuration = "Release",
  [string]$Runtime = "win-x64"
)

$ErrorActionPreference = "Stop"

$repoRoot = Split-Path -Parent $PSScriptRoot
$desktopDir = $PSScriptRoot
$issPath = Join-Path $desktopDir "SelrsDesktopInstaller.iss"
$outputDir = "C:\Users\SELRS\OneDrive\Documents\SELRS.cc"

Write-Host "=============================================" -ForegroundColor Cyan
Write-Host "SELRS Desktop Build (Auto-Sync Version)" -ForegroundColor Cyan
Write-Host "=============================================" -ForegroundColor Cyan

# Auto-sync version from root package.json
$packageJsonPath = Join-Path $repoRoot "package.json"
if (-not (Test-Path $packageJsonPath)) {
  throw "Root package.json not found at $packageJsonPath"
}

$packageJson = Get-Content -Raw $packageJsonPath | ConvertFrom-Json
$version = $packageJson.version

Write-Host ""
Write-Host "[Version] Syncing from package.json: $version" -ForegroundColor Green
Write-Host ""

# Update .iss file with new version
$issContent = Get-Content -Raw $issPath
$oldIssContent = $issContent
$issContent = $issContent -replace '#define AppVersion "[^"]*"', "#define AppVersion `"$version`""

if ($oldIssContent -ne $issContent) {
  $utf8NoBom = New-Object System.Text.UTF8Encoding($false)
  [System.IO.File]::WriteAllText($issPath, $issContent, $utf8NoBom)
  Write-Host "[Setup] Updated SelrsDesktopInstaller.iss with version: $version" -ForegroundColor Green
}

# Build the desktop application
Write-Host ""
Write-Host "[Build] Publishing .NET application..." -ForegroundColor Cyan
$publishDir = Join-Path $desktopDir "publish"

dotnet publish `
  (Join-Path $desktopDir "SelrsDesktop\SelrsDesktop.csproj") `
  -c $Configuration `
  -r $Runtime `
  --self-contained false `
  -p:PublishSingleFile=true `
  -p:IncludeNativeLibrariesForSelfExtract=true `
  -o $publishDir

Write-Host "[Build] Application published successfully" -ForegroundColor Green

# Build the installer
Write-Host ""
Write-Host "[Installer] Building Inno Setup installer..." -ForegroundColor Cyan

$candidates = @(
  "${env:ProgramFiles(x86)}\Inno Setup 6\ISCC.exe",
  "${env:ProgramFiles}\Inno Setup 6\ISCC.exe",
  "$env:LOCALAPPDATA\Programs\Inno Setup 6\ISCC.exe"
)
$iscc = $candidates | Where-Object { Test-Path $_ } | Select-Object -First 1
if (-not $iscc) {
  throw "ISCC.exe not found. Install Inno Setup 6. Checked: $($candidates -join ', ')"
}

& $iscc $issPath

Write-Host ""
Write-Host "=============================================" -ForegroundColor Green
Write-Host "[OK] Build Complete!" -ForegroundColor Green
Write-Host "  Version: $version" -ForegroundColor Green
Write-Host "  Installer: $outputDir\SELRS-Desktop-Setup-$version.exe" -ForegroundColor Green
Write-Host "=============================================" -ForegroundColor Green
Write-Host ""
