# Remove (as any) type casts and replace with proper typing
# Pattern: (as any)?. → direct property access (relies on user being properly typed)
# This is safe because the useAuth hook ensures user is either null or a proper User object

$srcDir = "D:\C\SRV100_Acc\client\src"
$files = Get-ChildItem -Path $srcDir -Recurse -Filter "*.ts*" -File

$totalReplacements = 0

foreach ($file in $files) {
  $content = Get-Content $file.FullName -Raw
  $originalContent = $content

  # Pattern 1: (user as any)?.field → user?.field
  # But keep it safe: (user as User | null)?.field
  $count = ($content | Select-String -Pattern '\(user as any\)\?' -AllMatches).Matches.Count
  if ($count -gt 0) {
    $content = $content -replace '\(user as any\)\?', '(user as User | null)?'
    $totalReplacements += $count
    Write-Host "$($file.Name): $count replacements of '(user as any)?' → '(user as User | null)?'"
  }

  # Pattern 2: (user as any). → (user as User | null).
  $count = ($content | Select-String -Pattern '\(user as any\)\.' -AllMatches).Matches.Count
  if ($count -gt 0) {
    $content = $content -replace '\(user as any\)\.', '(user as User | null).'
    $totalReplacements += $count
    Write-Host "$($file.Name): $count replacements of '(user as any).' → '(user as User | null).'"
  }

  if ($content -ne $originalContent) {
    Set-Content -Path $file.FullName -Value $content -NoNewline
  }
}

Write-Host "`nTotal (as any) replacements: $totalReplacements"
