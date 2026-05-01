param(
    [string]$VersionName,
    [int]$VersionCode,
    [switch]$SkipWebBuild,
    [switch]$SkipCapSync
)

$ErrorActionPreference = "Stop"

$repoRoot = Split-Path -Parent $PSScriptRoot
$packageJsonPath = "E:\SELRS.cc\package.json"
$androidDir = Join-Path $repoRoot "android"
$apkOutputDir = "C:\Users\SELRS\OneDrive\Documents\SELRS.cc"

function Write-Step {
    param([string]$Message)
    Write-Host ""
    Write-Host "==> $Message" -ForegroundColor Cyan
}

if (-not (Test-Path $packageJsonPath)) {
    throw "package.json not found at $packageJsonPath"
}

# Read current version from package.json
$packageJsonObj = Get-Content -Raw $packageJsonPath | ConvertFrom-Json
$projectVersion = [string]$packageJsonObj.version

if (-not $VersionName) {
    # Auto-increment patch version
    $parts = $projectVersion -split '\.'
    if ($parts.Length -eq 3) {
        $parts[2] = [int]$parts[2] + 1
        $VersionName = $parts -join '.'
    }
    else {
        $VersionName = $projectVersion
    }
}

# Update package.json version (simple text replacement)
$oldVersion = $projectVersion
$newVersion = $VersionName
if ($oldVersion -ne $newVersion) {
    Write-Step "Updating version: $oldVersion → $newVersion"
    $content = Get-Content -Raw $packageJsonPath
    # Simple text replacement: "version": "1.0.55" → "version": "1.0.56"
    $content = $content -replace "`"version`":\s*`"$([regex]::Escape($oldVersion))`"", "`"version`": `"$newVersion`""

    # Write with UTF8 without BOM
    $utf8NoBom = New-Object System.Text.UTF8Encoding($false)
    [System.IO.File]::WriteAllText($packageJsonPath, $content, $utf8NoBom)
}

# Auto-increment Android version code based on patch version
if (-not $VersionCode) {
    $parts = $VersionName -split '\.'
    if ($parts.Length -eq 3) {
        $patchVersion = [int]$parts[2]
        $VersionCode = 50 + $patchVersion  # Base version 50 + patch number
    }
    else {
        $VersionCode = 50
    }
}


Write-Step "Building Android release"
Write-Host "VersionName: $VersionName"
Write-Host "VersionCode: $VersionCode"

Push-Location $repoRoot
try {
    if (-not $SkipWebBuild) {
        Write-Step "Running web build"
        $gsPath = Join-Path $repoRoot "android\app\google-services.json"
        if (Test-Path $gsPath) {
            $env:VITE_ENABLE_ANDROID_FCM = "1"
            Write-Host "VITE_ENABLE_ANDROID_FCM=1 (google-services.json present)."
        }
        else {
            Remove-Item Env:VITE_ENABLE_ANDROID_FCM -ErrorAction SilentlyContinue
            Write-Host "google-services.json not found — web bundle will skip Android FCM registration (no crash)." -ForegroundColor Yellow
        }
        pnpm build
    }

    if (-not $SkipCapSync) {
        Write-Step "Syncing Capacitor Android"
        npx cap sync android
    }

    Push-Location $androidDir
    try {
        Write-Step "Running Gradle assembleRelease"
        Write-Host "VersionCode will be: $VersionCode (auto-calculated from version patch)"

        # Set environment variable so build.gradle can read it
        $env:APP_VERSION_CODE = [string]$VersionCode
        [System.Environment]::SetEnvironmentVariable("APP_VERSION_CODE", [string]$VersionCode, "Process")

        # Run Gradle with explicit property (as fallback)
        .\gradlew assembleRelease
    }
    finally {
        Pop-Location
    }
}
finally {
    Pop-Location
}

Write-Step "Done"
$apkFile = Get-ChildItem -Path $apkOutputDir -Filter "SELRS*.apk" -ErrorAction SilentlyContinue | Select-Object -First 1
if ($apkFile) {
    Write-Host "APK: $($apkFile.FullName)" -ForegroundColor Green
}
else {
    Write-Host "APK not found at $apkOutputDir. Check Gradle output." -ForegroundColor Yellow
}
