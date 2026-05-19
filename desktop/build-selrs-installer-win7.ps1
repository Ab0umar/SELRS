param(
  [string]$IssPath = (Join-Path $PSScriptRoot "SelrsDesktopInstaller.Win7.iss")
)

$ErrorActionPreference = "Stop"

$packageJsonPath = Join-Path (Split-Path -Parent $PSScriptRoot) "package.json"
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
powershell -ExecutionPolicy Bypass -File (Join-Path $PSScriptRoot "build-selrs-desktop-win7.ps1")
if ($LASTEXITCODE -ne 0) {
  throw "desktop publish failed with exit code $LASTEXITCODE"
}

Write-Host "[SELRS Win7 Installer] Compiling Inno Setup..." -ForegroundColor Cyan
$outputDir = Join-Path $PSScriptRoot "installer"
New-Item -ItemType Directory -Force -Path $outputDir | Out-Null
Push-Location $PSScriptRoot
try {
  & $iscc $IssPath
  if ($LASTEXITCODE -ne 0) {
    throw "Inno Setup failed with exit code $LASTEXITCODE"
  }
}
finally {
  Pop-Location
}

Write-Host "[SELRS Win7 Installer] Done -> desktop\installer\SELRS-Desktop-Setup-Win7-$version.exe" -ForegroundColor Green
