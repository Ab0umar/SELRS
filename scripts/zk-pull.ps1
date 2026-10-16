<#
.SYNOPSIS
  Pull attendance logs from ZKTeco device via zkemkeeper.dll COM SDK
  Must run under 32-bit PowerShell (SysWOW64) to access the 32-bit COM object.

.PARAMETER IP
  Device IP address (default: 196.202.50.91)

.PARAMETER Port
  Device port (default: 4370)

.PARAMETER MachineNo
  Device machine number (default: 1)

.PARAMETER OutFile
  Output CSV file path (default: stdout)

.PARAMETER Mode
  pull  = download attendance logs (default)
  push  = upload employees (reads employees.csv from --EmployeesFile)
  info  = show device info only

.EXAMPLE
  # Run via 32-bit PowerShell:
  & "C:\Windows\SysWOW64\WindowsPowerShell\v1.0\powershell.exe" -File zk-pull.ps1 -IP 196.202.50.91 -Port 4370 -OutFile C:\tmp\logs.csv
#>

param(
  [string]$IP        = "196.202.50.91",
  [int]   $Port      = 4370,
  [int]   $MachineNo = 1,
  [int]   $CommPwd   = 258288,
  [string]$OutFile   = "",
  [string]$Mode      = "pull",
  [string]$EmployeesFile = ""
)

# Auto-relaunch under 32-bit PowerShell (required for zkemkeeper.dll COM)
if ([IntPtr]::Size -ne 4) {
  $ps32 = "$env:SystemRoot\SysWOW64\WindowsPowerShell\v1.0\powershell.exe"
  $args32 = @("-File", $MyInvocation.MyCommand.Path,
    "-IP", $IP, "-Port", $Port, "-MachineNo", $MachineNo,
    "-CommPwd", $CommPwd, "-Mode", $Mode)
  if ($OutFile)       { $args32 += @("-OutFile", $OutFile) }
  if ($EmployeesFile) { $args32 += @("-EmployeesFile", $EmployeesFile) }
  & $ps32 $args32
  exit $LASTEXITCODE
}


try {
  $zk = New-Object -ComObject zkemkeeper.ZKEM
} catch {
  Write-Error "Failed to create zkemkeeper.ZKEM: $_"
  exit 3
}

if ($CommPwd -ne 0) {
  $null = $zk.SetCommPassword($CommPwd)
}
Write-Host "[ZK] Connecting to $IP`:$Port (pwd=$CommPwd)..."
$connected = $zk.Connect_Net($IP, $Port)
if (-not $connected) {
  Write-Error "Connection failed to $IP`:$Port"
  exit 1
}
Write-Host "[ZK] Connected OK"

# -----------------------------------------------------------------------
# INFO
# -----------------------------------------------------------------------
if ($Mode -eq "info") {
  $serial = ""
  $productName = ""
  $firmwareVersion = ""
  $null = $zk.GetSerialNumber($MachineNo, [ref]$serial)
  $null = $zk.GetProductCode($MachineNo, [ref]$productName)
  $null = $zk.GetFirmwareVersion($MachineNo, [ref]$firmwareVersion)
  Write-Host "Serial:   $serial"
  Write-Host "Product:  $productName"
  Write-Host "Firmware: $firmwareVersion"
  $zk.Disconnect()
  exit 0
}

# -----------------------------------------------------------------------
# SET DEVICE TIME to server local time
# -----------------------------------------------------------------------
if ($Mode -eq "settime") {
  $now = Get-Date
  $ok = $zk.SetDeviceTime2($MachineNo, $now.Year, $now.Month, $now.Day, $now.Hour, $now.Minute, $now.Second)
  Write-Host "[ZK] SetDeviceTime2 => $ok  time=$($now.ToString('yyyy-MM-dd HH:mm:ss'))"
  $zk.Disconnect()
  exit 0
}

