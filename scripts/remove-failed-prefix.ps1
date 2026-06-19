param(
  [string]$Folder = ".",
  [switch]$DryRun
)

$files = Get-ChildItem -Path $Folder -Filter "FAILED_*.jpg" -Recurse

if ($files.Count -eq 0) {
  Write-Host "No FAILED_ files found in: $Folder" -ForegroundColor Yellow
  exit 0
}

foreach ($file in $files) {
  $newName = $file.Name -replace "^FAILED_", ""
  $newPath = Join-Path $file.DirectoryName $newName

  if ($DryRun) {
    Write-Host "[DRY RUN] $($file.Name)  →  $newName"
  } else {
    Rename-Item -Path $file.FullName -NewName $newName
    Write-Host "Renamed: $($file.Name)  →  $newName" -ForegroundColor Green
  }
}

Write-Host "`nDone: $($files.Count) file(s) processed." -ForegroundColor Cyan
