param(
  [string]$NssmPath = "C:\ProgramData\chocolatey\bin\nssm.exe",
  [string]$WebPnpm = "C:\nvm4w\nodejs\pnpm.cmd",
  [string]$WebDir = "E:\SELRS.cc"
  )

$ErrorActionPreference = "Stop"

function Ensure-Admin {
  $id = [Security.Principal.WindowsIdentity]::GetCurrent()
  $p = New-Object Security.Principal.WindowsPrincipal($id)
  if (-not $p.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)) {
    throw "Run this script in an elevated PowerShell (Run as Administrator)."
  }
}

function Ensure-Path([string]$Path, [string]$Label) {
  if (-not (Test-Path $Path)) {
    throw "$Label not found: $Path"
  }
}

function Ensure-Service([string]$Name, [string]$App, [string]$Args, [string]$Dir) {
  $exists = (sc.exe query $Name 2>$null | Select-String "SERVICE_NAME") -ne $null
  if (-not $exists) {
    & $NssmPath install $Name $App $Args | Out-Host
  }

  & $NssmPath set $Name Application $App | Out-Host
  & $NssmPath set $Name AppParameters $Args | Out-Host
  & $NssmPath set $Name AppDirectory $Dir | Out-Host
  & $NssmPath set $Name AppRotateFiles 1 | Out-Host
  & $NssmPath set $Name AppRotateOnline 1 | Out-Host
  & $NssmPath set $Name AppRotateBytes 10485760 | Out-Host
  sc.exe config $Name start= auto | Out-Host
}

Ensure-Admin
Ensure-Path $NssmPath "NSSM"
Ensure-Path $WebPnpm "pnpm"
Ensure-Path $WebDir "Web directory"

Ensure-Service -Name "SELRS-DEV" -App $WebPnpm -Args "dev" -Dir $WebDir  -NssmPath $NssmPath

sc.exe stop "pm2.exe" | Out-Host
sc.exe config "pm2.exe" start= demand | Out-Host


sc.exe start "SELRS-DEV" | Out-Host

sc.exe query "SELRS-DEV" | Out-Host

Write-Host ""
Write-Host "Done. Services installed and started."