# Pushes web-created rows INTO an Access DB table (الخزنه.accdb).
# Reads a JSON array of rows from stdin, INSERTs each into the target table,
# and returns a JSON array mapping each row's webId -> the new Access ID.
#
# Input row format (generic, typed columns):
#   { "webId": 12,
#     "cols": [ { "name": "التاريخ", "value": "2026-06-28", "type": "date" },
#               { "name": "الايراد", "value": 100,          "type": "num"  },
#               { "name": "ملاحظات", "value": "ايراد",       "type": "str"  },
#               { "name": "تم السداد","value": true,          "type": "bool" } ] }
#
# Usage:
#   echo '<json>' | powershell -File access-push.ps1 -DbPath "C:\...\الخزنه.accdb" -TableName "All"
param(
  [Parameter(Mandatory)][string]$DbPath,
  [Parameter(Mandatory)][string]$TableName
)

[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$OutputEncoding = [System.Text.Encoding]::UTF8

$raw = [Console]::In.ReadToEnd()
if (-not $raw) { "[]"; exit 0 }
$rows = $raw | ConvertFrom-Json
if (-not $rows) { "[]"; exit 0 }
if ($rows -isnot [System.Array]) { $rows = @($rows) }

$connStr = "Provider=Microsoft.ACE.OLEDB.12.0;Data Source=$DbPath;"
$conn = New-Object System.Data.OleDb.OleDbConnection($connStr)
try { $conn.Open() } catch { Write-Error "Failed to open Access DB: $_"; exit 1 }

function Format-Value($value, $type) {
  if ($null -eq $value -or "$value" -eq "") {
    if ($type -eq "num") { return "0" }   # numeric money columns: 0 not NULL
    return "NULL"
  }
  switch ($type) {
    "date" { return "#$value#" }
    "num"  { return "$([double]$value)" }
    "bool" {
      $b = ($value -eq $true) -or ("$value" -eq "1") -or ("$value".ToLower() -eq "true")
      if ($b) { return "True" } else { return "False" }
    }
    default {
      $s = "$value" -replace "'", "''"
      return "'$s'"
    }
  }
}

$results = @()
foreach ($r in $rows) {
  $names  = @()
  $values = @()
  foreach ($c in $r.cols) {
    $names  += "[$($c.name)]"
    $values += (Format-Value $c.value $c.type)
  }
  $sql = "INSERT INTO [$TableName] (" + ($names -join ", ") + ") VALUES (" + ($values -join ", ") + ")"
  $cmd = $conn.CreateCommand()
  $cmd.CommandText = $sql
  try {
    [void]$cmd.ExecuteNonQuery()
    $idCmd = $conn.CreateCommand()
    $idCmd.CommandText = "SELECT @@IDENTITY"
    $newId = [int]$idCmd.ExecuteScalar()
    $results += [PSCustomObject]@{ webId = $r.webId; accessId = $newId; ok = $true }
  } catch {
    $results += [PSCustomObject]@{ webId = $r.webId; accessId = $null; ok = $false; error = "$_" }
  }
}

$conn.Close()
ConvertTo-Json -InputObject @($results) -Depth 6 -Compress
