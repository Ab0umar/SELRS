param(
    [string]$DbPath,
    [string]$Sql1,
    [string]$Sql2,
    [string]$Sql3,
    [string]$Sql4
)

function Decode-B64 {
    param([string]$b64)
    [System.Text.Encoding]::UTF8.GetString([System.Convert]::FromBase64String($b64))
}

$connStr = "Provider=Microsoft.ACE.OLEDB.12.0;Data Source=$DbPath;Persist Security Info=False;"
$conn = New-Object System.Data.OleDb.OleDbConnection($connStr)
$conn.Open()

function Run-Query($sqlText) {
    if (-not $sqlText) { return @() }
    try {
        $cmd = $conn.CreateCommand()
        $cmd.CommandText = $sqlText
        $reader = $cmd.ExecuteReader()
        $cols = @()
        for ($i = 0; $i -lt $reader.FieldCount; $i++) { $cols += $reader.GetName($i) }
        $rows = @()
        while ($reader.Read()) {
            $obj = @{}
            for ($i = 0; $i -lt $reader.FieldCount; $i++) {
                $v = $reader[$i]
                $obj[$cols[$i]] = if ($v -is [DBNull]) { $null } else { "$v" }
            }
            $rows += $obj
        }
        $reader.Close()
        return $rows
    } catch {
        return @()
    }
}

$result = @{
    salaf     = @(Run-Query (Decode-B64 $Sql1))
    qard      = @(Run-Query (Decode-B64 $Sql2))
    bait      = @(Run-Query (Decode-B64 $Sql3))
    instagram = @(Run-Query (Decode-B64 $Sql4))
}

$conn.Close()
$result | ConvertTo-Json -Depth 5 -Compress
