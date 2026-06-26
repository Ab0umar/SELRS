param(
      [string]$ServiceName = "SRV100_Acc",
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

      Write-Step "Status"
      git status

      Write-Step "Rebuild & Restart"
      pnpm build && nssm restart srv100

  }
  finally {
      Pop-Location
  }

  Write-Step "Done"
  Write-Host "git Pull For $ServiceName" -ForegroundColor Green