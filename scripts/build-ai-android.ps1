param([switch]$DebugBuild)
$ErrorActionPreference = 'Stop'
$aiRoot = Join-Path (Split-Path -Parent $PSScriptRoot) 'mobile-ai'
Push-Location (Split-Path -Parent $PSScriptRoot)
try {
    node node_modules/vite/bin/vite.js build --outDir ../outputs/ai-mobile/web
    if ($LASTEXITCODE -ne 0) { throw 'SELRS AI web bundle failed.' }
} finally { Pop-Location }
Push-Location $aiRoot
try {
    node ../node_modules/@capacitor/cli/bin/capacitor sync android
    if ($LASTEXITCODE -ne 0) { throw 'SELRS AI Capacitor sync failed.' }
    Push-Location (Join-Path $aiRoot 'android')
    try {
        $aiVariant = if ($DebugBuild) { 'debug' } else { 'release' }
        $aiTask = if ($DebugBuild) { 'assembleDebug' } else { 'assembleRelease' }
        & ./gradlew.bat $aiTask --console=plain
        if ($LASTEXITCODE -ne 0) { throw 'SELRS AI Android build failed.' }
        $aiSource = Join-Path $aiRoot "android/app/build/outputs/apk/$aiVariant/app-$aiVariant.apk"
        $aiOutput = Join-Path $aiRoot 'releases'
        New-Item -ItemType Directory -Path $aiOutput -Force | Out-Null
        $aiDestination = Join-Path $aiOutput "SELRS-AI-1.0-$aiVariant.apk"
        Copy-Item -LiteralPath $aiSource -Destination $aiDestination -Force
        Write-Host "APK: $aiDestination"
    } finally { Pop-Location }
} finally { Pop-Location }
