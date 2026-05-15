# Dumps Access DB tables to JSON for the Node.js sync service.
# Table names are passed as parameters to avoid encoding issues in the script file.
#
# Usage:
#   powershell -File access-dump.ps1 -DbPath "C:\path\to\file.accdb" `
#     -T1 "All" -T2 "table2" -T3 "table3" -T4 "table4" -T5 "table5"
param(
  [Parameter(Mandatory)][string]$DbPath,
  [string]$T1 = "",
  [string]$T2 = "",
  [string]$T3 = "",
  [string]$T4 = "",
  [string]$T5 = "",
  [string]$T6 = "",
  [string]$T7 = "",
  [string]$T8 = ""
)

[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$OutputEncoding = [System.Text.Encoding]::UTF8

$connStr = "Provider=Microsoft.ACE.OLEDB.12.0;Data Source=$DbPath;Mode=Read;"
$conn = New-Object System.Data.OleDb.OleDbConnection($connStr)

try {
  $conn.Open()
} catch {
  Write-Error "Failed to open Access DB: $_"
  exit 1
}

function Read-Table($tableName) {
  if (-not $tableName) { return @() }
  $cmd = $conn.CreateCommand()
  $cmd.CommandText = "SELECT * FROM [$tableName] ORDER BY [ID]"
  $reader = $cmd.ExecuteReader()
  $rows = @()
  while ($reader.Read()) {
    $obj = [ordered]@{}
    for ($i = 0; $i -lt $reader.FieldCount; $i++) {
      $val = $reader.GetValue($i)
      if ($val -is [System.DBNull]) { $val = $null }
      elseif ($val -is [System.DateTime]) { $val = $val.ToString("yyyy-MM-dd") }
      else { $val = "$val".Trim() }
      $obj[$reader.GetName($i)] = $val
    }
    $rows += [PSCustomObject]$obj
  }
  $reader.Close()
  return $rows
}

$result = [ordered]@{
  t1 = Read-Table $T1
  t2 = Read-Table $T2
  t3 = Read-Table $T3
  t4 = Read-Table $T4
  t5 = Read-Table $T5
  t6 = Read-Table $T6
  t7 = Read-Table $T7
  t8 = Read-Table $T8
}

$conn.Close()
$result | ConvertTo-Json -Depth 5 -Compress
