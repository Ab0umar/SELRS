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

      Write-Step "Add"
      git add .

      Write-Step "Push"
      git commit

      Write-Step "Check git status"
      git push origin main

      Write-Step "Status"
      git status

  }
  finally {
      Pop-Location
  }

  Write-Step "Done"
  Write-Host "git Push For $ServiceName" -ForegroundColor Green