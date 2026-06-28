# Pushes web-created ledger rows INTO the Access DB (الخزنه.accdb).
# Reads a JSON array of rows from stdin, INSERTs each into the target table,
# and returns a JSON array mapping each row's webId -> the new Access ID.
#
# Each input row: { webId, txDate (yyyy-MM-dd), income, expense, notes }
#
# Usage:
#   echo '<json>' | powershell -File access-push.ps1 -DbPath "C:\...\الخزنه.accdb" -TableName "All"
param(
  [Parameter(Mandatory)][string]$DbPath,
  [Parameter(Mandatory)][string]$TableName,
  [string]$ColDate   = "التاريخ",
  [string]$ColIncome = "الايراد",
  [string]$ColExpense= "المصروف",
  [string]$ColNotes  = "ملاحظات"
)

[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$OutputEncoding = [System.Text.Encoding]::UTF8

# Read JSON rows from stdin
$raw = [Console]::In.ReadToEnd()
if (-not $raw) { "[]"; exit 0 }
$rows = $raw | ConvertFrom-Json
if (-not $rows) { "[]"; exit 0 }
# Ensure array even for a single object
if ($rows -isnot [System.Array]) { $rows = @($rows) }

$connStr = "Provider=Microsoft.ACE.OLEDB.12.0;Data Source=$DbPath;"
$conn = New-Object System.Data.OleDb.OleDbConnection($connStr)
try { $conn.Open() } catch { Write-Error "Failed to open Access DB: $_"; exit 1 }

function Q([string]$s) { return $s -replace "'", "''" }

$results = @()
foreach ($r in $rows) {
  $webId   = $r.webId
  $txDate  = $r.txDate
  $income  = $r.income
  $expense = $r.expense
  $notes   = if ($null -ne $r.notes) { Q([string]$r.notes) } else { "" }

  $incVal = if ($null -ne $income  -and "$income"  -ne "") { [double]$income }  else { 0 }
  $expVal = if ($null -ne $expense -and "$expense" -ne "") { [double]$expense } else { 0 }

  $sql = "INSERT INTO [$TableName] ([$ColDate], [$ColIncome], [$ColExpense], [$ColNotes]) " +
         "VALUES (#$txDate#, $incVal, $expVal, '$notes')"
  $cmd = $conn.CreateCommand()
  $cmd.CommandText = $sql
  try {
    [void]$cmd.ExecuteNonQuery()
    $idCmd = $conn.CreateCommand()
    $idCmd.CommandText = "SELECT @@IDENTITY"
    $newId = [int]$idCmd.ExecuteScalar()
    $results += [PSCustomObject]@{ webId = $webId; accessId = $newId; ok = $true }
  } catch {
    $results += [PSCustomObject]@{ webId = $webId; accessId = $null; ok = $false; error = "$_" }
  }
}

$conn.Close()
,$results | ConvertTo-Json -Depth 5 -Compress
