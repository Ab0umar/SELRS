$p = 'C:\Users\SELRS\AppData\Roaming\Microsoft\Windows\Start Menu\Programs\Startup'
Get-ChildItem -LiteralPath $p -Force |
  Where-Object { $_.Extension -eq '.lnk' -and $_.Name -match 'SELRS' } |
  Remove-Item -Force
Get-ChildItem -LiteralPath $p -Force | Select-Object Name, FullName | Format-Table -AutoSize
