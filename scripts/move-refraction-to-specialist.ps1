$ErrorActionPreference = "Stop"
$path = Join-Path (Get-Location) "client\src\pages\WorkflowPrototypeLive.tsx"
$text = Get-Content -Raw -Path $path

$text = [regex]::Replace(
  $text,
  '(?s)(\s+after: Record<Eye, Refraction>;\r?\n)\s+refraction: \{\r?\n\s+od: Refraction & \{ pd: string \};\r?\n\s+os: Refraction & \{ pd: string \};\r?\n\s+reading: string;\r?\n\s+add: string;\r?\n\s+\};\r?\n(\s+notes: string;\r?\n\s+\};\r?\n\s+specialist: \{)',
  '$1$2',
  1
)

$initialRefraction = @'
    refraction: {
      od: { s: "+0.00", c: "+0.00", a: "180", pd: "31" },
      os: { s: "+0.00", c: "+0.00", a: "180", pd: "31" },
      reading: "N8",
      add: "---",
    },
'@
$text = $text.Replace($initialRefraction, "")

$nursingStart = $text.IndexOf('  const renderNursing = () => (')
if ($nursingStart -lt 0) { throw "renderNursing marker not found" }
$nursingEnd = $text.IndexOf('  const renderDoctorSheetLauncher =', $nursingStart)
if ($nursingEnd -lt 0) { throw "renderNursing end marker not found" }
$nursingSegment = $text.Substring($nursingStart, $nursingEnd - $nursingStart)
$refMatch = [regex]::Match(
  $nursingSegment,
  '(?s)        <section className="rounded-xl border border-slate-200 bg-white p-3">\r?\n          <h3 className="mb-3 text-sm font-bold">REFRACTION</h3>.*?(?=        <section className="rounded-xl border border-slate-200 bg-white p-3">\r?\n          <h3 className="mb-3 text-sm font-bold">PENTACAM</h3>)'
)
if (-not $refMatch.Success) { throw "nursing Refraction section not found" }
$globalRefStart = $nursingStart + $refMatch.Index
$text = $text.Remove($globalRefStart, $refMatch.Length)

Set-Content -Path $path -Value $text -Encoding utf8
Write-Output "Removed nursing Refraction section; specialist Refraction remains the active doctor section."
