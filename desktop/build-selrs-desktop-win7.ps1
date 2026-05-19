param(
  [string]$Configuration = "Release",
  [string]$OutDir = (Join-Path $PSScriptRoot "publish-win7")
)

$ErrorActionPreference = "Stop"

$project = Join-Path $PSScriptRoot "SelrsDesktop\SelrsDesktop.Win7.csproj"

Write-Host "[SELRS Win7] Publishing..." -ForegroundColor Cyan
dotnet publish $project `
  -c $Configuration `
  -o $OutDir
if ($LASTEXITCODE -ne 0) {
  throw "dotnet publish failed with exit code $LASTEXITCODE"
}

Write-Host "[SELRS Win7] Done: $OutDir" -ForegroundColor Green
