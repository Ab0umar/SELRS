param([string]$DbPath = "C:\Users\drels\OneDrive\SELRS\الخزنه.accdb")

$cs = "Provider=Microsoft.ACE.OLEDB.12.0;Data Source=$DbPath;Persist Security Info=False;"

function CountTable($name) {
    $c = New-Object System.Data.OleDb.OleDbConnection($cs)
    $c.Open()
    try {
        $cmd = $c.CreateCommand()
        $cmd.CommandText = "SELECT COUNT(*) FROM [$name]"
        $n = $cmd.ExecuteScalar()
        return $n
    } catch { return "ERROR: $_" }
    finally { $c.Close() }
}

function GetCols($name) {
    $c = New-Object System.Data.OleDb.OleDbConnection($cs)
    $c.Open()
    try {
        $cmd = $c.CreateCommand()
        $cmd.CommandText = "SELECT TOP 1 * FROM [$name]"
        $r = $cmd.ExecuteReader()
        $cols = @()
        for ($i = 0; $i -lt $r.FieldCount; $i++) { $cols += $r.GetName($i) }
        $r.Close()
        return $cols -join ", "
    } catch { return "ERROR: $_" }
    finally { $c.Close() }
}

$tables = @("All","2024","2025","2026","البيت","التصنيف","القرض","الموظفين","انستا","د_السعدني","سلف")

foreach ($t in $tables) {
    $cnt = CountTable $t
    $cols = GetCols $t
    Write-Host "[$t] rows=$cnt | cols: $cols"
}
