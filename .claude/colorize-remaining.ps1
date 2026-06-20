# Colorize remaining 54 hardcoded Tailwind colors to design tokens
# Pattern: replace hardcoded Tailwind colors with semantic tokens

$srcDir = "D:\C\SRV100_Acc\client\src"
$files = Get-ChildItem -Path $srcDir -Recurse -Filter "*.tsx" -File

$totalReplacements = 0

# Define replacement rules: [old_pattern, new_pattern]
$replacements = @(
    # Dark backgrounds (code blocks, overlays, dark UI) - OK to keep as is, but update to proper tokens
    @("bg-slate-950", "bg-slate-950"),  # Special case: code editor background - keep
    @("bg-slate-900/95", "bg-slate-900/95"),  # Special case - keep
    @("bg-slate-900/85", "bg-slate-900/85"),  # Special case - keep
    @("bg-slate-900/20", "bg-muted/40"),  # Overlay → muted overlay

    # Slate grays → token colors
    @("text-slate-100", "text-slate-100"),  # Special case (white text) - keep
    @("text-slate-300", "text-muted-foreground"),
    @("text-slate-400", "text-muted-foreground"),
    @("text-slate-700", "text-foreground"),
    @("text-slate-800", "text-foreground"),
    @("text-slate-900", "text-foreground"),
    @("bg-slate-700", "bg-muted"),
    @("bg-slate-800", "bg-muted/80"),
    @("bg-slate-600", "bg-muted"),
    @("hover:bg-slate-800", "hover:bg-muted/70"),
    @("hover:bg-slate-700", "hover:bg-muted/60"),

    # Blue colors
    @("bg-blue-100", "bg-primary/10"),
    @("text-blue-700", "text-primary"),
    @("text-blue-800", "text-primary"),
    @("bg-blue-50", "bg-primary/5"),
    @("border-blue-100", "border-primary/20"),
    @("border-blue-600", "border-primary"),

    # Purple colors
    @("text-purple-700", "text-primary"),
    @("bg-purple-100", "bg-primary/10"),

    # Gray/neutral
    @("hover:bg-gray-800", "hover:bg-muted/70"),
    @("hover:text-gray-400", "hover:text-muted-foreground"),
    @("bg-gray-800/60", "bg-muted/60"),
    @("text-gray-400", "text-muted-foreground"),

    # Red/danger
    @("border-red-200", "border-destructive/30"),
    @("bg-red-50", "bg-destructive/10"),
    @("text-red-700", "text-destructive"),

    # Rose/warning
    @("border-rose-300", "border-destructive/40"),
    @("border-rose-200", "border-destructive/30"),
    @("bg-rose-50/45", "bg-destructive/5"),
    @("text-rose-700", "text-destructive"),
    @("bg-rose-950/20", "bg-destructive/5"),

    # Green/success
    @("bg-green-500", "bg-emerald-500"),
    @("border-r-green-500", "border-emerald-500"),

    # Orange/warning
    @("border-r-orange-500", "border-warning"),

    # Amber/warning
    @("border-r-amber-500", "border-warning"),

    # White backgrounds
    @("bg-white", "bg-card"),

    # Text white
    @("text-white", "text-card-foreground")
)

foreach ($file in $files) {
    $content = Get-Content $file.FullName -Raw
    $originalContent = $content

    foreach ($rule in $replacements) {
        $old = $rule[0]
        $new = $rule[1]

        # Skip if old and new are same
        if ($old -eq $new) { continue }

        # Count matches
        $count = ($content | Select-String -Pattern ([regex]::Escape($old)) -AllMatches).Matches.Count
        if ($count -gt 0) {
            $content = $content -replace ([regex]::Escape($old)), $new
            $totalReplacements += $count
            Write-Host "$($file.Name): $count replacements of '$old' → '$new'"
        }
    }

    if ($content -ne $originalContent) {
        Set-Content -Path $file.FullName -Value $content -NoNewline
    }
}

Write-Host "`nTotal color token replacements: $totalReplacements"
