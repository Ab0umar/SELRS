# Remove all dark: classes - design explicitly mandates light-only theme
# DESIGN.md: "Light theme always." Clinic staff work in bright offices, OR needs light for visibility

$srcDir = Join-Path (Split-Path -Parent $PSScriptRoot) "client\src"
$files = Get-ChildItem -Path $srcDir -Recurse -Filter "*.tsx" -File

$totalReplacements = 0

foreach ($file in $files) {
    $content = Get-Content $file.FullName -Raw
    $originalContent = $content

    # Pattern: " dark:..." (with leading space to avoid partial matches)
    # Match dark:XXX where XXX is alphanumeric or special chars like - [ ] /
    $pattern = ' dark:[a-z0-9\-\[\]/%]*'

    # Count and remove all dark: classes
    $matches = [regex]::Matches($content, $pattern)
    if ($matches.Count -gt 0) {
        $content = $content -replace $pattern, ''
        $totalReplacements += $matches.Count
        Write-Host "$($file.Name): Removed $($matches.Count) dark: classes"
    }

    if ($content -ne $originalContent) {
        Set-Content -Path $file.FullName -Value $content -NoNewline
    }
}

Write-Host "`nTotal dark: class removals: $totalReplacements"
