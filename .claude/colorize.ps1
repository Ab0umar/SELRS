# Token colorization script for SELRS design system
# Maps hardcoded Tailwind colors to design-system tokens

$patterns = @(
  # Slate grays -> design tokens
  @{ old = 'bg-slate-50'; new = 'bg-muted' },
  @{ old = 'bg-slate-100'; new = 'bg-muted' },
  @{ old = 'bg-slate-200'; new = 'bg-border' },
  @{ old = 'bg-slate-300'; new = 'bg-border' },
  @{ old = 'text-slate-600'; new = 'text-muted-foreground' },
  @{ old = 'text-slate-700'; new = 'text-foreground' },
  @{ old = 'text-slate-900'; new = 'text-foreground' },
  @{ old = 'border-slate-100'; new = 'border-border' },
  @{ old = 'border-slate-200'; new = 'border-border' },
  @{ old = 'border-slate-300'; new = 'border-border' },
  @{ old = 'hover:bg-slate-50'; new = 'hover:bg-muted' },
  @{ old = 'hover:border-slate-300'; new = 'hover:border-border' },

  # Gray grays -> design tokens
  @{ old = 'bg-gray-50'; new = 'bg-muted' },
  @{ old = 'bg-gray-100'; new = 'bg-muted' },
  @{ old = 'bg-gray-200'; new = 'bg-border' },
  @{ old = 'text-gray-600'; new = 'text-muted-foreground' },
  @{ old = 'text-gray-700'; new = 'text-foreground' },
  @{ old = 'text-gray-900'; new = 'text-foreground' },
  @{ old = 'border-gray-200'; new = 'border-border' },
  @{ old = 'border-gray-300'; new = 'border-border' },
  @{ old = 'hover:bg-gray-50'; new = 'hover:bg-muted' },
  @{ old = 'hover:border-gray-300'; new = 'hover:border-border' },

  # White -> background
  @{ old = 'bg-white'; new = 'bg-background' },

  # Zinc -> tokens
  @{ old = 'bg-zinc-50'; new = 'bg-muted' },
  @{ old = 'text-zinc-600'; new = 'text-muted-foreground' },
  @{ old = 'text-zinc-900'; new = 'text-foreground' },
  @{ old = 'border-zinc-200'; new = 'border-border' }
)

$srcDir = Join-Path (Split-Path -Parent $PSScriptRoot) "client\src"
$files = Get-ChildItem -Path $srcDir -Recurse -Filter "*.tsx" -File

$totalReplacements = 0

foreach ($file in $files) {
  $content = Get-Content $file.FullName -Raw
  $originalContent = $content

  foreach ($pattern in $patterns) {
    $count = ($content | Select-String -Pattern $pattern.old -AllMatches).Matches.Count
    if ($count -gt 0) {
      $content = $content -replace "\b$($pattern.old)\b", $pattern.new
      $totalReplacements += $count
      Write-Host "$($file.Name): $count replacements of '$($pattern.old)' → '$($pattern.new)'"
    }
  }

  if ($content -ne $originalContent) {
    Set-Content -Path $file.FullName -Value $content -NoNewline
  }
}

Write-Host "`nTotal replacements: $totalReplacements"
