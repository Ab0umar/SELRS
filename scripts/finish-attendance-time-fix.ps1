param()

$ErrorActionPreference = 'Stop'
$repository = 'E:\selrs.cc'
$backupPath = 'E:\MySQL\Backups\attendance_before_aug2026_time_fix_20260927.sql'
$expectedHash = 'a8c99606aef94278339eac90e7ef6c7ae53ffd647ba14fa3123f76ddb50a88a1'

$identity = [Security.Principal.WindowsIdentity]::GetCurrent()
$principal = [Security.Principal.WindowsPrincipal]::new($identity)
if (-not $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)) {
  throw 'Run this script from an elevated PowerShell window.'
}
if (-not (Test-Path -LiteralPath $backupPath)) { throw 'Attendance backup is missing.' }
$actualHash = (Get-FileHash -LiteralPath $backupPath -Algorithm SHA256).Hash.ToLowerInvariant()
if ($actualHash -ne $expectedHash) { throw 'Attendance backup checksum changed.' }
if ((Resolve-Path -LiteralPath $repository).Path -ne $repository) {
  throw 'Unexpected repository path.'
}
Set-Location -LiteralPath $repository

$service = Get-Service -Name SRV100
if ($service.Status -ne 'Running') { throw 'SRV100 must be running before migration.' }
$migrationCommitted = $false
Stop-Service -Name SRV100 -ErrorAction Stop
(Get-Service -Name SRV100).WaitForStatus('Stopped', '00:00:30')

try {
  & pnpm exec tsx scripts/fix-attendance-times-from-2026-08.ts --apply "--backup=$backupPath"
  if ($LASTEXITCODE -ne 0) { throw 'Attendance migration failed.' }
  $migrationCommitted = $true

  $envPath = Join-Path $repository '.env'
  $content = [IO.File]::ReadAllText($envPath)
  $flagLine = 'ATTENDANCE_TIME_FIX_ENABLED=1'
  if ([regex]::IsMatch($content, '(?m)^ATTENDANCE_TIME_FIX_ENABLED\s*=')) {
    $content = [regex]::Replace($content, '(?m)^ATTENDANCE_TIME_FIX_ENABLED\s*=.*$', $flagLine)
  } else {
    $newline = if ($content.Contains("`r`n")) { "`r`n" } else { "`n" }
    if (-not $content.EndsWith($newline)) { $content += $newline }
    $content += "$flagLine$newline"
  }
  [IO.File]::WriteAllText($envPath, $content, [Text.UTF8Encoding]::new($false))

  Start-Service -Name SRV100 -ErrorAction Stop
  (Get-Service -Name SRV100).WaitForStatus('Running', '00:00:30')

  & pnpm exec tsx scripts/fix-attendance-times-from-2026-08.ts --verify
  if ($LASTEXITCODE -ne 0) { throw 'Post-migration verification failed.' }
  Write-Host 'Attendance time correction active from 2026-08-01.'
} catch {
  if (-not $migrationCommitted -and (Get-Service -Name SRV100).Status -eq 'Stopped') {
    Start-Service -Name SRV100 -ErrorAction Stop
  }
  throw
}
