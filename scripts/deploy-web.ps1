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
    }
finally {
    Pop-Location
}

Write-Step "Done"
Write-Host "Web deploy finished for service: $ServiceName" -ForegroundColor Green
