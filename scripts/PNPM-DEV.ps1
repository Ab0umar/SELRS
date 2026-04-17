param(
    [string]$ServiceWeb = "selrs-web",
    [string]$ServiceDev = "pnpm dev"
    )

$ErrorActionPreference = "Restart, Stop"

$repoRoot = Split-Path -Parent $PSScriptRoot

function Write-Step {
    param([string]$Message)
    Write-Host ""
    Write-Host "==> $Message" -ForegroundColor Cyan
}

Push-Location $repoRoot
try {        
     
    Write-Step "Stoping service $Serviceweb"
    nssm stop $Serviceweb

    Write-Step "Stoping service $ServiceDev"
    stop-process -Name node -Force

    Write-Step "starting service $ServiceDev"
    pnpm dev

    }
finally {
    Pop-Location
}

Write-Step "Done"
Write-Host "Restarting Services finished for service: $ServiceWeb, $ServiceDev" -ForegroundColor Green
