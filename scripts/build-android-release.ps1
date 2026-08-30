param(
    [string]$VersionName,
    [int]$VersionCode,
    [switch]$SkipWebBuild,
    [switch]$SkipCapSync,
    [string]$ApkOutputDir,
    [switch]$DryRun
)

$ErrorActionPreference = "Stop"

# إعداد المسارات الأساسية
$repoRoot = Split-Path -Parent $PSScriptRoot
$packageJsonPath = Join-Path $repoRoot "package.json"
$androidDir = Join-Path $repoRoot "android"
$androidSigningProperties = Join-Path $androidDir "app\key.properties"

# المسار الافتراضي للنسخ داخل OneDrive الخاص بالمستخدم الحالي
$localOneDrive = if ($env:OneDrive) { $env:OneDrive } else { Join-Path $env:USERPROFILE "OneDrive" }
$defaultDestination = Join-Path $localOneDrive "SELRS.cc"
$resolvedDestDir = if ($ApkOutputDir) { $ApkOutputDir } else { $defaultDestination }

$maxAndroidVersionCode = 2100000000

function Write-Step {
    param([string]$Message)
    Write-Host ""
    Write-Host "==> $Message" -ForegroundColor Cyan
}

function Assert-Command {
    param([string[]]$Names)
    foreach ($Name in $Names) {
        if (-not (Get-Command $Name -ErrorAction Ignore)) {
            throw "Required command '$Name' was not found in PATH."
        }
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

Assert-Command "corepack", "npx", "java"
if (-not (Get-Command pnpm -ErrorAction Ignore)) {
    function pnpm { corepack pnpm @args }
}

function Test-AndroidReleaseSigning {
    $requiredEnvironment = @(
        "ANDROID_STORE_FILE",
        "ANDROID_STORE_PASSWORD",
        "ANDROID_KEY_ALIAS",
        "ANDROID_KEY_PASSWORD"
    )
    $hasEnvironmentSigning = $requiredEnvironment | ForEach-Object {
        -not [string]::IsNullOrWhiteSpace([Environment]::GetEnvironmentVariable($_))
    }

    if (($hasEnvironmentSigning | Where-Object { $_ }).Count -eq $requiredEnvironment.Count) {
        return
    }

    if (Test-Path $androidSigningProperties) {
        return
    }

    throw "Android release signing is not configured. Set the ANDROID_* environment variables or create the untracked file android/app/key.properties from key.properties.example."
}

# 1. قراءة وتحديد الإصدار
$packageJsonObj = Get-Content -Raw $packageJsonPath | ConvertFrom-Json
$projectVersion = [string]$packageJsonObj.version
$semverPattern = '^\d+\.\d+\.\d+$'

if ($projectVersion -notmatch $semverPattern) {
    throw "package.json version '$projectVersion' is not in expected x.y.z format."
}

if (-not $PSBoundParameters.ContainsKey("VersionName") -or [string]::IsNullOrWhiteSpace($VersionName)) {
    $parts = $projectVersion -split '\.'
    $parts[2] = [int]$parts[2] + 1
    $VersionName = $parts -join '.'
}

# تحديث package.json
if ($projectVersion -ne $VersionName) {
    Write-Step "Updating version: $projectVersion → $VersionName"
    $packageJsonObj.version = $VersionName
    if (-not $DryRun) {
        Save-PackageJson -Path $packageJsonPath -Object $packageJsonObj
    }
}

# حساب الـ VersionCode
if (-not $PSBoundParameters.ContainsKey("VersionCode")) {
    $parts = $VersionName -split '\.'
    $VersionCode = ([int]$parts[0] * 1000000) + ([int]$parts[1] * 10000) + [int]$parts[2]
}

if ($VersionCode -gt $maxAndroidVersionCode) {
    throw "VersionCode ($VersionCode) exceeds the Android maximum limit of $maxAndroidVersionCode."
}

Write-Step "Building Android release"
Write-Host "VersionName: $VersionName"
Write-Host "VersionCode: $VersionCode"

if (-not $DryRun) {
    Test-AndroidReleaseSigning
}

Push-Location $repoRoot
$buildStartedAt = Get-Date
try {
    if (-not $SkipWebBuild) {
        Write-Step "Running web build"
        if (-not $DryRun) { pnpm build }
    }

    if (-not $SkipCapSync) {
        Write-Step "Syncing Capacitor"
        if (-not $DryRun) { npx cap sync android }
    }

    Push-Location $androidDir
    try {
        Write-Step "Running Gradle assembleRelease"
        $env:APP_VERSION_CODE = [string]$VersionCode
        if (-not $DryRun) {
            .\gradlew assembleRelease "-PversionCode=$VersionCode" "-PversionName=$VersionName"
            if ($LASTEXITCODE -ne 0) {
                throw "Gradle assembleRelease failed with exit code $LASTEXITCODE."
            }
        }
    }
    finally { Pop-Location }
}
finally { Pop-Location }

# 2. تسمية الملف النهائي بنظام SELRS + VersionName
Write-Step "Finalizing APK"
$gradleApkDir = Join-Path $androidDir "app\build\outputs\apk\release"
$apkFile = Get-ChildItem -Path $gradleApkDir -Filter "*.apk" |
    Where-Object { $_.LastWriteTime -ge $buildStartedAt } |
    Sort-Object LastWriteTime -Descending |
    Select-Object -First 1

if ($apkFile) {
    # تعديل الاسم هنا ليصبح SELRS_1.0.115.apk مثلاً
    $newApkName = "SELRS_$VersionName.apk"
    $copiedApkPath = Join-Path $resolvedDestDir $newApkName

    if (-not $DryRun) {
        if (-not (Test-Path $resolvedDestDir)) {
            New-Item -ItemType Directory -Path $resolvedDestDir -Force | Out-Null
        }

        # تنفيذ النسخ مع تغيير الاسم
        Write-Host "Source: $($apkFile.FullName)"
        Write-Host "Dest:   $copiedApkPath"
        Copy-Item -Path $apkFile.FullName -Destination $copiedApkPath -Force

        # Also copy to android/releases/ so the server can serve it for auto-updates
        $localReleasesDir = Join-Path $androidDir "releases"
        if (-not (Test-Path $localReleasesDir)) {
            New-Item -ItemType Directory -Path $localReleasesDir -Force | Out-Null
        }
        $localApkPath = Join-Path $localReleasesDir $newApkName
        Copy-Item -Path $apkFile.FullName -Destination $localApkPath -Force
        Write-Host "Also copied to: $localApkPath (served at /updates/android)" -ForegroundColor Green

        Write-Host "Successfully generated: $newApkName" -ForegroundColor Green
    }
    else {
        Write-Host "DryRun: APK would be saved as '$newApkName' in '$resolvedDestDir'." -ForegroundColor Yellow
    }
}
else {
    Write-Host "APK not found. Check Gradle logs." -ForegroundColor Red
}

Write-Step "Process Complete"
