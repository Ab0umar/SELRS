param(
    [string]$ServiceWeb = "selrs-web",
    [string]$ServiceApi = "selrs-api",
    [string]$ServiceTunnel = "cloudFlared"
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

 Write-Step "Restarting service $ServiceApi"
    nssm restart $ServiceApi

 Write-Step "Restarting service $ServiceTunnel"
    nssm restart $ServiceTunnel

    }
finally {
    Pop-Location
}

Write-Step "Done"
Write-Host "Restarting Services finished for service: $ServiceWeb, $ServiceApi ,$ServiceTunnel" -ForegroundColor Green
