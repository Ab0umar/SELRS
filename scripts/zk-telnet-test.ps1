param([string]$IP = "192.168.1.170", [string]$User = "root", [string]$Password = "solokey")

$neg = [byte[]](0xFF, 0xFC, 0x01, 0xFF, 0xFC, 0x1F, 0xFF, 0xFD, 0x03, 0xFF, 0xFD, 0x01)
$enc = [System.Text.Encoding]::ASCII

function ZkTRead([System.Net.Sockets.NetworkStream]$st, [int]$waitMs) {
  [System.Threading.Thread]::Sleep($waitMs)
  $buf = New-Object byte[] 16384; $total = 0
  $st.ReadTimeout = 1000
  while ($true) {
    try { $n = $st.Read($buf, $total, 16384 - $total); if ($n -eq 0) { break }; $total += $n } catch { break }
  }
  $hex  = ($buf[0..($total-1)] | ForEach-Object { $_.ToString("X2") }) -join " "
  $text = $enc.GetString($buf, 0, $total) -replace "[^\x20-\x7e\r\n]","."
  Write-Host "  hex : $hex"
  Write-Host "  text: $text"
}

function ZkTWrite([System.Net.Sockets.NetworkStream]$st, [string]$line) {
  $b = $enc.GetBytes($line + "`n")
  $st.Write($b, 0, $b.Length)
}

$tcp = New-Object System.Net.Sockets.TcpClient
$tcp.Connect($IP, 23)
$st = $tcp.GetStream()
$st.ReadTimeout = 5000

Write-Host "[1] negotiation"
$st.Write($neg, 0, $neg.Length)
ZkTRead $st 800

Write-Host "[2] user: $User"
ZkTWrite $st $User
ZkTRead $st 800

Write-Host "[3] password: $Password"
ZkTWrite $st $Password
ZkTRead $st 4000    # 4 second wait for delayed response

Write-Host "[4] send 'id' (to check if we have a shell)"
ZkTWrite $st "id"
ZkTRead $st 3000

$tcp.Close()
Write-Host "Done."
