param()

$ErrorActionPreference = "Stop"

$rootPackage = "E:\SELRS.cc\package.json"
$win7Package = "E:\SELRS.cc\desktop-electron\win7\package.json"
$win7Main = "E:\SELRS.cc\desktop-electron\win7\main.js"
$sourceMain = "E:\SELRS.cc\desktop-electron\main.js"

$rootVersion = (Get-Content -Raw $rootPackage | ConvertFrom-Json).version
$p = Get-Content -Raw $win7Package | ConvertFrom-Json
$p.version = $rootVersion
$utf8NoBom = New-Object System.Text.UTF8Encoding($false)
[System.IO.File]::WriteAllText($win7Package, ($p | ConvertTo-Json -Depth 10), $utf8NoBom)

Copy-Item -Force $sourceMain $win7Main

Write-Host "[Desktop Electron Win7] Installing dependencies..." -ForegroundColor Cyan
npm install --prefix "E:\SELRS.cc\desktop-electron\win7"

Write-Host "[Desktop Electron Win7] Building installer..." -ForegroundColor Cyan
npm run dist --prefix "E:\SELRS.cc\desktop-electron\win7"

Write-Host "[Desktop Electron Win7] Done -> C:\Users\SELRS\OneDrive\Documents\SELRS.cc\SELRS-Electron-Setup-Win7-$rootVersion.exe" -ForegroundColor Green
