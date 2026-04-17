# Auto-sync version from root package.json to desktop-electron package.json
param(
  [string]$RootPackageJsonPath = "E:\SELRS.cc\package.json",
  [string]$DesktopPackageJsonPath = "E:\SELRS.cc\desktop-electron\package.json"
)

$ErrorActionPreference = "Stop"

# Read root version
$rootPackageJson = Get-Content -Raw $RootPackageJsonPath | ConvertFrom-Json
$version = $rootPackageJson.version

Write-Host "[Desktop Electron] Syncing version from root package.json: $version" -ForegroundColor Cyan

# Update desktop-electron package.json
$desktopPackageJson = Get-Content -Raw $DesktopPackageJsonPath | ConvertFrom-Json
$desktopPackageJson.version = $version

$utf8NoBom = New-Object System.Text.UTF8Encoding($false)
$jsonContent = $desktopPackageJson | ConvertTo-Json -Depth 10
[System.IO.File]::WriteAllText($DesktopPackageJsonPath, $jsonContent, $utf8NoBom)

Write-Host "[Desktop Electron] Version synced: $version" -ForegroundColor Green
