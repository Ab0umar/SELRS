param(
      [string]$ServiceName = "SRV100",
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
          Write-Step "Rebuilding"
            pnpm build
      }

      Write-Step "Syncing APK"
      npx cap copy android
      npx cap sync android

      Write-Step "Building APK"
      set-location "$repoRoot\android"
        .\gradlew assembleRelease
  }
  finally {
      Pop-Location
  }

  Write-Step "Done"
  Write-Host "git Sync & Build finished for service: $ServiceName" -ForegroundColor Green