# -----------------------------------------------------------------------
# PULL attendance logs
# -----------------------------------------------------------------------
if ($Mode -eq "pull") {
  Write-Host "[ZK] Reading all logs from device..."
  $null = $zk.ReadAllGLogData($MachineNo)

  $lines = [System.Collections.Generic.List[string]]::new()
  $lines.Add("EnrollNo,InOutMode,VerifyMode,DateTime")

  $sdwEnrollNumber = ""
  $idwVerifyMode = 0
  $idwInOutMode  = 0
  $idwYear = 0; $idwMonth = 0; $idwDay = 0
  $idwHour = 0; $idwMinute = 0; $idwSecond = 0
  $idwWorkCode = 0
  $count = 0

  # Try SSR API first (newer devices, string user ID)
  while ($zk.SSR_GetGeneralLogData($MachineNo,
    [ref]$sdwEnrollNumber, [ref]$idwVerifyMode, [ref]$idwInOutMode,
    [ref]$idwYear, [ref]$idwMonth, [ref]$idwDay,
    [ref]$idwHour, [ref]$idwMinute, [ref]$idwSecond,
    [ref]$idwWorkCode)) {

    $dt = "{0:0000}-{1:00}-{2:00} {3:00}:{4:00}:{5:00}" -f $idwYear,$idwMonth,$idwDay,$idwHour,$idwMinute,$idwSecond
    $lines.Add("$sdwEnrollNumber,$idwInOutMode,$idwVerifyMode,$dt")
    $count++
  }

  # Fallback to older integer API if nothing returned
  if ($count -eq 0) {
    $null = $zk.ReadAllGLogData($MachineNo)
    $idwTMachineNumber = 0
    $idwEnrollNumber   = 0
    while ($zk.GetGeneralLogData($MachineNo,
      [ref]$idwTMachineNumber, [ref]$idwEnrollNumber,
      [ref]$idwVerifyMode,     [ref]$idwInOutMode,
      [ref]$idwYear, [ref]$idwMonth, [ref]$idwDay,
      [ref]$idwHour, [ref]$idwMinute, [ref]$idwSecond)) {

      $dt = "{0:0000}-{1:00}-{2:00} {3:00}:{4:00}:{5:00}" -f $idwYear,$idwMonth,$idwDay,$idwHour,$idwMinute,$idwSecond
      $lines.Add("$idwEnrollNumber,$idwInOutMode,$idwVerifyMode,$dt")
      $count++
    }
  }

  Write-Host "[ZK] Rows: $count"

  $csv = $lines -join "`n"
  if ($OutFile) {
    [System.IO.File]::WriteAllText($OutFile, $csv)
    Write-Host "[ZK] Saved to $OutFile"
  } else {
    Write-Output $csv
  }
}

# -----------------------------------------------------------------------
# PUSH employees to device
# -----------------------------------------------------------------------
if ($Mode -eq "push") {
  if (-not $EmployeesFile -or -not (Test-Path $EmployeesFile)) {
    Write-Error "EmployeesFile not found: $EmployeesFile"
    $zk.Disconnect(); exit 1
  }

  $pushed = 0; $failed = 0
  Import-Csv $EmployeesFile | ForEach-Object {
    $empCd = $_.empCd
    $name  = $_.fullName
    # uid must be a numeric string 1-65535
    $uid   = $_.uid

    try {
      $ok = $zk.SSR_SetUserInfo($MachineNo, $uid, $name, "", 0, $true)
      if ($ok) { $pushed++ } else { $failed++; Write-Warning "Failed to push $empCd" }
    } catch {
      $failed++; Write-Warning "Error pushing $empCd`: $_"
    }
  }

  Write-Host "[ZK] Push done: $pushed pushed, $failed failed"
}

# -----------------------------------------------------------------------
# PULL users from device
# -----------------------------------------------------------------------
if ($Mode -eq "users") {
  Write-Host "[ZK] Reading all users from device..."
  $null = $zk.ReadAllUserID($MachineNo)

  $lines = [System.Collections.Generic.List[string]]::new()
  $lines.Add("EnrollNo,Name,Privilege,Enabled")

  $sEnrollNo  = ""
  $sName      = ""
  $sPassword  = ""
  $iPrivilege = 0
  $bEnabled   = $false
  $count      = 0

  while ($zk.SSR_GetAllUserInfo($MachineNo, [ref]$sEnrollNo, [ref]$sName, [ref]$sPassword, [ref]$iPrivilege, [ref]$bEnabled)) {
    # Quote name field in case it contains commas
    $safeName = $sName -replace '"', '""'
    $lines.Add("$sEnrollNo,`"$safeName`",$iPrivilege,$bEnabled")
    $count++
  }

  Write-Host "[ZK] Users: $count"

  $csv = $lines -join "`n"
  if ($OutFile) {
    [System.IO.File]::WriteAllText($OutFile, $csv)
    Write-Host "[ZK] Saved to $OutFile"
  } else {
    Write-Output $csv
  }
}

$zk.Disconnect()
Write-Host "[ZK] Disconnected"
exit 0
