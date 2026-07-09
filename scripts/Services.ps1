param(
    [string]$ServiceWeb = "selrs-web"
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
     
    Write-Step "Restarting service $Serviceweb"
    nssm restart $Serviceweb


    }
finally {
    Pop-Location
}

Write-Step "Done"
Write-Host "Restarting Services finished for service: $ServiceWeb, $ServiceApi ,$ServiceTunnel" -ForegroundColor Green
