param(
  [string]$IssPath = "E:\SELRS.cc\desktop\SelrsDesktopInstaller.Win7.iss"
)

$ErrorActionPreference = "Stop"

$packageJsonPath = "E:\SELRS.cc\package.json"
$packageJson = Get-Content -Raw $packageJsonPath | ConvertFrom-Json
$version = $packageJson.version

Write-Host "[SELRS Win7 Installer] Syncing version: $version" -ForegroundColor Cyan

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

Write-Host "[SELRS Win7 Installer] Building desktop publish..." -ForegroundColor Cyan
powershell -ExecutionPolicy Bypass -File "E:\SELRS.cc\desktop\build-selrs-desktop-win7.ps1"

Write-Host "[SELRS Win7 Installer] Compiling Inno Setup..." -ForegroundColor Cyan
& $iscc $IssPath

Write-Host "[SELRS Win7 Installer] Done -> C:\Users\SELRS\OneDrive\Documents\SELRS.cc\SELRS-Desktop-Setup-Win7-$version.exe" -ForegroundColor Green
