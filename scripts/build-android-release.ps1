param(
    [string]$VersionName,
    [int]$VersionCode,
    [switch]$SkipWebBuild,
    [switch]$SkipCapSync,
    [string]$ApkOutputDir,
    [switch]$DryRun
)

$ErrorActionPreference = "Stop"

$repoRoot = Split-Path -Parent $PSScriptRoot
$packageJsonPath = Join-Path $repoRoot "package.json"
$androidDir = Join-Path $repoRoot "android"
$defaultApkOutputDir = Join-Path $androidDir "app\build\outputs\apk\release"
$resolvedApkOutputDir = if ($ApkOutputDir) { $ApkOutputDir } else { $defaultApkOutputDir }
$maxAndroidVersionCode = 2100000000

function Write-Step {
    param([string]$Message)
    Write-Host ""
    Write-Host "==> $Message" -ForegroundColor Cyan
}

function Require-Command {
    param([string]$Name)
    if (-not (Get-Command $Name -ErrorAction SilentlyContinue)) {
        throw "Required command '$Name' was not found in PATH."
    }
}

function Save-PackageJson {
    param(
        [string]$Path,
        [object]$Object
    )
    $json = $Object | ConvertTo-Json -Depth 100
    $utf8NoBom = New-Object System.Text.UTF8Encoding($false)
    [System.IO.File]::WriteAllText($Path, "$json`n", $utf8NoBom)
}

if (-not (Test-Path $packageJsonPath)) {
    throw "package.json not found at $packageJsonPath"
}

Require-Command "pnpm"
Require-Command "npx"

# Read current version from package.json
$packageJsonObj = Get-Content -Raw $packageJsonPath | ConvertFrom-Json
$projectVersion = [string]$packageJsonObj.version
$semverPattern = '^\d+\.\d+\.\d+$'

if ($projectVersion -notmatch $semverPattern) {
    throw "package.json version '$projectVersion' is not in expected x.y.z format."
}

if (-not $PSBoundParameters.ContainsKey("VersionName") -or [string]::IsNullOrWhiteSpace($VersionName)) {
    # Auto-increment patch version
    $parts = $projectVersion -split '\.'
    $parts[2] = [int]$parts[2] + 1
    $VersionName = $parts -join '.'
}

if ($VersionName -notmatch $semverPattern) {
    throw "VersionName '$VersionName' is invalid. Expected format: x.y.z"
}

# Update package.json version (structured update)
$oldVersion = $projectVersion
$newVersion = $VersionName
if ($oldVersion -ne $newVersion) {
    Write-Step "Updating version: $oldVersion → $newVersion"
    $packageJsonObj.version = $newVersion
    if (-not $DryRun) {
        Save-PackageJson -Path $packageJsonPath -Object $packageJsonObj
    }
    $confirmedVersion = if ($DryRun) { $newVersion } else { [string]((Get-Content -Raw $packageJsonPath | ConvertFrom-Json).version) }
    if ($confirmedVersion -ne $newVersion) {
        throw "Failed to update package.json version. Expected '$newVersion', found '$confirmedVersion'."
    }
}

# Auto-increment Android version code based on patch version
if (-not $PSBoundParameters.ContainsKey("VersionCode")) {
    $parts = $VersionName -split '\.'
    $patchVersion = [int]$parts[2]
    $VersionCode = 50 + $patchVersion  # Base version 50 + patch number
}

if ($VersionCode -lt 1 -or $VersionCode -gt $maxAndroidVersionCode) {
    throw "VersionCode '$VersionCode' is out of valid range (1..$maxAndroidVersionCode)."
}

Write-Step "Building Android release"
Write-Host "VersionName: $VersionName"
Write-Host "VersionCode: $VersionCode"
Write-Host "APK output directory: $resolvedApkOutputDir"
if ($DryRun) {
    Write-Host "DryRun: enabled (no file writes or build commands will execute)." -ForegroundColor Yellow
}

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
        if (-not $DryRun) {
            pnpm build
        }
    }

    if (-not $SkipCapSync) {
        Write-Step "Syncing Capacitor Android"
        if (-not $DryRun) {
            npx cap sync android
        }
    }

    Push-Location $androidDir
    try {
        Write-Step "Running Gradle assembleRelease"
        Write-Host "VersionCode: $VersionCode"

        # Set environment variable so build.gradle can read it
        $env:APP_VERSION_CODE = [string]$VersionCode
        [System.Environment]::SetEnvironmentVariable("APP_VERSION_CODE", [string]$VersionCode, "Process")

        # Prefer explicit Gradle property and keep env var as fallback.
        if (-not $DryRun) {
            .\gradlew assembleRelease "-PversionCode=$VersionCode"
        }
    }
    finally {
        Pop-Location
    }
}
finally {
    Pop-Location
}

Write-Step "Done"
$gradleApkDir = Join-Path $androidDir "app\build\outputs\apk\release"
$apkFile = Get-ChildItem -Path $gradleApkDir -Filter "*.apk" -ErrorAction SilentlyContinue | Sort-Object LastWriteTime -Descending | Select-Object -First 1
if ($apkFile) {
    if (-not (Test-Path $resolvedApkOutputDir)) {
        if (-not $DryRun) {
            New-Item -ItemType Directory -Path $resolvedApkOutputDir -Force | Out-Null
        }
    }
    $copiedApkPath = Join-Path $resolvedApkOutputDir $apkFile.Name
    if (-not $DryRun) {
        Copy-Item -Path $apkFile.FullName -Destination $copiedApkPath -Force
        Write-Host "APK: $copiedApkPath" -ForegroundColor Green
    }
    else {
        Write-Host "DryRun: APK would be copied from '$($apkFile.FullName)' to '$copiedApkPath'." -ForegroundColor Yellow
    }
}
else {
    Write-Host "APK not found in $gradleApkDir. Check Gradle output." -ForegroundColor Yellow
}
