param(
  [string]$Configuration = "Release",
  [string]$Runtime = "win-x64",
  [string]$OutDir = (Join-Path $PSScriptRoot "publish")
)

$ErrorActionPreference = "Stop"

$project = Join-Path $PSScriptRoot "SelrsDesktop\SelrsDesktop.csproj"

Write-Host "[SELRS] Publishing..." -ForegroundColor Cyan
dotnet publish $project `
  -c $Configuration `
  -r $Runtime `
  --self-contained false `
  -p:PublishSingleFile=true `
  -p:IncludeNativeLibrariesForSelfExtract=true `
  -o $OutDir
if ($LASTEXITCODE -ne 0) {
  throw "dotnet publish failed with exit code $LASTEXITCODE"
}

Write-Host "[SELRS] Done: $OutDir" -ForegroundColor Green
