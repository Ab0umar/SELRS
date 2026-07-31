param()

$ErrorActionPreference = "Stop"

$repoRoot = Split-Path -Parent $PSScriptRoot
$win7Dir = Join-Path $PSScriptRoot "win7"
$rootPackage = Join-Path $repoRoot "package.json"
$win7Package = Join-Path $win7Dir "package.json"
$win7Main = Join-Path $win7Dir "main.js"
$sourceMain = Join-Path $PSScriptRoot "main.js"

$rootVersion = (Get-Content -Raw $rootPackage | ConvertFrom-Json).version
$p = Get-Content -Raw $win7Package | ConvertFrom-Json
$p.version = $rootVersion
$utf8NoBom = New-Object System.Text.UTF8Encoding($false)
[System.IO.File]::WriteAllText($win7Package, ($p | ConvertTo-Json -Depth 10), $utf8NoBom)

Copy-Item -Force $sourceMain $win7Main

Write-Host "[Desktop Electron Win7] Installing dependencies..." -ForegroundColor Cyan
npm install --prefix $win7Dir

Write-Host "[Desktop Electron Win7] Building installer..." -ForegroundColor Cyan
npm run dist --prefix $win7Dir

Write-Host "[Desktop Electron Win7] Done -> $PSScriptRoot\SELRS-Electron-Setup-Win7-$rootVersion.exe" -ForegroundColor Green
