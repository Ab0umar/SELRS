param(
    [string]$ServiceName = "SRV100",
    [string]$NssmPath = "nssm.exe",
    [switch]$SkipInstall,
    [switch]$SkipTests,
    [switch]$SkipRestart,
    [switch]$SkipSmoke,
    [switch]$DryRun
)

$ErrorActionPreference = "Stop"

$repoRoot = Split-Path -Parent $PSScriptRoot
$distDir = Join-Path $repoRoot "dist"
$releaseBackupsDir = Join-Path $repoRoot ".release-backups"
$backupDir = $null

function Write-Step {
    param([string]$Message)
    Write-Host ""
    Write-Host "==> $Message" -ForegroundColor Cyan
}

function Invoke-ReleaseCommand {
    param([string]$Description, [scriptblock]$Command)
    Write-Step $Description
    if ($DryRun) {
        Write-Host "DryRun: skipped" -ForegroundColor Yellow
        return
    }
    & $Command
    if ($LASTEXITCODE -and $LASTEXITCODE -ne 0) {
        throw "$Description failed with exit code $LASTEXITCODE"
    }
}

function Restore-PreviousArtifact {
    if (-not $backupDir -or -not (Test-Path $backupDir)) {
        Write-Warning "No previous dist artifact was available for rollback."
        return
    }

    Write-Step "Rolling back previous dist artifact"
    if (Test-Path $distDir) {
        Remove-Item -LiteralPath $distDir -Recurse -Force
    }
    Copy-Item -LiteralPath $backupDir -Destination $distDir -Recurse -Force
    & $NssmPath restart $ServiceName
}

function Wait-ForReadiness {
    param([int]$Attempts = 12, [int]$DelaySeconds = 2)

    $port = if ($env:PORT) { $env:PORT } else { "4000" }
    $baseUrl = "http://127.0.0.1:$port"
    for ($attempt = 1; $attempt -le $Attempts; $attempt++) {
        try {
            $response = Invoke-WebRequest "$baseUrl/healthz" -UseBasicParsing -TimeoutSec 5
            if ($response.StatusCode -eq 200 -and $response.Content -match '"ok"\s*:\s*true') {
                Write-Host "Readiness passed on attempt $attempt"
                return
            }
        }
        catch {
            if ($attempt -eq $Attempts) { throw }
        }
        Start-Sleep -Seconds $DelaySeconds
    }
    throw "Service did not become ready at $baseUrl/healthz"
}

Push-Location $repoRoot
try {
    if (-not $SkipInstall) {
        Invoke-ReleaseCommand "Installing dependencies" { corepack pnpm install --frozen-lockfile }
    }

    Invoke-ReleaseCommand "Type checking" { corepack pnpm check }
    Invoke-ReleaseCommand "Checking tracked sensitive files" { corepack pnpm security:files }
    Invoke-ReleaseCommand "Checking migration files" { corepack pnpm db:migration-files-check }
    Invoke-ReleaseCommand "Checking database schema state" { corepack pnpm db:sync-check }

    if (-not $SkipTests) {
        Invoke-ReleaseCommand "Running tests" { corepack pnpm test }
    }

    if (-not $DryRun -and (Test-Path $distDir)) {
        $backupDir = Join-Path $releaseBackupsDir (Get-Date -Format "yyyyMMdd-HHmmss")
        New-Item -ItemType Directory -Path $releaseBackupsDir -Force | Out-Null
        Copy-Item -LiteralPath $distDir -Destination $backupDir -Recurse -Force
        Write-Host "Previous artifact: $backupDir"
    }

    Invoke-ReleaseCommand "Building web app" { corepack pnpm build }

    if (-not $SkipRestart) {
        Invoke-ReleaseCommand "Restarting service '$ServiceName'" { & $NssmPath restart $ServiceName }
        Invoke-ReleaseCommand "Checking service '$ServiceName'" { & $NssmPath status $ServiceName }
        Invoke-ReleaseCommand "Waiting for service readiness" { Wait-ForReadiness }
    }

    if (-not $SkipSmoke) {
        Invoke-ReleaseCommand "Running deployed smoke test" { corepack pnpm smoke }
    }

    $commit = if ($DryRun) { "dry-run" } else { (git rev-parse --short HEAD).Trim() }
    Write-Step "Release verified"
    Write-Host "Service: $ServiceName"
    Write-Host "Commit:  $commit"
    $version = node -p "require('./package.json').version"
    Write-Host "Version: $version"
    $latestMigration = Get-ChildItem (Join-Path $repoRoot "drizzle/migrations") -Filter "*.sql" |
        Sort-Object Name |
        Select-Object -Last 1
    $schemaVersion = if ($latestMigration) { $latestMigration.BaseName } else { "unknown" }
    Write-Host "Schema:  $schemaVersion"
}
catch {
    Write-Error "Web deployment failed: $($_.Exception.Message)"
    if (-not $DryRun -and -not $SkipRestart) {
        try {
            Restore-PreviousArtifact
        }
        catch {
            Write-Error "Rollback failed: $($_.Exception.Message)"
        }
    }
    exit 1
}
finally {
    Pop-Location
}
