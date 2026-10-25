param([string]$ServiceName = 'SRV100')
$ErrorActionPreference = 'Stop'
$repoRoot = Split-Path -Parent $PSScriptRoot
$reportPath = Join-Path $repoRoot 'outputs\ai-management-activation\service.json'
$configPath = "HKLM:\SYSTEM\CurrentControlSet\Services\$ServiceName\Parameters"
$originalEnvironment = $null
$environmentWritten = $false
try {
    if ($ServiceName -ne 'SRV100') { throw 'This activation is restricted to SRV100.' }
    $configuration = Get-ItemProperty -LiteralPath $configPath
    if ([IO.Path]::GetFullPath($configuration.AppDirectory) -ne [IO.Path]::GetFullPath($repoRoot)) {
        throw 'Service working directory does not match this checkout.'
    }
    $originalEnvironment = @($configuration.AppEnvironmentExtra)
    $nextEnvironment = @($originalEnvironment | Where-Object { $_ -notmatch '^AI_CORE_MANAGEMENT_ENABLED=' }) + 'AI_CORE_MANAGEMENT_ENABLED=true'
    Set-ItemProperty -LiteralPath $configPath -Name AppEnvironmentExtra -Value $nextEnvironment
    $environmentWritten = $true
    Restart-Service -Name $ServiceName
    $ready = $false
    for ($attempt = 0; $attempt -lt 20; $attempt++) {
        try {
            $response = Invoke-RestMethod 'http://127.0.0.1:4000/healthz' -TimeoutSec 3
            if ($response.ok -eq $true) { $ready = $true; break }
        } catch { Start-Sleep -Seconds 1 }
    }
    if (-not $ready) { throw 'Service readiness failed.' }
    @{ success = $true; service = $ServiceName; enabled = $true; readiness = $true; completedAt = [DateTime]::UtcNow.ToString('o') } | ConvertTo-Json | Set-Content -LiteralPath $reportPath
} catch {
    if ($environmentWritten) {
        Set-ItemProperty -LiteralPath $configPath -Name AppEnvironmentExtra -Value $originalEnvironment
        Restart-Service -Name $ServiceName
    }
    @{ success = $false; reason = $_.Exception.Message; completedAt = [DateTime]::UtcNow.ToString('o') } | ConvertTo-Json | Set-Content -LiteralPath $reportPath
    exit 1
}
