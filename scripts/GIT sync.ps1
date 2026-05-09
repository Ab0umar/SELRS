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
          Write-Step "Check git status"
          git status
      }

      Write-Step "Fetch"
      git fetch

      Write-Step "Pull"
      git pull

      Write-Step "Check git status"
      git status

      Write-Step "Deploy Web"
      pnpm build

      Write-Step "Restarting service $ServiceName"
      nssm restart $ServiceName
  }
  finally {
      Pop-Location
  }

  Write-Step "Done"
  Write-Host "git Sync & Build finished for service: $ServiceName" -ForegroundColor Green