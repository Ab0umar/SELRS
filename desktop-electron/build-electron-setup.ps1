param(
  [string]$Url = "https://192.168.0.100:4000"
)

$ErrorActionPreference = "Stop"
Set-Location "D:\c\srv100_acc\desktop-electron"

$env:SELRS_DESKTOP_URL = $Url

if (!(Test-Path ".\node_modules")) {
  pnpm install
}

# Build unpacked app only (no code-signing pipeline).
pnpm exec electron-builder --win dir

$isccCandidates = @(
  "${env:ProgramFiles(x86)}\Inno Setup 6\ISCC.exe",
  "${env:ProgramFiles}\Inno Setup 6\ISCC.exe",
  "$env:LOCALAPPDATA\Programs\Inno Setup 6\ISCC.exe"
)
$iscc = $isccCandidates | Where-Object { Test-Path $_ } | Select-Object -First 1
if (-not $iscc) {
  throw "ISCC.exe not found."
}

& $iscc "D:\c\srv100_acc\desktop-electron\SelrsElectronInstaller.iss"

Write-Host "Done: D:\c\srv100_acc\desktop-electron\dist\SELRS-Electron-Setup.exe" -ForegroundColor Green
