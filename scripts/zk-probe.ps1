param([string]$IP = "196.202.50.91")

$enc = [System.Text.Encoding]::ASCII

function ShowBytes([byte[]]$raw, [int]$len) {
  if ($len -le 0) { return "(empty)" }
  $hex  = ($raw[0..($len-1)] | ForEach-Object { $_.ToString("X2") }) -join " "
  $text = $enc.GetString($raw, 0, $len) -replace "[^\x20-\x7e\r\n]", "."
  return "hex:[$hex]  text:[$text]"
}

# ---- 1. ZKTeco TCP binary protocol on port 23 (no Telnet negotiation) ----
Write-Host "=== Test 1: ZKTeco CMD_CONNECT on port 23 (raw, no Telnet) ==="
try {
  $tcp = New-Object System.Net.Sockets.TcpClient
  $tcp.Connect($IP, 23); $st = $tcp.GetStream(); $st.ReadTimeout = 3000
  $buf = New-Object byte[] 4096

  # Read and discard Telnet banner
  [System.Threading.Thread]::Sleep(600)
  try { $st.Read($buf, 0, 4096) | Out-Null } catch {}

  # Build ZK CMD_CONNECT packet (same as zk4370Client.ts)
  function MkPkt([int]$cmd) {
    $inner = New-Object byte[] 8
    [System.BitConverter]::GetBytes([uint16]$cmd).CopyTo($inner, 0)   # cmd
    [System.BitConverter]::GetBytes([uint16]0).CopyTo($inner, 2)      # chk placeholder
    [System.BitConverter]::GetBytes([uint16]0).CopyTo($inner, 4)      # session
    [System.BitConverter]::GetBytes([uint16]1).CopyTo($inner, 6)      # reply
    $sum = 0; foreach ($b in $inner) { $sum = ($sum + $b) -band 0xFFFF }
    [System.BitConverter]::GetBytes([uint16]$sum).CopyTo($inner, 2)
    $tcp = New-Object byte[] 16
    [byte[]]@(0x50,0x50,0x82,0x7D).CopyTo($tcp, 0)
    [System.BitConverter]::GetBytes([uint16]8).CopyTo($tcp, 4)
    [System.BitConverter]::GetBytes([uint16]0).CopyTo($tcp, 6)
    $inner.CopyTo($tcp, 8)
    return $tcp
  }

  $pkt = MkPkt 1000
  Write-Host "Sending CMD_CONNECT:" ($pkt | ForEach-Object { $_.ToString("X2") }) -join " "
  $st.Write($pkt, 0, $pkt.Length)
  [System.Threading.Thread]::Sleep(2000)
  $n = 0; try { $n = $st.Read($buf, 0, 4096) } catch {}
  Write-Host "Response:" (ShowBytes $buf $n)
  $tcp.Close()
} catch { Write-Host "Error: $_" }

# ---- 2. UDP port scan for common ZKTeco ports ----
Write-Host "`n=== Test 2: UDP probe on common ports ==="
$udpPorts = @(4370, 5005, 7788, 8000, 9922)
foreach ($port in $udpPorts) {
  try {
    $udp = New-Object System.Net.Sockets.UdpClient
    $udp.Client.ReceiveTimeout = 1500

    # ZKTeco UDP CMD_CONNECT
    $pkt = [byte[]](0xE8,0x03, 0x00,0x00, 0x00,0x00, 0x01,0x00)
    $sum = 0; foreach ($b in $pkt) { $sum = ($sum + $b) -band 0xFFFF }
    $pkt[2] = $sum -band 0xFF; $pkt[3] = ($sum -shr 8) -band 0xFF

    $udp.Send($pkt, $pkt.Length, $IP, $port) | Out-Null
    $ep = [System.Net.IPEndPoint]::new([System.Net.IPAddress]::Any, 0)
    $resp = $udp.Receive([ref]$ep)
    Write-Host "UDP $port : RESPONSE" (ShowBytes $resp $resp.Length) "from $($ep.Address):$($ep.Port)"
    $udp.Close()
  } catch {
    Write-Host "UDP $port : no response"
    try { $udp.Close() } catch {}
  }
}

# ---- 3. Try empty username (just Enter) ----
Write-Host "`n=== Test 3: Empty username at login ==="
try {
  $tcp = New-Object System.Net.Sockets.TcpClient
  $tcp.Connect($IP, 23); $st = $tcp.GetStream(); $st.ReadTimeout = 3000
  $buf = New-Object byte[] 4096
  $neg = [byte[]](0xFF,0xFC,0x01,0xFF,0xFC,0x1F,0xFF,0xFD,0x03,0xFF,0xFD,0x01)
  $st.Write($neg,0,$neg.Length); [System.Threading.Thread]::Sleep(700)
  try { $st.Read($buf,0,4096) | Out-Null } catch {}

  # Send empty username
  $b = $enc.GetBytes("`n"); $st.Write($b,0,$b.Length)
  [System.Threading.Thread]::Sleep(2000)
  $n = 0; try { $n = $st.Read($buf,0,4096) } catch {}
  Write-Host "Empty username response:" (ShowBytes $buf $n)
  $tcp.Close()
} catch { Write-Host "Error: $_" }
