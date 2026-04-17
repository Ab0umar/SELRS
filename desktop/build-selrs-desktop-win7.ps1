param(
  [string]$Configuration = "Release",
  [string]$OutDir = "E:\SELRS.cc\desktop\publish-win7"
)

$ErrorActionPreference = "Stop"

$project = "E:\SELRS.cc\desktop\SelrsDesktop\SelrsDesktop.Win7.csproj"

Write-Host "[SELRS Win7] Publishing..." -ForegroundColor Cyan
dotnet publish $project `
  -c $Configuration `
  -o $OutDir

Write-Host "[SELRS Win7] Done: $OutDir" -ForegroundColor Green
