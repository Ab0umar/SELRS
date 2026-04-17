param(
  [string]$Configuration = "Release",
  [string]$Runtime = "win-x64",
  [string]$OutDir = "E:\SELRS.cc\desktop\publish"
)

$ErrorActionPreference = "Stop"

$project = "E:\SELRS.cc\desktop\SelrsDesktop\SelrsDesktop.csproj"

Write-Host "[SELRS] Publishing..." -ForegroundColor Cyan
dotnet publish $project `
  -c $Configuration `
  -r $Runtime `
  --self-contained false `
  -p:PublishSingleFile=true `
  -p:IncludeNativeLibrariesForSelfExtract=true `
  -o $OutDir

Write-Host "[SELRS] Done: $OutDir" -ForegroundColor Green
