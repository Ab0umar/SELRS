param(
  [string]$IssPath = "E:\SRV100\desktop\SelrsDesktopInstaller.iss"
)

$ErrorActionPreference = "Stop"

# Auto-sync version from root package.json
$packageJsonPath = "E:\SRV100\package.json"
$packageJson = Get-Content -Raw $packageJsonPath | ConvertFrom-Json
$version = $packageJson.version

Write-Host "[SELRS Installer] Syncing version from package.json: $version" -ForegroundColor Cyan

# Update .iss file with new version
$issContent = Get-Content -Raw $IssPath
$issContent = $issContent -replace '#define AppVersion "[^"]*"', "#define AppVersion `"$version`""

$utf8NoBom = New-Object System.Text.UTF8Encoding($false)
[System.IO.File]::WriteAllText($IssPath, $issContent, $utf8NoBom)

$candidates = @(
  "${env:ProgramFiles(x86)}\Inno Setup 6\ISCC.exe",
  "${env:ProgramFiles}\Inno Setup 6\ISCC.exe",
  "$env:LOCALAPPDATA\Programs\Inno Setup 6\ISCC.exe"
)
$iscc = $candidates | Where-Object { Test-Path $_ } | Select-Object -First 1
if (-not $iscc) {
  throw "ISCC.exe not found. Checked: $($candidates -join ', ')"
}

Write-Host "[SELRS Installer] Building desktop publish..." -ForegroundColor Cyan
powershell -ExecutionPolicy Bypass -File "E:\SRV100\desktop\build-selrs-desktop.ps1"

Write-Host "[SELRS Installer] Compiling Inno Setup..." -ForegroundColor Cyan
& $iscc $IssPath

Write-Host "[SELRS Installer] Done -> C:\Users\SELRS\OneDrive\Documents\SELRS.CC\SELRS-Desktop-Setup-$version.exe" -ForegroundColor Green
