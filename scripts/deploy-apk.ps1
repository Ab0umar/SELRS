param(
    [string]$ServiceName = "selrs-web",
    [switch]$SkipBuild
)

$ErrorActionPreference = "Stop"

$repoRoot = Split-Path -Parent $PSScriptRoot

function Write-Step {
    param([string]$Message)
    Write-Host ""
    Write-Host "==> $Message" -ForegroundColor Cyan
}

Push-Location $repoRoot
try {
    if (-not $SkipBuild) {
        Write-Step "Building web app"
             pnpm build
       }
       { Write-Step "APK"
       Set-Location E:\SRV100\android
    
        Write-Step "Syncing APK"
            npx cap sync android
       }
       { Write-Step "Restarting service $ServiceName"
             nssm restart $ServiceName
       }
       { Write-Step "Building APK"
        ./gradlew AssembleRelease 
       }
    }

    finally {
    Pop-Location
   }

Write-Step "Done"
Write-Host "Apk Sync & Build finished for service: $ServiceName" -ForegroundColor Green
